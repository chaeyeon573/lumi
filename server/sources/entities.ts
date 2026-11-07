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
export function decodeHtmlText(s: string): string {
  if (!s || !/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(s)) return s;
  let t = s;
  for (let i = 0; i < 2 && /&(#\d+|#x[0-9a-f]+|apos|quot|lt|gt|nbsp|amp);/i.test(t); i++) {
    t = decodeNumericEntities(t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')).replace(/&amp;/g, '&');
  }
  return t;
}
