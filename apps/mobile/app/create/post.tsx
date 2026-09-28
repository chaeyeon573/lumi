import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, X, Lock, ImageOff } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { PostInput } from '@core/api';
import type { PostAudience, PostType, Visibility } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_POST_TYPES, POST_TYPE_LABELS, POST_TYPE_EMOJI, TOPIC_TAGS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { photo } from '@core/lib/assets';
import { composerPrompts, type StageKind } from '@core/lib/stage';
import { defaultAudience } from '@core/lib/feed';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { replace } from '@/nav';
import { Screen, Button, Field, Input, Textarea, Cover, Toggle, Chip, C } from '@/ui';
import { VisibilityList } from '@/components/c_VisibilityList';
import { ChipWrap, WrapItem, FriendChips, SelectChips } from '@/components/c_Form';

const EMOJIS = ['📷', '☕', '🍜', '📚', '🏃', '🎸', '🎨', '🌅', '🐈', '🎤', '💻', '🌸'];
/** 데모용 샘플 사진 — 실제 서비스에서는 카메라·앨범 업로드 */
const SAMPLE_PHOTOS = ['c_cafe_laptop', 'c_espresso', 'c_library', 'c_road_sunset', 'c_stage', 'c_bench', 'c_pizza', 'c_meadow'];
const MAX_PHOTOS = 4;
const audiences = (): [PostAudience, string][] => [['students', t('재학생')], ['alumni', t('동문')], ['all', t('모두')]];
const audienceHelp = (a: PostAudience) => (a === 'students' ? t('재학생만 봐요') : a === 'alumni' ? t('동문만 봐요') : t('모두가 봐요'));

