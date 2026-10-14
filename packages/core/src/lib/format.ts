import { t, lang, locale } from '@core/i18n';

/** 그 기기 달력의 날짜 — toISOString()(UTC)을 쓰면 버클리에서 오후 5시부터 '오늘'이 내일이 된다. 서버(UTC)에서는 같다 */
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => localISO(new Date());

export function addDaysISO(days: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localISO(d);
}

export function isThisWeek(dateISO: string) {
  const today = new Date(todayISO());
  const target = new Date(dateISO);
  const diff = (target.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff < 7;
}

export function formatDate(dateISO: string) {
  const today = todayISO();
  if (dateISO === today) return t('오늘');
  if (dateISO === addDaysISO(1)) return t('내일');
  // 'YYYY-MM-DD' 만 주면 UTC 자정으로 읽혀 미국에서는 하루 전 요일·날짜가 나온다 — 그날 정오로 읽는다
  const d = new Date(`${dateISO.slice(0, 10)}T12:00:00`);
  if (lang === 'en') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  if (lang === 'en') return `${hour}${m === 0 ? '' : `:${String(m).padStart(2, '0')}`} ${h < 12 ? 'AM' : 'PM'}`;
  const period = h < 12 ? '오전' : '오후';
  return m === 0 ? `${period} ${hour}시` : `${period} ${hour}:${String(m).padStart(2, '0')}`;
}

export function formatDateTime(dateISO: string, hhmm: string) {
  return `${formatDate(dateISO)} ${formatTime(hhmm)}`;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('방금');
  if (min < 60) return `${min}${t('분 전')}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${t('시간 전')}`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}${t('일 전')}`;
  return new Date(iso).toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
}

export function isoMinutesAgo(min: number) {
  return new Date(Date.now() - min * 60000).toISOString();
}

export function isoHoursAgo(h: number) {
  return isoMinutesAgo(h * 60);
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function pairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

export function formatFee(fee: number) {
  return fee === 0 ? t('무료') : lang === 'en' ? `$${fee.toLocaleString()}` : `${fee.toLocaleString()}원`;
}
