import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { ChevronRight, Lock, ShieldAlert, Bell, MapPin, LogOut, RotateCcw, Bug, User, Users } from 'lucide-react-native';
import { PaywallSheet } from '@/components/PaywallSheet';
import { Sparkles } from 'lucide-react-native';
import { t, lang, setLang, type Lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import type { User as UserT } from '@core/types';
import { tw } from '@/tw';
import { nav, replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Segmented, Toggle, Button, BottomSheet, Avatar, C } from '@/ui';
import { affiliationText } from '@/components/b_Profile';
import { stageKind, type StageKind } from '@core/lib/stage';
import { setPartialFail } from '@/v2/useSectionState';

const card = tw`rounded-[24px] border border-line bg-white`;

/** 설정 (웹 SettingsPage) */
export default function SettingsScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const logout = useAppStore((s) => s.logout);
  const init = useAppStore((s) => s.init);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const users = useAppStore((s) => s.users);
  const showToast = useAppStore((s) => s.showToast);
  const me = v.me;
  const [switchOpen, setSwitchOpen] = useState(false);
  const items = [
    { Icon: User, label: t('프로필 편집'), to: '/profile/edit' },
    { Icon: Lock, label: t('공개 범위 설정'), desc: t('프로필 항목별 공개 범위'), to: '/settings/privacy' },
    { Icon: ShieldAlert, label: t('계정 및 안전 설정'), desc: t('차단 목록, 메시지 수신 제한, 신고 내역'), to: '/settings/safety' },
  ];

  /** 웹은 /welcome 으로 보내지만 모바일은 데모 계정으로 바로 다시 로그인한다 (루트 레이아웃 부팅 로직과 동일) */
  const [paywall, setPaywall] = useState(false);
  const relogin = async () => {
    await logout();
    const u = await api.auth.loginDemo();
    await setCurrentUser(u);
    replace('/');
  };
  const changeLang = (next: Lang) => {
    if (next === lang) return;
    setLang(next); // 저장 + platform.reload() — 핸들러가 없으면 아래 폴백으로 앱을 다시 띄운다
    Updates.reloadAsync().catch(() => init());
  };
  /** 데모: 학부생 · 대학원생 · 졸업생 화면을 바로 확인 (웹 설정 › 데모 도구 와 같은 동작) */
  const previewStage = async (k: StageKind) => {
    try {
      if (k === 'undergrad') { await run(() => api.users.setStage(me.id, 'undergrad')); await run(() => api.users.setResearch(me.id, null), t('학부생')); }
      else if (k === 'grad') { await run(() => api.users.setStage(me.id, 'masters')); await run(() => api.users.setResearch(me.id, { field: 'NLP', lab: lang === 'en' ? 'NLP Lab' : '자연어처리 연구실', year: 2, keywords: ['LLM', lang === 'en' ? 'Evaluation' : '평가'] }), t('대학원생')); }
      else await run(() => api.users.setStage(me.id, 'alumni'), t('졸업생'));
    } catch { /* toast by run */ }
  };
  const switchUser = async (u: UserT) => {
    setSwitchOpen(false);
    await setCurrentUser(u);
    showToast(`${u.nickname}${lang === 'en' ? ' — switched demo user' : ' 계정으로 전환했어요'}`);
    replace('/');
  };

  return (
    <Screen title={t('설정')}>
      <View style={tw`py-3`}>
        <View style={card}>
          {items.map((it, i) => (
            <Pressable key={it.to} onPress={() => nav(it.to)} style={tw`flex-row items-center px-4 py-3.5 ${i === 0 ? '' : 'border-t border-line'}`}>
              <it.Icon size={18} color={C.ink2} />
              <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{it.label}</Text>{it.desc && <Text style={tw`text-[12px] text-ink-3`}>{it.desc}</Text>}</View>
              <ChevronRight size={18} color={C.ink3} />
            </Pressable>
          ))}
        </View>

        <View style={[card, tw`px-4 mt-3`]}>
          <Toggle label={t('알림')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림')} checked={me.settings.notifications} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, notifications: val } }))} />
          <View style={tw`py-3 flex-row items-start border-t border-line`}>
            <MapPin size={18} color={C.ink2} style={tw`mt-0.5`} />
            <View style={tw`flex-1 ml-3`}>
              <Text style={tw`text-[14px] font-medium text-ink`}>{t('위치 권한 ·')} {me.settings.locationPermission === 'granted' ? t('허용됨') : me.settings.locationPermission === 'denied' ? t('거부됨') : t('미설정')}</Text>
              <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{t('위치는 주변 활동 추천에만 사용되고, 정확한 위치는 다른 사용자에게 공개되지 않아요.')}</Text>
              <View style={tw`flex-row mt-2`}><Button size="sm" variant="outline" onPress={() => run(() => api.users.update(me.id, { settings: { ...me.settings, locationPermission: me.settings.locationPermission === 'granted' ? 'denied' : 'granted' } }))}>{me.settings.locationPermission === 'granted' ? t('권한 끄기') : t('권한 허용')}</Button></View>
            </View>
          </View>
          <View style={tw`py-3 flex-row items-center border-t border-line`}><Bell size={18} color={C.ink2} /><Text style={tw`flex-1 ml-3 text-[14px] font-medium text-ink`}>{t('알림 확인')}</Text><Button size="sm" variant="outline" onPress={() => nav('/notifications')}>{t('열기')}</Button></View>
        </View>

        <View style={[card, tw`px-4 py-3 mt-3`]}>
          <Text style={tw`text-[14px] font-medium text-ink mb-2`}>{t('언어')}</Text>
          <Segmented<Lang> value={lang} onChange={changeLang} options={[['ko', '한국어'], ['en', 'English']]} />
          <Text style={tw`text-[12px] text-ink-3 mt-2`}>{t('언어를 바꾸면 데모 데이터도 해당 언어의 캠퍼스로 바뀌어요.')}</Text>
        </View>

        <View style={[card, tw`mt-3`]}>
          <Pressable onPress={relogin} style={tw`flex-row items-center px-4 py-3.5`}><LogOut size={18} color={C.ink2} /><Text style={tw`flex-1 ml-3 text-[14px] font-semibold text-ink`}>{t('로그아웃')}</Text></Pressable>
        </View>

        <View style={[card, tw`mt-3`]}>
          <Pressable onPress={() => (me.plan === 'plus' ? run(() => api.users.setPlan(me.id, 'free'), t('AroundU+ 해지했어요.')) : setPaywall(true))} style={tw`flex-row items-center px-4 py-3.5`}>
            <Sparkles size={18} color={C.primary} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{me.plan === 'plus' ? t('구독 관리') : 'AroundU+'}</Text><Text style={tw`text-[12px] text-ink-3`}>{me.plan === 'plus' ? t('AroundU+ 해지') : t('무제한 친구 요청') + ' · ' + t('광고 없는 피드')}</Text></View>
            <ChevronRight size={18} color={C.ink3} />
          </Pressable>
        </View>

        <View style={[card, tw`mt-3`]}>
          <Text style={tw`px-4 pt-3 pb-1 text-[11px] font-bold text-ink-3`}>{t('데모 도구')}</Text>
          <View style={tw`px-4 py-3 border-t border-line`}>
            <Text style={tw`text-[14px] font-semibold text-ink mb-2`}>{t('단계 미리보기')}</Text>
            <Segmented<StageKind> value={stageKind(me)} onChange={previewStage} options={[['undergrad', t('학부생')], ['grad', t('대학원생')], ['alumni', t('졸업생')]]} />
            <Text style={tw`text-[12px] text-ink-3 mt-2`}>{t('단계에 따라 홈과 추천이 달라져요. 학교 네트워크는 졸업 후에도 그대로예요.')}</Text>
          </View>
          <Pressable onPress={() => { setPartialFail('1'); showToast(t('다음에 여는 섹션 하나가 실패해요. 다시 시도로 복구해보세요.')); }} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <Bug size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{t('부분 오류 미리보기')}</Text></View>
          </Pressable>
          <Pressable onPress={() => run(() => api.users.update(me.id, { swipes: { date: '1970-01-01', count: 0 } }), t('스와이프 카운트를 초기화했어요.'))} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <RotateCcw size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{t('오늘 스와이프 카운트 초기화')}</Text></View>
          </Pressable>
          <Pressable onPress={() => run(() => api.users.setPlan(me.id, 'free'), t('플랜을 초기화했어요.'))} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <RotateCcw size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{t('플랜 초기화')}</Text></View>
          </Pressable>
          <Pressable onPress={() => setSwitchOpen(true)} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <Users size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{lang === 'en' ? 'Switch demo user' : '데모 사용자 전환'}</Text><Text style={tw`text-[12px] text-ink-3`}>{lang === 'en' ? `Now: ${me.nickname} · browse the app as someone else` : `현재 ${me.nickname} · 다른 사용자 시점으로 둘러봐요`}</Text></View>
            <ChevronRight size={18} color={C.ink3} />
          </Pressable>
          <Pressable onPress={() => nav('/onboarding')} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <Sparkles size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{t('새 계정으로 시작하기 (온보딩)')}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('학교 선택부터 가입 과정을 처음부터 둘러봐요')}</Text></View>
            <ChevronRight size={18} color={C.ink3} />
          </Pressable>
          <Pressable onPress={() => { api.system.failNext(); showToast(t('다음 요청이 실패해요. 홈으로 돌아가 새로고침해보세요.')); init(); }} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <Bug size={18} color={C.ink2} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-ink`}>{t('오류 상태 미리보기')}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('다음 API 요청 1회를 실패시켜 오류 화면을 확인해요')}</Text></View>
          </Pressable>
          <Pressable onPress={async () => { await api.system.reset(); await relogin(); showToast(t('데모 데이터를 초기화했어요.')); }} style={tw`flex-row items-center px-4 py-3.5 border-t border-line`}>
            <RotateCcw size={18} color={C.danger} />
            <View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-semibold text-danger`}>{t('데모 데이터 초기화')}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('모든 변경 사항을 지우고 예시 데이터로 되돌려요')}</Text></View>
          </Pressable>
        </View>
        <Text style={tw`text-center text-[11px] text-ink-3 mt-3`}>AroundU MVP · mock API (AsyncStorage)</Text>
      </View>

      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} />
      <BottomSheet open={switchOpen} onClose={() => setSwitchOpen(false)} title={lang === 'en' ? 'Switch demo user' : '데모 사용자 전환'} tall>
        {users.map((u) => (
          <Pressable key={u.id} onPress={() => switchUser(u)} style={tw`flex-row items-center rounded-xl px-3 py-2.5 mb-1 ${u.id === me.id ? 'bg-primary-soft' : ''}`}>
            <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
            <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{affiliationText(u, true)}</Text></View>
            {u.id === me.id ? <Text style={tw`text-[11px] font-bold text-primary`}>{t('나')}</Text> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}
