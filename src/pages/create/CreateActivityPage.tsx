import { useMemo, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { TILES_ENABLED, TILE_URL, LandmarkLayer } from '@/pages/map/MapPage';
import { MapPin } from 'lucide-react';
import type { ActivityInput } from '@core/api';
import type { ActivityCategory, ActivityKind, JoinPolicy, Visibility } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, Select, VisibilityList, EmptyState, Avatar, Cover } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS, JOIN_POLICY_LABELS, KIND_LABELS, ALL_CREW_TYPES, CREW_TYPE_LABELS, CREW_TYPE_EMOJI, MODE_LABELS } from '@core/lib/labels';
import { nowMin, toHHMM, todayIdx, toMin } from '@core/lib/timetable';
import { addDaysISO, formatDate, formatTime } from '@core/lib/format';
import type { CrewType } from '@core/types';
import { PLACE_PRESETS } from '@core/data/places';
import { LOOKING_FOR_ROLES, OFFER_ROLES, PERSON_ROLE_LABELS } from '@core/lib/labels';
import type { Role } from '@core/types';
import { todayISO } from '@core/lib/format';
import { friendsOf } from '@core/lib/relations';
import { cn } from '@core/lib/cn';
import { canPickPhotos, isNativeShell, shareOrCopy } from '@/lib/native';
import { shrinkPhoto } from '@/lib/photoUpload';
import { MEET_KINDS, MEET_KIND_CATEGORY } from '@/pages/meet/MeetPage';
import { Camera, Check, Globe, Users as UsersIcon, Lock as LockIcon, Share2, CalendarDays } from 'lucide-react';
import { QuickMeetup } from './QuickMeetup';

const COVER_HUES = [30, 220, 135, 285, 15, 175, 355, 100, 50, 235];

