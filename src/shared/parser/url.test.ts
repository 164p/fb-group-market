import { describe, expect, it } from 'vitest';
import { chronologicalGroupUrl, parseGroupUrl } from './url';

const id = (s: string) => {
  const r = parseGroupUrl(s);
  return r.ok ? r.id : `ERR:${r.reason}`;
};

describe('parseGroupUrl — accepted', () => {
  it.each([
    ['https://www.facebook.com/groups/123456789', '123456789'],
    ['https://www.facebook.com/groups/123456789/', '123456789'],
    ['facebook.com/groups/123456789', '123456789'],
    ['www.facebook.com/groups/123456789?ref=share&mibextid=abc', '123456789'],
    ['https://m.facebook.com/groups/123456789/', '123456789'],
    ['https://web.facebook.com/groups/123456789/?_rdc=1&_rdr', '123456789'],
    ['https://mbasic.facebook.com/groups/123456789', '123456789'],
    ['https://fb.com/groups/123456789', '123456789'],
    ['https://www.facebook.com/groups/123456789/posts/987654321/', '123456789'],
    ['https://www.facebook.com/groups/123456789/permalink/987654321/', '123456789'],
    ['https://www.facebook.com/groups/SecondHandBKK', 'secondhandbkk'],
    ['https://www.facebook.com/groups/second.hand_bkk-2/about', 'second.hand_bkk-2'],
    ['https://www.facebook.com/groups/%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%AA%E0%B8%AD%E0%B8%87', 'ตลาดมือสอง'],
    ['https://www.facebook.com/groups/ตลาดมือสอง/', 'ตลาดมือสอง'],
    ['  https://www.facebook.com/groups/123456789  ', '123456789'],
    ['123456789012', '123456789012'],
    ['https://www.facebook.com/permalink.php?story_fbid=1&group_id=555666777', '555666777'],
  ])('%s', (input, expected) => {
    expect(id(input)).toBe(expected);
  });

  it('returns the canonical url', () => {
    const r = parseGroupUrl('m.facebook.com/groups/ABC.def/?ref=x');
    expect(r).toEqual({ ok: true, id: 'abc.def', url: 'https://www.facebook.com/groups/abc.def' });
  });

  it('treats differently-cased slugs as the same group', () => {
    expect(id('facebook.com/groups/MyGroup')).toBe(id('facebook.com/groups/mygroup'));
  });
});

describe('parseGroupUrl — rejected', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['https://www.google.com/groups/123', 'notFacebook'],
    ['https://facebook.com.evil.example/groups/123', 'notFacebook'],
    ['not a url at all', 'notFacebook'],
    ['https://www.facebook.com/share/g/1ABCdef23/', 'shareLink'],
    ['https://www.facebook.com/marketplace/item/123', 'notGroup'],
    ['https://www.facebook.com/someone.profile', 'notGroup'],
    ['https://www.facebook.com/groups/', 'missingId'],
    ['https://www.facebook.com/groups/feed/', 'missingId'],
    ['https://www.facebook.com/groups/discover', 'missingId'],
    ['1234', 'notFacebook'],
  ])('%j → %s', (input, reason) => {
    expect(id(input)).toBe(`ERR:${reason}`);
  });
});

describe('chronologicalGroupUrl', () => {
  it('adds the newest-first sort and encodes Thai slugs', () => {
    expect(chronologicalGroupUrl('123')).toBe('https://www.facebook.com/groups/123/?sorting_setting=CHRONOLOGICAL');
    expect(chronologicalGroupUrl('ตลาด')).toContain('/groups/%E0%B8%95');
  });
});
