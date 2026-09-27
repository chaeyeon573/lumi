import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaywallSheet } from '@/components/social/PaywallSheet';
import { t, lang, setLang } from '@core/i18n';
import { Segmented } from '@/components/ui';
import { ChevronRight, Lock, ShieldAlert, Bell, MapPin, LogOut, RotateCcw, Bug, User, Sparkles, Receipt, GraduationCap } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toggle, Button, BottomSheet } from '@/components/ui';
import { CareerFields } from '@/components/profile_CareerFields';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { isAlumniStage } from '@core/lib/network';
import type { Career } from '@core/types';

export function SettingsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const logout = useAppStore((s) => s.logout);
  const init = useAppStore((s) => s.init);
  const showToast = useAppStore((s) => s.showToast);
  const me = v.me;
  const [paywall, setPaywall] = useState(false);
  const [alumniOpen, setAlumniOpen] = useState(false);
  const [career, setCareer] = useState<Career>(() => ({ ...me.career }));
  const [switching, setSwitching] = useState(false);
  const alumni = isAlumniStage(me);
  const switchToAlumni = async () => {
    setSwitching(true);
    try { await run(() => api.users.setStage(me.id, 'alumni', career), t('졸업생으로 전환했어요.')); setAlumniOpen(false); } catch { /* toast shown by run */ } finally { setSwitching(false); }
  };
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
        <div className="card px-4 divide-y divide-line">
          <Toggle label={t('알림')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림')} checked={me.settings.notifications} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, notifications: val } }))} />
          <div className="py-3 flex items-start gap-3"><MapPin size={18} className="text-ink-2 mt-0.5" /><div className="flex-1"><div className="text-[14px] font-medium">{t('위치 권한 ·')} {me.settings.locationPermission === 'granted' ? t('허용됨') : me.settings.locationPermission === 'denied' ? t('거부됨') : t('미설정')}</div><div className="text-[12px] text-ink-3 mt-0.5">{t('위치는 주변 활동 추천에만 사용되고, 정확한 위치는 다른 사용자에게 공개되지 않아요.')}</div><Button size="sm" variant="outline" className="mt-2" onClick={() => run(() => api.users.update(me.id, { settings: { ...me.settings, locationPermission: me.settings.locationPermission === 'granted' ? 'denied' : 'granted' } }))}>{me.settings.locationPermission === 'granted' ? t('권한 끄기') : t('권한 허용')}</Button></div></div>
          <div className="py-3 flex items-center gap-3"><Bell size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-medium">{t('알림 확인')}</span><Button size="sm" variant="ghost" onClick={() => nav('/notifications')}>{t('열기')}</Button></div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[14px] font-medium mb-2">{t('언어')}</div>
          <Segmented value={lang} onChange={(v) => v !== lang && setLang(v)} options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} />
          <p className="text-[12px] text-ink-3 mt-2">{t('언어를 바꾸면 데모 데이터도 해당 언어의 캠퍼스로 바뀌어요.')}</p>
        </div>
        <div className="card divide-y divide-line">
          <button onClick={async () => { await logout(); nav('/welcome', { replace: true }); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><LogOut size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('로그아웃')}</span></button>
        </div>
        <div className="card divide-y divide-line">
          <button onClick={() => (me.plan === 'plus' ? run(() => api.users.setPlan(me.id, 'free'), t('AroundU+ 해지했어요.')) : setPaywall(true))} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><Sparkles size={18} className="text-primary" /><span className="flex-1"><span className="block text-[14px] font-semibold">{me.plan === 'plus' ? t('구독 관리') : 'AroundU+'}</span><span className="block text-[12px] text-ink-3">{me.plan === 'plus' ? t('AroundU+ 해지') : `${t('무제한 친구 요청')} · ${t('광고 없는 피드')}`}</span></span><ChevronRight size={18} className="text-ink-3" /></button>
          <button onClick={() => nav('/pricing')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><Receipt size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{t('과금 구조')}</span><span className="block text-[12px] text-ink-3">{t('무료 · AroundU+ · 부스트')}</span></span><ChevronRight size={18} className="text-ink-3" /></button>
          {!alumni && <button onClick={() => setAlumniOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><GraduationCap size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{t('졸업생으로 전환')}</span><span className="block text-[12px] text-ink-3">{t('학교 네트워크는 그대로, 도시·경력으로 서클을 넓혀요')}</span></span><ChevronRight size={18} className="text-ink-3" /></button>}
        </div>
        <div className="card divide-y divide-line">
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-ink-3">{t('데모 도구')}</div>
          <button onClick={() => run(() => api.users.update(me.id, { swipes: { date: '1970-01-01', count: 0 } }), t('스와이프 카운트를 초기화했어요.'))} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><RotateCcw size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('오늘 스와이프 카운트 초기화')}</span></button>
          <button onClick={() => run(() => api.users.setPlan(me.id, 'free'), t('플랜을 초기화했어요.'))} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><RotateCcw size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('플랜 초기화')}</span></button>
          {alumni && <button onClick={() => run(() => api.users.setStage(me.id, 'undergrad'), t('학생으로 되돌렸어요.'))} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><GraduationCap size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('학생으로 되돌리기')}</span></button>}
          <button onClick={() => { api.system.failNext(); showToast(t('다음 요청이 실패해요. 홈으로 돌아가 새로고침해보세요.')); init(); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><Bug size={18} className="text-ink-2" /><span className="flex-1"><span className="block text-[14px] font-semibold">{t('오류 상태 미리보기')}</span><span className="block text-[12px] text-ink-3">{t('다음 API 요청 1회를 실패시켜 오류 화면을 확인해요')}</span></span></button>
          <button onClick={async () => { await api.system.reset(); await logout(); nav('/welcome', { replace: true }); showToast(t('데모 데이터를 초기화했어요.')); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><RotateCcw size={18} className="text-danger" /><span className="flex-1"><span className="block text-[14px] font-semibold text-danger">{t('데모 데이터 초기화')}</span><span className="block text-[12px] text-ink-3">{t('모든 변경 사항을 지우고 예시 데이터로 되돌려요')}</span></span></button>
        </div>
        <p className="text-center text-[11px] text-ink-3">AroundU MVP · mock API (localStorage)</p>
      </div>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} />
      <BottomSheet open={alumniOpen} onClose={() => setAlumniOpen(false)} title={t('졸업생으로 전환')}>
        <div className="space-y-4">
          <p className="text-[13px] text-ink-2">{t('학교 네트워크는 그대로 유지돼요. 도시·회사를 적으면 같은 도시의 졸업생과 더 잘 연결돼요.')}</p>
          <CareerFields value={career} onChange={setCareer} />
          <Button full size="lg" loading={switching} icon={<GraduationCap size={16} />} onClick={switchToAlumni}>{t('졸업생으로 전환')}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
