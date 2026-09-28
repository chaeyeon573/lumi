import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, MapPin, ExternalLink, Users, Bookmark, Share2, Flag, MoreHorizontal, AlarmClock, CalendarPlus, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { OPP_TYPE_COLORS, OPP_TYPE_EMOJI, OPP_TYPE_LABELS, PERSON_ROLE_LABELS, RSVP_LABELS, RSVP_EMOJI } from '@core/lib/labels';
import type { OpportunityIntent } from '@core/types';
import { formatDate, formatDateTime, relativeTime } from '@core/lib/format';
import { dday, daysUntil, matchReasons, isTogetherType } from '@core/lib/recommend';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Avatar, Button, Tag, BottomSheet, Input, Segmented, Empty, Chip, IconBtn, C } from '@/ui';
import { SheetItem } from '@/components/PostCard';
import { ReportSheet } from '@/components/a_ReportSheet';
import { ActivityRow, InfoRow, affiliationText } from '@/components/a_shared';

type Tab = 'info' | 'people' | 'qna';
type Result = 'accepted' | 'rejected' | 'attended' | '';

/** 기회 상세 (웹 OpportunityDetailPage): 상세 | 함께할 사람 | Q&A·후기 */
export default function OpportunityDetailScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>((tabParam as Tab) || 'info');
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const o = opps.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [text, setText] = useState('');
  const [review, setReview] = useState('');
  const [result, setResult] = useState<Result>('');
  if (!o) return <Screen title={t('기회')}><Empty title={`🔭 ${t('기회를 찾을 수 없어요')}`} /></Screen>;
  const mine = intents.find((i) => i.opportunityId === o.id && i.userId === v.me.id);
  const others = intents.filter((i) => i.opportunityId === o.id && i.userId !== v.me.id);
  const color = OPP_TYPE_COLORS[o.type];
  const teamActs = v.visibleActivities.filter((a) => a.opportunityId === o.id);
  const people = others.map((i) => ({ i, u: v.userById(i.userId)! })).filter((x) => x.u && !v.isBlocked(x.u.id))
    .map((x) => ({ ...x, reasons: matchReasons(v.me, x.u, v.snap, v.canSeeField(x.u, 'timetable')) })).sort((a, b) => (Number(b.i.intent === 'solo' || b.i.intent === 'company') - Number(a.i.intent === 'solo' || a.i.intent === 'company')) || b.reasons.length - a.reasons.length);
  const org = o.orgId ? v.orgById(o.orgId) : undefined;
  const together = isTogetherType(o.type);
  const setIntent = (intent: OpportunityIntent | null, msg?: string) => run(() => api.opportunities.setIntent(o.id, v.me.id, intent), msg);
  const ask = async () => { if (!text.trim()) return; await run(() => api.opportunities.ask(o.id, v.me.id, text.trim())); setText(''); };
  const submitReview = async () => { await run(() => api.opportunities.review(o.id, v.me.id, review.trim(), result || undefined), t('후기를 남겼어요.')); setReview(''); setResult(''); };
  const card = tw`card p-4`;
  const resultOptions: [Result, string][] = [['', t('결과 비공개')], ['accepted', t('합격·수혜')], ['rejected', t('불합격')], ['attended', t('참가')]];
  const tabOptions: [Tab, string][] = together
    ? [['info', t('상세')], ['people', `${t('함께할 사람 ')}${people.length}`], ['qna', `${t('Q&A·후기 ')}${o.qna.length + o.reviews.length}`]]
    : [['info', t('상세')], ['qna', `${t('Q&A·후기 ')}${o.qna.length + o.reviews.length}`]];

  const footer = (
    <View style={[tw`flex-row`, { gap: 8 }]}>
      <Pressable onPress={() => run(() => api.opportunities.toggleSave(o.id, v.me.id), mine?.saved ? undefined : t('저장했어요. 마감 3일 전에 알려드릴게요.'))} style={tw`h-[52px] w-[52px] rounded-2xl items-center justify-center ${mine?.saved ? 'bg-primary' : 'bg-surface-2'}`}><Bookmark size={20} color={mine?.saved ? C.onPrimary : C.ink2} fill={mine?.saved ? C.onPrimary : 'none'} /></Pressable>
      {together ? (<>
        <Button size="lg" variant={mine ? 'secondary' : 'primary'} full onPress={() => setRsvpOpen(true)}>{mine ? `${RSVP_EMOJI[mine.intent]} ${RSVP_LABELS[mine.intent]}` : t('같이 갈래요')}</Button>
        {mine && (mine.intent === 'solo' || mine.intent === 'company') && <Button size="lg" variant="outline" onPress={() => setTab('people')} icon={<Users size={18} color={C.ink2} />}>{t('사람 찾기')}</Button>}
      </>) : (
        mine?.intent === 'applied' ? <Button size="lg" variant="secondary" full icon={<CheckCircle2 size={18} color={C.primary} />} onPress={() => setIntent('interested')}>{t('지원 완료')}</Button>
          : <Button size="lg" full onPress={() => setIntent('applied', t('지원 완료로 표시했어요. 후기를 남겨주면 다음 사람에게 도움이 돼요.'))}>{t('지원했어요')}</Button>
      )}
    </View>
  );

  return (
    <Screen title="" right={<IconBtn onPress={() => setMenu(true)}><MoreHorizontal size={20} color={C.ink2} /></IconBtn>} footer={footer}>
      <View style={[tw`-mx-4 h-[150px] items-center justify-center`, { backgroundColor: `${color}22` }]}><Text style={{ fontSize: 64 }}>{OPP_TYPE_EMOJI[o.type]}</Text></View>
      <View style={tw`-mt-6`}>
        <View style={card}>
          <View style={[tw`flex-row flex-wrap items-center`, { gap: 6 }]}>
            <View style={[tw`rounded-lg px-2 h-6 justify-center`, { backgroundColor: color }]}><Text style={tw`text-[11px] font-bold text-white`}>{OPP_TYPE_EMOJI[o.type]} {OPP_TYPE_LABELS[o.type]}</Text></View>
            {o.official && <Tag tone="gold">✓ {t('공식')}</Tag>}
            {o.deadline ? <><View style={tw`flex-1`} /><View style={tw`flex-row items-center`}><AlarmClock size={11} color={daysUntil(o.deadline) <= 7 ? C.danger : C.ink2} /><View style={tw`ml-1`}><Tag tone={daysUntil(o.deadline) <= 7 ? 'danger' : 'neutral'}>{dday(o.deadline)} · {formatDate(o.deadline)} {t('마감')}</Tag></View></View></> : null}
          </View>
          <Text style={tw`text-[20px] font-extrabold text-ink leading-7 mt-2`}>{o.title}</Text>
          <Pressable onPress={() => org && nav(`/orgs/${org.id}`)} style={tw`flex-row items-center mt-0.5`}><Text style={tw`text-[13px] text-ink-2`}>{o.host}</Text>{org && <Text style={tw`ml-1 text-primary text-[12px]`}>{t('조직 페이지')}</Text>}</Pressable>
          {together && <View style={[tw`mt-3 flex-row`, { gap: 8 }]}>
            <View style={tw`flex-1 rounded-xl bg-surface-2 py-2 items-center`}><Text style={tw`text-[16px] font-extrabold text-ink`}>{others.length}</Text><Text style={tw`text-[10px] text-ink-3`}>{t('관심 있는 학생')}</Text></View>
            <View style={tw`flex-1 rounded-xl bg-surface-2 py-2 items-center`}><Text style={tw`text-[16px] font-extrabold text-ink`}>{others.filter((i) => ['going', 'solo', 'company', 'team', 'applied'].includes(i.intent)).length}</Text><Text style={tw`text-[10px] text-ink-3`}>{t('참가 예정')}</Text></View>
            <Pressable onPress={() => setTab('people')} style={tw`flex-1 rounded-xl bg-primary-soft py-2 items-center`}><Text style={tw`text-[16px] font-extrabold text-ink`}>{others.filter((i) => i.intent === 'solo' || i.intent === 'company' || i.intent === 'team').length}</Text><Text style={tw`text-[10px] text-primary text-center`}>{t('같이 갈 사람 찾는 중')}</Text></Pressable>
          </View>}
        </View>

        <View style={tw`mt-3`}><Segmented value={tab} onChange={setTab} options={tabOptions} /></View>

        {tab === 'info' && (
          <>
            <View style={[card, tw`mt-3`]}><Text style={tw`text-[14px] text-ink-2 leading-6`}>{o.description}</Text></View>
            <View style={tw`mt-3 card overflow-hidden`}>
              {o.date ? <InfoRow icon={<Clock size={16} color={C.ink2} />} label={t('일시')} value={formatDateTime(o.date, o.startTime ?? '00:00')} /> : null}
              {o.place ? <InfoRow icon={<MapPin size={16} color={C.ink2} />} label={t('장소')} value={o.place.name} action={<Pressable onPress={() => nav('/map')}><Text style={tw`text-[12px] text-primary font-semibold`}>{t('지도')}</Text></Pressable>} /> : null}
              <InfoRow icon={<Text>👤</Text>} label={t('누구에게 맞는지')} value={o.eligibility} last={!o.benefit && !o.rolesNeeded && !o.sourceUrl} />
              {o.benefit ? <InfoRow icon={<Text>🎁</Text>} label={t('혜택·상금·장학금')} value={o.benefit} last={!o.rolesNeeded && !o.sourceUrl} /> : null}
              {o.rolesNeeded ? <InfoRow icon={<Users size={16} color={C.ink2} />} label={t('필요한 역할')} value={o.rolesNeeded.map((r) => PERSON_ROLE_LABELS[r]).join(', ') + (o.teamSize ? `${t(' · 팀 ')}${o.teamSize}` : '')} last={!o.sourceUrl} /> : null}
              {o.sourceUrl ? <InfoRow icon={<ExternalLink size={16} color={C.ink2} />} label={t('공식 출처')} value={o.sourceLabel} sub={`${t('마지막 확인 ')}${formatDate(o.lastVerified)}`} action={<Pressable onPress={() => Linking.openURL(o.sourceUrl!)}><Text style={tw`text-[12px] text-primary font-semibold`}>{t('열기')}</Text></Pressable>} last /> : null}
            </View>
            <View style={[tw`flex-row flex-wrap mt-3`, { gap: 4 }]}>{o.tags.map((tg) => <Tag key={tg}>#{tg}</Tag>)}</View>
            {together && <View style={tw`mt-3`}>
              <View style={tw`flex-row items-center justify-between mb-2`}><Text style={tw`text-[15px] font-bold text-ink`}>{t('같이 준비하는 모임 · 팀원 모집')}</Text><Pressable onPress={() => nav(`/create/activity?kind=group&opportunity=${o.id}`)} style={tw`flex-row items-center`}><CalendarPlus size={13} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('만들기')}</Text></Pressable></View>
              {teamActs.length ? teamActs.map((a) => <ActivityRow key={a.id} activity={a} />) : <View style={card}><Text style={tw`text-[13px] text-ink-3`}>{t('아직 없어요. 준비방이나 팀원 모집을 먼저 열어보세요.')}</Text></View>}
            </View>}
          </>
        )}

        {tab === 'people' && (
          <View style={tw`mt-3`}>
            {people.length === 0 && <Empty title={`🙋 ${t('아직 관심 있는 사람이 없어요')}`} description={t('관심을 표시하면 다른 사람에게 내가 보여요.')} />}
            {people.map(({ u, i, reasons }) => (
              <View key={u.id} style={tw`card p-3.5 mb-2`}>
                <Pressable onPress={() => nav(`/users/${u.id}`)} style={tw`flex-row items-center`}>
                  <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
                  <View style={tw`flex-1 min-w-0 ml-3`}>
                    <Text numberOfLines={1} style={tw`text-[14px] text-ink`}><Text style={tw`font-bold`}>{u.nickname}</Text><Text style={tw`text-[12px] text-ink-3`}> · {affiliationText(u)}</Text></Text>
                    <View style={tw`flex-row items-center flex-wrap mt-0.5`}><Tag tone={i.intent === 'solo' || i.intent === 'company' ? 'primary' : i.intent === 'interested' ? 'neutral' : 'mint'}>{RSVP_EMOJI[i.intent]} {RSVP_LABELS[i.intent]}</Tag>{u.canOffer.length > 0 && <Text style={tw`ml-1.5 text-[12px] text-ink-2`}>{t('제공:')} {u.canOffer.slice(0, 3).map((r) => PERSON_ROLE_LABELS[r]).join('·')}</Text>}</View>
                  </View>
                </Pressable>
                {reasons.length > 0 && <View style={tw`mt-2`}>{reasons.slice(0, 3).map((r) => <View key={r.text} style={tw`flex-row items-center mb-0.5`}><CheckCircle2 size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] text-ink-2 shrink`}>{r.text}</Text></View>)}</View>}
                <View style={[tw`flex-row mt-3`, { gap: 8 }]}>
                  {(i.intent === 'solo' || i.intent === 'company') ? <Button size="sm" full icon={<Users size={14} color={C.onPrimary} />} onPress={() => nav(`/users/${u.id}?propose=1&cat=networking&opp=${o.id}`)}>{t('같이 가기 제안')}</Button>
                    : <Button size="sm" full onPress={() => nav(`/create/activity?kind=group&opportunity=${o.id}&invite=${u.id}`)}>{o.rolesNeeded ? t('팀 제안하기') : t('같이 준비해요')}</Button>}
                  <Button size="sm" variant="outline" onPress={() => nav(`/users/${u.id}?propose=1`)} icon={<MessageCircle size={14} color={C.ink2} />}>{t('커피 한 잔')}</Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'qna' && (
          <>
            <View style={[card, tw`mt-3`]}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{t('질문과 답변')} {o.qna.length}</Text>
              <View style={tw`mt-3`}>
                {o.qna.map((c) => { const u = v.userById(c.authorId); return <View key={c.id} style={tw`flex-row mb-3`}><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><View style={tw`flex-1 ml-2.5`}><Text style={tw`text-[12px] text-ink`}><Text style={tw`font-bold`}>{u?.nickname}</Text><Text style={tw`text-ink-3`}>  {relativeTime(c.createdAt)}</Text></Text><Text style={tw`text-[13px] text-ink-2 mt-0.5`}>{c.text}</Text></View></View>; })}
                {o.qna.length === 0 && <Text style={tw`text-[12px] text-ink-3`}>{t('궁금한 점을 물어보면 지원 경험자나 주최 측이 답해줘요.')}</Text>}
              </View>
              <View style={tw`flex-row items-center mt-3`}><Input style={tw`flex-1 h-10`} placeholder={t('질문 남기기')} value={text} onChangeText={setText} onSubmitEditing={ask} /><View style={tw`w-2`} /><Button size="sm" disabled={!text.trim()} onPress={ask}>{t('등록')}</Button></View>
            </View>
            <View style={[card, tw`mt-3`]}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{t('지원·참가 후기')} {o.reviews.length}</Text>
              <View style={tw`mt-3`}>
                {o.reviews.map((r) => { const u = v.userById(r.authorId); return <View key={r.id} style={tw`flex-row mb-3`}><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><View style={tw`flex-1 ml-2.5`}><View style={tw`flex-row items-center flex-wrap`}><Text style={tw`text-[12px] font-bold text-ink`}>{u?.nickname}</Text>{r.result && <View style={tw`ml-1.5`}><Tag tone={r.result === 'accepted' ? 'mint' : r.result === 'rejected' ? 'neutral' : 'primary'}>{{ accepted: t('합격·수혜'), rejected: t('불합격'), attended: t('참가') }[r.result]}</Tag></View>}<Text style={tw`ml-1.5 text-[12px] text-ink-3`}>{relativeTime(r.createdAt)}</Text></View><Text style={tw`text-[13px] text-ink-2 mt-0.5`}>{r.text}</Text></View></View>; })}
                {o.reviews.length === 0 && <Text style={tw`text-[12px] text-ink-3`}>{t('첫 후기를 남겨보세요. 결과 공개는 선택이에요.')}</Text>}
              </View>
              <View style={tw`mt-3`}>
                <View style={tw`flex-row flex-wrap`}>{resultOptions.map(([k, l]) => <View key={k} style={tw`mb-2`}><Chip size="sm" active={result === k} onPress={() => setResult(k)}>{l}</Chip></View>)}</View>
                <View style={tw`flex-row items-center`}><Input style={tw`flex-1 h-10`} placeholder={t('후기·팁 남기기')} value={review} onChangeText={setReview} /><View style={tw`w-2`} /><Button size="sm" disabled={!review.trim()} onPress={submitReview}>{t('등록')}</Button></View>
              </View>
            </View>
          </>
        )}
      </View>

      <BottomSheet open={rsvpOpen} onClose={() => setRsvpOpen(false)} title={t('이 행사, 어떻게 할래요?')} tall>
        {(['interested', 'going', 'solo', 'company', 'team', 'applied', 'done'] as OpportunityIntent[]).filter((k) => k !== 'team' || o.rolesNeeded).map((k) => (
          <Pressable key={k} onPress={async () => { await setIntent(k, k === 'company' || k === 'solo' ? t('같이 갈 사람을 보여드릴게요.') : undefined); setRsvpOpen(false); if (k === 'company' || k === 'solo') setTab('people'); }}
            style={tw`rounded-xl px-3.5 h-12 border flex-row items-center mb-1.5 ${mine?.intent === k ? 'border-primary bg-primary-soft' : 'border-line'}`}>
            <Text style={tw`text-[18px]`}>{RSVP_EMOJI[k]}</Text><Text style={tw`ml-2.5 text-[14px] font-medium text-ink`}>{RSVP_LABELS[k]}</Text>
            {(k === 'solo' || k === 'company') && <Text style={tw`ml-auto text-[11px] text-ink-3`}>{others.filter((i) => i.intent === 'solo' || i.intent === 'company').length}{t('명')}</Text>}
          </Pressable>
        ))}
        {mine && <Pressable onPress={async () => { await setIntent(null); setRsvpOpen(false); }} style={tw`h-10 items-center justify-center`}><Text style={tw`text-[13px] text-ink-3`}>{t('상태 지우기')}</Text></Pressable>}
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('기회')}>
        <SheetItem icon={<Share2 size={18} color={C.ink} />} label={t('친구에게 보내기')} onPress={() => { setMenu(false); showToast(t('링크를 복사했어요.')); }} />
        {o.sourceUrl ? <SheetItem icon={<ExternalLink size={18} color={C.ink} />} label={t('공식 출처 열기')} onPress={() => { setMenu(false); Linking.openURL(o.sourceUrl!); }} /> : null}
        <SheetItem icon={<Flag size={18} color={C.danger} />} label={t('잘못된 정보·부적절한 내용 신고')} danger onPress={() => { setMenu(false); setReport(true); }} />
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={o.id} />
    </Screen>
  );
}
