import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_AVAILABILITY, ALL_INTERESTS, ALL_PURPOSES, AVAILABILITY_LABELS, INTEREST_EMOJI, INTEREST_LABELS, PURPOSE_LABELS } from '@core/lib/labels';
import type { Availability, Interest, ProfileField, Purpose, Self, User } from '@core/types';
import { tw } from '@/tw';
import { replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Chip, Input, Textarea, Toggle, Segmented } from '@/ui';
import { VisibilityPicker } from '@/components/b_VisibilityPicker';

const EMOJIS = ['🙂', '😎', '🧑‍💻', '👩‍🎨', '🧑‍🔬', '🏃', '🎸', '📚', '🌱', '🎨', '🚀', '🧗', '☕', '🐱', '🦊', '🎧'];
/** 웹의 hue 슬라이더(0~359) 대신 30° 간격 색상 견본 */
const HUES = Array.from({ length: 12 }, (_, i) => i * 30);
type PhotoType = User['avatar']['photoType'];

/** 라벨 + 오른쪽 슬롯(공개 범위) — 렌더 밖에 정의해 입력 포커스가 유지되게 한다 (웹 Field right 슬롯) */
function Field({ label, right, hint, children }: { label: string; right?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <View style={tw`mb-5`}>
      <View style={tw`flex-row items-center justify-between mb-1.5`}><Text style={tw`text-[12px] font-bold text-ink-3`}>{label}</Text>{right ?? null}</View>
      {children}
      {hint ? <Text style={tw`text-[11px] text-ink-3 mt-1`}>{hint}</Text> : null}
    </View>
  );
}

