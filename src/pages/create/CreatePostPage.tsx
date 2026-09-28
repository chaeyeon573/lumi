import { useMemo, useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Lock, ImageOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { PostInput } from '@core/api';
import type { PostType, Visibility } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field, Input, Textarea, Select, Cover, Toggle, Chip, Avatar, Segmented } from '@/components/ui';
import { composerPrompts } from '@core/lib/stage';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_POST_TYPES, POST_TYPE_LABELS, POST_TYPE_EMOJI, TOPIC_TAGS, VISIBILITY_LABELS } from '@core/lib/labels';
import { POST_VISIBILITIES } from '@core/lib/feed';
import { myGroups } from '@core/lib/meet';
import { friendsOf } from '@core/lib/relations';
import { photo } from '@/lib/assets';
import { cn } from '@core/lib/cn';

const EMOJIS = ['📷', '☕', '🍜', '📚', '🏃', '🎸', '🎨', '🌅', '🐈', '🎤', '💻', '🌸'];
/** 데모용 샘플 사진 — 실제 서비스에서는 카메라·앨범 업로드 */
const SAMPLE_PHOTOS = ['c_cafe_laptop', 'c_espresso', 'c_library', 'c_road_sunset', 'c_stage', 'c_bench', 'c_pizza', 'c_meadow'];
const MAX_PHOTOS = 4;
type PostVis = typeof POST_VISIBILITIES[number];
const isPostVis = (x: string | null): x is PostVis => !!x && (POST_VISIBILITIES as readonly string[]).includes(x);
const newPhoto = (i: number) => ({ emoji: EMOJIS[i % EMOJIS.length], hue: (i * 70 + 30) % 360, url: photo(SAMPLE_PHOTOS[(i + SAMPLE_PHOTOS.length - 1) % SAMPLE_PHOTOS.length]) });

