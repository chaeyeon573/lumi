import { useMemo, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Lock, ImageOff } from 'lucide-react';
import type { PostInput } from '@core/api';
import type { PostType, Visibility } from '@core/types';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Field, Input, Textarea, Select, VisibilityList, Cover, Toggle, Chip, Avatar } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_POST_TYPES, POST_TYPE_LABELS, POST_TYPE_EMOJI, TOPIC_TAGS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { cn } from '@core/lib/cn';
import { SampleTag } from '@/components/ui/SampleTag';
import { isNativeShell } from '@/lib/native';
import { shrinkPhoto } from '@/lib/photoUpload';

const MAX_PHOTOS = 4;

/** 개인 포스트: 사진 1~4장 + 짧은 글, 종류·주제·함께한 사람·관련 활동, 공개 범위와 노출 위치 */
export function CreatePostPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const allOpps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  // 관련 기회는 내가 저장·표시한 것만 — 전체 수백 개(같은 제목 “Gathering” 여러 개)를 드롭다운에 넣으면 고를 수가 없다
  const myOppIds = new Set(intents.filter((i) => i.userId === v.me.id).map((i) => i.opportunityId));
  const opps = allOpps.filter((o) => myOppIds.has(o.id));
  const myOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const myActs = v.visibleActivities.filter((a) => a.hostId === v.me.id || v.myParticipation(a.id)?.status === 'approved');
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((id) => v.userById(id)!).filter(Boolean), [v]);
  const orgParam = params.get('org');
  const showToast = useAppStore((x) => x.showToast);
  const [uploading, setUploading] = useState(false);
  // 학생 본인 사진 — 줄여서(위치정보 제거) 올린 뒤 주소를 글에 붙인다 (src/lib/photoUpload.ts, server/media.ts)
  const addPhoto = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.system.uploadPhoto(await shrinkPhoto(file));
      setForm((x) => ({ ...x, media: [...x.media, { emoji: '📷', hue: 210, url }].slice(0, MAX_PHOTOS) }));
    } catch (e) { showToast((e as Error).message && !/too large/.test((e as Error).message) ? (e as Error).message : t('사진을 올리지 못했어요. 다시 시도해 주세요.')); }
    finally { setUploading(false); }
  };
  const [form, setForm] = useState<PostInput>({
    text: '', media: [], tags: [], topics: [], visibility: 'school', relatedActivityId: params.get('activity') ?? undefined, relatedOpportunityId: undefined,
    orgId: orgParam && myOrgs.some((o) => o.id === orgParam) ? orgParam : undefined, anonymous: params.get('anon') === '1',
    postType: (params.get('type') as PostType | null) ?? 'story', taggedUserIds: [], recruitNext: false, showOnProfile: true, showOnFeed: true,
  });
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<PostInput>) => setForm((f) => ({ ...f, ...p }));
  const toggle = <T,>(arr: T[] | undefined, x: T) => (arr ?? []).includes(x) ? (arr ?? []).filter((y) => y !== x) : [...(arr ?? []), x];
  const anon = !!form.anonymous;

  const submit = async () => {
    setBusy(true);
    try { await run(() => api.posts.create(v.me.id, { ...form, media: anon ? [] : form.media, taggedUserIds: anon ? [] : form.taggedUserIds }), t('게시물을 올렸어요.')); nav(form.orgId ? `/orgs/${form.orgId}?tab=posts` : form.showOnFeed ? '/community' : '/profile', { replace: true }); } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title={form.orgId ? t('조직 소식 작성') : t('게시물 작성')} />
      <div className="px-4 py-4 space-y-5">
        {!form.orgId && <div className="card px-4"><Toggle label={t('익명으로 올리기')} description={t('이름과 사진 대신 "익명"으로 표시돼요. 익명은 글만 올릴 수 있고 학교명만 보여요. 신고 시 운영진이 확인할 수 있어요.')} checked={anon} onChange={(val) => patch({ anonymous: val, orgId: val ? undefined : form.orgId, media: val ? [] : form.media })} /></div>}
        <Field label={t('종류')} required><div className="flex flex-wrap gap-1.5">{ALL_POST_TYPES.filter((pt) => form.orgId ? true : pt !== 'news').map((pt) => <Chip key={pt} size="sm" active={form.postType === pt} onClick={() => patch({ postType: pt })}>{POST_TYPE_EMOJI[pt]} {POST_TYPE_LABELS[pt]}</Chip>)}</div></Field>
        {/* iPhone 앱(웹뷰)은 사진·카메라 권한 문구(NSPhotoLibrary/NSCameraUsageDescription)가 없어 사진 고르기를 누르면 앱이 꺼질 수 있다 —
            앱을 문구와 함께 다시 빌드하기 전까지 사진 칸은 웹에서만 (apps/shell/app.config.ts) */}
        {!isNativeShell() && <Field label={`${t('사진')} (${form.media.length}/${MAX_PHOTOS})`} hint={anon ? undefined : t('캠퍼스 생활·활동 사진을 올려 주세요. 사진 속 위치 정보는 지워서 올려요.')}>
          {anon ? <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-3 flex items-center gap-2"><ImageOff size={15} />{t('익명 글에는 사진을 붙일 수 없어요. 사진을 올리려면 익명을 끄세요.')}</div> : (<>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {form.media.map((m, i) => (
                <div key={i} className="relative shrink-0"><Cover emoji={m.emoji} hue={m.hue} url={m.url} className="h-24 w-24 rounded-2xl" size={36} />
                  <button onClick={() => patch({ media: form.media.filter((_, j) => j !== i) })} className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-ink text-white grid place-items-center"><X size={12} /></button></div>
              ))}
              {form.media.length < MAX_PHOTOS && (
                <label className={cn('h-24 w-24 rounded-2xl border-2 border-dashed border-line grid place-items-center text-ink-3 shrink-0 press', uploading ? 'opacity-60' : 'cursor-pointer')} aria-label={t('사진')}>
                  {uploading ? <span className="text-[11px] text-center px-1">{t('사진 올리는 중…')}</span> : <Plus size={22} />}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addPhoto(f); }} />
                </label>
              )}
            </div>
          </>)}
        </Field>}
        <Field label={t('내용')} required><Textarea placeholder={form.postType === 'question' ? t('무엇이 궁금해요?') : form.postType === 'together' ? t('무엇을 같이 하고 싶어요?') : t('무슨 일이 있었나요?')} value={form.text} onChange={(e) => patch({ text: e.target.value })} maxLength={500} /></Field>
        <Field label={t('주제')}><div className="flex flex-wrap gap-1.5">{TOPIC_TAGS.map((tg) => <Chip key={tg.key} size="sm" active={form.topics?.includes(tg.key)} onClick={() => patch({ topics: toggle(form.topics, tg.key) })}>#{tg.label}</Chip>)}</div></Field>
        <Field label={t('태그 (학교·수업·동아리)')}>
          <div className="flex gap-2"><Input placeholder={t('태그 입력 후 추가')} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { patch({ tags: [...form.tags, tagInput.trim().replace(/^#/, '')] }); setTagInput(''); } } }} /><Button variant="secondary" onClick={() => { if (tagInput.trim()) { patch({ tags: [...form.tags, tagInput.trim().replace(/^#/, '')] }); setTagInput(''); } }}>{t('추가')}</Button></div>
          <div className="flex flex-wrap gap-1.5 mt-2">{[...new Set(v.me.timetable.map((c) => c.name))].slice(0, 3).map((c) => <Chip key={c} size="sm" active={form.courseTag === c} onClick={() => patch({ courseTag: form.courseTag === c ? undefined : c })}>📚 {c}</Chip>)}{form.tags.map((tg, i) => <button key={i} onClick={() => patch({ tags: form.tags.filter((_, j) => j !== i) })} className="rounded-lg bg-primary-soft text-primary text-[12px] font-semibold px-2 h-7 flex items-center gap-1">#{tg}<X size={11} /></button>)}</div>
        </Field>
        {!anon && (
          <Field label={t('함께한 사람')} hint={t('태그된 사람이 승인해야 그 사람 프로필에도 표시돼요.')}>
            <div className="flex flex-wrap gap-1.5">{friends.map((f) => <Chip key={f.id} size="sm" active={form.taggedUserIds?.includes(f.id)} onClick={() => patch({ taggedUserIds: toggle(form.taggedUserIds, f.id) })}><Avatar emoji={f.avatar.emoji} hue={f.avatar.hue} url={f.avatar.url} size={18} /> {f.sample && <SampleTag className="h-4 mr-0 px-1 text-[9px]" />}{f.nickname}</Chip>)}{friends.length === 0 && <span className="text-[12px] text-ink-3">{t('친구가 없어요')}</span>}</div>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('참여한 활동')}><Select value={form.relatedActivityId ?? ''} onChange={(e) => patch({ relatedActivityId: e.target.value || undefined })}><option value="">{t('연결 안 함')}</option>{myActs.map((a) => <option key={a.id} value={a.id}>{a.title}{a.sample ? (lang === 'en' ? ' (sample)' : ' (예시)') : ''}</option>)}</Select></Field>
          {opps.length > 0 && <Field label={t('관련 기회')}><Select value={form.relatedOpportunityId ?? ''} onChange={(e) => patch({ relatedOpportunityId: e.target.value || undefined })}><option value="">{t('연결 안 함')}</option>{opps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</Select></Field>}
        </div>
        {!anon && <div className="card px-4"><Toggle label={t('다음 활동 같이할 사람 모집')} description={t('게시물에 "다음에는 같이하기" 버튼이 강조돼요.')} checked={!!form.recruitNext} onChange={(val) => patch({ recruitNext: val })} /></div>}
        {myOrgs.length > 0 && !anon && <Field label={t('조직 이름으로 게시')}><Select value={form.orgId ?? ''} onChange={(e) => patch({ orgId: e.target.value || undefined, postType: e.target.value ? 'news' : form.postType })}><option value="">{t('내 이름으로')}</option>{myOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>}
        <Field label={t('공개 범위')} required hint={t('인터넷 전체 공개는 없어요. 학교 인증 사용자 안에서만 보여요.')}>
          <VisibilityList value={form.visibility} options={(anon ? ['school', 'private'] : ['school', 'friends', 'followers', 'private']) as Visibility[]} onChange={(vis) => patch({ visibility: vis })} />
        </Field>
        <div className="card px-4 divide-y divide-line">
          <Toggle label={t('내 프로필에 표시')} checked={form.showOnProfile !== false && !anon} onChange={(val) => patch({ showOnProfile: val })} />
          <Toggle label={t('Community Feed에도 공개')} description={form.visibility === 'private' ? t('나만 보기에서는 Feed에 올라가지 않아요.') : undefined} checked={form.showOnFeed !== false && form.visibility !== 'private'} onChange={(val) => patch({ showOnFeed: val })} />
        </div>
        <p className="text-[11px] text-ink-3 flex items-start gap-1.5"><Lock size={12} className="shrink-0 mt-0.5" />{t('스토리·릴스·랭킹은 없어요. 사진은 캠퍼스 생활과 활동 기록에만 써요.')}</p>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" disabled={!form.text.trim()} loading={busy} onClick={submit}>{t('게시하기')}</Button>
      </div>
    </div>
  );
}
