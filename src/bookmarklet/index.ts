// จุดเริ่มของ bookmarklet — ทำงานบนหน้ากลุ่ม Facebook
import { APP_URL, BOOKMARKLET_VERSION, DEFAULT_SETTINGS } from '../shared/config';
import type { StopReason } from '../shared/types';
import { readGroup } from './dom/extract';
import { Panel, type Prefs } from './panel';
import { collect } from './scroller';
import { Bridge, copyText } from './transport';
import { directKnownToFail, loadSentIds, rememberDirect, saveSentIds } from './memory';
import { encodePayload, MAX_URL_PAYLOAD } from '../shared/transfer';

declare global {
  interface Window {
    __fbgm?: { running: boolean };
    /** ใช้ในการทดสอบเท่านั้น */
    __FBGM_TEST__?: { appUrl?: string; delayMs?: [number, number] };
  }
}

const PREFS_KEY = 'fbgm:prefs';

const STOP_TEXT: Record<StopReason, string> = {
  maxPosts: 'ครบจำนวนที่ตั้งไว้',
  maxAge: 'ถึงโพสต์ที่เก่ากว่าที่ตั้งไว้',
  reachedKnown: 'เจอโพสต์ที่เคยดึงแล้ว',
  noMore: 'ไม่มีโพสต์โหลดเพิ่มแล้ว',
  user: 'หยุดตามที่คุณกด',
  error: 'เกิดข้อผิดพลาด',
};

function loadPrefs(): Prefs {
  const base: Prefs = { stopMode: DEFAULT_SETTINGS.stopMode, maxPosts: DEFAULT_SETTINGS.maxPosts, maxAgeDays: DEFAULT_SETTINGS.maxAgeDays };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return base;
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ไม่เป็นไร */
  }
}