/** 글쓰기 — 내용 · 사진 · 공개 범위(전체 / 내 학교 / 특정 그룹 / 팔로워)만 앞에. 종류·주제·태그·함께한 사람 등은 "더 보기" 아래 */
export function CreatePostPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const groups = useMemo(() => myGroups(orgs, v.me), [orgs, v.me]);
  const myActs = v.visibleActivities.filter((a) => a.hostId === v.me.id || v.myParticipation(a.id)?.status === 'approved');
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((id) => v.userById(id)!).filter(Boolean), [v]);
  const orgParam = params.get('org');
  const groupParam = params.get('group');
  const groupPre = groupParam && groups.some((o) => o.id === groupParam) ? groupParam : undefined;
  const visParam = params.get('vis');
  const anonPre = params.get('anon') === '1';
  // 피드 컴포저의 단계별 시작점 (수업 질문 · 연구 질문 · 근황 …) — topics 에 키로 저장
  const topicParam = params.get('topic');
  const prompt = topicParam ? (['undergrad', 'grad', 'alumni'] as const).flatMap((k) => composerPrompts(k)).find((x) => x.key === topicParam) : undefined;
  const [form, setForm] = useState<PostInput>({
    text: '', media: params.get('photo') === '1' ? [newPhoto(0)] : [], tags: [], topics: prompt ? [prompt.key] : [],
    visibility: anonPre ? 'school' : groupPre ? 'group' : isPostVis(visParam) ? visParam : 'school', groupId: groupPre,
    relatedActivityId: params.get('activity') ?? undefined, relatedOpportunityId: undefined,
    orgId: orgParam && adminOrgs.some((o) => o.id === orgParam) ? orgParam : undefined, anonymous: anonPre,
    postType: prompt?.postType ?? (params.get('type') as PostType | null) ?? 'story', taggedUserIds: [], recruitNext: false, showOnProfile: true, showOnFeed: true,
  });
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(!!form.orgId || (form.postType !== 'story' && !prompt));
  const [promptOn, setPromptOn] = useState(!!prompt);
  const patch = (p: Partial<PostInput>) => setForm((f) => ({ ...f, ...p }));
  const toggle = <T,>(arr: T[] | undefined, x: T) => (arr ?? []).includes(x) ? (arr ?? []).filter((y) => y !== x) : [...(arr ?? []), x];
  const anon = !!form.anonymous;
  const visOptions: { value: PostVis; label: string }[] = (anon ? (['school'] as PostVis[]) : POST_VISIBILITIES).map((vis) => ({ value: vis, label: VISIBILITY_LABELS[vis] }));
  const setVis = (vis: Visibility) => patch({ visibility: vis, groupId: vis === 'group' ? (form.groupId ?? groups[0]?.id) : undefined });
  const addTag = () => { if (tagInput.trim()) { patch({ tags: [...form.tags, tagInput.trim().replace(/^#/, '')] }); setTagInput(''); } };
  const valid = form.text.trim().length > 0 && (form.visibility !== 'group' || !!form.groupId);
  const groupName = form.groupId ? groups.find((o) => o.id === form.groupId)?.name : undefined;

  const submit = async () => {
    setBusy(true);
    try {
      await run(() => api.posts.create(v.me.id, { ...form, media: anon ? [] : form.media, taggedUserIds: anon ? [] : form.taggedUserIds, groupId: form.visibility === 'group' ? form.groupId : undefined }), t('게시물을 올렸어요.'));
      const to = form.visibility === 'group' && form.groupId ? `/orgs/${form.groupId}?tab=feed` : form.orgId ? `/orgs/${form.orgId}?tab=feed` : form.showOnFeed ? '/feed' : '/profile';
      nav(to, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={form.orgId ? t('조직 소식 작성') : groupName ? `${groupName} · ${t('글쓰기')}` : t('글쓰기')} />
      <div className="px-4 py-4 space-y-5">
        {prompt && promptOn && (
          <div className="flex items-center gap-2">
            <span className="h-8 px-3 rounded-full bg-accent-soft text-primary text-[13px] font-semibold flex items-center gap-1.5">{prompt.emoji} {prompt.label}</span>
            <button type="button" aria-label={t('닫기')} onClick={() => { setPromptOn(false); patch({ topics: (form.topics ?? []).filter((x) => x !== prompt.key), postType: 'story' }); }} className="h-8 w-8 rounded-full grid place-items-center text-ink-3 press"><X size={15} /></button>
          </div>
        )}
        <Field label={t('내용')} required><Textarea rows={5} className="min-h-[120px]" placeholder={prompt && promptOn ? prompt.placeholder : form.postType === 'question' ? t('무엇이 궁금해요?') : form.postType === 'together' ? t('무엇을 같이 하고 싶어요?') : t('무슨 일이 있나요?')} value={form.text} onChange={(e) => patch({ text: e.target.value })} maxLength={500} /></Field>
        <Field label={`${t('사진')} (${form.media.length}/${MAX_PHOTOS})`}>
          {anon ? <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-3 flex items-center gap-2"><ImageOff size={15} />{t('익명 글에는 사진을 붙일 수 없어요. 사진을 올리려면 익명을 끄세요.')}</div> : (<>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {form.media.map((m, i) => (
                <div key={i} className="relative shrink-0"><Cover emoji={m.emoji} hue={m.hue} url={m.url} className="h-24 w-24 rounded-2xl" size={36} />
                  <button onClick={() => patch({ media: form.media.filter((_, j) => j !== i) })} className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-ink text-white grid place-items-center"><X size={12} /></button></div>
              ))}
              {form.media.length < MAX_PHOTOS && <button onClick={() => patch({ media: [...form.media, newPhoto(form.media.length)] })} className="h-24 w-24 rounded-2xl border-2 border-dashed border-line grid place-items-center text-ink-3 shrink-0"><Plus size={22} /></button>}
            </div>
            {form.media.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{SAMPLE_PHOTOS.map((name) => <button key={name} onClick={() => patch({ media: form.media.map((m, i) => (i === form.media.length - 1 ? { ...m, url: photo(name) } : m)) })} className={cn('h-10 w-10 rounded-lg overflow-hidden', form.media[form.media.length - 1]?.url === photo(name) && 'ring-2 ring-primary')}><Cover emoji="" hue={0} url={photo(name)} className="h-full w-full" /></button>)}{EMOJIS.slice(0, 6).map((e) => <button key={e} onClick={() => patch({ media: form.media.map((m, i) => (i === form.media.length - 1 ? { ...m, emoji: e, url: undefined } : m)) })} className={cn('h-10 w-10 rounded-lg text-lg', !form.media[form.media.length - 1]?.url && form.media[form.media.length - 1]?.emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}>{e}</button>)}</div>}
          </>)}
        </Field>
        <Field label={t('공개 범위')} required hint={anon ? t('익명 글은 내 학교에만 보여요.') : t('인터넷 전체 공개는 없어요. 인증된 사용자 안에서만 보여요.')}>
          {anon ? <div className="h-11 rounded-2xl bg-surface-2 px-3.5 flex items-center text-[14px] text-ink-2">{VISIBILITY_LABELS.school}</div>
            : <Segmented value={form.visibility as PostVis} onChange={setVis} options={visOptions} />}
          {form.visibility === 'group' && !anon && (
            groups.length === 0
              ? <p className="mt-2 text-[12px] text-ink-3">{t('가입한 그룹이 없어요. 모임 › 그룹에서 찾아보세요.')}</p>
              : <Select className="mt-2" value={form.groupId ?? ''} onChange={(e) => patch({ groupId: e.target.value || undefined })}><option value="">{t('그룹 선택')}</option>{groups.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
          )}
        </Field>

        <button type="button" onClick={() => setMore((m) => !m)} className="w-full h-10 rounded-full bg-surface-2 text-[13px] font-semibold text-ink-2 flex items-center justify-center gap-1 press">{more ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{more ? t('접기') : t('더 보기')}</button>

        {more && (
          <div className="space-y-5">
            <Field label={t('종류')}><div className="flex flex-wrap gap-1.5">{ALL_POST_TYPES.filter((pt) => form.orgId ? true : pt !== 'news').map((pt) => <Chip key={pt} size="sm" active={form.postType === pt} onClick={() => patch({ postType: pt })}>{POST_TYPE_EMOJI[pt]} {POST_TYPE_LABELS[pt]}</Chip>)}</div></Field>
            <Field label={t('주제')}><div className="flex flex-wrap gap-1.5">{TOPIC_TAGS.map((tg) => <Chip key={tg.key} size="sm" active={form.topics?.includes(tg.key)} onClick={() => patch({ topics: toggle(form.topics, tg.key) })}>#{tg.label}</Chip>)}</div></Field>
            <Field label={t('태그 (학교·수업·동아리)')}>
              <div className="flex gap-2"><Input placeholder={t('태그 입력 후 추가')} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} /><Button variant="secondary" onClick={addTag}>{t('추가')}</Button></div>
              <div className="flex flex-wrap gap-1.5 mt-2">{[...new Set(v.me.timetable.map((c) => c.name))].slice(0, 3).map((c) => <Chip key={c} size="sm" active={form.courseTag === c} onClick={() => patch({ courseTag: form.courseTag === c ? undefined : c })}>📚 {c}</Chip>)}{form.tags.map((tg, i) => <button key={i} onClick={() => patch({ tags: form.tags.filter((_, j) => j !== i) })} className="rounded-lg bg-primary-soft text-primary text-[12px] font-semibold px-2 h-7 flex items-center gap-1">#{tg}<X size={11} /></button>)}</div>
            </Field>
            {!anon && (
              <Field label={t('함께한 사람')} hint={t('태그된 사람이 승인해야 그 사람 프로필에도 표시돼요.')}>
                <div className="flex flex-wrap gap-1.5">{friends.map((f) => <Chip key={f.id} size="sm" active={form.taggedUserIds?.includes(f.id)} onClick={() => patch({ taggedUserIds: toggle(form.taggedUserIds, f.id) })}><Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={18} /> {f.nickname}</Chip>)}{friends.length === 0 && <span className="text-[12px] text-ink-3">{t('친구가 없어요')}</span>}</div>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('참여한 활동')}><Select value={form.relatedActivityId ?? ''} onChange={(e) => patch({ relatedActivityId: e.target.value || undefined })}><option value="">{t('연결 안 함')}</option>{myActs.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select></Field>
              <Field label={t('관련 기회')}><Select value={form.relatedOpportunityId ?? ''} onChange={(e) => patch({ relatedOpportunityId: e.target.value || undefined })}><option value="">{t('연결 안 함')}</option>{opps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</Select></Field>
            </div>
            {!anon && <div className="card px-4"><Toggle label={t('다음 활동 같이할 사람 모집')} description={t('게시물에 "다음에는 같이하기" 버튼이 강조돼요.')} checked={!!form.recruitNext} onChange={(val) => patch({ recruitNext: val })} /></div>}
            {adminOrgs.length > 0 && !anon && <Field label={t('조직 이름으로 게시')}><Select value={form.orgId ?? ''} onChange={(e) => patch({ orgId: e.target.value || undefined, postType: e.target.value ? 'news' : form.postType })}><option value="">{t('내 이름으로')}</option>{adminOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>}
            <div className="card px-4 divide-y divide-line">
              <Toggle label={t('내 프로필에 표시')} checked={form.showOnProfile !== false && !anon} onChange={(val) => patch({ showOnProfile: val })} />
              <Toggle label={t('Feed에도 공개')} checked={form.showOnFeed !== false} onChange={(val) => patch({ showOnFeed: val })} />
              {!form.orgId && <Toggle label={t('익명으로 올리기')} description={t('이름과 사진 대신 "익명"으로 표시돼요. 익명은 글만 올릴 수 있고 학교명만 보여요. 신고 시 운영진이 확인할 수 있어요.')} checked={anon} onChange={(val) => patch({ anonymous: val, orgId: val ? undefined : form.orgId, media: val ? [] : form.media, visibility: val ? 'school' : form.visibility, groupId: val ? undefined : form.groupId })} />}
            </div>
            <p className="text-[11px] text-ink-3 flex items-start gap-1.5"><Lock size={12} className="shrink-0 mt-0.5" />{t('스토리·릴스·랭킹은 없어요. 사진은 캠퍼스 생활과 활동 기록에만 써요.')}</p>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!valid} loading={busy} onClick={submit}>{t('게시하기')}</Button>
      </div>
    </div>
  );
}
