import { useNavigate } from 'react-router-dom';
import { t } from '@core/i18n';
import { Star, UserPlus, Clock, MapPin, X, Sparkles } from 'lucide-react';
import type { User } from '@core/types';
import { Portrait, VerifiedBadge, Tag, Button } from '@/components/ui';
import { INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS, ROLE_LABELS } from '@core/lib/labels';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { commonInterests } from '@core/lib/relations';
import { cn } from '@core/lib/cn';
import { highlightPrompt } from '@core/lib/prompts-fun';
import { isAlumniStage } from '@core/lib/network';
import { MutualLine } from '@/components/people_Mutual';
import { availabilityText } from '@core/lib/timetable';
import { matchReasons } from '@core/lib/recommend';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  user: User;
  onSkip?: () => void;
  compact?: boolean;
  className?: string;
}

export function affiliationText(u: User, showSchoolOverride?: boolean) {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const a = u.affiliation;
  const parts: string[] = [];
  if (showSchoolOverride ?? a.showSchool) parts.push(a.schoolName);
  if (a.showDepartment) parts.push(a.department);
  parts.push(ROLE_LABELS[a.role]);
  return parts.join(' · ');
}

/** 추천 사람 카드 — 사진뿐 아니라 관심사·소속·가능 시간·하고 싶은 활동을 함께 보여준다 */
export function PersonCard({ user, onSkip, compact, className }: Props) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const liked = v.iLike(user.id);
  const following = v.isFollowing(user.id);
  const common = commonInterests(v.me, user);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const reasons = matchReasons(v.me, user, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(user, 'timetable')).filter((r) => r.kind !== 'school');
  // 졸업생끼리는 시간표·공강을 쓰지 않는다
  const tt = !isAlumniStage(v.me) && !isAlumniStage(user) && v.canSeeField(user, 'timetable');
  const avail = availabilityText(user, tt);
  const hl = v.canSeeField(user, 'prompts') ? highlightPrompt(v.me, user) : undefined;
  const showAvail = avail.auto || (v.canSeeField(user, 'availability') && user.availability !== 'hidden');

  const like = async () => {
    const res = await run(() => api.relationships.toggleLike(v.me.id, user.id));
    if (res.mutual) useAppStore.getState().showToast(`${user.nickname}${t('님과 서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.')}`, 'success');
  };
  const follow = () => run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? undefined : `${user.nickname}${t('님을 팔로우해요')}`);

  return (
    <article className={cn('card overflow-hidden flex flex-col', compact ? 'w-[260px]' : 'w-full', className)}>
      <button onClick={() => nav(`/users/${user.id}`)} className="text-left">
        <Portrait emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} photoType={user.avatar.photoType} className={compact ? 'h-[168px]' : 'h-[220px]'} />
      </button>
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => nav(`/users/${user.id}`)} className="text-[16px] font-bold">{user.nickname}</button>
            {user.affiliation.type === 'university' && user.affiliation.emailVerified && <VerifiedBadge kind="school" />}
            {user.identityVerified && <VerifiedBadge kind="identity" />}
          </div>
          <div className="text-[12px] text-ink-3 mt-0.5 truncate">{affiliationText(user)}</div>
          {!v.isFriend(user.id) && <MutualLine user={user} className="mt-1" />}
        </div>
        {v.canSeeField(user, 'likes') && user.likes && <p className="text-[13px] text-ink-2 line-clamp-2">{user.likes}{t('를 좋아해요.')}</p>}
        <div className="flex flex-wrap gap-1">
          {(common.length ? common : user.interests.slice(0, 3)).slice(0, 3).map((i) => (
            <Tag key={i} tone={common.includes(i) ? 'primary' : 'neutral'}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Tag>
          ))}
          {common.length > 0 && <Tag tone="mint"><Sparkles size={11} /> {t('공통')} {common.length}</Tag>}
        </div>
        <div className="text-[12px] text-ink-2 space-y-0.5">
          {showAvail && <div className="flex items-center gap-1"><Clock size={12} className="text-ink-3" />{avail.text}{avail.auto && tt && <span className="text-[10px] text-mint font-semibold ml-0.5">{t('시간표')}</span>}</div>}
          <div className="flex items-center gap-1"><MapPin size={12} className="text-ink-3" />{user.region} {t('근처 ·')} {user.purposes.slice(0, 2).map((p) => PURPOSE_LABELS[p]).join(', ')}</div>
        </div>
        {reasons.length > 0 && <ul className="space-y-0.5">{reasons.slice(0, 2).map((r) => <li key={r.text} className="text-[12px] text-ink-2 flex items-start gap-1"><CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" /><span className="line-clamp-1">{r.text}</span></li>)}</ul>}
        {hl ? <div className="rounded-xl bg-primary-soft px-3 py-2"><div className="text-[11px] font-semibold text-ink-3 truncate">{hl.question}</div><div className="text-[13px] font-semibold text-ink leading-snug line-clamp-2">“{hl.answer}”</div></div>
          : user.nowWant && <div className="rounded-xl bg-primary-soft text-primary text-[13px] font-semibold px-3 py-2">“{user.nowWant}”</div>}
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <button onClick={like} aria-label={t('관심')} className={cn('h-10 w-10 rounded-xl grid place-items-center press', liked ? 'bg-heart text-white' : 'bg-heart-soft text-heart')}><Star size={18} fill={liked ? 'currentColor' : 'none'} /></button>
          <Button size="sm" className="flex-1 h-10" onClick={() => nav(`/users/${user.id}?propose=1`)}>{t('같이하기')}</Button>
          <Button size="sm" variant={following ? 'secondary' : 'outline'} className="h-10" onClick={follow} icon={<UserPlus size={15} />}>{following ? t('팔로잉') : t('팔로우')}</Button>
          {onSkip && <button onClick={onSkip} aria-label={t('넘기기')} className="h-10 w-10 rounded-xl grid place-items-center bg-surface-2 text-ink-3 press"><X size={18} /></button>}
        </div>
      </div>
    </article>
  );
}
