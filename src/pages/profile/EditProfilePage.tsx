import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, GraduationCap } from 'lucide-react';
import { BottomSheet } from '@/components/ui';
import { FormField, InfoNote, SelectField, TextArea, TextInput, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { SaveButton, SubScreen, STATUS_LABEL, YEAR_OPTIONS, en, entryYearFor, listToText, textToList, useSaveSelf, yearOfStudy } from './shared';

/**
 * Edit Profile (PDF S072): Name · Bio · University · Student status · Academic year · Spoken languages · Country of origin.
 * 예전 화면의 키·목적(데이팅 포함)·좋아하는 것·지역 같은 칸은 여기서 뺐다 — 저장된 값은 그대로 두고 보이지만 않는다.
 * 관심사는 Recommendation preferences(S078), 찾는 사람은 What you're looking for(S079), 공개 범위는 Visibility(S085).
 * PDF 에 없는 Major(전공) 한 칸을 더했다 — 프로필 첫 줄("Design · Second-year")을 고칠 곳이 여기뿐이다.
 */
export function EditProfilePage() {
  const nav = useNavigate();
  const { me, busy, save } = useSaveSelf();
  const aff = me.affiliation.type === 'university' ? me.affiliation : null;
  const [name, setName] = useState(me.nickname);
  const [bio, setBio] = useState(me.bio ?? '');
  const [major, setMajor] = useState(aff?.department ?? '');
  const [year, setYear] = useState(aff ? yearOfStudy(aff.year) : 1);
  const [langs, setLangs] = useState(listToText(me.spokenLanguages));
  const [country, setCountry] = useState(me.countryOfOrigin ?? '');
  const [yearOpen, setYearOpen] = useState(false);
  const ok = name.trim().length >= 2;

  const submit = () => save({
    nickname: name.trim(), bio: bio.trim(), spokenLanguages: textToList(langs), countryOfOrigin: country.trim(),
    ...(aff ? { affiliation: { ...aff, department: major.trim(), ...(aff.role === 'undergraduate' && yearOfStudy(aff.year) !== year ? { year: entryYearFor(year) } : {}) } } : {}),
  }, en ? 'Profile saved' : '프로필을 저장했어요');

  return (
    <SubScreen title={en ? 'Edit Profile' : '프로필 편집'} cta={<SaveButton label={en ? 'Save Profile' : '프로필 저장'} busy={busy} disabled={!ok} onClick={submit} />}>
      <div className="space-y-5">
        <FormField label={en ? 'Name' : '이름'}><TextInput value={name} maxLength={12} onChange={(e) => setName(e.target.value)} autoComplete="nickname" /></FormField>
        <FormField label={en ? 'Bio' : '소개'}><TextArea value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} placeholder={en ? 'One line about you' : '나를 한 줄로'} className="min-h-[72px]" /></FormField>
        {aff && <>
          <FormField label={en ? 'University' : '학교'} hint={aff.emailVerified ? (en ? 'Verified with your school email' : '학교 이메일로 인증됨') : (en ? 'Add your school email in Settings › Privacy & safety' : '설정 › 개인정보와 안전에서 학교 이메일을 추가하세요')}>
            <div className={cn(cardCls, 'h-12 px-4 flex items-center gap-2.5 rounded-2xl text-[15px]')}><GraduationCap size={19} className="text-ink-3" />{aff.schoolName}</div>
          </FormField>
          <FormField label={en ? 'Major' : '전공'}><TextInput value={major} maxLength={60} onChange={(e) => setMajor(e.target.value)} placeholder={en ? 'Optional' : '선택'} /></FormField>
          <FormField label={en ? 'Student status' : '학생 상태'}><SelectField value={STATUS_LABEL[aff.role]} placeholder="" onClick={() => nav('/profile/status')} /></FormField>
          {aff.role === 'alumni' && <FormField label={en ? 'Your next chapter' : '다음 걸음'}><SelectField value={[me.nextChapter?.role, me.nextChapter?.company, me.nextChapter?.city].filter(Boolean).join(' · ')} placeholder={en ? 'Optional' : '선택'} onClick={() => nav('/profile/next-chapter')} /></FormField>}
          {aff.role === 'undergraduate' && <FormField label={en ? 'Academic year' : '학년'}><SelectField value={YEAR_OPTIONS[year - 1]} placeholder="" onClick={() => setYearOpen(true)} /></FormField>}
        </>}
        <FormField label={en ? 'Spoken languages' : '쓰는 언어'} hint={en ? 'Separate with commas' : '쉼표로 나눠 적어요'}><TextInput value={langs} maxLength={200} onChange={(e) => setLangs(e.target.value)} placeholder={en ? 'Optional' : '선택'} /></FormField>
        <FormField label={en ? 'Country of origin' : '출신 나라'}><TextInput value={country} maxLength={56} onChange={(e) => setCountry(e.target.value)} placeholder={en ? 'Optional · separate from language' : '선택 · 언어와 따로'} /></FormField>
        <InfoNote>{en ? 'Languages and country are shown to people at your school unless you change it in Discovery & privacy.' : '언어와 나라는 같은 학교 사람에게 보여요. Discovery & privacy 에서 바꿀 수 있어요.'}</InfoNote>
      </div>
      <BottomSheet open={yearOpen} onClose={() => setYearOpen(false)} title={en ? 'Academic year' : '학년'}>
        <div className="space-y-2 pb-2">
          {YEAR_OPTIONS.map((label, i) => (
            <button key={label} onClick={() => { setYear(i + 1); setYearOpen(false); }} className={cn(cardCls, 'w-full h-12 px-4 flex items-center justify-between text-left text-[15px] press', year === i + 1 && 'border-sel-line text-sel-fg')}>
              {label}{year === i + 1 && <Check size={18} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </SubScreen>
  );
}
