"""
ทดสอบ bookmarklet กับหน้ากลุ่ม Facebook จำลอง

เบราว์เซอร์ทดสอบจะเปิด https://www.facebook.com/groups/mockgroup/ และ https://164p.github.io/fb-group-market/
แต่ทุก request ถูกดักแล้วตอบด้วยไฟล์ใน e2e/ (ไม่มีการติดต่อ Facebook จริง)
origin จึงเป็น facebook.com / github.io จริง ทำให้การตรวจ origin ของ postMessage ถูกทดสอบด้วย

ใช้: npm run build:bm && python3 e2e/bookmarklet_e2e.py
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
MOCK = (ROOT / 'e2e/mock-facebook-group.html').read_text()
STUB = (ROOT / 'e2e/stub-receiver.html').read_text()
BM = (ROOT / '.bookmarklet/bookmarklet.js').read_text()
GROUP_URL = 'https://www.facebook.com/groups/mockgroup/?sorting_setting=CHRONOLOGICAL'
APP = 'https://164p.github.io/fb-group-market/'

failures = []


def check(name, cond, detail=''):
    print(('  ✓ ' if cond else '  ✗ ') + name + (f' — {detail}' if detail else ''))
    if not cond:
        failures.append(name)


def run(p, title, stub_cfg, start, timeout_ms=120_000, silent_wait=False, url=GROUP_URL, during=None):
    print(f'\n▶ {title}')
    b = p.chromium.launch(args=['--no-proxy-server'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin='https://www.facebook.com')
    ctx.route('https://www.facebook.com/**', lambda r: r.fulfill(body=MOCK, content_type='text/html; charset=utf-8'))
    ctx.route(APP + '**', lambda r: r.fulfill(body=STUB, content_type='text/html; charset=utf-8'))
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    # ตั้งค่า stub ผ่าน localStorage ของ origin github.io
    ctx.add_init_script(f"if (location.origin === 'https://164p.github.io') localStorage.setItem('stubcfg', {json.dumps(json.dumps(stub_cfg))});")
    errors = []
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_timeout(500)
    page.evaluate("window.__FBGM_TEST__ = { delayMs: [60, 120] }")
    page.evaluate(BM)
    panel = page.locator('#fbgm-panel')
    start(panel)
    with ctx.expect_page() as popup_info:
        panel.locator('button.btn').click()
    popup = popup_info.value
    if during:
        during(page)
    # รอจนแผงแสดงผลสุดท้าย
    page.wait_for_function(
        "() => { const r = document.querySelector('#fbgm-panel')?.shadowRoot; return r && /ส่งแล้ว|เก็บได้|ไม่พบโพสต์|เวอร์ชันเก่า/.test(r.textContent) }",
        timeout=timeout_ms,
    )
    panel_text = page.evaluate("document.querySelector('#fbgm-panel').shadowRoot.textContent")
    received = popup.evaluate('window.__received') if not popup.is_closed() else None
    return b, page, popup, panel_text, received, errors


def set_mode(mode, value=None):
    def f(panel):
        panel.locator(f'input[value="{mode}"]').check()
        if value is not None:
            panel.locator('input.n').nth(0 if mode == 'maxPosts' else 1).fill(str(value))
    return f


with sync_playwright() as p:
    # 1) ครบจำนวน 20 โพสต์
    b, page, popup, text, rec, errs = run(p, 'หยุดเมื่อครบ 20 โพสต์', {}, set_mode('maxPosts', 20))
    posts = rec['posts']
    ids = [x['postId'] for x in posts]
    check('panel บอกว่าส่งแล้ว 20', 'ส่งแล้ว 20' in text)
    check('ได้ 20 โพสต์', len(posts) == 20, str(len(posts)))
    check('ไม่มีโพสต์ซ้ำ', len(set(ids)) == len(ids))
    check('HELLO มีชื่อกลุ่มจริงและ id จาก URL', rec['hello']['group'] == {'id': 'mockgroup', 'name': 'ตลาดมือสองทดสอบ', 'url': 'https://www.facebook.com/groups/mockgroup'}, str(rec['hello']['group']))
    check('DONE = maxPosts', rec['done']['stopReason'] == 'maxPosts')
    check('รวมโพสต์ปักหมุด', '100000' in ids)
    check('ลิงก์จาก hover ได้ URL มาตรฐาน', all(x['postUrl'] == f"https://www.facebook.com/groups/mockgroup/posts/{x['postId']}/" for x in posts))
    check('ลิงก์ story_fbid อ่านได้', '200005' in ids)
    long_post = next((x for x in posts if x['postId'] == '200001'), None)
    check('กด "ดูเพิ่มเติม" แล้วได้ข้อความเต็ม', long_post and 'ส่งพัสดุได้ทั่วประเทศ' in long_post['text'])
    check('ไม่เก็บข้อความ comment', not any('คอมเมนต์' in x['text'] for x in posts))
    sale = next((x for x in posts if x['postId'] == '200003'), None)
    check('อ่านราคาโพสต์ขายแบบมีฟอร์ม', sale and sale.get('structuredPrice') == '฿3,333', str(sale and sale.get('structuredPrice')))
    check('อ่านเวลาโพสต์', next(x for x in posts if x['postId'] == '200000')['timeText'] == '1 ชม.')
    check('ไม่ส่งชื่อผู้โพสต์ (ค่าเริ่มต้น)', not any(x.get('authorName') for x in posts))
    check('ไม่มี error ในหน้า', not errs, '; '.join(errs))
    page.screenshot(path=sys.argv[1] + '/bm-done.png') if len(sys.argv) > 1 else None
    b.close()

    # 2) เจอโพสต์ที่เคยดึงแล้ว
    known = [str(200000 + i) for i in range(8, 30)]
    b, page, popup, text, rec, errs = run(p, 'หยุดเมื่อเจอโพสต์ที่เคยดึงแล้ว', {'knownIds': known, 'storeAuthorName': True}, set_mode('reachedKnown'))
    ids = [x['postId'] for x in rec['posts']]
    check('หยุดด้วย reachedKnown', rec['done']['stopReason'] == 'reachedKnown')
    check('เก็บโพสต์ใหม่ครบก่อนถึงของเดิม', all(str(200000 + i) in ids for i in range(8)), str(ids))
    check('หยุดหลังเจอของเดิม 3 โพสต์ติด', len([i for i in ids if i in known]) == 3, str(len(ids)))
    check('ส่งชื่อผู้โพสต์เมื่อเว็บแอปอนุญาต', all(x.get('authorName', '').startswith('ผู้ขาย') for x in rec['posts']))
    b.close()

    # 3) ย้อนหลัง 1 วัน
    b, page, popup, text, rec, errs = run(p, 'หยุดเมื่อเก่ากว่า 1 วัน', {}, set_mode('maxAge', 1))
    ids = [x['postId'] for x in rec['posts']]
    times = [x['timeText'] for x in rec['posts']]
    check('หยุดด้วย maxAge', rec['done']['stopReason'] == 'maxAge')
    check('โพสต์แนะนำเก่า 3 โพสต์บนสุดไม่ทำให้หยุดก่อน (ได้ ≥ 20)', len(ids) >= 20, str(len(ids)))
    check('ไม่ส่งโพสต์แนะนำที่เก่ากว่ากำหนด', not any(i.startswith('1000') for i in ids), str(ids[:4]))
    check('ไม่ใช้ลิงก์ "Mario 10" เป็นเวลาโพสต์', all(t != 'Mario 10' for t in times))
    # Facebook แสดง "1 วัน" สำหรับ 24–47 ชม. จึงนับว่าอยู่ในช่วง 1 วัน ส่วน "2 วัน" ขึ้นไปต้องไม่ถูกส่ง
    check('ไม่ส่งโพสต์ที่เก่ากว่ากำหนด', all(not any(f'{d} วัน' in t for d in range(2, 40)) and '2567' not in t for t in times), str(times[-3:]))
    b.close()

    # 4) จนหมดกลุ่ม
    b, page, popup, text, rec, errs = run(p, 'ดึงจนหมด (60 + ปักหมุด 3)', {}, set_mode('maxPosts', 500), timeout_ms=240_000)
    ids = [x['postId'] for x in rec['posts']]
    check('หยุดด้วย noMore', rec['done']['stopReason'] == 'noMore', rec['done']['stopReason'])
    check('ได้ครบ 63 โพสต์ ไม่ซ้ำ แม้โพสต์เก่าถูกลบออกจาก DOM และเนื้อหาโหลดเมื่อใกล้จอ', len(ids) == 63 and len(set(ids)) == 63, str(len(ids)))
    check('ส่งเป็นชุดละไม่เกิน 10', all(len(bt['posts']) <= 10 for bt in rec['batches']))
    stats = page.evaluate('window.__MOCK_STATS__')
    check('ไม่กด "ดูเพิ่มเติม" ที่เป็นลิงก์ (ไม่เปิดหน้าต่างโพสต์)', stats['modalOpened'] == 0, str(stats))
    b.close()

    # 4b) หน้าที่เลื่อนกล่องด้านใน + แท็บถูกซ่อนกลางทาง
    paused_seen = []

    def hide_then_show(page):
        page.wait_for_function("() => /อ่านถึงโพสต์/.test(document.querySelector('#fbgm-panel').shadowRoot.textContent)", timeout=60_000)
        page.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })")
        page.wait_for_timeout(2500)
        paused_seen.append('หยุดชั่วคราว' in page.evaluate("document.querySelector('#fbgm-panel').shadowRoot.textContent"))
        before = page.evaluate("document.querySelector('main').scrollTop")
        page.wait_for_timeout(2500)
        paused_seen.append(before == page.evaluate("document.querySelector('main').scrollTop"))
        page.evaluate("delete document.hidden")

    b, page, popup, text, rec, errs = run(p, 'กล่องเลื่อนด้านใน (หน้าต่างเลื่อนไม่ได้) + สลับแท็บกลางทาง', {}, set_mode('maxPosts', 500),
                                          timeout_ms=240_000, url=GROUP_URL + '&inner=1', during=hide_then_show)
    ids = [x['postId'] for x in rec['posts']]
    check('แผงบอกหยุดชั่วคราวเมื่อแท็บถูกซ่อน', paused_seen[:1] == [True], str(paused_seen))
    check('ไม่เลื่อนต่อระหว่างแท็บถูกซ่อน', paused_seen[1:2] == [True], str(paused_seen))
    check('เลื่อนกล่องด้านในจนได้ครบ 63 โพสต์', len(set(ids)) == 63 and rec['done']['stopReason'] == 'noMore', f"{len(set(ids))} {rec['done']['stopReason']}")
    b.close()

    # 5) หน้ารับข้อมูลไม่ตอบ แต่หน้าต่างยังเข้าถึงได้ → พาหน้าต่างไปพร้อมข้อมูลในลิงก์เอง
    b, page, popup, text, rec, errs = run(p, 'หน้ารับข้อมูลไม่ตอบ: ส่งผ่านลิงก์อัตโนมัติ', {'silent': True}, set_mode('maxPosts', 15), timeout_ms=120_000)
    check('แผงบอกว่าส่งแล้ว 15', 'ส่งแล้ว 15' in text)
    check('หน้าต่างถูกพาไปที่ #/receive?d=…', '#/receive?d=z' in popup.url, popup.url[:80])
    remembered = page.evaluate("localStorage.getItem('fbgm:direct')")
    check('จำว่าส่งตรงไม่ได้', remembered and '"ok":false' in remembered, remembered)
    b.close()

    # 6) bookmarklet เวอร์ชันเก่า
    b, page, popup, text, rec, errs = run(p, 'เว็บแอปต้องการเวอร์ชันใหม่กว่า', {'minVersion': 99}, set_mode('maxPosts', 10))
    check('แจ้งให้ลากปุ่มใหม่', 'เวอร์ชันเก่า' in text and len(rec['posts']) == 0)
    b.close()

    # 7) ไม่ใช่หน้ากลุ่ม
    print('\n▶ เปิดบนหน้าที่ไม่ใช่กลุ่ม')
    b = p.chromium.launch(args=['--no-proxy-server'])
    ctx = b.new_context()
    ctx.route('https://www.facebook.com/**', lambda r: r.fulfill(body='<h1>หน้าแรก</h1>', content_type='text/html; charset=utf-8'))
    pg = ctx.new_page()
    msgs = []
    pg.on('dialog', lambda d: (msgs.append(d.message), d.dismiss()))
    pg.goto('https://www.facebook.com/marketplace/')
    pg.evaluate(BM)
    check('แจ้งให้เปิดหน้ากลุ่ม', msgs and 'หน้ากลุ่ม' in msgs[0], msgs[0] if msgs else '')
    b.close()

print('\n' + ('ผ่านทั้งหมด' if not failures else f'ไม่ผ่าน {len(failures)} ข้อ: {failures}'))
sys.exit(1 if failures else 0)
