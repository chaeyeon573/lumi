import { Coffee, BookOpen, Dumbbell, UtensilsCrossed, Sparkles, type LucideIcon } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, ActivityCategory } from '@core/types';
import type { Tone } from '@/components/ha';

const en = lang === 'en';

/**
 * 모임 종류 (PDF S037·S041·S049·S055 칩: Coffee · Study · Workout · Lunch) — 색·아이콘·활동 분류를 한 곳에서.
 * Hangout 은 칩에는 없고, 그 밖의 분류(클럽·공연·네트워킹 …)로 연 모임의 카드 모양.
 */
export interface MeetupKind { key: 'coffee' | 'study' | 'workout' | 'lunch' | 'hangout'; label: string; cat: ActivityCategory; cats: ActivityCategory[]; Icon: LucideIcon; tone: Tone }
export const KINDS: MeetupKind[] = [
  { key: 'coffee', label: en ? 'Coffee' : '커피', cat: 'coffee', cats: ['coffee'], Icon: Coffee, tone: 'peach' },
  { key: 'study', label: en ? 'Study' : '공부', cat: 'study', cats: ['study', 'seminar'], Icon: BookOpen, tone: 'ice' },
  { key: 'workout', label: en ? 'Workout' : '운동', cat: 'exercise', cats: ['exercise'], Icon: Dumbbell, tone: 'mint' },
  { key: 'lunch', label: en ? 'Lunch' : '점심', cat: 'meal', cats: ['meal'], Icon: UtensilsCrossed, tone: 'peach' },
  { key: 'hangout', label: en ? 'Hangout' : '같이 놀기', cat: 'etc', cats: ['etc', 'performance', 'club', 'networking', 'school_event', 'store_deal'], Icon: Sparkles, tone: 'rose' },
];
/** 칩 줄 — PDF 의 네 개 */
export const CHIP_KINDS = KINDS.slice(0, 4);
export const kindByKey = (k: string | null | undefined) => KINDS.find((x) => x.key === k);
export const kindOf = (a: Pick<Activity, 'category'>) => KINDS.find((k) => k.cats.includes(a.category)) ?? KINDS[4];