/** 프로필 편집 (웹 EditProfilePage) */
export default function EditProfileScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const [form, setForm] = useState<Self>(() => structuredClone(me));
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<Self>) => setForm((f) => ({ ...f, ...p }));
  const toggle = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);
  const aff = form.affiliation.type === 'university' ? form.affiliation : null;

  const fv = (k: ProfileField) => <VisibilityPicker compact value={form.fieldVisibility[k]} onChange={(vis) => patch({ fieldVisibility: { ...form.fieldVisibility, [k]: vis } })} />;

  const save = async () => {
    setBusy(true);
    try {
      const { id: _id, createdAt: _c, ...rest } = form;
      await run(() => api.users.update(me.id, rest), t('프로필을 저장했어요.'));
      replace('/profile');
    } catch { setBusy(false); }
  };

  return (
    <Screen title={t('프로필 편집')} footer={<View style={tw`flex-row`}><Button full size="lg" loading={busy} disabled={form.nickname.trim().length < 2} onPress={save}>{t('저장')}</Button></View>}>
      <View style={tw`py-4`}>
        <View style={tw`flex-row items-center mb-5`}>
          <LinearGradient colors={[`hsl(${form.avatar.hue}, 85%, 88%)`, `hsl(${(form.avatar.hue + 40) % 360}, 80%, 74%)`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw`h-20 w-20 rounded-3xl items-center justify-center`}><Text style={tw`text-[36px]`}>{form.avatar.emoji}</Text></LinearGradient>
          <View style={tw`flex-1 ml-4`}>
            <Segmented<PhotoType> value={form.avatar.photoType} onChange={(pt) => patch({ avatar: { ...form.avatar, photoType: pt } })} options={[['face', t('얼굴')], ['masked', t('가면')], ['back', t('뒷모습')]]} />
            <View style={tw`flex-row flex-wrap mt-2`}>{HUES.map((h) => <Pressable key={h} onPress={() => patch({ avatar: { ...form.avatar, hue: h } })} style={[tw`h-6 w-6 rounded-full mr-1.5 mb-1.5 ${form.avatar.hue === h ? 'border-2 border-primary' : ''}`, { backgroundColor: `hsl(${h}, 80%, 78%)` }]} />)}</View>
          </View>
        </View>
        <View style={tw`flex-row flex-wrap mb-5`}>{EMOJIS.map((e) => <View key={e} style={tw`w-1/8 p-0.5`}><Pressable onPress={() => patch({ avatar: { ...form.avatar, emoji: e } })} style={tw`h-10 rounded-xl items-center justify-center ${form.avatar.emoji === e ? 'bg-primary-soft border-2 border-primary' : 'bg-surface-2'}`}><Text style={tw`text-[20px]`}>{e}</Text></Pressable></View>)}</View>

        <Field label={`${t('닉네임')} *`}><Input value={form.nickname} onChangeText={(text) => patch({ nickname: text })} maxLength={12} /></Field>
        <Field label={t('지금 하고 싶은 활동 (한 줄)')} hint={t('홈 추천 카드에 표시돼요')}><Input placeholder={t('예: 오늘 저녁 신촌에서 커피 한 잔?')} value={form.nowWant ?? ''} onChangeText={(text) => patch({ nowWant: text })} /></Field>
        <Field label={t('자기소개')} right={fv('bio')}><Textarea value={form.bio} onChangeText={(text) => patch({ bio: text })} maxLength={200} /></Field>
        <Field label={t('좋아하는 것')} right={fv('likes')}><Input value={form.likes} onChangeText={(text) => patch({ likes: text })} /></Field>
        <Field label={t('자유시간에 하고 싶은 활동')} right={fv('freeTime')}><Input value={form.freeTime} onChangeText={(text) => patch({ freeTime: text })} /></Field>
        <Field label={t('관심사')} right={fv('interests')}><View style={tw`flex-row flex-wrap`}>{ALL_INTERESTS.map((i) => <View key={i} style={tw`mb-2`}><Chip active={form.interests.includes(i)} onPress={() => patch({ interests: toggle(form.interests, i) as Interest[] })}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</Chip></View>)}</View></Field>
        <Field label={t('이용 목적')} right={fv('purposes')}><View style={tw`flex-row flex-wrap`}>{ALL_PURPOSES.map((p) => <View key={p} style={tw`mb-2`}><Chip active={form.purposes.includes(p)} onPress={() => patch({ purposes: toggle(form.purposes, p) as Purpose[] })}>{PURPOSE_LABELS[p]}</Chip></View>)}</View></Field>
        <Field label={t('활동 가능한 시간')} right={fv('availability')}><View style={tw`flex-row flex-wrap`}>{ALL_AVAILABILITY.map((a) => <View key={a} style={tw`mb-2`}><Chip active={form.availability === a} onPress={() => patch({ availability: a as Availability })}>{AVAILABILITY_LABELS[a]}</Chip></View>)}</View></Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-1.5`}><Field label={t('키 (선택)')} right={fv('height')}><Input keyboardType="number-pad" placeholder="cm" value={form.height != null ? String(form.height) : ''} onChangeText={(text) => patch({ height: text ? Number(text) : undefined })} /></Field></View>
          <View style={tw`flex-1 ml-1.5`}><Field label={t('지역')}><Input value={form.region} onChangeText={(text) => patch({ region: text })} /></Field></View>
        </View>
        <Field label={t('관심 있는 사람의 조건 (선택)')} right={fv('preferredPartner')}><Input value={form.preferredPartner ?? ''} onChangeText={(text) => patch({ preferredPartner: text })} /></Field>

        {aff && (
          <View style={tw`rounded-[24px] border border-line bg-white px-4 mb-5`}>
            <View style={tw`py-3`}><Text style={tw`text-[13px] font-bold text-ink`}>{t('학교 정보')}</Text><Text style={tw`text-[12px] text-ink-3`}>{aff.schoolName} · {aff.department} · {aff.emailVerified ? t('학교 인증 완료') : t('미인증')}</Text></View>
            <View style={tw`h-px bg-line`} />
            <Toggle label={t('학교명 공개')} checked={aff.showSchool} onChange={(val) => patch({ affiliation: { ...aff, showSchool: val } })} />
            <View style={tw`h-px bg-line`} />
            <Toggle label={t('학과 공개')} checked={aff.showDepartment} onChange={(val) => patch({ affiliation: { ...aff, showDepartment: val } })} />
            {!aff.emailVerified && <View style={tw`py-3 flex-row border-t border-line`}><Button size="sm" variant="secondary" onPress={() => patch({ affiliation: { ...aff, emailVerified: true } })}>{t('학교 이메일 인증하기 (데모: 즉시 완료)')}</Button></View>}
          </View>
        )}
        <View style={tw`rounded-[24px] border border-line bg-white px-4`}><Toggle label={t('본인 인증')} description={form.identityVerified ? t('인증 완료 — 프로필에 배지가 표시돼요') : t('데모에서는 토글로 인증 상태를 바꿀 수 있어요')} checked={form.identityVerified} onChange={(val) => patch({ identityVerified: val })} /></View>
      </View>
    </Screen>
  );
}
