import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Eye, Users, X, Check } from 'lucide-react';
import { lang } from '@core/i18n';
import type { PostInput } from '@core/api';
import type { PostType, Visibility } from '@core/types';
import { api } from '@core/api';
import { Avatar, BottomSheet, Cover } from '@/components/ui';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextArea, SelectField, InfoNote, Switch } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { canPickPhotos } from '@/lib/native';
import { shrinkPhoto } from '@/lib/photoUpload';

const en = lang === 'en';
const MAX_PHOTOS = 4;
type Kind = 'post' | 'question' | 'photo';
const VIS: { key: Visibility; label: string; sub: string }[] = [
  { key: 'school', label: en ? 'My school' : '우리 학교', sub: en ? 'Verified students at your school' : '같은 학교 인증 학생' },
  { key: 'friends', label: en ? 'Friends' : '친구', sub: en ? 'Only your friends' : '친구만' },
  { key: 'followers', label: en ? 'Followers' : '팔로워', sub: en ? 'People who follow you and friends' : '팔로워와 친구' },
  { key: 'private', label: en ? 'Only me' : '나만', sub: en ? 'A note to yourself' : '나만 보기' },
];

/**
 * 글쓰기 (PDF S051 Share something) — 나 · 종류(Post / Question / Photo) · 글 · 사진 · 공개 범위 · 올릴 곳.
 * 인터넷 전체 공개는 없다 (학교 인증 사용자 안에서만). 익명은 글만 (사진 없이) — 학교 이름만 보인다.
 */