function main() {
  if (window.__fbgm?.running) return;
  const test = window.__FBGM_TEST__;
  const appUrl = test?.appUrl ?? APP_URL;
  const appOrigin = new URL(appUrl).origin;

  if (!/(^|\.)facebook\.com$/.test(location.hostname)) {
    alert('ปุ่ม "ดึงสินค้า" ใช้ได้บนหน้ากลุ่ม Facebook เท่านั้น\nเปิดกลุ่มซื้อขายบน Facebook แล้วกดอีกครั้ง');
    return;
  }
  const group = readGroup();
  if (!group) {
    alert('ยังไม่ได้อยู่ในหน้ากลุ่ม\nเปิดหน้าแรกของกลุ่ม (ที่อยู่ขึ้นต้นด้วย facebook.com/groups/) แล้วกดอีกครั้ง');
    return;
  }

  document.getElementById('fbgm-panel')?.remove();
  const state = { running: false, stop: false };
  window.__fbgm = state;

  const panel = new Panel(group.name, loadPrefs());
  panel.render({ kind: 'setup' });
  let bridge: Bridge | null = null;
  let lastExport = '';

  panel.onClose = () => {
    state.stop = true;
    state.running = false;
    bridge?.dispose();
    panel.remove();
  };
  panel.onStop = () => {
    state.stop = true;
  };
  panel.onCopy = async () => {
    const ok = await copyText(lastExport);
    panel.render({
      kind: 'done',
      title: ok ? 'คัดลอกแล้ว' : 'คัดลอกไม่สำเร็จ',
      body: ok ? 'เปิดหน้ารับข้อมูลแล้ววางในช่อง (Ctrl+V หรือ ⌘+V)' : 'ลองกดคัดลอกอีกครั้ง',
      fallback: true,
      receiveUrl: bridge?.receiveUrl(true),
    });
  };

  let handoffUrl = '';
  panel.onHandoff = () => {
    // เปิดแท็บใหม่ในขณะที่ผู้ใช้คลิก (เบราว์เซอร์อนุญาต) พร้อมข้อมูลทั้งรอบในลิงก์
    const w = window.open(handoffUrl, '_blank');
    panel.render(
      w
        ? { kind: 'done', title: 'ส่งเข้าเว็บแล้ว', body: 'ดูสินค้าได้ที่แท็บที่เพิ่งเปิด' }
        : { kind: 'done', title: 'เบราว์เซอร์บล็อกแท็บใหม่', body: 'อนุญาตป๊อปอัปสำหรับ facebook.com หรือคัดลอกข้อมูลไปวางแทน', fallback: true, receiveUrl: bridge?.receiveUrl(true) },
    );
  };

  panel.onStart = (prefs) => {
    savePrefs(prefs);
    state.running = true;
    state.stop = false;
    bridge = new Bridge(appUrl, appOrigin, group, BOOKMARKLET_VERSION);
    // ส่งตรงไม่ได้ในครั้งก่อน (Facebook ตัดการเชื่อมต่อหน้าต่าง) → ไม่ต้องเปิดหน้าต่างรอ ส่งผ่านแท็บใหม่ตอนจบ
    const tryDirect = !directKnownToFail();
    // ต้องเปิดหน้าต่างทันทีในขณะที่ผู้ใช้คลิก
    if (tryDirect) bridge.openWindow();
    void run(prefs, bridge, tryDirect);
  };

  async function run(prefs: Prefs, b: Bridge, tryDirect: boolean) {
    const hello = tryDirect
      ? (panel.render({ kind: 'connecting' }), await b.hello())
      : { ok: false, knownIds: new Set<string>(), storeAuthorName: false, minBookmarkletVersion: 0 };
    if (tryDirect) rememberDirect(hello.ok);
    if (hello.ok && hello.minBookmarkletVersion > BOOKMARKLET_VERSION) {
      state.running = false;
      panel.render({
        kind: 'error',
        title: 'ปุ่มนี้เป็นเวอร์ชันเก่า',
        body: 'ลบบุ๊กมาร์กเดิม แล้วลากปุ่มใหม่จากหน้าติดตั้ง',
        link: { href: `${appUrl}#/setup`, label: 'ไปหน้าติดตั้ง' },
      });
      return;
    }

    let stopReason: StopReason = 'error';
    let scanned = 0;
    let collected = 0;
    try {
      const res = await collect(
        {
          groupId: group!.id,
          stopMode: prefs.stopMode,
          maxPosts: prefs.maxPosts,
          maxAgeDays: prefs.maxAgeDays,
          delayMs: test?.delayMs ?? DEFAULT_SETTINGS.scrollDelayMs,
          // post id ที่เว็บแอปมี + ที่ปุ่มนี้เคยส่ง (ใช้ได้แม้ส่งตรงไม่ได้)
          knownIds: new Set([...hello.knownIds, ...loadSentIds(group!.id)]),
          withAuthor: hello.storeAuthorName,
        },
        {
          onBatch: (posts) => b.send(posts),
          onProgress: (p) => {
            collected = p.collected;
            if (!state.stop) panel.render({ kind: 'running', collected: p.collected, scanned: p.scanned, oldest: p.oldestTimeText, direct: b.direct && !b.windowClosed });
          },
          shouldStop: () => state.stop,
        },
      );
      stopReason = res.stopReason;
      scanned = res.scanned;
    } catch (e) {
      console.error('[ดึงสินค้า]', e);
    }
    state.running = false;
    saveSentIds(group!.id, b.all.map((p) => p.postId));

    const delivered = await b.done(stopReason, scanned);
    if (delivered) {
      panel.render({ kind: 'done', title: `ส่งแล้ว ${collected} โพสต์`, body: `หยุดเพราะ${STOP_TEXT[stopReason]} ดูผลได้ที่หน้าต่างรับข้อมูล` });
      return;
    }
    if (collected === 0) {
      panel.render({
        kind: 'error',
        title: 'ไม่พบโพสต์',
        body: 'อ่านโพสต์จากหน้านี้ไม่ได้ ลองเลื่อนลงเล็กน้อยให้โพสต์แรกแสดงแล้วกดใหม่ ถ้ายังไม่ได้ Facebook อาจเปลี่ยนหน้าตา',
      });
      return;
    }

    const payload = b.exportPayload(stopReason, scanned);
    lastExport = JSON.stringify(payload);
    let encoded = '';
    try {
      encoded = await encodePayload(payload);
    } catch (e) {
      console.error('[ดึงสินค้า] encode', e);
    }
    handoffUrl = encoded ? b.handoffUrl(encoded) : '';
    const fitsUrl = !!handoffUrl && handoffUrl.length < MAX_URL_PAYLOAD;

    // หน้าต่างที่เปิดไว้ยังเข้าถึงได้ (แค่คุยกันไม่ได้) → พาไปหน้ารับข้อมูลพร้อมข้อมูลเลย ไม่ต้องกดอะไร
    if (fitsUrl && b.navigate(handoffUrl)) {
      panel.render({ kind: 'done', title: `ส่งแล้ว ${collected} โพสต์`, body: `หยุดเพราะ${STOP_TEXT[stopReason]} ดูผลได้ที่หน้าต่างรับข้อมูล` });
      return;
    }
    if (fitsUrl) {
      panel.render({ kind: 'handoff', collected });
      return;
    }
    panel.render({
      kind: 'done',
      title: `เก็บได้ ${collected} โพสต์`,
      body: 'ข้อมูลมากเกินกว่าจะส่งผ่านลิงก์ กดคัดลอกข้อมูลแล้วนำไปวาง',
      fallback: true,
      receiveUrl: b.receiveUrl(true),
    });
  }
}

main();