export function CreateActivityPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const editing = id ? v.visibleActivities.find((a) => a.id === id) : undefined;
  const kind = (editing?.kind ?? (params.get('kind') as ActivityKind) ?? 'personal') as ActivityKind;
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : 's_yonsei';
  const presets = PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'];
  const myOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id) || o.memberIds.includes(v.me.id));
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((fid) => v.userById(fid)!).filter(Boolean), [v]);
  const opps = useAppStore((s) => s.opportunities);
  const oppId = editing?.opportunityId ?? params.get('opportunity') ?? undefined;
  const opp = oppId ? opps.find((o) => o.id === oppId) : undefined;
  const isTeam = !!params.get('team') || !!opp?.rolesNeeded || !!editing?.rolesNeeded;
  const inviteId = params.get('invite');
  // Study Crew 모드: 수업 이름으로 묶이고 같은 수업 학생에게만 보인다
  const crewCourse = editing?.courseName ?? params.get('crew') ?? '';
  const isCrew = !!crewCourse;
  // 지금 만날 사람: 30분 뒤 시작, 90분
  const isNow = !!params.get('now');
  const orgParam = params.get('org');
  // Meet › Create a Meetup (2026-11-02 사장님 시안) — 사진·제목·종류 4개·설명·일시·장소·인원·공개 범위 3개만
  const isMeetup = !!params.get('meetup') && !isCrew && !isTeam && !editing;
  // 조직 행사 만들기 (사장님 시안: 운영진 → Create Event) — 사진·제목·조직·일시·장소·설명·공개 범위(Public / Members only)
  const isOrgEvent = kind === 'org_event' && !!params.get('event') && !editing;
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const simple = isMeetup || isOrgEvent;
  const crewDefaults = (() => {
    if (!crewCourse) return null;
    const mine = v.me.timetable.filter((c) => c.name === crewCourse);
    const today = todayIdx();
    const upcoming = mine.map((c) => ({ c, d: (c.day - today + 7) % 7 })).filter((x) => x.d > 0 || toMin(x.c.end) > nowMin()).sort((a, b) => a.d - b.d || toMin(a.c.start) - toMin(b.c.start))[0];
    const start = upcoming ? toMin(upcoming.c.end) + 15 : 18 * 60;
    return { date: upcoming ? addDaysISO(upcoming.d) : todayISO(), start: toHHMM(Math.min(start, 21 * 60)), end: toHHMM(Math.min(start + 90, 22 * 60)) };
  })();
  const nowStart = Math.ceil((nowMin() + 30) / 15) * 15;
  // 새 활동의 기본 날짜 — 저녁 6시 기본값이 이미 지났으면 내일 (밤에 열면 지난 시각이 기본으로 들어가던 것)
  const defaultDate = isNow || nowMin() < 17 * 60 + 30 ? todayISO() : addDaysISO(1);

  const [form, setForm] = useState<ActivityInput>(() => editing ? { ...editing } : isCrew ? {
    kind: 'group', category: 'study', title: `${crewCourse} ${CREW_TYPE_LABELS.exam} Study Crew`, description: lang === 'en' ? `Study crew for ${crewCourse}. Split the material, explain to each other.` : `${crewCourse} 같이 준비해요. 범위 나눠서 서로 설명하기.`, cover: { emoji: '📝', hue: 220 },
    courseName: crewCourse, crewType: 'exam', mode: 'offline', date: crewDefaults!.date, startTime: crewDefaults!.start, endTime: crewDefaults!.end, place: presets[0], capacity: 4, fee: 0, conditions: '',
    joinPolicy: 'open', visibility: 'department', visibilityTargets: [`course:${crewCourse}`], invitedIds: [],
  } : {
    kind, category: (params.get('cat') as ActivityCategory | null) ?? (kind === 'org_event' ? 'club' : opp ? (opp.type === 'hackathon' || opp.type === 'startup' ? 'networking' : 'study') : isNow ? 'meal' : 'coffee'), title: opp ? `${opp.title}${t(' 같이 준비해요')}` : '', description: opp ? `${opp.title}${t('에 함께 지원·참가할 사람을 찾아요.')}` : '', cover: opp ? opp.cover : { emoji: isNow ? '🍱' : '☕', hue: 30 },
    opportunityId: oppId, rolesNeeded: opp?.rolesNeeded ?? (isTeam ? [] : undefined), openSlot: isNow || undefined, mode: isTeam ? 'offline' : undefined,
    date: params.get('date') ?? defaultDate, startTime: params.get('start') ?? (isNow ? toHHMM(Math.min(nowStart, 23 * 60)) : '18:00'), endTime: params.get('end') ?? (isNow ? toHHMM(Math.min(nowStart + 90, 23 * 60 + 30)) : '19:30'), place: presets[0], capacity: kind === 'personal' ? 4 : 10, fee: 0, conditions: '',
    joinPolicy: kind === 'personal' || params.get('meetup') || params.get('event') ? 'open' : 'approval', visibility: 'school', visibilityTargets: [], invitedIds: inviteId ? [inviteId] : [], orgId: kind === 'org_event' ? (orgParam && myOrgs.some((o) => o.id === orgParam) ? orgParam : myOrgs[0]?.id) : undefined,
  });
  const patch = (p: Partial<ActivityInput>) => setForm((f) => ({ ...f, ...p }));
  const setCategory = (c: ActivityCategory) => patch({ category: c, cover: { emoji: CATEGORY_EMOJI[c], hue: form.cover.hue } });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const addPhoto = async (file: File) => {
    setUploading(true);
    try { const { url } = await api.system.uploadPhoto(await shrinkPhoto(file)); patch({ cover: { ...form.cover, url } }); }
    catch (e) { showToast((e as Error).message, 'error'); } finally { setUploading(false); }
  };
  const [customPlace, setCustomPlace] = useState(false);

  // 즉석 만남은 짧은 양식 — 무엇·언제·어디 (QuickMeetup). 긴 양식은 '활동 만들기'와 그 양식의 '자세히 정하기'로
  if (isNow && !isMeetup && !editing && !isCrew && !isTeam && !opp) return <QuickMeetup presets={presets} inviteId={inviteId} />;
  if (id && !editing) return <div className="min-h-full"><TopBar back title={t('활동 수정')} /><EmptyState emoji="🔒" title={t('수정할 수 없는 활동이에요')} /></div>;
  if (editing && editing.hostId !== v.me.id) return <div className="min-h-full"><TopBar back title={t('활동 수정')} /><EmptyState emoji="🔒" title={t('주최자만 수정할 수 있어요')} /></div>;

  // 새 활동은 지난 시각으로 열 수 없다
  const past = !editing && (form.date < todayISO() || (form.date === todayISO() && toMin(form.startTime) < nowMin()));
  const valid = (!isOrgEvent || !!form.orgId) && form.title.trim().length >= 2 && form.description.trim().length > 0 && form.place.name && form.capacity > 0 && form.startTime < form.endTime && !past;
  // 영어는 '오늘 18:00 Doe Library 에서 …' 어순을 그대로 옮기면 'Today 18:00 Doe Library at …' 가 된다 — 날짜·시각·장소·제목 순으로
  const preview = lang === 'en'
    ? [`${formatDate(form.date)} ${formatTime(form.startTime)}`, form.place.name, form.title || '…'].filter(Boolean).join(' · ')
    : `${formatDate(form.date)} ${formatTime(form.startTime)} ${form.place.name}${t('에서 ')}${form.title || '…'}`;

  const submit = async () => {
    setBusy(true);
    try {
      const input: ActivityInput = { ...form, conditions: form.conditions?.trim() || undefined, visibilityTargets: form.visibility === 'department' && !form.visibilityTargets?.length ? [v.me.affiliation.type === 'university' ? v.me.affiliation.department : ''] : form.visibilityTargets };
      if (editing) {
        await run(() => api.activities.update(editing.id, input), t('활동을 수정했어요.'));
        nav(`/activities/${editing.id}`, { replace: true });
      } else {
        // 회원만: 고른 조직의 지금 회원으로 (조직을 바꾼 뒤에도 맞게)
        if (isOrgEvent && input.visibility === 'selected') { const o = adminOrgs.find((x) => x.id === input.orgId); input.visibilityTargets = o ? [...new Set([...o.memberIds, ...o.adminIds])] : []; }
        const res = await run(() => api.activities.create(v.me.id, input), simple ? undefined : t('활동을 만들었어요!'));
        if (simple) { setCreated(res.activity.id); setBusy(false); } else nav(`/activities/${res.activity.id}`, { replace: true });
      }
    } catch { setBusy(false); }
  };

  if (created) {
    const url = `${window.location.origin}/activities/${created}`;
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-8 text-center bg-bg">
        <span className="h-24 w-24 rounded-full bg-t-mint grid place-items-center text-t-mint-fg"><Check size={48} strokeWidth={2.4} /></span>
        <h1 className="font-display text-[24px] font-extrabold mt-6">{isOrgEvent ? (lang === 'en' ? 'Event Created!' : '행사를 올렸어요!') : (lang === 'en' ? 'Meetup Created!' : '모임을 만들었어요!')}</h1>
        <p className="text-[14px] text-ink-3 mt-2">{isOrgEvent ? (lang === 'en' ? (form.visibility === 'selected' ? 'Your members can see it now.' : 'Your event is now live on Explore.') : (form.visibility === 'selected' ? '회원에게 바로 보여요.' : 'Explore 에 바로 올라갔어요.')) : (lang === 'en' ? 'Your meetup is now live on Meet.' : 'Meet 에 바로 올라갔어요.')}</p>
        <div className="w-full max-w-[320px] mt-8 space-y-2.5">
          {isOrgEvent && <Button full size="lg" icon={<Share2 size={18} />} onClick={async () => { if (await shareOrCopy({ title: form.title, url }) === 'copied') showToast(t('링크를 복사했어요.')); }}>{lang === 'en' ? 'Share Link' : '링크 공유'}</Button>}
          <Button full size="lg" variant={isOrgEvent ? 'outline' : 'primary'} icon={<CalendarDays size={18} />} onClick={() => nav(`/activities/${created}`, { replace: true })}>{isOrgEvent ? (lang === 'en' ? 'View Event' : '행사 보기') : (lang === 'en' ? 'View Meetup' : '모임 보기')}</Button>
          {isOrgEvent && form.orgId && <Button full size="lg" variant="outline" icon={<UsersIcon size={18} />} onClick={() => nav(`/orgs/${form.orgId}?tab=events`, { replace: true })}>{lang === 'en' ? 'View Organization' : '조직 보기'}</Button>}
          {!isOrgEvent && <Button full size="lg" variant="outline" icon={<Share2 size={18} />} onClick={async () => { if (await shareOrCopy({ title: form.title, url }) === 'copied') showToast(t('링크를 복사했어요.')); }}>{lang === 'en' ? 'Share Link' : '링크 공유'}</Button>}
          {isOrgEvent && <p className="text-[12px] text-ink-3 pt-1">{lang === 'en' ? 'Share it in your Instagram, GroupMe or group chats.' : '인스타그램·단톡방에 링크를 올려 보세요.'}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={isOrgEvent ? (lang === 'en' ? 'Create Event' : '행사 만들기') : isMeetup ? (lang === 'en' ? 'Create a Meetup' : '모임 만들기') : editing ? t('활동 수정') : isCrew ? t('Study Crew 만들기') : isNow ? t('지금 만날 사람 찾기') : isTeam ? t('팀·준비방 만들기') : `${KIND_LABELS[kind]}${t(' 만들기')}`} />
      <div className="px-4 py-4 space-y-5">
        {simple && canPickPhotos() && apiMode === 'remote' && (
          <label className={cn('block relative h-[160px] rounded-[20px] overflow-hidden cursor-pointer press', !form.cover.url && 'bg-surface-2 border-2 border-dashed border-line')}>
            {form.cover.url ? <Cover emoji={form.cover.emoji} hue={form.cover.hue} url={form.cover.url} className="h-full w-full" size={32} /> : null}
            <span className={cn('absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[13px] font-semibold', form.cover.url ? 'bg-black/30 text-white' : 'text-ink-3')}><Camera size={24} />{uploading ? (lang === 'en' ? 'Uploading…' : '올리는 중…') : form.cover.url ? (lang === 'en' ? 'Change photo' : '사진 바꾸기') : (lang === 'en' ? 'Add Photo' : '사진 추가')}</span>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addPhoto(f); }} />
          </label>
        )}
        {isNow && <div className="rounded-xl bg-accent-soft text-[13px] px-3 py-2.5">⚡ {t('30분 뒤 시작으로 맞춰뒀어요. 시간이 맞는 사람의 발견 › Now에 바로 보여요.')}</div>}
        {isCrew && (
          <div className="card p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-[13px]"><span className="text-xl">📚</span><span><span className="text-[11px] text-ink-3 block">{t('수업')}</span><b>{crewCourse}</b></span><span className="ml-auto text-[11px] text-ink-3">{t('같은 수업 학생에게만 보여요')}</span></div>
            <Field label={t('유형')} required><div className="flex flex-wrap gap-1.5">{ALL_CREW_TYPES.map((ct) => <Chip key={ct} size="sm" active={form.crewType === ct} onClick={() => patch({ crewType: ct as CrewType, title: `${crewCourse} ${CREW_TYPE_LABELS[ct]} Study Crew`, cover: { ...form.cover, emoji: CREW_TYPE_EMOJI[ct] } })}>{CREW_TYPE_EMOJI[ct]} {CREW_TYPE_LABELS[ct]}</Chip>)}</div></Field>
            <Field label={t('방식')} required><div className="flex gap-1.5">{(['offline', 'online'] as const).map((m) => <Chip key={m} size="sm" active={form.mode === m} onClick={() => patch({ mode: m, place: m === 'online' ? { name: lang === 'en' ? 'Online (Zoom)' : '온라인 (Zoom)', lat: presets[0].lat, lng: presets[0].lng } : presets[0] })}>{MODE_LABELS[m]}</Chip>)}</div></Field>
          </div>
        )}
        {kind === 'org_event' && !isOrgEvent && (
          <Field label={t('주최 조직')} hint={myOrgs.length ? undefined : t('가입된 조직이 없어 개인 이름으로 등록돼요. 학생 동아리 행사 등록은 무료예요.')}>
            {myOrgs.length ? <Select value={form.orgId ?? ''} onChange={(e) => patch({ orgId: e.target.value || undefined })}><option value="">{t('개인 이름으로')}</option>{myOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select> : null}
          </Field>
        )}
        {opp && <div className="card p-3 flex items-center gap-3"><span className="text-2xl">{opp.cover.emoji}</span><span className="flex-1 text-[13px]"><span className="text-[11px] text-ink-3 block">{t('연결된 기회')}</span><b>{opp.title}</b></span></div>}
        {isTeam && (
          <Field label={t('필요한 역할')} hint={t('맞는 역할을 가진 사람에게 먼저 추천돼요')}>
            <div className="flex flex-wrap gap-2">{[...new Set([...OFFER_ROLES, ...LOOKING_FOR_ROLES.filter((r) => ['teammate', 'cofounder', 'study_partner', 'application_partner'].includes(r))])].map((r) => <Chip key={r} size="sm" active={form.rolesNeeded?.includes(r)} onClick={() => patch({ rolesNeeded: form.rolesNeeded?.includes(r) ? form.rolesNeeded.filter((x) => x !== r) : [...(form.rolesNeeded ?? []), r as Role] })}>{PERSON_ROLE_LABELS[r]}</Chip>)}</div>
          </Field>
        )}
        {inviteId && form.invitedIds?.includes(inviteId) && <div className="rounded-xl bg-mint-soft text-[13px] px-3 py-2">✅ {v.userById(inviteId)?.nickname}{t('님을 바로 참가자로 초대해요.')}</div>}
        {isTeam && !isCrew && <Field label={t('방식')}><div className="flex gap-1.5">{(['offline', 'online'] as const).map((m) => <Chip key={m} size="sm" active={form.mode === m} onClick={() => patch({ mode: m })}>{MODE_LABELS[m]}</Chip>)}</div></Field>}
        {isOrgEvent && <Field label={lang === 'en' ? 'Event Title' : '행사 이름'} required><Input placeholder={lang === 'en' ? 'e.g. Spring Social' : '예: 봄 소셜'} value={form.title} onChange={(e) => patch({ title: e.target.value })} maxLength={60} /></Field>}
        {isOrgEvent && <Field label={lang === 'en' ? 'Organization' : '주최 조직'} required>{adminOrgs.length ? <Select value={form.orgId ?? ''} onChange={(e) => patch({ orgId: e.target.value || undefined })}>{adminOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select> : <p className="text-[13px] text-ink-3">{lang === 'en' ? 'Only organization admins can post events. Ask your officers to add you as an admin.' : '조직 운영진만 행사를 올릴 수 있어요.'}</p>}</Field>}
        {isMeetup && <Field label={t('제목')} required><Input placeholder={lang === 'en' ? 'e.g. Coffee & Catch Up' : '예: 커피 한잔해요'} value={form.title} onChange={(e) => patch({ title: e.target.value })} maxLength={60} /></Field>}
        {isMeetup && <Field label={lang === 'en' ? 'Category' : '종류'} required>
          <div className="grid grid-cols-4 gap-2">{MEET_KINDS.map((k) => { const on = MEET_KIND_CATEGORY[k.key] === form.category || (k.cats as readonly string[]).includes(form.category) && !MEET_KINDS.some((x) => MEET_KIND_CATEGORY[x.key] === form.category); return (
            <button key={k.key} type="button" onClick={() => setCategory(MEET_KIND_CATEGORY[k.key])} className={cn('rounded-2xl h-[72px] flex flex-col items-center justify-center gap-1 border-2 press', k.tone, on ? 'border-sel' : 'border-transparent')}>
              <k.Icon size={20} /><span className="text-[12px] font-semibold text-ink">{k.title}</span>
            </button>); })}</div>
        </Field>}
        {!isCrew && !simple && <Field label={t('활동 종류')} required>
          <div className="flex flex-wrap gap-2">{ALL_CATEGORIES.map((c) => <Chip key={c} color={CATEGORY_COLORS[c]} active={form.category === c} onClick={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
        </Field>}
        {!simple && <Field label={t('제목')} required><Input placeholder={t('예: 오늘 오후 6시 신촌에서 커피 마실 사람?')} value={form.title} onChange={(e) => patch({ title: e.target.value })} maxLength={60} /></Field>}
        <Field label={t('설명')} required><Textarea placeholder={t('예: 창업이나 AI에 관심 있는 분이면 좋아요. 최대 4명.')} value={form.description} onChange={(e) => patch({ description: e.target.value })} maxLength={500} /></Field>
        {!(simple && canPickPhotos() && apiMode === 'remote') && <Field label={t('대표 이미지')} hint={isNativeShell() || apiMode === 'remote' ? undefined : t('데모에서는 색상과 이모지로 대표 이미지를 만들어요.')}>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl grid place-items-center text-3xl shrink-0" style={{ background: `linear-gradient(135deg, hsl(${form.cover.hue} 80% 92%), hsl(${(form.cover.hue + 50) % 360} 70% 68%))` }}>{form.cover.emoji}</div>
            <div className="flex flex-wrap gap-1.5">{COVER_HUES.map((h) => <button key={h} type="button" onClick={() => patch({ cover: { ...form.cover, hue: h } })} className={cn('h-7 w-7 rounded-full', form.cover.hue === h && 'ring-2 ring-offset-2 ring-ink')} style={{ background: `hsl(${h} 75% 70%)` }} aria-label={`${t('색상 ')}${h}`} />)}</div>
          </div>
        </Field>}
        {/* 날짜를 한 줄로 — 세 칸에 나누면 “10/17/2(” 처럼 잘리고 시간의 AM/PM 이 가려져 6 PM 이 06:00 으로 보인다 */}
        <Field label={t('날짜')} required><Input type="date" min={todayISO()} value={form.date} onChange={(e) => patch({ date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('시작')} required><Input type="time" value={form.startTime} onChange={(e) => patch({ startTime: e.target.value })} /></Field>
          <Field label={t('종료')} required><Input type="time" value={form.endTime} onChange={(e) => patch({ endTime: e.target.value })} /></Field>
        </div>
        {past && <p className="text-[12px] text-danger -mt-3">{lang === 'en' ? 'That time has already passed — pick a later time.' : '이미 지난 시각이에요. 더 뒤로 골라주세요.'}</p>}
        <Field label={t('장소')} required hint={t('선택한 장소만 지도에 표시돼요. 내 위치는 공개되지 않아요.')}>
          <div className="flex flex-wrap gap-1.5 mb-2">{presets.map((p) => <Chip key={p.name} size="sm" active={form.place.name === p.name} onClick={() => { patch({ place: p }); setCustomPlace(false); }}>{p.name}</Chip>)}<Chip size="sm" active={customPlace} onClick={() => setCustomPlace(true)}><MapPin size={12} /> {t('지도에서 직접')}</Chip></div>
          {customPlace && (
            <div className="space-y-2">
              <Input placeholder={t('장소 이름')} value={form.place.name} onChange={(e) => patch({ place: { ...form.place, name: e.target.value } })} />
              <div className="h-[180px] rounded-xl overflow-hidden border border-line">
                <MapContainer center={[form.place.lat, form.place.lng]} zoom={16} className={`h-full w-full z-0 ${TILES_ENABLED ? '' : 'no-tiles'}`} zoomControl={false} attributionControl={false}>
                  {TILES_ENABLED ? <TileLayer url={TILE_URL} /> : <LandmarkLayer schoolId={schoolId} />}
                  <ClickToPlace onPick={(lat, lng) => patch({ place: { ...form.place, lat, lng } })} />
                  <Marker position={[form.place.lat, form.place.lng]} icon={L.divIcon({ className: 'leaflet-div-icon', html: `<div class="au-marker" style="background:${CATEGORY_COLORS[form.category]}"><span>${CATEGORY_EMOJI[form.category]}</span></div>`, iconSize: [36, 36], iconAnchor: [18, 34] })} />
                </MapContainer>
              </div>
              <p className="text-[11px] text-ink-3">{t('지도를 탭해서 위치를 옮길 수 있어요.')}</p>
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('모집 인원')} required><Input type="number" min={1} value={form.capacity} onChange={(e) => patch({ capacity: Math.max(1, Number(e.target.value)) })} /></Field>
          {!simple && <Field label={t('참가비 (원)')}><Input type="number" min={0} step={1000} value={form.fee} onChange={(e) => patch({ fee: Math.max(0, Number(e.target.value)) })} /></Field>}
        </div>
        {!simple && <Field label={t('참가 조건 (선택)')}><Input placeholder={t('예: 창업이나 AI에 관심 있는 분')} value={form.conditions ?? ''} onChange={(e) => patch({ conditions: e.target.value })} /></Field>}
        {!simple && <Field label={t('참가 승인 방식')} required>
          <div className="space-y-1.5">{(Object.keys(JOIN_POLICY_LABELS) as JoinPolicy[]).map((j) => (
            <button key={j} type="button" onClick={() => patch({ joinPolicy: j })} className={cn('w-full text-left rounded-xl px-3.5 h-11 text-[14px] font-medium border flex items-center justify-between', form.joinPolicy === j ? 'border-sel-line bg-sel-soft' : 'border-line')}>{JOIN_POLICY_LABELS[j]}<span className={cn('h-4 w-4 rounded-full border-2', form.joinPolicy === j ? 'border-sel bg-sel' : 'border-line')} /></button>
          ))}</div>
          {form.joinPolicy === 'invite' && (
            <div className="mt-2"><p className="text-[12px] text-ink-3 mb-1.5">{t('초대할 친구')}</p><div className="flex flex-wrap gap-1.5">{friends.map((f) => <Chip key={f.id} size="sm" active={form.invitedIds?.includes(f.id)} onClick={() => patch({ invitedIds: form.invitedIds?.includes(f.id) ? form.invitedIds.filter((x) => x !== f.id) : [...(form.invitedIds ?? []), f.id] })}>{f.avatar.emoji} {f.nickname}</Chip>)}{friends.length === 0 && <span className="text-[12px] text-ink-3">{t('친구가 없어요')}</span>}</div></div>
          )}
        </Field>}
        {isMeetup && <Field label={lang === 'en' ? 'Visibility' : '공개 범위'} required>
          <div className="space-y-2">{([
            { key: 'public', Icon: Globe, title: lang === 'en' ? 'Public' : '전체 공개', desc: lang === 'en' ? `Anyone at ${v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : 'your school'} can see and join` : '우리 학교 학생 누구나 보고 참여', on: form.joinPolicy !== 'invite' && form.visibility === 'school', set: { visibility: 'school' as Visibility, joinPolicy: 'open' as JoinPolicy } },
            { key: 'network', Icon: UsersIcon, title: lang === 'en' ? 'My Network' : '내 네트워크', desc: lang === 'en' ? 'Friends and mutual connections only' : '친구와 서로 아는 사람만', on: form.joinPolicy !== 'invite' && form.visibility === 'friends', set: { visibility: 'friends' as Visibility, joinPolicy: 'open' as JoinPolicy } },
            { key: 'invite', Icon: LockIcon, title: lang === 'en' ? 'Invite Only' : '초대한 사람만', desc: lang === 'en' ? 'Only the friends you invite can see and join' : '초대한 친구만 보고 참여', on: form.joinPolicy === 'invite', set: { visibility: 'private' as Visibility, joinPolicy: 'invite' as JoinPolicy } },
          ]).map((o) => (
            <button key={o.key} type="button" onClick={() => patch(o.set)} className={cn('w-full rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left border-2', o.on ? 'border-sel-line bg-sel-soft' : 'border-line')}>
              <o.Icon size={19} className="text-ink-2 shrink-0" /><span className="flex-1 min-w-0"><span className="block text-[14px] font-bold">{o.title}</span><span className="block text-[12px] text-ink-3">{o.desc}</span></span>
            </button>
          ))}</div>
          {form.joinPolicy === 'invite' && <div className="mt-2 flex flex-wrap gap-1.5">{friends.length ? friends.map((f) => <Chip key={f.id} size="sm" active={form.invitedIds?.includes(f.id)} onClick={() => patch({ invitedIds: form.invitedIds?.includes(f.id) ? form.invitedIds.filter((x) => x !== f.id) : [...(form.invitedIds ?? []), f.id] })}>{f.nickname}</Chip>) : <span className="text-[12px] text-ink-3">{lang === 'en' ? 'Add friends first — or share the link after creating.' : '먼저 친구를 추가하거나, 만든 뒤 링크를 공유하세요.'}</span>}</div>}
        </Field>}
        {isOrgEvent && <Field label={lang === 'en' ? 'Visibility' : '공개 범위'} required>
          <div className="space-y-2">{([
            { key: 'public', Icon: Globe, title: lang === 'en' ? 'Public (Show on Explore)' : '전체 공개 (Explore 에 표시)', desc: lang === 'en' ? 'Anyone at your school can see and RSVP' : '우리 학교 누구나 보고 RSVP', on: form.visibility === 'school', set: { visibility: 'school' as Visibility, visibilityTargets: [] } },
            { key: 'members', Icon: LockIcon, title: lang === 'en' ? 'Members only' : '회원만', desc: lang === 'en' ? 'Only your organization’s members can see' : '우리 조직 회원만 볼 수 있어요', on: form.visibility === 'selected', set: { visibility: 'selected' as Visibility, visibilityTargets: (() => { const o = adminOrgs.find((x) => x.id === form.orgId); return o ? [...new Set([...o.memberIds, ...o.adminIds])] : []; })() } },
          ]).map((o) => (
            <button key={o.key} type="button" onClick={() => patch(o.set)} className={cn('w-full rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left border-2', o.on ? 'border-sel-line bg-sel-soft' : 'border-line')}>
              <o.Icon size={19} className="text-ink-2 shrink-0" /><span className="flex-1 min-w-0"><span className="block text-[14px] font-bold">{o.title}</span><span className="block text-[12px] text-ink-3">{o.desc}</span></span>
            </button>
          ))}</div>
        </Field>}
        {simple ? null : isCrew ? <div className="rounded-xl bg-primary-soft text-[13px] px-3 py-2.5">🔒 {t('공개 범위: 같은 수업을 듣는 사람만. 시간표에 이 수업이 있는 학생에게만 보여요.')}</div> : <Field label={t('공개 범위')} required>
          <VisibilityList value={form.visibility} options={['public', 'school', 'department', 'friends', 'selected']} onChange={(vis: Visibility) => patch({ visibility: vis })} />
          {form.visibility === 'department' && <Input className="mt-2" placeholder={t('학과·조직 이름 (예: 컴퓨터과학과)')} value={form.visibilityTargets?.[0] ?? ''} onChange={(e) => patch({ visibilityTargets: e.target.value ? [e.target.value] : [] })} />}
          {form.visibility === 'selected' && (
            <div className="mt-2 flex flex-wrap gap-1.5">{friends.map((f) => <Chip key={f.id} size="sm" active={form.visibilityTargets?.includes(f.id)} onClick={() => patch({ visibilityTargets: form.visibilityTargets?.includes(f.id) ? form.visibilityTargets.filter((x) => x !== f.id) : [...(form.visibilityTargets ?? []), f.id] })}><Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={18} /> {f.nickname}</Chip>)}</div>
          )}
        </Field>}
        <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2"><b>{t('미리보기')}</b> · {preview}</div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>{editing ? t('수정 완료') : isCrew ? t('Crew 열기') : isNow ? t('지금 열기') : isOrgEvent ? (lang === 'en' ? 'Create Event' : '행사 올리기') : isMeetup ? (lang === 'en' ? 'Create Meetup' : '모임 만들기') : t('활동 만들기')}</Button>
      </div>
    </div>
  );
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