export function CreatePostPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const orgs = useAppStore((s) => s.organizations);
  const adminOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const orgParam = params.get('org');
  const typeParam = params.get('type') as PostType | null;
  const [kind, setKind] = useState<Kind>(typeParam === 'question' ? 'question' : 'post');
  const [form, setForm] = useState<PostInput>({
    text: '', media: [], tags: [], topics: [], visibility: 'school', relatedActivityId: params.get('activity') ?? undefined,
    orgId: orgParam && adminOrgs.some((o) => o.id === orgParam) ? orgParam : undefined, anonymous: params.get('anon') === '1',
    postType: typeParam && typeParam !== 'question' ? typeParam : 'story', showOnProfile: true, showOnFeed: true,
  });
  const [sheet, setSheet] = useState<'vis' | 'to' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<PostInput>) => setForm((f) => ({ ...f, ...p }));
  const anon = !!form.anonymous && !form.orgId;
  const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : '';
  const org = form.orgId ? adminOrgs.find((o) => o.id === form.orgId) : undefined;
  const photos = canPickPhotos();
  const to = org ? org.name : form.showOnFeed === false ? (en ? 'My profile only' : '내 프로필에만') : (en ? 'Campus feed' : '캠퍼스 피드');

  const addPhoto = async (file: File) => {
    setUploading(true);
    try { const { url } = await api.system.uploadPhoto(await shrinkPhoto(file)); patch({ media: [...form.media, { emoji: '', hue: 210, url }].slice(0, MAX_PHOTOS) }); }
    catch (e) { showToast((e as Error).message && !/too large/.test((e as Error).message) ? (e as Error).message : (en ? 'Couldn’t add that photo. Try again.' : '사진을 올리지 못했어요.'), 'error'); }
    finally { setUploading(false); }
  };
  const submit = async () => {
    if (kind === 'photo' && !form.media.length && !form.text.trim()) { showToast(en ? 'Add a photo first.' : '사진을 먼저 골라 주세요.', 'error'); return; }
    setBusy(true);
    const input: PostInput = { ...form, text: form.text.trim(), anonymous: anon, media: anon ? [] : form.media, postType: org ? 'news' : kind === 'question' ? 'question' : form.postType === 'question' ? 'story' : form.postType,
      showOnFeed: form.visibility === 'private' ? false : form.showOnFeed, showOnProfile: !anon };
    try {
      const res = await run(() => api.posts.create(v.me.id, input), en ? 'Shared.' : '올렸어요.');
      nav(org ? `/orgs/${org.id}?tab=posts` : `/posts/${res.post.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Share something' : '글쓰기'} />
      <PageTitle title={en ? 'Share something' : '글쓰기'} className="pb-3" />
      <div className="px-4 pb-6 space-y-5">
        <div className="flex items-center gap-3">
          {anon ? <span className="h-11 w-11 rounded-full grid place-items-center bg-t-lav text-t-lav-fg font-bold">?</span> : org ? <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={44} /> : <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={44} />}
          <span className="min-w-0"><b className="block text-[15px] truncate">{anon ? (en ? 'Anonymous' : '익명') : org ? org.name : (en ? 'You' : '나')}</b><span className="block text-[13px] text-ink-3 truncate">{school || (en ? 'Your university' : '내 학교')}</span></span>
        </div>
        <ChipRow>
          <Chip active={kind === 'post'} onClick={() => setKind('post')}>{en ? 'Post' : '글'}</Chip>
          <Chip active={kind === 'question'} onClick={() => setKind('question')}>{en ? 'Question' : '질문'}</Chip>
          {photos && !anon && <Chip active={kind === 'photo'} onClick={() => setKind('photo')}>{en ? 'Photo' : '사진'}</Chip>}
        </ChipRow>
        <TextArea value={form.text} maxLength={500} onChange={(e) => patch({ text: e.target.value })} className="min-h-[110px]"
          placeholder={kind === 'question' ? (en ? 'What would you like to ask?' : '무엇이 궁금해요?') : (en ? 'What would you like to share?' : '무엇을 나누고 싶어요?')} />
        {photos && !anon && (kind === 'photo' || form.media.length > 0 || kind === 'post') && (
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar">
            {form.media.map((m, i) => (
              <div key={i} className="relative shrink-0"><Cover emoji={m.emoji} hue={m.hue} url={m.url} className="h-[132px] w-[132px] rounded-[20px]" size={30} />
                <button onClick={() => patch({ media: form.media.filter((_, j) => j !== i) })} aria-label={en ? 'Remove photo' : '사진 빼기'} className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-bg/80 text-ink grid place-items-center"><X size={14} /></button></div>
            ))}
            {form.media.length < MAX_PHOTOS && (
              <label className={cn('h-[132px] rounded-[20px] border border-dashed border-line bg-surface flex flex-col items-center justify-center gap-2 text-ink-3 press shrink-0', form.media.length ? 'w-[132px]' : 'w-full', uploading ? 'opacity-60' : 'cursor-pointer')}>
                <Camera size={22} /><span className="text-[14px] font-medium">{uploading ? (en ? 'Uploading…' : '올리는 중…') : (en ? 'Add photo' : '사진 추가')}</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addPhoto(f); }} />
              </label>
            )}
          </div>
        )}
        <FormField label={en ? 'Visibility' : '공개 범위'}><SelectField icon={<Eye size={18} />} value={VIS.find((x) => x.key === form.visibility)?.label} placeholder="" onClick={() => setSheet('vis')} /></FormField>
        <FormField label={en ? 'Post to' : '올릴 곳'}><SelectField icon={<Users size={18} />} value={to} placeholder="" onClick={() => setSheet('to')} /></FormField>
        {!org && (
          <div className="flex items-center gap-3">
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{en ? 'Post anonymously' : '익명으로 올리기'}</span><span className="block text-[12.5px] text-ink-3">{en ? 'Text only · shows your school, not you' : '글만 · 내 이름 대신 학교만 보여요'}</span></span>
            <Switch checked={anon} onChange={(on) => { patch({ anonymous: on, visibility: on && !['school', 'private'].includes(form.visibility) ? 'school' : form.visibility }); if (on && kind === 'photo') setKind('post'); }} label={en ? 'Post anonymously' : '익명'} />
          </div>
        )}
        <InfoNote>{en ? 'Group and class posts follow their permissions.' : '그룹·수업 글은 그곳의 공개 범위를 따라요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" disabled={!form.text.trim() && !form.media.length} loading={busy} onClick={submit}>{en ? 'Share Post' : '올리기'}</Btn></BottomCTA>

      <BottomSheet open={sheet === 'vis'} onClose={() => setSheet(null)} title={en ? 'Who can see it' : '공개 범위'}>
        <div className="space-y-1">{VIS.filter((x) => !anon || x.key === 'school' || x.key === 'private').map((x) => (
          <button key={x.key} onClick={() => { patch({ visibility: x.key }); setSheet(null); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left press">
            <span className="flex-1 min-w-0"><b className="block text-[15px]">{x.label}</b><span className="block text-[12.5px] text-ink-3">{x.sub}</span></span>{form.visibility === x.key && <Check size={18} className="text-sel-fg" />}
          </button>
        ))}</div>
      </BottomSheet>
      <BottomSheet open={sheet === 'to'} onClose={() => setSheet(null)} title={en ? 'Post to' : '올릴 곳'}>
        <div className="space-y-1">
          {[{ key: 'feed', label: en ? 'Campus feed' : '캠퍼스 피드', sub: en ? 'Feed and your profile' : '피드와 내 프로필', on: !org && form.showOnFeed !== false, set: { orgId: undefined, showOnFeed: true } },
            { key: 'profile', label: en ? 'My profile only' : '내 프로필에만', sub: en ? 'Not in the feed' : '피드에는 안 보여요', on: !org && form.showOnFeed === false, set: { orgId: undefined, showOnFeed: false } },
            ...adminOrgs.map((o) => ({ key: o.id, label: o.name, sub: en ? 'As the group — on its page and the feed' : '그룹 이름으로 — 그룹 페이지와 피드', on: org?.id === o.id, set: { orgId: o.id, showOnFeed: true, anonymous: false } }))]
            .map((x) => (
              <button key={x.key} onClick={() => { patch(x.set); setSheet(null); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left press">
                <span className="flex-1 min-w-0"><b className="block text-[15px] truncate">{x.label}</b><span className="block text-[12.5px] text-ink-3">{x.sub}</span></span>{x.on && <Check size={18} className="text-sel-fg" />}
              </button>
            ))}
        </div>
      </BottomSheet>
    </div>
  );
}
