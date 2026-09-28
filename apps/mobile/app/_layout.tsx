import '../src/platform'; // core보다 먼저 — 저장소·언어 어댑터 등록
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DevSettings, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { t } from '@core/i18n';
import { setReloadHandler } from '@/platform';
import { FONTS, applyDefaultFont } from '@/fonts';
import { Toast, C } from '@/ui';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '@/tamagui.config';
import { setPalette, storedPalette, usePalette } from '@/theme';
import { replace } from '@/nav';
import { Welcome } from '@/components/Welcome';
import { OnboardingFlow } from './onboarding';

// 언어 변경 등 전체 재시작: 배포 빌드는 Updates.reloadAsync, 개발은 DevSettings.reload
setReloadHandler(() => { Updates.reloadAsync().catch(() => { try { DevSettings.reload(); } catch { /* */ } }); });

// 색 조합(설정 › 데모 도구) — index.js 가 저장소를 먼저 올리므로(hydrate) 첫 화면부터 저장된 팔레트로 그린다
setPalette(storedPalette(), false);

const FONT_WAIT_MS = 3000;

export default function RootLayout() {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const currentUserId = useAppStore((s) => s.currentUserId);
  // 계정 삭제 직후(로그아웃 전) 익명화된 "나"가 실시간 패치로 들어와도 탭 화면을 그리지 않는다
  const meDeleted = useAppStore((s) => !!s.users.find((u) => u.id === s.currentUserId)?.deleted);
  const init = useAppStore((s) => s.init);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const [fontTimeout, setFontTimeout] = useState(false);
  const palette = usePalette();
  /** 로그아웃 상태에서 보여줄 화면 — 시작 화면 또는 가입(온보딩) */
  const [signedOutView, setSignedOutView] = useState<'welcome' | 'onboarding'>('welcome');
  const wasSignedOut = useRef(false);
  if (fontsLoaded) applyDefaultFont();

  // 폰트는 화면을 막지 않는다: 실패하거나 오래 걸리면 시스템 글꼴로 진행
  useEffect(() => { const id = setTimeout(() => setFontTimeout(true), FONT_WAIT_MS); return () => clearTimeout(id); }, []);
  useEffect(() => { if (fontError) console.warn('[boot] fonts failed, using system font', fontError); }, [fontError]);
  // 스플래시는 레이아웃이 뜨는 순간 무조건 걷는다 (부팅이 실패해도 흰 화면이 남지 않게)
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);

  const boot = async () => {
    setBooting(true); setBootError(null);
    try {
      console.log('[boot] init');
      await init();
      const st = useAppStore.getState();
      if (st.status === 'error') throw new Error(st.error ?? 'init failed');
      // 데모(mock)만: 세션이 없으면 데모 계정으로 바로 로그인. 실제 서버(remote)는 시작 화면을 보여준다
      if (!st.currentUserId && apiMode === 'mock') {
        console.log('[boot] loginDemo');
        const u = await api.auth.loginDemo();
        await setCurrentUser(u);
      }
      console.log('[boot] ready');
    } catch (e) {
      console.warn('[boot] failed', e);
      setBootError((e as Error)?.message || String(e));
    } finally { setBooting(false); }
  };
  useEffect(() => { boot(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fontsSettled = fontsLoaded || !!fontError || fontTimeout;
  const failed = !booting && (!!bootError || status === 'error');
  const ready = !booting && fontsSettled && status === 'ready' && !!currentUserId && !meDeleted;
  /** 로그아웃 · 계정 삭제 뒤, 또는 remote 모드에서 세션이 없을 때 */
  const signedOut = !booting && !failed && fontsSettled && status === 'ready' && !currentUserId;
  // 로그아웃되면 시작 화면부터. 다시 로그인하면 (이전 화면이 남지 않게) 홈으로
  useEffect(() => {
    if (signedOut) { wasSignedOut.current = true; setSignedOutView('welcome'); }
    else if (ready && wasSignedOut.current) { wasSignedOut.current = false; setTimeout(() => { try { replace('/'); } catch { /* */ } }, 0); }
  }, [signedOut, ready]);
  // 색 조합이 바뀌면 화면 트리를 다시 그린다 (C · tw 를 쓰는 화면까지 새 색을 받게). Tamagui 컴포넌트는 <Theme> 로 바로 바뀐다.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="light">
        <Theme name={palette}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            {ready ? (
              <Stack key={palette} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
            ) : signedOut ? (
              signedOutView === 'onboarding'
                ? <OnboardingFlow embedded onExit={() => setSignedOutView('welcome')} />
                : <Welcome onStart={() => setSignedOutView('onboarding')} />
            ) : failed ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 28 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink }}>{t('문제가 발생했어요.')}</Text>
                <Text style={{ marginTop: 8, fontSize: 13, color: C.ink3, textAlign: 'center' }}>{bootError || error || ''}</Text>
                <Pressable onPress={boot} style={{ marginTop: 20, height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: C.primary, justifyContent: 'center' }}><Text style={{ color: C.onPrimary, fontWeight: '600' }}>{t('다시 시도')}</Text></Pressable>
                {apiMode === 'mock' ? <Pressable onPress={async () => { try { await api.system.reset(); } catch { /* */ } boot(); }} style={{ marginTop: 10, height: 40, paddingHorizontal: 18, justifyContent: 'center' }}><Text style={{ color: C.link, fontWeight: '600' }}>{t('데모 데이터 초기화')}</Text></Pressable> : null}
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>
            )}
            <Toast />
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
