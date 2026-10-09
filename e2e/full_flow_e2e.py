"""
ทดสอบครบวงจร: หน้ากลุ่ม Facebook จำลอง → bookmarklet → หน้ารับข้อมูลของเว็บแอปจริง (จาก dist/) → หน้าสินค้า

- https://www.facebook.com/**            → e2e/mock-facebook-group.html
- https://164p.github.io/fb-group-market/** → ไฟล์ใน dist/ (เว็บแอปที่ build แล้ว)
ไม่มีการติดต่อเว็บจริง

ใช้: npm run build && python3 e2e/full_flow_e2e.py [โฟลเดอร์เก็บภาพหน้าจอ]
"""
import json
import mimetypes
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
MOCK = (ROOT / 'e2e/mock-facebook-group.html').read_text()
BM = (ROOT / '.bookmarklet/bookmarklet.js').read_text()
APP = 'https://164p.github.io/fb-group-market/'
GROUP_URL = 'https://www.facebook.com/groups/mockgroup/?sorting_setting=CHRONOLOGICAL'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
failures = []


def check(name, cond, detail=''):
    print(('  ✓ ' if cond else '  ✗ ') + name + (f' — {detail}' if detail else ''))
    if not cond:
        failures.append(name)


def serve_dist(route):
    path = route.request.url.split('/fb-group-market/', 1)[1].split('#')[0].split('?')[0] or 'index.html'
    f = DIST / path
    if not f.is_file():
        f = DIST / 'index.html'
    ctype = mimetypes.guess_type(str(f))[0] or 'application/octet-stream'
    if ctype.startswith('text/') or ctype == 'application/javascript':
        ctype += '; charset=utf-8'
    route.fulfill(body=f.read_bytes(), content_type=ctype)


def run_bookmarklet(ctx, page, mode, value=None):
    page.goto(GROUP_URL)
    page.wait_for_timeout(400)
    page.evaluate("window.__FBGM_TEST__ = { delayMs: [60, 120] }")
    page.evaluate(BM)
    panel = page.locator('#fbgm-panel')
    panel.locator(f'input[value="{mode}"]').check()
    if value is not None:
        panel.locator('input.n').nth(0 if mode == 'maxPosts' else 1).fill(str(value))
    with ctx.expect_page() as info:
        panel.locator('button.btn').click()
    popup = info.value
    page.wait_for_function(
        "() => /ส่งแล้ว|เก็บได้|ไม่พบโพสต์|เวอร์ชันเก่า/.test(document.querySelector('#fbgm-panel')?.shadowRoot?.textContent || '')",
        timeout=180_000,
    )
    popup.wait_for_selector('text=รับข้อมูลครบแล้ว', timeout=15_000)
    panel_text = page.evaluate("document.querySelector('#fbgm-panel').shadowRoot.textContent")
    stats = popup.locator('dd').all_inner_texts()
    return popup, panel_text, stats


