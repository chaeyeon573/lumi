/**
 * 모바일 UI 키트 (Pastel Breeze) — 웹 src/components/ui 와 같은 이름·역할.
 * 스타일은 twrnc: style={tw`...`}. 색 토큰은 tailwind.config.js.
 */
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, MessageCircle, GraduationCap, ChevronDown, ChevronLeft, User as UserIcon, X, Search, MapPin, BadgeCheck } from 'lucide-react-native';
import { schoolBadge, isVerified } from '@core/lib/network';
import { t, lang, setLang } from '@core/i18n';
import { getPlatform } from '@core/platform';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from './tw';
import { useViewer } from './viewer';
import { nav, back } from './nav';

export const C = { primary: '#0F2B48', soft: '#D2E4FF', accent: '#A3D5FF', accentSoft: '#BFF4FF', surface2: '#F3F4ED', line: '#E6E8E1', ink: '#1A1C18', ink2: '#43474D', ink3: '#74777E', verify: '#2E6388', danger: '#BA1A1A', mint: '#2E7D5B', mintSoft: '#DDF3E6', gold: '#B8860B', goldSoft: '#FFF1C9',
  /** 팔레트 교체를 한 곳에서 하기 위한 보조 토큰 — 새 화면은 hex 대신 이것들을 쓴다 */
  bg: '#FFFFFF', onPrimary: '#FFFFFF', goldInk: '#B57A0E', goldLine: '#E8D28A', skySoft: '#F4F9FF', inputLine: '#B1E5FF',
  glass: 'rgba(255,255,255,0.88)', glassSoft: 'rgba(255,255,255,0.85)', glassDim: 'rgba(255,255,255,0.4)', onDarkBtn: 'rgba(255,255,255,0.15)', scrim: 'rgba(0,0,0,0.35)' };
export const img = (path?: string) => (path ? (getPlatform().asset(path) as number) : undefined);
const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;

/* ---------- Avatar ---------- */
export function Avatar({ emoji, hue, url, size = 44, style }: { emoji: string; hue: number; url?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  if (url) return <Image source={img(url)} style={[{ width: size, height: size, borderRadius: size / 2 }, style as StyleProp<ImageStyle>]} contentFit="cover" />;
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: hsl(hue, 80, 82), alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.6 }}>{emoji}</Text>
    </View>
  );
}
/** 게시물·활동 커버 (사진 또는 색 배경 + 이모지) */
export function Cover({ emoji, hue, url, size = 56, radius = 16, style }: { emoji: string; hue: number; url?: string; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  if (url) return <Image source={img(url)} style={[{ width: size, height: size, borderRadius: radius }, style as StyleProp<ImageStyle>]} contentFit="cover" />;
  return <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: hsl(hue, 70, 85), alignItems: 'center', justifyContent: 'center' }, style]}><Text style={{ fontSize: size * 0.4 }}>{emoji}</Text></View>;
}

/* ---------- Header / Screen ---------- */
/** 루트 탭 공통 헤더 — 워드마크 + 학교 알약("연세대학교 ✓") + (검색) · 알림 · 메시지(DM) · 프로필 (웹 AppHeader) */
export function AppHeader({ right, people, search }: { right?: ReactNode; people?: boolean; search?: boolean }) {
  const v = useViewer();
  const [langOpen, setLangOpen] = useState(false);
  const notifications = useAppStore((s) => s.notifications);
  const rooms = useAppStore((s) => s.chatRooms);
  const unreadBell = notifications.some((n) => n.userId === v.me.id && !n.read);
  const unreadChat = rooms.some((r) => r.memberIds.includes(v.me.id) && r.messages.some((m) => m.senderId !== v.me.id && new Date(m.createdAt) > new Date(r.lastReadAt[v.me.id] ?? 0)));
  const hasSchool = v.me.affiliation.type === 'university';
  const full = hasSchool ? (v.me.affiliation as { schoolName: string }).schoolName : '';
  const school = hasSchool ? schoolBadge(v.me, lang) : t('학교 선택');
  const verified = hasSchool && isVerified(v.me);
  return (
    <View style={tw`h-16 pl-4 pr-2 flex-row items-center`}>
      <Text style={tw`text-[21px] font-extrabold text-brand tracking-tight`}>AroundU</Text>
      <Pressable onPress={() => setLangOpen(true)} style={tw`ml-1.5 h-8 pl-2 pr-2 rounded-full bg-accent-soft border border-accent flex-row items-center max-w-[112px] shrink`}>
        {people ? <MapPin size={13} color={C.primary} /> : <GraduationCap size={13} color={C.primary} />}
        <Text numberOfLines={1} style={tw`mx-1 text-[12px] font-bold text-primary shrink`}>{school}</Text>
        {verified ? <BadgeCheck size={13} color={C.verify} /> : <ChevronDown size={13} color={C.primary} />}
      </Pressable>
      <View style={tw`flex-1`} />
      {right}
      {search || people ? <IconBtn onPress={() => nav('/search?tab=people')}><Search size={21} color={C.ink2} /></IconBtn> : null}
      {people ? null : <IconBtn onPress={() => nav('/notifications')} badge={unreadBell}><Bell size={21} color={C.ink2} /></IconBtn>}
      <IconBtn onPress={() => nav('/chats')} badge={unreadChat}><MessageCircle size={21} color={C.ink2} /></IconBtn>
      <Pressable onPress={() => nav('/profile')} style={tw`ml-0.5`}>
        {v.me.avatar.url ? <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={30} /> : <View style={tw`h-[30px] w-[30px] rounded-full bg-primary items-center justify-center`}><UserIcon size={16} color="#fff" /></View>}
      </Pressable>
      <LangSheet open={langOpen} onClose={() => setLangOpen(false)} school={full} />
    </View>
  );
}

