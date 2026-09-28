/**
 * 모바일 UI 키트 (디자인 v3 — Timeleft 느낌) — Tamagui 로 만든 프리미티브. 웹 src/components/ui (shadcn/ui) 와 같은 이름·역할.
 * 색·반경·글자는 packages/core/src/theme/tokens.ts (Tamagui 테마 `$primary` · `$ink` … / `C` 객체 / tw 클래스 모두 같은 값).
 *
 * 규칙: 채워진 파랑 버튼은 화면당 하나(나머지는 secondary · outline · ghost). 이름·제목은 ink, 링크만 파랑.
 * 선택된 칩은 옅은 하늘 면 + 파랑 글자 + 파랑 선. 카드는 반경 20 + 1px 선 + 아주 옅은 그림자.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, type TextInputProps, type ViewStyle, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input as TInput, Sheet, Spinner, Switch, Text, TextArea, XStack, YStack, styled } from 'tamagui';
import { Bell, MessageCircle, GraduationCap, ChevronDown, ChevronLeft, User as UserIcon, X, Search, MapPin, BadgeCheck } from 'lucide-react-native';
import { schoolBadge, isVerified } from '@core/lib/network';
import { t, lang, setLang } from '@core/i18n';
import { getPlatform } from '@core/platform';
import { RADIUS, SHADOW, SPACE } from '@core/theme/tokens';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from './tw';
import { useViewer } from './viewer';
import { nav, back } from './nav';
import { C, alpha } from './theme';

export { C, usePalette, setPalette, PALETTE_IDS } from './theme';
export const img = (path?: string) => (path ? (getPlatform().asset(path) as number) : undefined);
const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;
/** tw`` 배열 · 객체 스타일을 Tamagui style 로 넘길 때 하나로 편다 */
const flat = (s: StyleProp<ViewStyle>) => (s ? (StyleSheet.flatten(s) as ViewStyle) : undefined);

/* ---------- Text ---------- */
/** 기본 글자 — Plus Jakarta Sans, 색은 ink */
export const T = styled(Text, { name: 'AText', fontFamily: '$body', color: '$ink', fontSize: 15 });

