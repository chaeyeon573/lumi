import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PALETTES, type PaletteId } from '@core/theme/tokens';
import { PALETTE_IDS, currentPalette, setPalette } from '@/lib/palette';
import { t, lang, setLang } from '@core/i18n';
import { ChevronRight, Lock, ShieldAlert, Bell, MapPin, LogOut, RotateCcw, Bug, User, Sparkles, Receipt, GraduationCap, Target, BellRing, Coffee, Bookmark, SplitSquareVertical, Trash2, FileText, Shield, LifeBuoy, ExternalLink } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Toggle, Button, Segmented } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { isAlumniStage, stageLabel, stageOf } from '@core/lib/network';
import { stageKind, STAGE_KIND_LABELS, type StageKind } from '@core/lib/stage';
import { DEMO_STAGE_PROMPTS } from '@core/data/prompts-demo';
import { activeStatus } from '@core/lib/status';
import { statusText } from '@/components/people_StatusPill';
import { PARTIAL_FAIL_KEY } from '@/hooks/useSectionState';
import { legalUrl, type LegalPageKey } from '@core/lib/legal';
import { DeleteAccountSheet } from '@/components/settings_DeleteAccountSheet';

export function SettingsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const logout = useAppStore((s) => s.logout);
  const init = useAppStore((s) => s.init);
  const showToast = useAppStore((s) => s.showToast);
  const savedSearches = useAppStore((s) => s.savedSearches);
  const me = v.me;
  const alumni = isAlumniStage(me);
  const plus = me.plan === 'plus';
  const myStatus = activeStatus(me);
  const [palette, setPaletteState] = useState<PaletteId>(() => currentPalette());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const legal: { Icon: typeof User; label: string; page: LegalPageKey }[] = [
    { Icon: FileText, label: t('이용약관'), page: 'terms' },
    { Icon: Shield, label: t('개인정보처리방침'), page: 'privacy' },
    { Icon: LifeBuoy, label: t('고객지원'), page: 'support' },
  ];
  const items = [
    { Icon: User, label: t('프로필 편집'), desc: t('사진 · 전공 · 거주 도시 · 관심사'), to: '/profile/edit' },
    { Icon: Target, label: t('추천 설정'), desc: t('AroundU가 나를 이해하는 기준'), to: '/profile/wants' },
    { Icon: Lock, label: t('공개 범위 설정'), desc: t('프로필 항목별 공개 범위'), to: '/settings/privacy' },
    { Icon: ShieldAlert, label: t('계정 및 안전 설정'), desc: t('차단 목록, 메시지 수신 제한, 신고 내역'), to: '/settings/safety' },
  ];
  const simulateAlerts = async () => {
    const mine = savedSearches.filter((s) => s.userId === me.id && s.alert);
    if (mine.length === 0) { showToast(t('알림이 켜진 저장 검색이 없어요')); return; }
    try {
      for (const s of mine) await run(() => api.searches.run(me.id, s.id));
      showToast(lang === 'en' ? `Re-ran ${mine.length} saved search${mine.length > 1 ? 'es' : ''}. Check notifications.` : `저장 검색 ${mine.length}개를 다시 실행했어요. 알림을 확인해보세요.`, 'success');
    } catch { /* toast by run */ }
  };
  /** 데모: 단계 바꾸기 — 대학원생은 연구 분야 예시를, 졸업생은 하는 일 예시를 함께 넣는다 */
  const previewStage = async (k: StageKind) => {
    if (k === stageKind(me)) return;
    try {
      if (k === 'undergrad') { await run(() => api.users.setStage(me.id, 'undergrad')); await run(() => api.users.setResearch(me.id, null), t('학부생 화면으로 바꿨어요.')); }
      if (k === 'grad') { await run(() => api.users.setStage(me.id, 'masters')); await run(() => api.users.setResearch(me.id, { field: 'NLP', lab: lang === 'en' ? 'NLP Lab' : '자연어처리 연구실', year: 2, keywords: ['LLM', lang === 'en' ? 'Evaluation' : '평가'] }), t('대학원생 화면으로 바꿨어요.')); }
      if (k === 'alumni') await run(() => api.users.setStage(me.id, 'alumni', me.career?.industry ? undefined : (lang === 'en' ? { city: 'San Francisco', company: 'Startup', industry: 'AI', role: 'ML Engineer' } : { city: '서울', company: '스타트업', industry: 'AI', role: 'ML Engineer' })), t('졸업생 화면으로 바꿨어요.'));
      // 데모 계정은 질문 답변도 그 단계 질문으로
      if (me.id === 'u_me') await run(() => api.users.update(me.id, { prompts: DEMO_STAGE_PROMPTS[lang][k] }));
    } catch { /* toast by run */ }
  };
  const Row = ({ Icon, label, desc, onClick, tone }: { Icon: typeof User; label: string; desc?: string; onClick: () => void; tone?: 'danger' | 'primary' }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press">
      <Icon size={18} className={tone === 'danger' ? 'text-danger' : tone === 'primary' ? 'text-primary' : 'text-ink-2'} />
      <span className="flex-1 min-w-0"><span className={`block text-[14px] font-semibold ${tone === 'danger' ? 'text-danger' : ''}`}>{label}</span>{desc && <span className="block text-[12px] text-ink-3">{desc}</span>}</span>
      <ChevronRight size={18} className="text-ink-3" />
    </button>
  );
  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('설정')} />
      <div className="px-4 py-3 space-y-3">
        <div className="card divide-y divide-line">
          {items.map((it) => <Row key={it.to} Icon={it.Icon} label={it.label} desc={it.desc} onClick={() => nav(it.to)} />)}
        </div>

        {/* ── 지금 상태: "☕ 이번 주 커피 가능" — 기간이 지나면 자동으로 꺼짐 ── */}
        <div className="card divide-y divide-line">
          <Row Icon={Coffee} label={`${t('요즘 가능해요')} · ${t('지금 상태')}`} desc={myStatus ? statusText(myStatus) : `${t('상태 없음')} · ${t('기간이 지나면 자동으로 꺼져요')}`} onClick={() => nav('/profile/open-to')} />
          <Row Icon={Bookmark} label={t('저장한 사람')} desc={t('나만 볼 수 있어요')} onClick={() => nav('/profile/saved')} />
        </div>

        {/* ── 상태 (재학생 ↔ 졸업생) ── */}
        <div className="card divide-y divide-line">
          <Row Icon={GraduationCap} label={alumni ? `${t('상태')}: ${stageLabel(stageOf(me), lang)}` : t('졸업생으로 전환')} desc={alumni ? t('졸업 후 정보 · 재학생으로 되돌리기(데모)') : t('학교 연결은 그대로, 졸업 후에도 새로운 사람을 만나요')} onClick={() => nav('/profile/status')} />
        </div>

        <div className="card px-4 divide-y divide-line">
          <Toggle label={t('알림')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림')} checked={me.settings.notifications} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, notifications: val } }))} />
          <div className="py-3 flex items-start gap-3">
            <MapPin size={18} className="text-ink-2 mt-0.5" />
            <div className="flex-1">
              <div className="text-[14px] font-medium">{t('위치 (GPS)')} · {me.settings.locationPermission === 'granted' ? t('허용됨') : me.settings.locationPermission === 'denied' ? t('거부됨') : t('미설정')}</div>
              <div className="text-[12px] text-ink-3 mt-0.5">{t('GPS는 "지금 근처" 모임 추천에만 쓰여요. 프로필의 거주 도시·활동 지역과는 별개이고, 정확한 위치는 누구에게도 공개되지 않아요.')}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => run(() => api.users.update(me.id, { settings: { ...me.settings, locationPermission: me.settings.locationPermission === 'granted' ? 'denied' : 'granted' } }))}>{me.settings.locationPermission === 'granted' ? t('권한 끄기') : t('권한 허용')}</Button>
                <Button size="sm" variant="ghost" onClick={() => nav('/profile/edit')}>{t('거주 도시 바꾸기')}</Button>
              </div>
            </div>
          </div>
          <div className="py-3 flex items-center gap-3"><Bell size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-medium">{t('알림 확인')}</span><Button size="sm" variant="ghost" onClick={() => nav('/notifications')}>{t('열기')}</Button></div>
        </div>

        <div className="card px-4 py-3">
          <div className="text-[14px] font-medium mb-2">{t('언어')}</div>
          <Segmented value={lang} onChange={(l) => l !== lang && setLang(l)} options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} />
          <p className="text-[12px] text-ink-3 mt-2">{t('언어를 바꾸면 데모 데이터도 해당 언어의 캠퍼스로 바뀌어요.')}</p>
        </div>

        {/* ── 플랜 ── */}
        <div className="card divide-y divide-line">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Sparkles size={18} className="text-primary" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold">{plus ? 'AroundU+ · ' + t('구독 중') : t('무료 플랜')}</span>
              <span className="block text-[12px] text-ink-3">{plus ? t('Beyond 무제한 · 고급 필터 · 저장 검색 알림 · 광고 없음') : t('같은 학교 사람·동문·모임·피드는 모두 무료예요')}</span>
            </span>
            {plus
              ? <Button size="sm" variant="outline" onClick={() => run(() => api.users.setPlan(me.id, 'free'), t('AroundU+ 해지했어요.'))}>{t('구독 관리')}</Button>
              : <Button size="sm" onClick={() => nav('/plus')}>{t('AroundU+ 알아보기')}</Button>}
          </div>
          <Row Icon={Receipt} label={t('과금 구조')} desc={t('무료 · AroundU+ · 부스트')} onClick={() => nav('/pricing')} />
        </div>

        {/* ── 약관 · 개인정보 · 고객지원 (서버 공개 페이지) ── */}
        <div className="card divide-y divide-line">
          {legal.map((l) => (
            <a key={l.page} href={legalUrl(l.page)} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-4 py-3.5 text-left press">
              <l.Icon size={18} className="text-ink-2" />
              <span className="flex-1 text-[14px] font-semibold">{l.label}</span>
              <ExternalLink size={16} className="text-ink-3" />
            </a>
          ))}
        </div>

        <div className="card divide-y divide-line">
          <button onClick={async () => { await logout(); nav('/welcome', { replace: true }); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press"><LogOut size={18} className="text-ink-2" /><span className="flex-1 text-[14px] font-semibold">{t('로그아웃')}</span></button>
          <Row Icon={Trash2} tone="danger" label={t('계정 삭제')} desc={t('프로필과 활동 기록을 영구히 지워요')} onClick={() => setDeleteOpen(true)} />
        </div>

        {/* ── 데모 도구 ── */}
        <div className="card divide-y divide-line">
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-ink-3">{t('데모 도구')}</div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-semibold">{t('색 조합')}</div>
            <div className="text-[12px] text-ink-3 mb-2">{t('옅은 하늘 배경 · 맑은 파랑 버튼 · 짙은 회청 글자 — 세 가지를 비교해 봐요. 이 브라우저에만 저장돼요.')}</div>
            <Segmented value={palette} onChange={(p) => { setPalette(p); setPaletteState(p); }} options={PALETTE_IDS.map((id) => ({ value: id, label: PALETTES[id].name }))} />
          </div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-semibold">{t('단계 미리보기')}</div>
            <div className="text-[12px] text-ink-3 mb-2">{t('같은 계정으로 학부생 · 대학원생 · 졸업생 화면을 바꿔 봐요. 연결·기록은 그대로예요.')}</div>
            <Segmented value={stageKind(me)} onChange={previewStage} options={(['undergrad', 'grad', 'alumni'] as const).map((k) => ({ value: k, label: STAGE_KIND_LABELS()[k] }))} />
          </div>
          <Row Icon={RotateCcw} label={t('연결 요청 카운트 초기화')} desc={t('오늘 보낸 연결 요청 수를 0으로')} onClick={() => run(() => api.users.update(me.id, { swipes: { date: '1970-01-01', count: 0 } }), t('연결 요청 카운트를 초기화했어요.'))} />
          <Row Icon={RotateCcw} label={t('플랜 초기화')} desc={t('무료 플랜으로')} onClick={() => run(() => api.users.setPlan(me.id, 'free'), t('플랜을 초기화했어요.'))} />
          {alumni && <Row Icon={GraduationCap} label={t('재학생으로 되돌리기')} desc={t('연결·기록은 그대로, 홈이 재학생 기준으로')} onClick={() => run(() => api.users.setStage(me.id, 'undergrad'), t('재학생으로 되돌렸어요.'))} />}
          <Row Icon={BellRing} label={t('새 사람 알림 시뮬레이션')} desc={t('알림이 켜진 저장 검색을 다시 실행해요')} onClick={simulateAlerts} />
          <Row Icon={SplitSquareVertical} label={t('부분 오류 미리보기')} desc={t('다음에 여는 화면의 한 섹션만 실패시켜 재시도를 확인해요')} onClick={() => { try { sessionStorage.setItem(PARTIAL_FAIL_KEY, '1'); } catch { /* */ } showToast(t('다음에 여는 화면에서 한 섹션이 실패해요.')); }} />
          <Row Icon={Bug} label={t('오류 상태 미리보기')} desc={t('다음 API 요청 1회를 실패시켜 오류 화면을 확인해요')} onClick={() => { api.system.failNext(); showToast(t('다음 요청이 실패해요. 홈으로 돌아가 새로고침해보세요.')); init(); }} />
          <Row Icon={RotateCcw} tone="danger" label={t('데모 데이터 초기화')} desc={t('모든 변경 사항을 지우고 예시 데이터로 되돌려요')} onClick={async () => { await api.system.reset(); await logout(); nav('/welcome', { replace: true }); showToast(t('데모 데이터를 초기화했어요.')); }} />
        </div>
        <p className="text-center text-[11px] text-ink-3">{apiMode === 'mock' ? 'AroundU MVP · mock API (localStorage)' : 'AroundU'}</p>
      </div>
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
