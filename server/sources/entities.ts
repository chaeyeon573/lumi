/**
 * HTML 숫자 문자 코드(&#8211; &#x2019;)를 글자로 — 범위 밖 숫자(&#551899002633743; 같은 깨진 값)는 오류 대신 버린다.
 * String.fromCodePoint 는 0x10FFFF 를 넘으면 RangeError 를 던져 가져오기 전체가 멈췄다 (2026-10-31 버클리 행사 가져오기).
 */
export function charFromCode(n: number): string {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
}
/** &#123; / &#x7B; 를 모두 글자로 (nbsp(160)는 공백) */
export const decodeNumericEntities = (s: string) => s.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v: string) => (v === '160' ? ' ' : charFromCode(v[0] === 'x' || v[0] === 'X' ? parseInt(v.slice(1), 16) : Number(v))));

/** 이름 있는 글자 코드(&apos; &amp; &quot; &lt; &gt; &nbsp;)와 숫자 코드를 푼다 — 두 번 감싼 것(&amp;apos;)도.
 *  행사 제목 321개가 "Men&apos;s Water Polo" 처럼 그대로 나가고 있었다 (CampusGroups RSS 등, 2026-11-07) */
const NAMED: Record<string, string> = { lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026' };

/**
 * UTF-8 글자를 Latin-1/Windows-1252 로 잘못 읽어 깨진 글자("EspaÃƒÂ±ol", "â€œ") 되살리기 — 깨진 덩어리만, 두세 번 겹친 것도.
 * 되살린 결과가 올바른 UTF-8 이 아니면 그대로 둔다(지어내지 않는다). 이미 잃어버린 '�' 는 못 고친다. (동아리 소개 13곳, 2026-11-08)
 */
const CP1252: Record<string, number> = { '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8a, '\u2039': 0x8b, '\u0152': 0x8c, '\u017d': 0x8e, '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97, '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203a': 0x9b, '\u0153': 0x9c, '\u017e': 0x9e, '\u0178': 0x9f };
const HI = '[\\u0080-\\u00bf\\u20ac\\u201a\\u0192\\u201e\\u2026\\u2020\\u2021\\u02c6\\u2030\\u0160\\u2039\\u0152\\u017d\\u2018\\u2019\\u201c\\u201d\\u2022\\u2013\\u2014\\u02dc\\u2122\\u0161\\u203a\\u0153\\u017e\\u0178]';
const RUN = new RegExp(`(?:[\\u00c2-\\u00f4]${HI}+)+`, 'g');
export function fixMojibake(s: string): string {
  if (!s || !/[\u00c2-\u00f4]/.test(s)) return s;
  let t = s;
  for (let pass = 0; pass < 3; pass++) {
    const next = t.replace(RUN, (run) => {
      const bytes: number[] = [];
      for (const ch of run) { const c = ch.charCodeAt(0); const b = c < 256 ? c : CP1252[ch]; if (b === undefined) return run; bytes.push(b); }
      try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch { return run; }
    });
    if (next === t) break; t = next;
  }
  return t;
}

export function decodeHtmlText(s: string): string {
  if (!s || !/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(s)) return s;
  let t = s;
  for (let i = 0; i < 2 && /&(#\d+|#x[0-9a-f]+|apos|quot|lt|gt|nbsp|amp|[lr][sd]quo|[mn]dash|hellip);/i.test(t); i++) {
    t = decodeNumericEntities(t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/&(lsquo|rsquo|ldquo|rdquo|mdash|ndash|hellip);/g, (_, n: string) => NAMED[n])).replace(/&amp;/g, '&');
  }
  return t;
}
