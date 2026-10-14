import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet, Button } from '@/components/ui';
import { themeColor, useDesign } from '@/lib/design';
import { haptic, native } from '@/lib/native';
import { forgetPushToken, markPushOffered, shouldOfferPush, syncPushToken, turnOnPush } from './pushDevice';

const en = lang === 'en';
type RunFn = ReturnType<typeof useAppStore.getState>['run'];

/**
 * Only rendered inside the iPhone app (App.tsx: isNativeShell()). Connects the web app to apps/shell:
 * - deep links / push taps navigate inside the SPA (no reload)
 * - status bar + background follow the design (classic = light, v2 = dark)
 * - tells the shell when the first real screen is up (it hides the splash then — no white flash)
 * - push: keeps this device's token registered while signed in, unregisters on sign-out,
 *   and offers notifications after the person's first successful action (never at first launch)
 */
export function NativeBridge() {
  const navigate = useNavigate();
  const design = useDesign();
  const status = useAppStore((s) => s.status);
  const userId = useAppStore((s) => s.currentUserId);
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore((s) => s.showToast);
  const userRef = useRef(userId);
  userRef.current = userId;

  useEffect(() => { native()?.onNavigate((path) => navigate(path)); }, [navigate]);

  useEffect(() => {
    document.documentElement.dataset.native = native()?.platform ?? 'ios';
    void native()?.setTheme({ design, background: themeColor(design), statusBar: design === 'v2' ? 'light' : 'dark' }).catch(() => {});
  }, [design]);

  useEffect(() => {
    if (status === 'ready' || status === 'error') void native()?.ready().catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return;
    if (userId) void syncPushToken().catch(() => {});
    else void forgetPushToken();
  }, [userId, status]);

  // first meaningful action → offer push (wraps the store's run(); every successful action goes through it)
  useEffect(() => {
    const st = useAppStore.getState();
    const orig = st.run as RunFn & { lumiWrapped?: boolean };
    if (orig.lumiWrapped) return;
    const wrapped = (async (fn, msg) => {
      const r = await orig(fn, msg);
      if (userRef.current) setTimeout(() => { void shouldOfferPush().then((ok) => { if (ok && userRef.current) { markPushOffered(); setOffer(true); } }); }, 1200);
      return r;
    }) as RunFn & { lumiWrapped?: boolean };
    wrapped.lumiWrapped = true;
    useAppStore.setState({ run: wrapped });
  }, []);

  const yes = async () => {
    setBusy(true);
    try {
      const s = await turnOnPush();
      if (s === 'granted') { haptic('success'); showToast(en ? "Notifications on — we'll ping you when something happens." : '알림을 켰어요.', 'success'); }
      else if (s === 'denied') showToast(en ? 'No problem — you can turn them on later in Settings.' : '나중에 설정에서 켤 수 있어요.', 'info');
    } catch { showToast(en ? "Couldn't turn on notifications — try again from Settings." : '알림을 켜지 못했어요.', 'error'); }
    finally { setBusy(false); setOffer(false); }
  };

  return (
    <BottomSheet open={offer} onClose={() => setOffer(false)}>
      <div className="flex flex-col items-center text-center pt-2">
        <span className="h-14 w-14 rounded-full bg-primary-soft text-primary grid place-items-center"><Bell size={26} /></span>
        <h3 className="mt-3 text-[18px] font-bold">{en ? 'Know when people answer' : '답이 오면 알려드릴까요?'}</h3>
        <p className="mt-1.5 text-[13.5px] text-ink-2 leading-relaxed">{en ? 'Get a heads-up when someone approves your join request, sends you a game or a proposal, or a plan gets decided. Turn it off anytime in Settings.' : '참가 승인, 게임·제안 도착, 약속 확정을 알림으로 받아요. 설정에서 언제든 끌 수 있어요.'}</p>
        <Button full className="mt-4" loading={busy} onClick={yes}>{en ? 'Turn on notifications' : '알림 켜기'}</Button>
        <Button full variant="ghost" className="mt-1" onClick={() => setOffer(false)}>{en ? 'Not now' : '나중에'}</Button>
      </div>
    </BottomSheet>
  );
}
