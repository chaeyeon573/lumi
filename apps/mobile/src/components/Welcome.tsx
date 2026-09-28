import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, GraduationCap, Sparkles, Briefcase, Globe } from 'lucide-react-native';
import { t, lang, setLang, type Lang } from '@core/i18n';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { localeContext } from '@core/lib/locale-context';
import { tw } from '@/tw';
import { BottomSheet, Button, Field, Input, C } from '@/ui';
import { openLegal } from '@/legal';
import { SHOW_DEMO } from '@/demo';

/**
 * 시작 화면 (웹 WelcomePage) — 로그아웃 상태에서 루트 레이아웃이 탭 대신 보여준다.
 * 시작하기 → 온보딩(가입) · 이메일 코드 로그인 · (mock/데모 빌드만) 데모 계정 · 약관 링크.
 */
export function Welcome({ onStart }: { onStart: () => void }) {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const ctx = localeContext();
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');

  const loginDemo = async () => {
    setBusy(true);
    try { const user = await api.auth.loginDemo(); await setCurrentUser(user); }
    catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };
  const sendCode = async () => {
    setBusy(true);
    try {
      const r = await api.schools.sendVerificationCode(email.trim(), '');
      setHint(r.hint);
      if (r.ok) setSent(true); else showToast(r.hint, 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const loginWithCode = async () => {
    setBusy(true);
    try { const user = await api.auth.loginWithCode(email.trim(), code.trim()); setEmailOpen(false); await setCurrentUser(user); }
    catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };
  const changeLang = (l: Lang) => { if (l !== lang) setLang(l); };

  const pills = [
    { Icon: GraduationCap, label: t('내 학교'), bg: C.primary, fg: C.onPrimary },
    { Icon: Sparkles, label: t('관심사·활동'), bg: C.soft, fg: C.primary },
    { Icon: Briefcase, label: t('직업·지역'), bg: C.tint2, fg: C.primary },
    { Icon: Globe, label: t('더 넓은 관계'), bg: C.surface2, fg: C.ink2 },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[tw`flex-1`, { backgroundColor: C.surface }]}>
      <View style={tw`items-end px-4 pt-2`}>
        <View style={tw`flex-row rounded-full bg-surface-2 p-0.5`}>
          {([['ko', '한국어'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => (
            <Pressable key={l} onPress={() => changeLang(l)} style={[tw`px-3 h-7 rounded-full justify-center`, lang === l ? { backgroundColor: C.primary } : null]}>
              <Text style={[tw`text-[12px] font-bold`, { color: lang === l ? C.onPrimary : C.ink2 }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={tw`flex-1 items-center justify-center px-7`}>
        <Text style={[tw`text-[46px] font-extrabold`, { color: C.ink, letterSpacing: -1 }]}>AroundU</Text>
        <Text style={tw`mt-7 text-[28px] font-bold text-ink text-center leading-9`}>{ctx.tagline}</Text>
        <Text style={tw`mt-3 text-[14px] text-ink-2 text-center leading-5`}>{ctx.subtitle}</Text>
        <View style={tw`mt-8 flex-row flex-wrap items-center justify-center`}>
          {pills.map((p, i) => (
            <View key={p.label} style={tw`flex-row items-center mb-1`}>
              <View style={[tw`flex-row items-center h-7 px-2.5 rounded-full`, { backgroundColor: p.bg }]}><p.Icon size={12} color={p.fg} /><Text style={[tw`ml-1 text-[11px] font-semibold`, { color: p.fg }]}>{p.label}</Text></View>
              {i < pills.length - 1 ? <View style={tw`mx-1`}><ArrowRight size={12} color={C.ink3} /></View> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={tw`px-6 pb-6`}>
        <View style={tw`flex-row`}><Button full size="lg" onPress={onStart}>{t('시작하기')}</Button></View>
        <Pressable onPress={() => setEmailOpen(true)} style={tw`h-11 items-center justify-center mt-1`}>
          <Text style={tw`text-[13px] text-ink-2`}>{t('이미 계정이 있나요?')} <Text style={tw`font-bold text-primary underline`}>{t('로그인')}</Text></Text>
        </Pressable>
        {SHOW_DEMO ? <View style={tw`flex-row`}><Button full size="lg" variant="ghost" onPress={loginDemo} loading={busy && !emailOpen}>{t('로그인 (데모 계정)')}</Button></View> : null}
        <Text style={tw`mt-2 text-center text-[11px] text-ink-3`}>{t('학교 인증을 거친 사람만 만나요. 정확한 위치는 절대 공개되지 않아요.')}</Text>
        <View style={tw`mt-1.5 flex-row justify-center`}>
          <Text onPress={() => openLegal('terms')} accessibilityRole="link" style={tw`text-[11px] text-ink-3 underline`}>{t('이용약관')}</Text>
          <Text style={tw`mx-1.5 text-[11px] text-ink-3`}>·</Text>
          <Text onPress={() => openLegal('privacy')} accessibilityRole="link" style={tw`text-[11px] text-ink-3 underline`}>{t('개인정보처리방침')}</Text>
        </View>
      </View>

      <BottomSheet open={emailOpen} onClose={() => setEmailOpen(false)} title={t('이메일로 로그인')}>
        <Field label={t('학교 이메일')} hint={hint || t('가입할 때 쓴 학교 이메일로 코드를 보내드려요.')}>
          <View style={tw`flex-row items-center`}>
            <Input style={tw`flex-1`} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@school.edu" value={email} onChangeText={(v) => { setEmail(v); setSent(false); }} />
            <View style={tw`w-2`} />
            <Button variant="secondary" onPress={sendCode} loading={busy && !sent} disabled={!email.includes('@')}>{t('코드 받기')}</Button>
          </View>
        </Field>
        {sent ? (
          <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
            <Input keyboardType="number-pad" placeholder="123456" value={code} onChangeText={setCode} maxLength={6} autoFocus />
          </Field>
        ) : null}
        <View style={tw`flex-row`}><Button full size="lg" onPress={loginWithCode} loading={busy && sent} disabled={!sent || code.trim().length < 6}>{t('로그인')}</Button></View>
      </BottomSheet>
    </SafeAreaView>
  );
}