/* ---------- Avatar ---------- */
export function Avatar({ emoji, hue, url, size = 44, style }: { emoji: string; hue: number; url?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  if (url) return <Image source={img(url)} style={[{ width: size, height: size, borderRadius: size / 2 }, style as StyleProp<ImageStyle>]} contentFit="cover" />;
  return (
    <YStack width={size} height={size} borderRadius={size / 2} backgroundColor={hsl(hue, 70, 86)} alignItems="center" justifyContent="center" style={flat(style)}>
      <T fontSize={size * 0.5} lineHeight={size * 0.6}>{emoji}</T>
    </YStack>
  );
}
/** 게시물·활동 커버 (사진 또는 색 배경 + 이모지) */
export function Cover({ emoji, hue, url, size = 56, radius = 16, style }: { emoji: string; hue: number; url?: string; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  if (url) return <Image source={img(url)} style={[{ width: size, height: size, borderRadius: radius }, style as StyleProp<ImageStyle>]} contentFit="cover" />;
  return <YStack width={size} height={size} borderRadius={radius} backgroundColor={hsl(hue, 60, 88)} alignItems="center" justifyContent="center" style={flat(style)}><T fontSize={size * 0.4}>{emoji}</T></YStack>;
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
    <XStack height={64} paddingLeft={16} paddingRight={8} alignItems="center" backgroundColor="$bg">
      <T fontSize={22} fontWeight="800" letterSpacing={-0.5} color="$ink">AroundU</T>
      <XStack onPress={() => setLangOpen(true)} marginLeft={6} height={32} paddingHorizontal={9} borderRadius={RADIUS.pill} backgroundColor="$tint" alignItems="center" maxWidth={120} flexShrink={1} pressStyle={{ opacity: 0.8 }} cursor="pointer">
        {people ? <MapPin size={13} color={C.ink2} /> : <GraduationCap size={13} color={C.ink2} />}
        <T numberOfLines={1} marginHorizontal={4} fontSize={12} fontWeight="600" color="$ink2" flexShrink={1}>{school}</T>
        {verified ? <BadgeCheck size={13} color={C.verify} /> : <ChevronDown size={13} color={C.ink3} />}
      </XStack>
      <YStack flex={1} />
      {right}
      {search || people ? <IconBtn onPress={() => nav('/search?tab=people')}><Search size={21} color={C.ink2} /></IconBtn> : null}
      {people ? null : <IconBtn onPress={() => nav('/notifications')} badge={unreadBell}><Bell size={21} color={C.ink2} /></IconBtn>}
      <IconBtn onPress={() => nav('/chats')} badge={unreadChat}><MessageCircle size={21} color={C.ink2} /></IconBtn>
      <XStack onPress={() => nav('/profile')} marginLeft={2} cursor="pointer">
        {v.me.avatar.url ? <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={30} /> : <YStack height={30} width={30} borderRadius={15} backgroundColor="$tint2" alignItems="center" justifyContent="center"><UserIcon size={16} color={C.ink2} /></YStack>}
      </XStack>
      <LangSheet open={langOpen} onClose={() => setLangOpen(false)} school={full} />
    </XStack>
  );
}

/** 학교 알약 → 한국어 / English 전환 (한국 대학 버전 · 미국 대학 버전) */
export function LangSheet({ open, onClose, school }: { open: boolean; onClose: () => void; school: string }) {
  const pick = (l: 'ko' | 'en') => { onClose(); if (l !== lang) setLang(l); };
  return (
    <BottomSheet open={open} onClose={onClose} title={school}>
      <T fontSize={12} fontWeight="600" color="$ink3" marginBottom={8}>{lang === 'en' ? 'Language · Campus version' : '언어 · 캠퍼스 버전'}</T>
      {([['ko', '한국어 · 한국 대학'], ['en', 'English · US campus']] as ['ko' | 'en', string][]).map(([l, label]) => (
        <SelectRow key={l} active={lang === l} onPress={() => pick(l)}>{label}</SelectRow>
      ))}
      <XStack onPress={() => { onClose(); nav('/settings'); }} height={44} alignItems="center" justifyContent="center" cursor="pointer"><T fontSize={13} fontWeight="600" color="$link">{t('설정')}</T></XStack>
    </BottomSheet>
  );
}
/** 시트 안 선택 행 (알약) — 선택되면 옅은 하늘 면 + 파랑 글자 + 파랑 선 */
export function SelectRow({ active, onPress, children, right }: { active?: boolean; onPress?: () => void; children: ReactNode; right?: ReactNode }) {
  return (
    <XStack onPress={onPress} height={48} paddingHorizontal={16} marginBottom={8} borderRadius={RADIUS.pill} alignItems="center" borderWidth={1}
      backgroundColor={active ? '$tint' : '$surface'} borderColor={active ? alpha(C.primary, 0.4) : '$line'} pressStyle={{ backgroundColor: '$surface2' }} cursor="pointer">
      <T flex={1} fontSize={14} fontWeight="600" color={active ? '$primary' : '$ink'}>{children}</T>
      {right}
    </XStack>
  );
}
export function IconBtn({ onPress, children, badge }: { onPress: () => void; children: ReactNode; badge?: boolean }) {
  return (
    <XStack onPress={onPress} hitSlop={4} height={40} width={38} borderRadius={RADIUS.pill} alignItems="center" justifyContent="center" pressStyle={{ backgroundColor: '$surface2' }} cursor="pointer">
      {children}{badge ? <YStack position="absolute" top={8} right={8} height={8} width={8} borderRadius={4} backgroundColor="$danger" /> : null}
    </XStack>
  );
}

/** 탭 화면 래퍼: SafeArea + 옅은 배경 (+ 옵션 스크롤) */
export function TabScreen({ children, scroll = true, header }: { children: ReactNode; scroll?: boolean; header?: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {header ?? <AppHeader />}
      {scroll ? <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <YStack flex={1}>{children}</YStack>}
    </SafeAreaView>
  );
}
/** 상세 화면 래퍼: 뒤로가기 + 제목 + 오른쪽 액션 */
export function Screen({ title, right, children, scroll = true, footer, sub }: { title?: string; right?: ReactNode; children: ReactNode; scroll?: boolean; footer?: ReactNode; sub?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <XStack height={56} paddingLeft={4} paddingRight={12} alignItems="center">
        <IconBtn onPress={back}><ChevronLeft size={26} color={C.ink} /></IconBtn>
        <T numberOfLines={1} flex={1} fontSize={17} fontWeight="700" color="$ink" marginLeft={4}>{title ?? ''}</T>
        {right}
      </XStack>
      {sub}
      {scroll ? <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <YStack flex={1}>{children}</YStack>}
      {footer && <YStack paddingHorizontal={16} paddingTop={8} backgroundColor="$surface" borderTopWidth={1} borderColor="$line" paddingBottom={Math.max(insets.bottom, 12)}>{footer}</YStack>}
    </SafeAreaView>
  );
}

/* ---------- Typography / layout ---------- */
/** 화면 첫 문장 (display 에 가까운 24/800) */
export const H1 = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <T fontSize={24} lineHeight={30} fontWeight="800" letterSpacing={-0.5} color="$ink" style={flat(style) as never}>{children}</T>;
/** 섹션 제목 20/700 */
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <T fontSize={20} lineHeight={26} fontWeight="700" letterSpacing={-0.4} color="$ink" style={flat(style) as never}>{children}</T>;
export const Muted = ({ children, size = 13, style }: { children: ReactNode; size?: number; style?: StyleProp<ViewStyle> }) => <T fontSize={size} color="$ink3" style={flat(style) as never}>{children}</T>;

/** 카드 — 반경 20 · 흰 면 · 1px 선 · 아주 옅은 그림자 (카드 안에 카드를 넣지 않는다) */
export const CardFrame = styled(YStack, {
  name: 'Card',
  backgroundColor: '$surface',
  borderRadius: RADIUS.card,
  borderWidth: 1,
  borderColor: '$line',
  padding: SPACE.cardPad,
  boxShadow: SHADOW.card,
});
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <CardFrame style={flat(style)}>{children}</CardFrame>;
export const Divider = () => <YStack height={1} backgroundColor="$line" />;

/* ---------- Chips / Tags ---------- */
/** 선택 칩 — 기본 흰 면 + 선, 선택되면 옅은 하늘 면 + 파랑 글자 + 파랑 선 (채우지 않는다) */
export function Chip({ active, onPress, children, size = 'md' }: { active?: boolean; onPress?: () => void; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <XStack onPress={onPress} height={size === 'sm' ? 32 : 36} paddingHorizontal={size === 'sm' ? 12 : 15} marginRight={8} borderRadius={RADIUS.pill} alignItems="center" justifyContent="center" borderWidth={1}
      backgroundColor={active ? '$tint' : '$surface'} borderColor={active ? alpha(C.primary, 0.4) : '$line'} pressStyle={{ scale: 0.98, backgroundColor: active ? '$tint' : '$surface2' }} cursor={onPress ? 'pointer' : undefined}>
      <T fontSize={size === 'sm' ? 12 : 13} fontWeight={active ? '600' : '500'} color={active ? '$primary' : '$ink2'}>{children}</T>
    </XStack>
  );
}
export function ChipRow({ children }: { children: ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>{children}</ScrollView>;
}
type Tone = 'neutral' | 'primary' | 'mint' | 'gold' | 'danger';
const TONE: Record<Tone, [string, string]> = {
  neutral: ['$surface2', '$ink2'], primary: ['$tint', '$primary'], mint: ['$okSoft', '$ok'], gold: ['$warnSoft', '$warn'], danger: ['$dangerSoft', '$danger'],
};
/** 태그·배지 — 알약, 옅은 면 + 진한 글자 (웹 shadcn Badge) */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const [bg, fg] = TONE[tone];
  return <XStack height={24} paddingHorizontal={10} borderRadius={RADIUS.pill} backgroundColor={bg as never} alignItems="center" justifyContent="center"><T fontSize={11} fontWeight="600" color={fg as never}>{children}</T></XStack>;
}
export const Badge = Tag;

/* ---------- Buttons ---------- */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
/** 알약 버튼 프레임 — variant 는 웹 shadcn Button 과 같다 (accent 는 예전 이름: secondary 와 같음) */
export const ButtonFrame = styled(XStack, {
  name: 'Button',
  role: 'button',
  borderRadius: RADIUS.pill,
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  pressStyle: { opacity: 0.9, scale: 0.98 },
  variants: {
    variant: {
      primary: { backgroundColor: '$primary', pressStyle: { backgroundColor: '$primaryPress' } },
      secondary: { backgroundColor: '$tint', pressStyle: { backgroundColor: '$tint2' } },
      accent: { backgroundColor: '$tint', pressStyle: { backgroundColor: '$tint2' } },
      outline: { backgroundColor: '$surface', borderWidth: 1, borderColor: '$line', pressStyle: { backgroundColor: '$surface2' } },
      ghost: { backgroundColor: 'transparent', pressStyle: { backgroundColor: '$surface2' } },
      danger: { backgroundColor: '$dangerSoft' },
    },
    size: {
      sm: { height: 36, paddingHorizontal: 16 },
      md: { height: 44, paddingHorizontal: 20 },
      lg: { height: 52, paddingHorizontal: 24 },
    },
    full: { true: { flex: 1 } },
    off: { true: { opacity: 0.45, pointerEvents: 'none' } },
  } as const,
  defaultVariants: { variant: 'primary', size: 'md' },
});
const BTN_FG: Record<ButtonVariant, keyof typeof C> = { primary: 'onPrimary', secondary: 'primary', accent: 'primary', outline: 'ink', ghost: 'ink2', danger: 'danger' };
export function Button({ children, onPress, variant = 'primary', size = 'md', full, loading, disabled, icon, style }: { children: ReactNode; onPress?: () => void; variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; full?: boolean; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const fg = C[BTN_FG[variant]];
  const off = !!(disabled || loading);
  return (
    <ButtonFrame variant={variant} size={size} full={!!full} off={!!disabled} onPress={off ? undefined : onPress} aria-disabled={off} style={flat(style)}>
      {loading ? <Spinner color={fg} /> : <>{icon ? <YStack marginRight={6}>{icon}</YStack> : null}<T numberOfLines={1} color={fg} fontSize={size === 'sm' ? 13 : size === 'lg' ? 15 : 14} fontWeight="600" flexShrink={1}>{children}</T></>}
    </ButtonFrame>
  );
}

/* ---------- Rows ---------- */
/** 알약형 행: 아바타 · 제목/부제 · 오른쪽 액션 */
export function PillRow({ avatar, title, sub, action, onPress }: { avatar: ReactNode; title: string; sub?: string; action?: ReactNode; onPress?: () => void }) {
  return (
    <XStack onPress={onPress} borderRadius={RADIUS.pill} borderWidth={1} borderColor="$line" backgroundColor="$surface" paddingHorizontal={10} paddingVertical={8} alignItems="center" marginBottom={12} boxShadow={SHADOW.card} pressStyle={{ backgroundColor: '$surface2' }} cursor={onPress ? 'pointer' : undefined}>
      {avatar}
      <YStack flex={1} minWidth={0} marginHorizontal={12}><T numberOfLines={1} fontSize={15} fontWeight="600" color="$ink">{title}</T>{sub ? <T numberOfLines={1} fontSize={13} color="$ink2">{sub}</T> : null}</YStack>
      {action}
    </XStack>
  );
}
/** 구분선 목록 행 */
export function ListRow({ left, title, badge, sub, right, onPress, last }: { left?: ReactNode; title: string; badge?: ReactNode; sub?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <XStack onPress={onPress} alignItems="center" paddingVertical={14} borderBottomWidth={last ? 0 : 1} borderColor="$line" pressStyle={onPress ? { opacity: 0.7 } : undefined} cursor={onPress ? 'pointer' : undefined}>
      {left}
      <YStack flex={1} minWidth={0} marginLeft={left ? 12 : 0}>
        <XStack alignItems="center"><T numberOfLines={1} fontSize={15} fontWeight="600" color="$ink" flexShrink={1}>{title}</T>{badge ? <YStack marginLeft={8}>{badge}</YStack> : null}</XStack>
        {sub ? <T numberOfLines={1} fontSize={13} color="$ink3" marginTop={2}>{sub}</T> : null}
      </YStack>
      {right ? <YStack marginLeft={8}>{right}</YStack> : null}
    </XStack>
  );
}
/** 아이콘 원 — 기본은 옅은 하늘 */
export function IconCircle({ children, size = 40, bg }: { children: ReactNode; size?: number; bg?: string }) {
  return <YStack width={size} height={size} borderRadius={size / 2} backgroundColor={bg ?? '$tint'} alignItems="center" justifyContent="center">{children}</YStack>;
}

/* ---------- Tabs ---------- */
/** 세그먼트 — 옅은 회청 레일 위 흰 알약이 선택 (웹 shadcn Tabs) */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <XStack backgroundColor="$surface2" borderRadius={RADIUS.pill} padding={4}>
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <XStack key={k} onPress={() => onChange(k)} flex={1} height={36} borderRadius={RADIUS.pill} alignItems="center" justifyContent="center" paddingHorizontal={6}
            backgroundColor={on ? '$surface' : 'transparent'} boxShadow={on ? `0 1px 3px ${alpha(C.shadow, 0.12)}` : undefined} cursor="pointer" role="tab" aria-selected={on}>
            <T numberOfLines={1} fontSize={13} fontWeight="600" color={on ? '$ink' : '$ink3'}>{l}</T>
          </XStack>
        );
      })}
    </XStack>
  );
}
/** 밑줄 탭 — 선택은 ink 글자 + 파랑 2px 밑줄 */
export function UnderlineTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <XStack paddingHorizontal={16} borderBottomWidth={1} borderColor="$line">
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <YStack key={k} onPress={() => onChange(k)} height={44} marginRight={26} justifyContent="center" borderBottomWidth={2} borderColor={on ? '$primary' : 'transparent'} marginBottom={-1} cursor="pointer" role="tab" aria-selected={on}>
            <T fontSize={15} fontWeight={on ? '700' : '500'} color={on ? '$ink' : '$ink3'}>{l}</T>
          </YStack>
        );
      })}
    </XStack>
  );
}