/** 학교 알약 → 한국어 / English 전환 (한국 대학 버전 · 미국 대학 버전) */
export function LangSheet({ open, onClose, school }: { open: boolean; onClose: () => void; school: string }) {
  const pick = (l: 'ko' | 'en') => { onClose(); if (l !== lang) setLang(l); };
  return (
    <BottomSheet open={open} onClose={onClose} title={school}>
      <Text style={tw`text-[12px] font-bold text-ink-3 mb-2`}>{lang === 'en' ? 'Language · Campus version' : '언어 · 캠퍼스 버전'}</Text>
      {([['ko', '한국어 · 한국 대학'], ['en', 'English · US campus']] as ['ko' | 'en', string][]).map(([l, label]) => (
        <Pressable key={l} onPress={() => pick(l)} style={tw`h-12 px-4 mb-2 rounded-full flex-row items-center ${lang === l ? 'bg-primary' : 'bg-surface-2'}`}>
          <Text style={tw`text-[14px] font-semibold ${lang === l ? 'text-white' : 'text-primary'}`}>{label}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => { onClose(); nav('/settings'); }} style={tw`h-11 items-center justify-center`}><Text style={tw`text-[13px] font-semibold text-verify`}>{t('설정')}</Text></Pressable>
    </BottomSheet>
  );
}
export function IconBtn({ onPress, children, badge }: { onPress: () => void; children: ReactNode; badge?: boolean }) {
  return <Pressable onPress={onPress} hitSlop={4} style={tw`h-10 w-[38px] rounded-full items-center justify-center`}>{children}{badge ? <View style={tw`absolute top-2 right-2 h-2 w-2 rounded-full bg-danger`} /> : null}</Pressable>;
}

/** 탭 화면 래퍼: SafeArea + 흰 배경 (+ 옵션 스크롤) */
export function TabScreen({ children, scroll = true, header }: { children: ReactNode; scroll?: boolean; header?: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-white`}>
      {header ?? <AppHeader />}
      {scroll ? <ScrollView contentContainerStyle={tw`px-4 pb-8`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={tw`flex-1`}>{children}</View>}
    </SafeAreaView>
  );
}
/** 상세 화면 래퍼: 뒤로가기 + 제목 + 오른쪽 액션 */
export function Screen({ title, right, children, scroll = true, footer, sub }: { title?: string; right?: ReactNode; children: ReactNode; scroll?: boolean; footer?: ReactNode; sub?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-white`}>
      <View style={tw`h-14 pl-1 pr-3 flex-row items-center`}>
        <IconBtn onPress={back}><ChevronLeft size={26} color={C.primary} /></IconBtn>
        <Text numberOfLines={1} style={tw`flex-1 text-[17px] font-bold text-primary ml-1`}>{title ?? ''}</Text>
        {right}
      </View>
      {sub}
      {scroll ? <ScrollView contentContainerStyle={tw`px-4 pb-10`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={tw`flex-1`}>{children}</View>}
      {footer && <View style={[tw`px-4 pt-2 bg-white border-t border-line`, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>}
    </SafeAreaView>
  );
}

/* ---------- Typography / layout ---------- */
export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <Text style={[tw`text-[24px] font-bold text-primary`, style as never]}>{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <Text style={[tw`text-[20px] font-bold text-primary`, style as never]}>{children}</Text>;
export const Muted = ({ children, size = 13, style }: { children: ReactNode; size?: number; style?: StyleProp<ViewStyle> }) => <Text style={[{ fontSize: size, color: C.ink3 }, style as never]}>{children}</Text>;
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[tw`rounded-[24px] bg-white border border-line p-5`, style]}>{children}</View>;
export const Divider = () => <View style={tw`h-px bg-line`} />;

/* ---------- Chips / Tags ---------- */
export function Chip({ active, onPress, children, size = 'md' }: { active?: boolean; onPress?: () => void; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <Pressable onPress={onPress} style={tw`${size === 'sm' ? 'h-8 px-3' : 'h-9 px-4'} rounded-full items-center justify-center mr-2 ${active ? 'bg-primary' : 'bg-surface-2'}`}>
      <Text style={tw`${size === 'sm' ? 'text-[12px]' : 'text-[13px]'} font-semibold ${active ? 'text-white' : 'text-primary'}`}>{children}</Text>
    </Pressable>
  );
}
export function ChipRow({ children }: { children: ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4`} contentContainerStyle={tw`px-4 py-1`}>{children}</ScrollView>;
}
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'mint' | 'gold' | 'danger' }) {
  const bg = { neutral: 'bg-surface-2', primary: 'bg-accent-soft', mint: 'bg-mint-soft', gold: 'bg-gold-soft', danger: 'bg-danger-soft' }[tone];
  const fg = { neutral: 'text-ink-2', primary: 'text-primary', mint: 'text-mint', gold: 'text-gold', danger: 'text-danger' }[tone];
  return <View style={tw`h-6 px-2.5 rounded-full ${bg} items-center justify-center`}><Text style={tw`text-[11px] font-semibold ${fg}`}>{children}</Text></View>;
}

/* ---------- Buttons ---------- */
export function Button({ children, onPress, variant = 'primary', size = 'md', full, loading, disabled, icon, style }: { children: ReactNode; onPress?: () => void; variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'danger'; size?: 'sm' | 'md' | 'lg'; full?: boolean; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const h = size === 'sm' ? 'h-9 px-4' : size === 'lg' ? 'h-13 px-6' : 'h-11 px-5';
  const bg = { primary: 'bg-primary', secondary: 'bg-primary-soft', outline: 'bg-white border border-line', accent: 'bg-accent', danger: 'bg-danger-soft' }[variant];
  const fg = { primary: '#fff', secondary: C.primary, outline: C.ink2, accent: C.primary, danger: C.danger }[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[tw`${h} rounded-full flex-row items-center justify-center ${bg} ${full ? 'flex-1' : ''} ${disabled ? 'opacity-50' : ''}`, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon ? <View style={tw`mr-1.5`}>{icon}</View> : null}<Text numberOfLines={1} style={{ color: fg, fontSize: size === 'sm' ? 13 : 14, fontWeight: '600', flexShrink: 1 }}>{children}</Text></>}
    </Pressable>
  );
}

/* ---------- Rows ---------- */
/** 알약형 행: 아바타 · 제목/부제 · 오른쪽 액션 */
export function PillRow({ avatar, title, sub, action, onPress }: { avatar: ReactNode; title: string; sub?: string; action?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={tw`rounded-full border border-line bg-white pl-2.5 pr-2.5 py-2 flex-row items-center mb-3`}>
      {avatar}
      <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary`}>{title}</Text>{sub ? <Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{sub}</Text> : null}</View>
      {action}
    </Pressable>
  );
}
/** 구분선 목록 행 */
export function ListRow({ left, title, badge, sub, right, onPress, last }: { left?: ReactNode; title: string; badge?: ReactNode; sub?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={tw`flex-row items-center py-3.5 ${last ? '' : 'border-b border-line'}`}>
      {left}
      <View style={tw`flex-1 min-w-0 ${left ? 'ml-3' : ''}`}>
        <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary shrink`}>{title}</Text>{badge ? <View style={tw`ml-2`}>{badge}</View> : null}</View>
        {sub ? <Text numberOfLines={1} style={tw`text-[13px] text-ink-3 mt-0.5`}>{sub}</Text> : null}
      </View>
      {right ? <View style={tw`ml-2`}>{right}</View> : null}
    </Pressable>
  );
}
export function IconCircle({ children, size = 40, bg = C.surface2 }: { children: ReactNode; size?: number; bg?: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

/* ---------- Tabs ---------- */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <View style={tw`flex-row bg-surface-2 rounded-full p-1`}>
      {options.map(([k, l]) => <Pressable key={k} onPress={() => onChange(k)} style={tw`flex-1 h-9 rounded-full items-center justify-center ${value === k ? 'bg-white' : ''}`}><Text style={tw`text-[13px] font-semibold ${value === k ? 'text-primary' : 'text-ink-3'}`}>{l}</Text></Pressable>)}
    </View>
  );
}
export function UnderlineTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <View style={tw`px-4 flex-row border-b border-line`}>
      {options.map(([k, l]) => <Pressable key={k} onPress={() => onChange(k)} style={[tw`h-11 mr-7 justify-center border-b-[3px]`, { borderBottomColor: value === k ? C.accent : 'transparent', marginBottom: -1 }]}><Text style={tw`text-[16px] font-semibold ${value === k ? 'text-primary' : 'text-ink-2'}`}>{l}</Text></Pressable>)}
    </View>
  );
}

/* ---------- Sheet / states ---------- */
export function BottomSheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={[tw`flex-1`, { backgroundColor: 'rgba(15,43,72,0.35)' }]} />
      <View style={[tw`bg-white rounded-t-[28px] px-5 pt-3`, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: tall ? '88%' : '70%' }]}>
        <View style={tw`self-center h-1 w-10 rounded-full bg-line mb-3`} />
        <View style={tw`flex-row items-center mb-3`}><Text style={tw`flex-1 text-[18px] font-bold text-primary`}>{title ?? ''}</Text><IconBtn onPress={onClose}><X size={20} color={C.ink2} /></IconBtn></View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
}
export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <View style={tw`items-center py-10`}><Text style={tw`text-[15px] font-semibold text-ink-2 text-center`}>{title}</Text>{description ? <Text style={tw`text-[13px] text-ink-3 mt-1 text-center`}>{description}</Text> : null}{action ? <View style={tw`mt-4`}>{action}</View> : null}</View>;
}
export function Loading() { return <View style={tw`py-16 items-center`}><ActivityIndicator color={C.primary} /></View>; }

/* ---------- Form ---------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <View style={tw`mb-4`}><Text style={tw`text-[12px] font-bold text-ink-3 mb-1.5`}>{label}</Text>{children}{hint ? <Text style={tw`text-[11px] text-ink-3 mt-1`}>{hint}</Text> : null}</View>;
}
export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.ink3} {...props} style={[tw`h-12 px-4 rounded-2xl border border-[#B1E5FF] bg-white text-[15px] text-ink`, props.style]} />;
}
export function Textarea(props: TextInputProps) {
  return <TextInput multiline textAlignVertical="top" placeholderTextColor={C.ink3} {...props} style={[tw`min-h-[96px] px-4 py-3 rounded-2xl border border-[#B1E5FF] bg-white text-[15px] text-ink`, props.style]} />;
}
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={tw`flex-row items-center py-3`}>
      <View style={tw`flex-1 mr-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{label}</Text>{description ? <Text style={tw`text-[12px] text-ink-3`}>{description}</Text> : null}</View>
      <View style={tw`h-7 w-12 rounded-full p-0.5 ${checked ? 'bg-primary' : 'bg-line'}`}><View style={[tw`h-6 w-6 rounded-full bg-white`, { marginLeft: checked ? 20 : 0 }]} /></View>
    </Pressable>
  );
}
/** 선택 알약 목록 (단일/다중) */
export function Choice<T extends string>({ options, value, onChange, multi }: { options: [T, string][]; value: T[] | T; onChange: (v: T) => void; multi?: boolean }) {
  const sel = Array.isArray(value) ? value : [value];
  return <View style={tw`flex-row flex-wrap`}>{options.map(([k, l]) => <Chip key={k} size="sm" active={sel.includes(k)} onPress={() => onChange(k)}>{l}</Chip>)}{multi ? null : null}</View>;
}

/* ---------- Toast ---------- */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;
  const bg = toast.tone === 'error' ? C.danger : toast.tone === 'success' ? C.mint : C.ink;
  return <View pointerEvents="none" style={[tw`absolute left-6 right-6 items-center`, { bottom: 96 }]}><View style={[tw`px-4 py-2.5 rounded-xl`, { backgroundColor: bg }]}><Text style={tw`text-white text-[13px] font-semibold text-center`}>{toast.text}</Text></View></View>;
}

/** 간단한 확인 시트 */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; onOk: () => void } | null>(null);
  const el = (
    <BottomSheet open={!!state} onClose={() => setState(null)} title={state?.title}>
      <View style={tw`flex-row mt-2`}><Button full variant="outline" onPress={() => setState(null)}>{t('취소')}</Button><View style={tw`w-2`} /><Button full onPress={() => { state?.onOk(); setState(null); }}>{t('확인')}</Button></View>
    </BottomSheet>
  );
  return { confirm: (title: string, onOk: () => void) => setState({ title, onOk }), el };
}

/** 아직 옮기지 않은 화면 자리 — 뒤로가기가 있어서 내비게이션이 끊기지 않는다 */
export function Soon({ title }: { title: string }) {
  return <Screen title={title}><Empty title={title} description="Coming soon" /></Screen>;
}
