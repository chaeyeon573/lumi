import { useNavigate } from 'react-router-dom';
import { t, lang, setLang } from '@core/i18n';
import { Segmented } from '@/components/ui';
import { useState } from 'react';
import { ChevronRight, Lock, ShieldAlert, Bell, MapPin, LogOut, RotateCcw, Bug, User, FileText, MessageSquareText } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toggle, Button } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { SchoolEmailCard } from '@/components/settings/SchoolEmailCard';
import { DeleteAccountCard } from '@/components/settings/DeleteAccountCard';
import { PushSettingRow } from '@/components/native/PushSettingRow';
import { appVersionLabel, isNativeShell } from '@/lib/native';
import { FeedbackSheet } from '@/components/layout/FeedbackTab';
import { setDesign, useDesign, type Design } from '@/lib/design';

export function SettingsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const logout = useAppStore((s) => s.logout);
  const init = useAppStore((s) => s.init);
  const showToast = useAppStore((s) => s.showToast);
  const me = v.me;
  // iPhone 앱: 데모 도구·가짜 위치 권한·데모 안내 문구·디자인 비교를 숨긴다(App Review 2.1).
  // 의견은 웹·앱 모두 여기서 보낸다 — 예전의 떠 있는 '의견'·'Design' 알약은 화면의 버튼을 가려서 뺐다 (AppShell)
  const inApp = isNativeShell();
  const [feedback, setFeedback] = useState(false);
  const design = useDesign();
  const items = [
    { Icon: User, label: t('프로필 편집'), to: '/profile/edit' },
    { Icon: Lock, label: t('공개 범위 설정'), desc: t('프로필 항목별 공개 범위'), to: '/settings/privacy' },
    { Icon: ShieldAlert, label: t('계정 및 안전 설정'), desc: t('차단 목록, 메시지 수신 제한, 신고 내역'), to: '/settings/safety' },
  ];
  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('설정')} />
      <div className="px-4 py-3 space-y-3">
        <div className="card divide-y divide-line">
          {items.map((it) => <button key={it.to} onClick={() => nav(it.to)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><it.Icon size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{it.label}</span>{it.desc && <span className="block text-[12px] text-ink-3">{it.desc}</span>}</span><ChevronRight size={18} className="text-ink-3" /></button>)}
        </div>
        <SchoolEmailCard />
        <div className="card px-4 divide-y divide-line">
          <Toggle label={t('알림')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림')} checked={me.settings.notifications} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, notifications: val } }))} />
          {!inApp && <div className="py-3 flex items-start gap-3"><MapPin size={18} className="text-ink-2 mt-0.5" /><div className="flex-1"><div className="text-[14px] font-medium">{t('위치 권한 ·')} {me.settings.locationPermission === 'granted' ? t('허용됨') : me.settings.locationPermission === 'denied' ? t('거부됨') : t('미설정')}</div><div className="text-[12px] text-ink-3 mt-0.5">{t('위치는 주변 활동 추천에만 사용되고, 정확한 위치는 다른 사용자에게 공개되지 않아요.')}</div><Button size="sm" variant="outline" className="mt-2" onClick={() => run(() => api.users.update(me.id, { settings: { ...me.settings, locationPermission: me.settings.locationPermission === 'granted' ? 'denied' : 'granted' } }))}>{me.settings.locationPermission === 'granted' ? t('권한 끄기') : t('권한 허용')}</Button></div></div>}
          {/* iPhone 앱에서만 — 이 기기의 푸시 권한 */}
          <PushSettingRow />
          <div className="py-3 flex items-center gap-3"><Bell size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-medium">{t('알림 확인')}</span><Button size="sm" variant="ghost" onClick={() => nav('/notifications')}>{t('열기')}</Button></div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[14px] font-medium mb-2">{t('언어')}</div>
          <Segmented value={lang} onChange={(v) => v !== lang && setLang(v)} options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} />
          {/* 캠퍼스가 언어 따라 바뀌는 건 예시 데이터(mock)뿐 — 실제 서버에선 화면 글자만 바뀐다 */}
          {apiMode === 'mock' && <p className="text-[12px] text-ink-3 mt-2">{t('언어를 바꾸면 데모 데이터도 해당 언어의 캠퍼스로 바뀌어요.')}</p>}
        </div>
        {/* 디자인 — 기본은 New. 웹에서만 (iPhone 앱은 한 디자인) */}
        {!inApp && (
          <div className="card px-4 py-3">
            <div className="text-[14px] font-medium mb-2">{lang === 'en' ? 'Design' : '디자인'}</div>
            <Segmented value={design} onChange={(d: Design) => d !== design && setDesign(d)} options={[{ value: 'v2', label: lang === 'en' ? 'New' : '새 디자인' }, { value: 'classic', label: lang === 'en' ? 'Classic' : '클래식' }]} />
          </div>
        )}
        <div className="card divide-y divide-line">
          <button onClick={() => setFeedback(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><MessageSquareText size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{lang === 'en' ? 'Send feedback' : '의견 보내기'}</span><span className="block text-[12px] text-ink-3">{lang === 'en' ? 'Ideas, bugs, anything confusing — we read every message' : '아이디어·버그·헷갈린 점 — 하나도 빠짐없이 읽어요'}</span></span><ChevronRight size={18} className="text-ink-3" /></button>
        </div>
        {/* Privacy Policy · Terms of Use — public pages (src/pages/legal) */}
        <div className="card divide-y divide-line">
          {[{ to: '/privacy', label: 'Privacy Policy' }, { to: '/terms', label: 'Terms of Use' }].map((it) => <button key={it.to} onClick={() => nav(it.to)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><FileText size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{it.label}</span><ChevronRight size={18} className="text-ink-3" /></button>)}
        </div>
        <div className="card divide-y divide-line">
          <button onClick={async () => { await logout(); nav('/welcome', { replace: true }); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><LogOut size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('로그아웃')}</span></button>
        </div>
        <DeleteAccountCard />
        {/* 데모 도구는 mock(브라우저 저장) 모드에서만 — 실제 서버에서는 초기화가 막혀 있어(ALLOW_RESET) 눌러도 오류만 난다 */}
        {!inApp && apiMode !== 'remote' && <div className="card divide-y divide-line">
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-ink-3">{t('데모 도구')}</div>
          <button onClick={() => { api.system.failNext(); showToast(t('다음 요청이 실패해요. 홈으로 돌아가 새로고침해보세요.')); init(); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><Bug size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{t('오류 상태 미리보기')}</span><span className="block text-[12px] text-ink-3">{t('다음 API 요청 1회를 실패시켜 오류 화면을 확인해요')}</span></span></button>
          <button onClick={async () => { await api.system.reset(); await logout(); nav('/welcome', { replace: true }); showToast(t('데모 데이터를 초기화했어요.')); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><RotateCcw size={18} className="text-danger" /><span className="flex-1"><span className="block text-[14px] font-semibold text-danger">{t('데모 데이터 초기화')}</span><span className="block text-[12px] text-ink-3">{t('모든 변경 사항을 지우고 예시 데이터로 되돌려요')}</span></span></button>
        </div>}
        <p className="text-center text-[11px] text-ink-3">{appVersionLabel() ? `Lumi for iPhone ${appVersionLabel()}` : apiMode === 'remote' ? 'Lumi' : 'Lumi MVP · mock API (localStorage)'}</p>
        <FeedbackSheet open={feedback} onClose={() => setFeedback(false)} />
      </div>
    </div>
  );
}
