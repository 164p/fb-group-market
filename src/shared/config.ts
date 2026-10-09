/** URL สาธารณะของเว็บแอป — bookmarklet ใช้เปิดหน้า #/receive และตรวจ origin */
export const APP_URL = 'https://164p.github.io/fb-group-market/';
export const APP_ORIGIN = new URL(APP_URL).origin;

/** origin ของ Facebook ที่ยอมรับข้อความจาก bookmarklet */
export const FACEBOOK_ORIGINS = ['https://www.facebook.com', 'https://web.facebook.com'] as const;

/** เพิ่มเลขนี้ทุกครั้งที่ bookmarklet เปลี่ยนแบบที่ต้องให้ผู้ใช้ลากปุ่มใหม่ */
export const BOOKMARKLET_VERSION = 1;

/** เพิ่มเลขนี้เมื่อปรับ logic ของ parser เพื่อให้ parse ข้อมูลเก่าใหม่ได้ */
export const PARSER_VERSION = 1;

export const DEFAULT_SETTINGS = {
  stopMode: 'maxPosts',
  maxPosts: 100,
  maxAgeDays: 7,
  scrollDelayMs: [1500, 3000],
  storeAuthorName: false,
  acceptedTermsAt: null,
} as const;

/** เพดานความปลอดภัยต่อรอบดึง เพื่อลดความเสี่ยงบัญชีถูกจำกัด */
export const MAX_POSTS_PER_RUN = 500;
