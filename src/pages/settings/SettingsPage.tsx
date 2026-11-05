import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Eye, Globe, Lock, LogOut, MessageSquareText, ShieldCheck, User } from 'lucide-react';
import { lang, setLang } from '@core/i18n';
import { apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet } from '@/components/ui';
import { RowCard, cardCls } from '@/components/ha';
import { FeedbackSheet } from '@/components/layout/FeedbackTab';
import { appVersionLabel } from '@/lib/native';
import { cn } from '@core/lib/cn';
import { SubScreen } from '@/pages/profile/shared';

const en = lang === 'en';

/**
 * Settings (PDF S084): Your account (Edit Profile · Discovery & privacy · Visibility settings · Privacy & safety),
 * App (Notifications · Language), ⇥ Sign Out. 그 밑에 의견 보내기와 Privacy Policy · Terms (App Store 링크).
 * 계정 삭제는 Privacy & safety 안 (PDF S086). 예전 데모 도구·디자인 전환은 없다. Lumi+ 는 사장님 결정 전까지 넣지 않는다.
 */
export function SettingsPage() {
  const nav = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const [feedback, setFeedback] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const section = 'ha-h2 mt-7 mb-3';
  const version = appVersionLabel();
  return (
    <SubScreen title={en ? 'Settings' : '설정'}>
      <h2 className="ha-h2 mb-3">{en ? 'Your account' : '내 계정'}</h2>
      <div className="space-y-3">
        <RowCard tone="ice" icon={<User size={21} />} title={en ? 'Edit Profile' : '프로필 편집'} sub={en ? 'Name, bio and university' : '이름·소개·학교'} onClick={() => nav('/profile/edit')} />
        <RowCard tone="lav" icon={<Eye size={21} />} title={en ? 'Discovery & privacy' : '발견과 개인정보'} sub={en ? 'Classmates, memberships and preferences' : '같은 수업·멤버십·추천 설정'} onClick={() => nav('/settings/discovery')} />
        <RowCard tone="mint" icon={<Lock size={21} />} title={en ? 'Visibility settings' : '공개 범위'} sub={en ? 'Choose who sees what' : '누가 무엇을 볼지'} onClick={() => nav('/settings/privacy')} />
        <RowCard tone="peach" icon={<ShieldCheck size={21} />} title={en ? 'Privacy & safety' : '개인정보와 안전'} sub={en ? 'Block, report and account safety' : '차단·신고·계정 안전'} onClick={() => nav('/settings/safety')} />
      </div>
      <h2 className={section}>{en ? 'App' : '앱'}</h2>
      <div className="space-y-3">
        <RowCard tone="ice" icon={<Bell size={21} />} title={en ? 'Notifications' : '알림'} sub={en ? 'Control what reaches you' : '무엇을 받을지'} onClick={() => nav('/settings/notifications')} />
        <RowCard tone="rose" icon={<Globe size={21} />} title={en ? 'Language' : '언어'} sub={en ? 'English' : '한국어'} onClick={() => setLangOpen(true)} />
        <RowCard tone="lav" icon={<MessageSquareText size={21} />} title={en ? 'Send feedback' : '의견 보내기'} sub={en ? 'Ideas, bugs, anything confusing' : '아이디어·버그·헷갈린 점'} onClick={() => setFeedback(true)} />
      </div>
      <button onClick={async () => { await logout(); nav('/welcome', { replace: true }); }} className="mt-6 h-11 flex items-center gap-2 text-[15px] font-semibold text-sel-fg press">
        <LogOut size={18} />{en ? 'Sign Out' : '로그아웃'}
      </button>
      <div className="mt-6 flex items-center gap-2 text-[13px] text-ink-3">
        <button onClick={() => nav('/privacy')} className="press">Privacy Policy</button><span>·</span>
        <button onClick={() => nav('/terms')} className="press">Terms of Use</button>
        <span className="flex-1" />
        <span>{version ? `Lumi ${version}` : apiMode === 'remote' ? 'Lumi' : 'Lumi · offline demo'}</span>
      </div>
      <FeedbackSheet open={feedback} onClose={() => setFeedback(false)} />
      <BottomSheet open={langOpen} onClose={() => setLangOpen(false)} title={en ? 'Language' : '언어'}>
        <div className="space-y-2 pb-2">
          {([['en', 'English'], ['ko', '한국어']] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setLangOpen(false); if (k !== lang) setLang(k); }} className={cn(cardCls, 'w-full h-12 px-4 flex items-center justify-between text-left text-[15px] press', lang === k && 'border-sel-line text-sel-fg')}>
              {label}{lang === k && <Check size={18} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </SubScreen>
  );
}