/* ---------- Sheet / states ---------- */
/** 아래에서 올라오는 시트 — Tamagui Sheet (모달 · 끌어내려 닫기) */
export function BottomSheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Sheet modal open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }} snapPoints={[tall ? 88 : 70]} snapPointsMode="percent" dismissOnSnapToBottom dismissOnOverlayPress zIndex={100_000} transition="quick" moveOnKeyboardChange>
      <Sheet.Overlay backgroundColor="$scrim" transition="quick" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Frame backgroundColor="$surface" borderTopLeftRadius={28} borderTopRightRadius={28} paddingHorizontal={20} paddingTop={12} boxShadow={SHADOW.sheet}>
        <YStack alignSelf="center" height={4} width={40} borderRadius={2} backgroundColor="$line" marginBottom={12} />
        <XStack alignItems="center" marginBottom={12}><T flex={1} fontSize={18} fontWeight="700" color="$ink">{title ?? ''}</T><IconBtn onPress={onClose}><X size={20} color={C.ink2} /></IconBtn></XStack>
        <Sheet.ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>{children}</Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  );
}
/** 빈 상태 — 제목 15/700 · 설명 13 · 버튼 하나 */
export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <YStack alignItems="center" paddingVertical={40}><T fontSize={15} fontWeight="700" color="$ink2" textAlign="center">{title}</T>{description ? <T fontSize={13} color="$ink3" marginTop={4} textAlign="center">{description}</T> : null}{action ? <YStack marginTop={16}>{action}</YStack> : null}</YStack>;
}
export function Loading() { return <YStack paddingVertical={64} alignItems="center"><Spinner color={C.primary} /></YStack>; }