/** 개인 포스트: 사진 1~4장 + 짧은 글, 종류·주제·함께한 사람·관련 활동, 공개 범위와 노출 위치 (웹 CreatePostPage 와 동일) */
export default function CreatePostScreen() {
  const params = useLocalSearchParams<{ org?: string; type?: string; activity?: string; anon?: string; topic?: string }>();
  /** 피드 컴포저의 단계별 시작점 칩 (?type=…&topic=key) — 종류를 미리 고르고, 예시 문장을 보여주고, topics 에 key 를 저장 */
  const prompt = params.topic ? (['undergrad', 'grad', 'alumni'] as StageKind[]).flatMap((k) => composerPrompts(k)).find((p) => p.key === params.topic) : undefined;
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const myOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id));
  const myActs = v.visibleActivities.filter((a) => a.hostId === v.me.id || v.myParticipation(a.id)?.status === 'approved');
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((id) => v.userById(id)!).filter(Boolean), [v]);
  const orgParam = params.org;
  const [form, setForm] = useState<PostInput>({
    text: '', media: [], tags: [], topics: prompt ? [prompt.key] : [], visibility: 'school', relatedActivityId: params.activity || undefined, relatedOpportunityId: undefined,
    orgId: orgParam && myOrgs.some((o) => o.id === orgParam) ? orgParam : undefined, anonymous: params.anon === '1',
    postType: (params.type as PostType | undefined) || prompt?.postType || 'story', taggedUserIds: [], recruitNext: false, showOnProfile: true, showOnFeed: true,
    audience: defaultAudience(v.me, params.topic),
  });
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<PostInput>) => setForm((f) => ({ ...f, ...p }));
  const toggle = <T,>(arr: T[] | undefined, x: T) => (arr ?? []).includes(x) ? (arr ?? []).filter((y) => y !== x) : [...(arr ?? []), x];
  const anon = !!form.anonymous;
  const addTag = () => { if (tagInput.trim()) { patch({ tags: [...form.tags, tagInput.trim().replace(/^#/, '')] }); setTagInput(''); } };
  const last = form.media[form.media.length - 1];

  const submit = async () => {
    setBusy(true);
    try { await run(() => api.posts.create(v.me.id, { ...form, media: anon ? [] : form.media, taggedUserIds: anon ? [] : form.taggedUserIds }), t('게시물을 올렸어요.')); replace(form.orgId ? `/orgs/${form.orgId}?tab=posts` : form.showOnFeed ? '/feed' : '/profile'); } catch { setBusy(false); }
  };

  return (
    <Screen title={form.orgId ? t('조직 소식 작성') : t('게시물 작성')} footer={<View style={tw`flex-row`}><Button full size="lg" disabled={!form.text.trim()} loading={busy} onPress={submit}>{t('게시하기')}</Button></View>}>
      <View style={tw`py-4`}>
        {prompt ? <View style={tw`mb-4 self-start h-8 px-3 rounded-full bg-accent-soft justify-center`}><Text style={tw`text-[13px] font-semibold text-primary`}>{prompt.emoji} {prompt.label}</Text></View> : null}
        {/* 글이 올라갈 공간 — 재학생 / 동문 / 모두. 기본은 내 단계(후배 질문 받아요·채용은 모두) */}
        {!form.orgId && (
          <View style={tw`mb-5`}>
            <View style={tw`flex-row`}>
              {audiences().map(([key, label]) => <Chip key={key} active={form.audience === key} onPress={() => patch({ audience: key })}>{label}</Chip>)}
            </View>
            <Text style={tw`mt-1.5 text-[12px] text-ink-3`}>{audienceHelp(form.audience ?? 'all')}</Text>
          </View>
        )}
        {!form.orgId && <View style={tw`card px-4 mb-5`}><Toggle label={t('익명으로 올리기')} description={t('이름과 사진 대신 "익명"으로 표시돼요. 익명은 글만 올릴 수 있고 학교명만 보여요. 신고 시 운영진이 확인할 수 있어요.')} checked={anon} onChange={(val) => patch({ anonymous: val, orgId: val ? undefined : form.orgId, media: val ? [] : form.media })} /></View>}
        <Field label={t('종류')}><ChipWrap>{ALL_POST_TYPES.filter((pt) => form.orgId ? true : pt !== 'news').map((pt) => <WrapItem key={pt}><Chip size="sm" active={form.postType === pt} onPress={() => patch({ postType: pt })}>{POST_TYPE_EMOJI[pt]} {POST_TYPE_LABELS[pt]}</Chip></WrapItem>)}</ChipWrap></Field>
        <Field label={`${t('사진')} (${form.media.length}/${MAX_PHOTOS})`} hint={anon ? undefined : t('캠퍼스 생활·활동 중심으로. 데모에서는 샘플 사진이나 이모지 카드로 대체해요.')}>
          {anon ? <View style={tw`rounded-xl bg-surface-2 px-3.5 py-3 flex-row items-center`}><ImageOff size={15} color={C.ink3} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-3`}>{t('익명 글에는 사진을 붙일 수 없어요. 사진을 올리려면 익명을 끄세요.')}</Text></View> : (<>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pt-2 pr-2`}>
              {form.media.map((m, i) => (
                <View key={i} style={tw`mr-2`}>
                  <Cover emoji={m.emoji} hue={m.hue} url={m.url} size={96} radius={16} />
                  <Pressable onPress={() => patch({ media: form.media.filter((_, j) => j !== i) })} hitSlop={6} style={tw`absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-ink items-center justify-center`}><X size={12} color={C.onPrimary} /></Pressable>
                </View>
              ))}
              {form.media.length < MAX_PHOTOS && <Pressable onPress={() => patch({ media: [...form.media, { emoji: EMOJIS[form.media.length % EMOJIS.length], hue: (form.media.length * 70 + 30) % 360, url: photo(SAMPLE_PHOTOS[(form.media.length + SAMPLE_PHOTOS.length - 1) % SAMPLE_PHOTOS.length]) }] })} style={[tw`h-24 w-24 rounded-2xl border-2 border-line items-center justify-center`, { borderStyle: 'dashed' }]}><Plus size={22} color={C.ink3} /></Pressable>}
            </ScrollView>
            {form.media.length > 0 && (
              <View style={tw`flex-row flex-wrap mt-2`}>
                {SAMPLE_PHOTOS.map((name) => <Pressable key={name} onPress={() => patch({ media: form.media.map((m, i) => (i === form.media.length - 1 ? { ...m, url: photo(name) } : m)) })} style={[tw`h-10 w-10 rounded-lg overflow-hidden mr-1.5 mb-1.5`, last?.url === photo(name) ? { borderWidth: 2, borderColor: C.primary } : null]}><Cover emoji="" hue={0} url={photo(name)} size={40} radius={8} /></Pressable>)}
                {EMOJIS.slice(0, 6).map((e) => <Pressable key={e} onPress={() => patch({ media: form.media.map((m, i) => (i === form.media.length - 1 ? { ...m, emoji: e, url: undefined } : m)) })} style={[tw`h-10 w-10 rounded-lg items-center justify-center mr-1.5 mb-1.5 ${!last?.url && last?.emoji === e ? 'bg-primary-soft' : 'bg-surface-2'}`, !last?.url && last?.emoji === e ? { borderWidth: 2, borderColor: C.primary } : null]}><Text style={tw`text-[18px]`}>{e}</Text></Pressable>)}
              </View>
            )}
          </>)}
        </Field>
        <Field label={t('내용')}><Textarea placeholder={prompt ? prompt.placeholder : form.postType === 'question' ? t('무엇이 궁금해요?') : form.postType === 'together' ? t('무엇을 같이 하고 싶어요?') : t('무슨 일이 있었나요?')} value={form.text} onChangeText={(text) => patch({ text })} maxLength={500} /></Field>
        <Field label={t('주제')}><ChipWrap>{TOPIC_TAGS.map((tg) => <WrapItem key={tg.key}><Chip size="sm" active={form.topics?.includes(tg.key)} onPress={() => patch({ topics: toggle(form.topics, tg.key) })}>#{tg.label}</Chip></WrapItem>)}</ChipWrap></Field>
        <Field label={t('태그 (학교·수업·동아리)')}>
          <View style={tw`flex-row items-center`}><Input placeholder={t('태그 입력 후 추가')} value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} style={tw`flex-1`} /><View style={tw`w-2`} /><Button variant="secondary" onPress={addTag}>{t('추가')}</Button></View>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {[...new Set(v.me.timetable.map((c) => c.name))].slice(0, 3).map((c) => <View key={c} style={tw`mb-1.5`}><Chip size="sm" active={form.courseTag === c} onPress={() => patch({ courseTag: form.courseTag === c ? undefined : c })}>📚 {c}</Chip></View>)}
            {form.tags.map((tg, i) => <Pressable key={i} onPress={() => patch({ tags: form.tags.filter((_, j) => j !== i) })} style={tw`h-7 px-2 rounded-lg bg-primary-soft flex-row items-center mr-1.5 mb-1.5`}><Text style={tw`text-[12px] font-semibold text-primary`}>#{tg}</Text><X size={11} color={C.primary} style={tw`ml-1`} /></Pressable>)}
          </View>
        </Field>
        {!anon && (
          <Field label={t('함께한 사람')} hint={t('태그된 사람이 승인해야 그 사람 프로필에도 표시돼요.')}>
            <FriendChips friends={friends} selected={form.taggedUserIds ?? []} onToggle={(fid) => patch({ taggedUserIds: toggle(form.taggedUserIds, fid) })} />
          </Field>
        )}
        <Field label={t('참여한 활동')}><SelectChips value={form.relatedActivityId ?? ''} emptyLabel={t('연결 안 함')} options={myActs.map((a) => [a.id, a.title] as [string, string])} onChange={(val) => patch({ relatedActivityId: val || undefined })} /></Field>
        <Field label={t('관련 기회')}><SelectChips value={form.relatedOpportunityId ?? ''} emptyLabel={t('연결 안 함')} options={opps.map((o) => [o.id, o.title] as [string, string])} onChange={(val) => patch({ relatedOpportunityId: val || undefined })} /></Field>
        {!anon && <View style={tw`card px-4 mb-5`}><Toggle label={t('다음 활동 같이할 사람 모집')} description={t('게시물에 "다음에는 같이하기" 버튼이 강조돼요.')} checked={!!form.recruitNext} onChange={(val) => patch({ recruitNext: val })} /></View>}
        {myOrgs.length > 0 && !anon && <Field label={t('조직 이름으로 게시')}><SelectChips value={form.orgId ?? ''} emptyLabel={t('내 이름으로')} options={myOrgs.map((o) => [o.id, o.name] as [string, string])} onChange={(val) => patch({ orgId: val || undefined, postType: val ? 'news' : form.postType })} /></Field>}
        <Field label={t('공개 범위')} hint={t('인터넷 전체 공개는 없어요. 학교 인증 사용자 안에서만 보여요.')}>
          <VisibilityList value={form.visibility} options={(anon ? ['school', 'private'] : ['school', 'friends', 'followers', 'private']) as Visibility[]} onChange={(vis) => patch({ visibility: vis })} />
        </Field>
        <View style={tw`card px-4 mb-5`}>
          <Toggle label={t('내 프로필에 표시')} checked={form.showOnProfile !== false && !anon} onChange={(val) => patch({ showOnProfile: val })} />
          <View style={tw`h-px bg-line`} />
          <Toggle label={t('Community Feed에도 공개')} description={form.visibility === 'private' ? t('나만 보기에서는 Feed에 올라가지 않아요.') : undefined} checked={form.showOnFeed !== false && form.visibility !== 'private'} onChange={(val) => patch({ showOnFeed: val })} />
        </View>
        <View style={tw`flex-row items-start`}><Lock size={12} color={C.ink3} style={tw`mt-0.5`} /><Text style={tw`ml-1.5 flex-1 text-[11px] text-ink-3`}>{t('스토리·릴스·랭킹은 없어요. 사진은 캠퍼스 생활과 활동 기록에만 써요.')}</Text></View>
      </View>
    </Screen>
  );
}
