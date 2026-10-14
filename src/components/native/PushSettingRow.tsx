import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { Button } from '@/components/ui';
import { isNativeShell, openAppSettings, pushStatus, type PushStatus } from '@/lib/native';
import { PUSH_CHANGED, turnOnPush } from './pushDevice';

const en = lang === 'en';

/** Settings → Notifications, iPhone app only: this phone's push permission (the in-app toggle above decides what is sent) */
export function PushSettingRow() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore((s) => s.showToast);
  useEffect(() => {
    if (!isNativeShell()) return;
    const check = () => { void pushStatus().then((s) => setStatus(s.status)); };
    check();
    // back from the iOS Settings app
    document.addEventListener('visibilitychange', check);
    window.addEventListener(PUSH_CHANGED, check);
    return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener(PUSH_CHANGED, check); };
  }, []);
  if (!isNativeShell() || !status || status === 'unavailable') return null;
  const turnOn = async () => {
    setBusy(true);
    try { const s = await turnOnPush(); setStatus(s); if (s === 'granted') showToast(en ? 'Notifications on' : '알림을 켰어요', 'success'); }
    catch { showToast(en ? "Couldn't turn on notifications — try again." : '알림을 켜지 못했어요.', 'error'); }
    finally { setBusy(false); }
  };
  const desc = status === 'granted' ? (en ? 'On for this iPhone' : '이 iPhone에서 켜짐')
    : status === 'denied' ? (en ? 'Off — turn on in iPhone Settings → Lumi → Notifications' : '꺼짐 — iPhone 설정 → Lumi → 알림에서 켜세요')
    : (en ? 'Get a heads-up on this iPhone' : '이 iPhone으로 알림 받기');
  return (
    <div className="py-3 flex items-center gap-3">
      <BellRing size={18} className="text-ink-2" />
      <div className="flex-1"><div className="text-[14px] font-medium">{en ? 'Push notifications' : '푸시 알림'}</div><div className="text-[12px] text-ink-3 mt-0.5">{desc}</div></div>
      {status === 'undetermined' && <Button size="sm" loading={busy} onClick={turnOn}>{en ? 'Turn on' : '켜기'}</Button>}
      {status === 'denied' && <Button size="sm" variant="outline" onClick={openAppSettings}>{en ? 'Settings' : '설정'}</Button>}
    </div>
  );
}
