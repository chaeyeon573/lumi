/**
 * 유학생(F-1) 지원 가능 여부 — 공고 본문에 회사가 적어 둔 문장만 읽는다(짐작하지 않는다). 아무 말도 없으면 undefined.
 *  - citizens   : “U.S. citizenship required”, 보안 인가(clearance), “must be a U.S. person”
 *  - intl_ok    : CPT/OPT 언급, “international students welcome/eligible”, “visa sponsorship available / will sponsor”
 *  - no_sponsor : “not able to sponsor”, “without (the need for) sponsorship”
 * 시민권 요구가 가장 강하다. CPT/OPT 를 받는다고 적고 같은 글에 ‘H-1B 스폰서는 없다’고 쓴 공고가 많아서, 유학생 인턴에겐 intl_ok 가 더 맞다.
 */
import type { Opportunity } from '@core/types';
import { decodeNumericEntities } from './entities';

export const plainText = (html = '') => decodeNumericEntities(html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ');

// 시민권 — “must be / required / only” 처럼 요구하는 문장만. 모든 공고에 붙는 수출 통제 안내문(“Export Control Regulations… may require”)은 아니다
const CITIZENS = /\bU\.?\s?S\.?\s+citizen(ship)?\s+(is\s+|are\s+)?(required|only)|\bmust\s+(be|have|hold)\s+(a\s+)?U\.?\s?S\.?\s+citizen|\brequires?\s+U\.?\s?S\.?\s+citizenship|\b(active|current|ability to obtain( and maintain)?|able to obtain( and maintain)?|eligib\w+ (for|to obtain))\s+(a\s+)?(U\.?\s?S\.?\s+)?(government\s+|federal\s+|DoD\s+|secret\s+|top\s+secret\s+)?security\s+clearance|\bmust\s+be\s+(a\s+)?U\.?\s?S\.?\s+person|\bU\.?\s?S\.?\s+persons?\s+only\b/i;
// 유학생 가능 — 받는다고 분명히 쓴 문장
const INTL_OK = /international students\s+(are\s+)?(welcome|eligible|encouraged)|\b(accept|welcome|support)\w*\s+(students\s+)?(eligible\s+for\s+|on\s+|with\s+)?(F-1\s+)?(CPT|OPT|curricular practical training)|\beligible\s+for\s+(CPT|OPT)\b|\b(CPT|OPT)\s+(is\s+)?(accepted|eligible|welcome)|visa sponsorship (is\s+)?available|\bwe\s+(will\s+)?(also\s+)?sponsor\b|\bsponsorship\s+(is\s+)?available/i;
const NO_SPONSOR = /\b(not|unable to|cannot|can\s?not|will not|won'?t|do not|does not|don'?t|doesn'?t|no)\s+(be\s+able\s+to\s+)?(provide\s+|offer\s+|support\s+)?(visa\s+|immigration\s+|employment\s+)?(or\s+immigration\s+)?sponsor(ship)?|\bwithout\s+(the\s+need\s+for\s+|requiring\s+)?(current\s+or\s+future\s+|future\s+)?(visa\s+|employer\s+|employment\s+)?sponsorship/i;
// CPT/OPT 가 그냥 나오기만 한 것 — ‘스폰서 없음(…STEM OPT…)’ 목록 안일 수 있어서, 스폰서 없음 문장이 없을 때만 유학생 가능으로 본다
const CPT_OPT = /\b(CPT|OPT)\b|curricular practical training|optional practical training/i;

export function workAuthOf(text: string): Opportunity['workAuth'] {
  if (!text) return undefined;
  if (CITIZENS.test(text)) return 'citizens';
  if (INTL_OK.test(text)) return 'intl_ok';
  if (NO_SPONSOR.test(text)) return 'no_sponsor';
  if (CPT_OPT.test(text)) return 'intl_ok';
  return undefined;
}