/* ---------- Form ---------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <YStack marginBottom={16}><T fontSize={13} fontWeight="600" color="$ink2" marginBottom={6}>{label}</T>{children}{hint ? <T fontSize={12} color="$ink3" marginTop={4}>{hint}</T> : null}</YStack>;
}
/** 입력칸 — 반경 14, 흰 면, 1px 선, 포커스는 파랑 선 (Tamagui Input · RN TextInput props 그대로) */
export function Input(props: TextInputProps) {
  const { style, editable, placeholderTextColor, ...rest } = props;
  return (
    <TInput {...(rest as object)} readOnly={editable === false} placeholderTextColor={(placeholderTextColor ?? C.ink3) as never}
      height={48} paddingHorizontal={16} borderRadius={RADIUS.input} borderWidth={1} borderColor="$line" backgroundColor="$surface" fontFamily="$body" fontSize={15} color="$ink"
      focusStyle={{ borderColor: '$primary', outlineWidth: 0 }} style={flat(style as StyleProp<ViewStyle>) as never} />
  );
}
export function Textarea(props: TextInputProps) {
  const { style, editable, placeholderTextColor, multiline: _m, textAlignVertical: _v, ...rest } = props;
  return (
    <TextArea {...(rest as object)} readOnly={editable === false} placeholderTextColor={(placeholderTextColor ?? C.ink3) as never} textAlignVertical="top"
      minHeight={96} paddingHorizontal={16} paddingVertical={12} borderRadius={RADIUS.input} borderWidth={1} borderColor="$line" backgroundColor="$surface" fontFamily="$body" fontSize={15} lineHeight={22} color="$ink"
      focusStyle={{ borderColor: '$primary', outlineWidth: 0 }} style={flat(style as StyleProp<ViewStyle>) as never} />
  );
}
/** 켜고 끄기 — Tamagui Switch (켜짐 = 맑은 파랑) */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <XStack onPress={() => onChange(!checked)} alignItems="center" paddingVertical={12} cursor="pointer">
      <YStack flex={1} marginRight={12}><T fontSize={14} fontWeight="600" color="$ink">{label}</T>{description ? <T fontSize={12} color="$ink3">{description}</T> : null}</YStack>
      <Switch checked={checked} onCheckedChange={onChange} width={48} height={28} padding={3} borderWidth={0} borderRadius={RADIUS.pill} backgroundColor="$line" activeStyle={{ backgroundColor: '$primary' }} aria-label={label}>
        <Switch.Thumb width={22} height={22} borderRadius={11} backgroundColor="$surface" boxShadow={`0 1px 2px ${alpha(C.shadow, 0.2)}`} transition="quick" />
      </Switch>
    </XStack>
  );
}
/** 선택 알약 목록 (단일/다중) */
export function Choice<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T[] | T; onChange: (v: T) => void; multi?: boolean }) {
  const sel = Array.isArray(value) ? value : [value];
  return <XStack flexWrap="wrap" rowGap={8}>{options.map(([k, l]) => <Chip key={k} size="sm" active={sel.includes(k)} onPress={() => onChange(k)}>{l}</Chip>)}</XStack>;
}

