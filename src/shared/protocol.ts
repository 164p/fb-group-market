// โปรโตคอลข้อความระหว่าง bookmarklet (บน facebook.com) กับเว็บแอป (หน้า #/receive)
import { FACEBOOK_ORIGINS } from './config';
import type { RawPost, StopReason } from './types';

export const PROTOCOL_VERSION = 1 as const;

export interface GroupInfo {
  id: string;
  name: string;
  url: string;
}

export type BridgeMessage =
  | { v: 1; type: 'HELLO'; sessionId: string; bookmarkletVersion: number; group: GroupInfo }
  | { v: 1; type: 'BATCH'; sessionId: string; seq: number; posts: RawPost[] }
  | { v: 1; type: 'DONE'; sessionId: string; stopReason: StopReason; scanned: number }
  /**
   * เว็บแอป → bookmarklet: ยืนยันรับชุดข้อมูล
   * seq 0 = ตอบ HELLO พร้อม post id ที่มีอยู่แล้ว (ใช้กับเงื่อนไข "เจอโพสต์ที่เคยดึงแล้ว") และการตั้งค่าที่เกี่ยวข้อง
   */
  | {
      v: 1;
      type: 'ACK';
      sessionId: string;
      seq: number;
      knownIds?: string[];
      storeAuthorName?: boolean;
      /** เว็บแอปต้องการ bookmarklet เวอร์ชันนี้ขึ้นไป */
      minBookmarkletVersion?: number;
    };

/** ช่องทางสำรอง: ข้อมูลทั้งรอบที่ผู้ใช้คัดลอกแล้ววางในหน้า #/receive */
export interface ExportPayload {
  v: 1;
  type: 'EXPORT';
  bookmarkletVersion: number;
  group: GroupInfo;
  stopReason: StopReason;
  scanned: number;
  posts: RawPost[];
}

export function isExportPayload(data: unknown): data is ExportPayload {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  return m.v === PROTOCOL_VERSION && m.type === 'EXPORT' && Array.isArray(m.posts) && !!m.group;
}

export type BridgeMessageType = BridgeMessage['type'];

/** ตรวจว่าข้อความมาจาก Facebook และมีรูปแบบถูกต้อง */
export function isTrustedFacebookOrigin(origin: string): boolean {
  return (FACEBOOK_ORIGINS as readonly string[]).includes(origin);
}

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  return (
    m.v === PROTOCOL_VERSION &&
    typeof m.sessionId === 'string' &&
    (m.type === 'HELLO' || m.type === 'BATCH' || m.type === 'DONE' || m.type === 'ACK')
  );
}
