import { Coffee, Utensils, BookOpen, Dumbbell, Music, Mic2, GraduationCap, FlaskConical, Handshake, Tag, Sparkles, Plane, CalendarDays, Briefcase, Trophy, Rocket, Users, type LucideIcon } from 'lucide-react';
import type { ActivityCategory, OpportunityType } from '@core/types';

/** 카테고리 아이콘 — 이모지 대신 단색 아이콘 */
export const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  coffee: Coffee, meal: Utensils, study: BookOpen, exercise: Dumbbell, club: Music, performance: Mic2, school_event: GraduationCap, seminar: FlaskConical, networking: Handshake, store_deal: Tag, etc: Sparkles,
};
export const OPP_ICON: Record<OpportunityType, LucideIcon> = {
  event: GraduationCap, club: Music, lab: FlaskConical, internship: Handshake, scholarship: GraduationCap, hackathon: Sparkles, startup: Handshake, activity: Coffee, exchange: Plane,
};
/** Harness A 공고 카드(ListingCard)의 사진 없는 칸 — 홈 타일과 같은 아이콘 (행사 = 달력, 기회 = 트로피 계열) */
export const LISTING_ICON: Record<OpportunityType, LucideIcon> = {
  event: CalendarDays, internship: Briefcase, lab: FlaskConical, scholarship: GraduationCap, hackathon: Trophy, startup: Rocket, exchange: Plane, club: Users, activity: Coffee,
};
export const listingIcon = (type: OpportunityType) => { const I = LISTING_ICON[type] ?? Sparkles; return <I size={30} strokeWidth={1.8} />; };
/** 카테고리별 부드러운 배경 (Wes Anderson 팔레트) */
export const CATEGORY_TINT: Record<ActivityCategory, string> = {
  coffee: '#FFD2B5', meal: '#F1A7A1', study: '#A7C6ED', exercise: '#C7D8B8', club: '#F1A7A1', performance: '#FBBE02', school_event: '#FFD2B5', seminar: '#A7C6ED', networking: '#FBBE02', store_deal: '#C7D8B8', etc: '#EADFCF',
};
export const OPP_TINT: Record<OpportunityType, string> = { event: '#FBBE02', club: '#F1A7A1', lab: '#A7C6ED', internship: '#C7D8B8', scholarship: '#FFD2B5', hackathon: '#A7C6ED', startup: '#FF6F61', activity: '#FFD2B5', exchange: '#A7C6ED' };