/* ---------- Toast ---------- */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;
  const bg = toast.tone === 'error' ? '$danger' : toast.tone === 'success' ? '$ok' : '$ink';
  return (
    <YStack pointerEvents="none" position="absolute" left={24} right={24} bottom={96} alignItems="center">
      <YStack paddingHorizontal={16} paddingVertical={10} borderRadius={14} backgroundColor={bg} boxShadow={SHADOW.float}><T color="$onPrimary" fontSize={13} fontWeight="600" textAlign="center">{toast.text}</T></YStack>
    </YStack>
  );
}

/** 간단한 확인 시트 */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; onOk: () => void } | null>(null);
  const el = (
    <BottomSheet open={!!state} onClose={() => setState(null)} title={state?.title}>
      <XStack marginTop={8}><Button full variant="outline" onPress={() => setState(null)}>{t('취소')}</Button><YStack width={8} /><Button full onPress={() => { state?.onOk(); setState(null); }}>{t('확인')}</Button></XStack>
    </BottomSheet>
  );
  return { confirm: (title: string, onOk: () => void) => setState({ title, onOk }), el };
}

/** 아직 옮기지 않은 화면 자리 — 뒤로가기가 있어서 내비게이션이 끊기지 않는다 */
export function Soon({ title }: { title: string }) {
  return <Screen title={title}><Empty title={title} description="Coming soon" /></Screen>;
}

/** 예전 코드 호환: tw 도 여기서 꺼내 쓸 수 있게 */
export { tw };