with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-proxy-server'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route('https://www.facebook.com/**', lambda r: r.fulfill(body=MOCK, content_type='text/html; charset=utf-8'))
    ctx.route(APP + '**', serve_dist)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    ctx.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    errors = []
    ctx.on('weberror', lambda e: errors.append(str(e.error)))
    page = ctx.new_page()

    print('\n▶ รอบแรก: ดึง 20 โพสต์ (เปิดเว็บแอปครั้งแรกผ่านหน้ารับข้อมูล)')
    popup, panel_text, stats = run_bookmarklet(ctx, page, 'maxPosts', 20)
    check('แผงบน Facebook บอกว่าส่งแล้ว 20', 'ส่งแล้ว 20' in panel_text)
    check('หน้ารับข้อมูลสรุป สินค้าใหม่ 22 / อัปเดต 0 (20 โพสต์ มี 1 โพสต์แยกเป็น 3)', stats[:2] == ['22', '0'], str(stats))
    check('หน้ารับข้อมูลบอกว่าเพิ่มกลุ่มให้แล้ว', popup.get_by_text('เพิ่มกลุ่มนี้ในรายการกลุ่มของคุณแล้ว').count() == 1)
    if SHOTS:
        popup.set_viewport_size({'width': 460, 'height': 680})
        popup.screenshot(path=f'{SHOTS}/receive-done.png')

    app = ctx.new_page()
    app.goto(APP + '#/?g=mockgroup')
    app.wait_for_timeout(1500)
    summary = app.locator('h1 + p').inner_text()
    check('ไม่มีข้อมูลตัวอย่างปน (เข้าเว็บครั้งแรกผ่านหน้ารับข้อมูล)', 'จาก 1 กลุ่ม' in summary and 'ตัวอย่าง' not in summary, summary)
    check('หน้าสินค้ามี 22 รายการของกลุ่มนี้', app.locator('p[aria-live]').inner_text().startswith('22'), app.locator('p[aria-live]').inner_text())

    app.get_by_label('ค้นหาสินค้า').fill('iPhone 13')
    app.wait_for_timeout(700)
    card = app.locator('article').first
    check('ราคาแยกได้ถูก (iPhone 13 → 12,900)', 'iPhone 13 128GB สีมิดไนท์' in card.inner_text() and '12,900' in card.inner_text(), card.inner_text().replace('\n', ' | ')[:120])
    link = card.get_by_role('link', name='ดูโพสต์บน Facebook').get_attribute('href')
    check('ลิงก์ไปโพสต์ Facebook', link.startswith('https://www.facebook.com/groups/mockgroup/posts/'), link)
    app.get_by_label('ล้างคำค้น').click()
    app.wait_for_timeout(500)
    app.locator('#sort').select_option('priceAsc')
    app.wait_for_timeout(500)
    if SHOTS:
        app.screenshot(path=f'{SHOTS}/listings-real.png')

    app.goto(APP + '#/groups')
    app.wait_for_timeout(1000)
    row = app.locator('#my-groups + ul li').first.inner_text()
    check('หน้ากลุ่มมีชื่อจริง จำนวน และเวลาดึงล่าสุด', 'ตลาดมือสองทดสอบ' in row and '22' in row and 'ดึงล่าสุด' in row, row.replace('\n', ' | '))
    popup.close()

    print('\n▶ รอบสอง: "เจอโพสต์ที่เคยดึงแล้ว" ต้องหยุดเร็วและไม่สร้างซ้ำ')
    popup, panel_text, stats = run_bookmarklet(ctx, page, 'reachedKnown')
    check('หยุดเพราะเจอโพสต์ที่เคยดึงแล้ว', popup.get_by_text('เจอโพสต์ที่เคยดึงแล้ว').count() == 1)
    check('ไม่มีสินค้าใหม่ อัปเดต 3', stats[:2] == ['0', '3'], str(stats))
    app.goto(APP + '#/?g=mockgroup')
    app.wait_for_timeout(1200)
    check('ยังมี 22 รายการ (ไม่ซ้ำ)', app.locator('p[aria-live]').inner_text().startswith('22'))
    popup.close()

    print('\n▶ ทางสำรอง: วางข้อมูลที่คัดลอกมา')
    export = {
        'v': 1, 'type': 'EXPORT', 'bookmarkletVersion': 1, 'stopReason': 'maxPosts', 'scanned': 2,
        'group': {'id': 'othergroup', 'url': 'https://www.facebook.com/groups/othergroup', 'name': 'กลุ่มที่สอง'},
        'posts': [
            {'postId': '1', 'postUrl': 'javascript:alert(1)', 'text': 'กล้อง Fujifilm X100V\nราคา 45,000 บาท', 'timeText': '2 ชม.'},
            {'postId': '2', 'postUrl': 'https://www.facebook.com/groups/othergroup/posts/2/', 'text': 'จักรยาน 3,500.-', 'timeText': '5 ชม.'},
        ],
    }
    imp = ctx.new_page()
    imp.goto(APP + '#/receive?paste=1')
    imp.wait_for_timeout(800)
    imp.locator('#paste').fill('ไม่ใช่ข้อมูล')
    imp.get_by_role('button', name='นำเข้าข้อมูล').click()
    imp.wait_for_timeout(300)
    check('ข้อมูลผิดรูปแบบขึ้นข้อความแนะนำ', 'ข้อมูลไม่ถูกต้อง' in imp.get_by_role('alert').inner_text())
    imp.locator('#paste').fill(json.dumps(export, ensure_ascii=False))
    imp.get_by_role('button', name='นำเข้าข้อมูล').click()
    imp.wait_for_selector('text=นำเข้าข้อมูลแล้ว', timeout=10_000)
    check('นำเข้า 2 รายการ', imp.locator('dd').all_inner_texts()[:1] == ['2'])
    app.goto(APP + '#/?g=othergroup')
    app.wait_for_timeout(1200)
    hrefs = app.get_by_role('link', name='ดูโพสต์บน Facebook').evaluate_all('els => els.map(e => e.href)')
    check('ลิงก์ javascript: ถูกแทนด้วยลิงก์ Facebook ที่ปลอดภัย', all(h.startswith('https://www.facebook.com/') for h in hrefs) and len(hrefs) == 2, str(hrefs))

    print('\n▶ โพสต์ขายหลายรายการถูกแยกเป็นหลายสินค้า')
    app.goto(APP + '#/?g=mockgroup&q=Pokemon')
    app.wait_for_timeout(1200)
    card = app.locator('article').first.inner_text()
    check('ค้น "Pokemon" เจอรายการแยก ราคา 900', 'Pokemon Violet' in card and '900' in card, card.replace('\n', ' | ')[:140])
    check('บอกว่ามาจากโพสต์หลายรายการ', '3 ใน 3 รายการ' in card)
    check('ค้นแล้วไม่ดึงรายการอื่นในโพสต์เดียวกันมาด้วย', app.locator('p[aria-live]').inner_text().startswith('1'))

    check('ไม่มี error ในเว็บแอป', not errors, '; '.join(errors))
    b.close()

    # ---------------------------------------------------------------------------------------------
    print('\n▶ Facebook ตัดการเชื่อมต่อหน้าต่าง (Cross-Origin-Opener-Policy) — แบบที่เจอบน Facebook จริง')
    b = p.chromium.launch(args=['--no-proxy-server'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(
        'https://www.facebook.com/**',
        lambda r: r.fulfill(body=MOCK, content_type='text/html; charset=utf-8', headers={'Cross-Origin-Opener-Policy': 'same-origin'}),
    )
    ctx.route(APP + '**', serve_dist)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    ctx.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    page = ctx.new_page()

    def run_until_handoff(mode, value=None):
        page.goto(GROUP_URL)
        page.wait_for_timeout(400)
        page.evaluate("window.__FBGM_TEST__ = { delayMs: [60, 120] }")
        page.evaluate(BM)
        panel = page.locator('#fbgm-panel')
        panel.locator(f'input[value="{mode}"]').check()
        if value is not None:
            panel.locator('input.n').nth(0).fill(str(value))
        pages_before = len(ctx.pages)
        panel.locator('button.btn').click()
        page.wait_for_function(
            "() => /พร้อมส่ง|ส่งแล้ว|ไม่พบโพสต์/.test(document.querySelector('#fbgm-panel')?.shadowRoot?.textContent || '')",
            timeout=180_000,
        )
        return panel, pages_before

    panel, before = run_until_handoff('maxPosts', 20)
    text = page.evaluate("document.querySelector('#fbgm-panel').shadowRoot.textContent")
    check('แสดงปุ่ม "ส่งเข้าเว็บ" (ไม่ต้องคัดลอกวาง)', 'ส่งเข้าเว็บ' in text and 'พร้อมส่ง' in text, text[-120:])
    if SHOTS:
        page.screenshot(path=f'{SHOTS}/handoff-panel.png')
    with ctx.expect_page() as info:
        panel.get_by_role('button', name='ส่งเข้าเว็บ').click()
    tab = info.value
    tab.wait_for_selector('text=รับข้อมูลครบแล้ว', timeout=20_000)
    stats = tab.locator('dd').all_inner_texts()
    check('แท็บใหม่รับข้อมูลครบ: สินค้าใหม่ 22 (20 โพสต์ มี 1 โพสต์แยกเป็น 3)', stats[:1] == ['22'], str(stats))
    check('ลบข้อมูลออกจาก URL หลังนำเข้า', '?d=' not in tab.url, tab.url)
    tab.close()

    print('\n▶ ครั้งถัดไป: ไม่เปิดหน้าต่างรอ และ "เจอโพสต์ที่เคยดึงแล้ว" ใช้ความจำในเครื่อง')
    panel, before = run_until_handoff('reachedKnown')
    t0 = page.evaluate("document.querySelector('#fbgm-panel').shadowRoot.textContent")
    check('ไม่เปิดหน้าต่างรับข้อมูลค้างไว้', len(ctx.pages) == before, f'{before} → {len(ctx.pages)}')
    check('หยุดเร็วเพราะเจอโพสต์เดิม (≤ 4 โพสต์)', any(f'{n}โพสต์พร้อมส่ง' in t0.replace(' ', '') for n in range(1, 5)), t0[-80:])
    b.close()

    # ---------------------------------------------------------------------------------------------
    print('\n▶ หน้าสินค้าไม่กระตุกเวลาเลื่อน (300 รายการ ความสูงไม่เท่ากัน)')
    b = p.chromium.launch(args=['--no-proxy-server'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(APP + '**', serve_dist)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    app = ctx.new_page()
    app.goto(APP + '#/receive?paste=1')
    app.wait_for_timeout(800)
    many = {
        'v': 1, 'type': 'EXPORT', 'bookmarkletVersion': 1, 'stopReason': 'noMore', 'scanned': 300,
        'group': {'id': 'big', 'url': 'https://www.facebook.com/groups/big', 'name': 'กลุ่มใหญ่'},
        'posts': [
            {'postId': str(5000 + i), 'postUrl': f'https://www.facebook.com/groups/big/posts/{5000 + i}/',
             'text': f'สินค้าชิ้นที่ {i} ' + ('ชื่อยาวมาก ' * (i % 7)) + f'\nราคา {100 + i * 7} บาท\n' + ('รายละเอียด ' * (i % 13)),
             'timeText': f'{i % 23 + 1} ชม.'}
            for i in range(300)
        ],
    }
    app.locator('#paste').fill(json.dumps(many, ensure_ascii=False))
    app.get_by_role('button', name='นำเข้าข้อมูล').click()
    app.wait_for_selector('text=นำเข้าข้อมูลแล้ว', timeout=20_000)
    app.goto(APP + '#/?g=big')
    app.wait_for_timeout(1200)
    jumps = []
    for step in range(1, 30):
        target = step * 600
        app.evaluate(f'window.scrollTo(0, {target})')
        app.wait_for_timeout(120)
        y = app.evaluate('scrollY')
        maxy = app.evaluate('document.documentElement.scrollHeight - innerHeight')
        if abs(y - min(target, maxy)) > 2:
            jumps.append((target, y))
    for step in range(28, 0, -1):
        target = step * 600
        app.evaluate(f'window.scrollTo(0, {target})')
        app.wait_for_timeout(120)
        y = app.evaluate('scrollY')
        if abs(y - target) > 2:
            jumps.append((target, y))
    check('ตำแหน่งเลื่อนไม่กระโดดทั้งขาลงและขาขึ้น', not jumps, str(jumps[:5]))
    shown = app.locator('article').count()
    check('โหลดเพิ่มเมื่อเลื่อน (แสดงมากกว่าชุดแรก 48)', shown > 48, str(shown))
    b.close()

print('\n' + ('ผ่านทั้งหมด' if not failures else f'ไม่ผ่าน {len(failures)} ข้อ: {failures}'))
sys.exit(1 if failures else 0)
