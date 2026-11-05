import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Search, Users } from 'lucide-react';
import { extraVisibilityOf } from '@core/lib/privacy';
import type { Visibility } from '@core/types';
import { ChoiceChips, FormField, IconTile, InfoNote, RowCard, Switch, TextInput, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { SaveButton, SubScreen, VIS_LABEL, en, listToText, textToList, useSaveSelf } from '@/pages/profile/shared';

const LEVELS = ['private', 'friends', 'school', 'public'] as const;
type Level = typeof LEVELS[number];
const level = (v: Visibility): Level => (LEVELS.includes(v as Level) ? v as Level : 'school');

/**
 * Discovery & privacy (PDF S083) — 서버가 지키는 것만:
 * - Classmate discovery → showToClassmates (같은 수업 학생에게 '이 수업 듣는다'만). 지금 서버의 기본값은 켜짐이라
 *   PDF 의 "Off by default" 는 쓰지 않는다 — 지금 상태를 그대로 보여 준다
 * - Membership display → extraVisibility.memberships (동아리 멤버·팔로워 목록에서 빠진다)
 * - Spoken languages · Country of origin → 프로필 값 + 공개 범위 (extraVisibility.languages·country, 졸업 뒤 정보도 같이)
 * Academic year 는 Edit Profile 에만 둔다 — 학년은 사람을 알아보는 줄이라 숨길 수 없어서, 여기 두면 숨길 수 있는 것처럼 보인다.
 * 아래에 추천 설정 두 화면(S078 · S079)으로 가는 줄.
 */
export function DiscoveryPage() {
  const nav = useNavigate();
  const { me, busy, save } = useSaveSelf();
  const [classmates, setClassmates] = useState(me.showToClassmates !== false);
  const [memberships, setMemberships] = useState<Level>(level(extraVisibilityOf(me, 'memberships')));
  const [details, setDetails] = useState<Level>(level(extraVisibilityOf(me, 'languages')));
  const [langs, setLangs] = useState(listToText(me.spokenLanguages));
  const [country, setCountry] = useState(me.countryOfOrigin ?? '');
  const chips = LEVELS.map((l) => ({ value: l, label: VIS_LABEL[l]! }));
  const submit = () => save({
    showToClassmates: classmates, spokenLanguages: textToList(langs), countryOfOrigin: country.trim(),
    extraVisibility: { ...me.extraVisibility, memberships, languages: details, country: details, nextChapter: details },
  }, en ? 'Privacy saved' : '저장했어요');

  return (
    <SubScreen title={en ? 'Discovery & privacy' : '발견과 개인정보'} cta={<SaveButton label={en ? 'Save Privacy' : '저장'} busy={busy} onClick={submit} />}>
      <div className={cn(cardCls, 'p-4 flex items-center gap-3.5')}>
        <IconTile tone="ice"><Users size={21} /></IconTile>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold">{en ? 'Classmate discovery' : '같은 수업 찾기'}</span>
          <span className="block text-[13px] text-ink-3 mt-0.5">{en ? 'Classmates see only that you take the class' : '같은 수업 학생에게 수업을 듣는다는 것만'}</span>
        </span>
        <Switch checked={classmates} onChange={setClassmates} label={en ? 'Classmate discovery' : '같은 수업 찾기'} />
      </div>
      {!classmates && <p className="text-[12.5px] text-ink-3 mt-2">{en ? 'While it’s off you won’t see classmate lists either.' : '끄면 나도 같은 수업 학생 목록을 못 봐요.'}</p>}

      <h2 className="ha-h2 mt-7 mb-3">{en ? 'Membership display' : '멤버십 공개'}</h2>
      <ChoiceChips value={memberships} onChange={setMemberships} options={chips} />

      <div className="space-y-5 mt-6">
        <FormField label={en ? 'Spoken languages' : '쓰는 언어'}><TextInput value={langs} maxLength={200} onChange={(e) => setLangs(e.target.value)} placeholder={en ? 'Optional' : '선택'} /></FormField>
        <FormField label={en ? 'Country of origin' : '출신 나라'}><TextInput value={country} maxLength={56} onChange={(e) => setCountry(e.target.value)} placeholder={en ? 'Optional · not inferred' : '선택 · 짐작하지 않아요'} /></FormField>
        <FormField label={en ? 'Who sees languages, country and next chapter' : '언어·나라·졸업 뒤 정보를 볼 사람'}><ChoiceChips value={details} onChange={setDetails} options={chips} /></FormField>
      </div>
      <InfoNote className="mt-4">{en ? 'Group membership and housing privacy remain under your control.' : '그룹 멤버십과 사는 곳 공개는 언제든 바꿀 수 있어요.'}</InfoNote>

      <h2 className="ha-h2 mt-7 mb-3">{en ? 'Preferences' : '추천 설정'}</h2>
      <div className="space-y-3">
        <RowCard tone="lav" icon={<Compass size={21} />} title={en ? 'Recommendation preferences' : '추천 설정'} sub={en ? 'Goals and what you’d like to discover' : '목표와 알고 싶은 것'} onClick={() => nav('/profile/preferences')} />
        <RowCard tone="rose" icon={<Search size={21} />} title={en ? 'What you’re looking for' : '찾고 있는 것'} sub={en ? 'People to meet and things to do' : '만나고 싶은 사람과 하고 싶은 것'} onClick={() => nav('/profile/looking-for')} />
      </div>
    </SubScreen>
  );
}
