import { Text, View } from 'react-native';
import { ShieldCheck, Ban, Flag } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import type { User } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Segmented, Tag, C } from '@/ui';

type Policy = User['settings']['messagePolicy'];
const card = tw`card p-4`;

/** 계정 및 안전 설정 (웹 SafetySettingsPage) */
export default function SafetySettingsScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const reports = useAppStore((s) => s.reports);
  const me = v.me;
  const blocked = v.snap.relationships.blocks.filter((b) => b.fromId === me.id).map((b) => v.userById(b.toId)).filter((u): u is User => !!u);
  const myReports = reports.filter((r) => r.reporterId === me.id);
  const TARGET = { user: t('사용자'), activity: t('활동'), post: t('게시물'), message: t('메시지') };
  return (
    <Screen title={t('계정 및 안전 설정')}>
      <View style={tw`py-3`}>
        <View style={card}>
          <View style={tw`flex-row items-center`}><ShieldCheck size={16} color={C.mint} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('인증 상태')}</Text></View>
          <View style={tw`flex-row mt-2`}>
            {me.affiliation.type === 'university' && <View style={tw`mr-2`}>{me.affiliation.emailVerified ? <Tag tone="primary">{t('학교 인증 완료')}</Tag> : <Tag tone="gold">{t('학교 미인증')}</Tag>}</View>}
            {me.identityVerified ? <Tag tone="mint">{t('본인 인증 완료')}</Tag> : <Tag>{t('본인 미인증')}</Tag>}
          </View>
          <View style={tw`flex-row mt-3`}><Button size="sm" variant="outline" onPress={() => nav('/profile/edit')}>{t('인증 관리')}</Button></View>
        </View>

        <View style={[card, tw`mt-4`]}>
          <Text style={tw`text-[14px] font-bold text-ink`}>{t('메시지 수신 제한')}</Text>
          <Text style={tw`text-[12px] text-ink-3 mt-0.5 mb-3`}>{t('연결되지 않은 사람은 어떤 설정에서도 메시지를 보낼 수 없어요.')}</Text>
          <Segmented<Policy> value={me.settings.messagePolicy} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, messagePolicy: val } }), t('메시지 수신 설정을 바꿨어요.'))} options={[['connected', t('연결된 사람')], ['friends_only', t('친구만')], ['none', t('받지 않음')]]} />
        </View>

        <View style={[card, tw`mt-4`]}>
          <View style={tw`flex-row items-center`}><Ban size={16} color={C.danger} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('차단한 사용자')} {blocked.length}</Text></View>
          {blocked.length === 0 ? <Text style={tw`text-[12px] text-ink-3 mt-2`}>{t('차단한 사용자가 없어요.')}</Text> : (
            <View style={tw`mt-2`}>{blocked.map((u, i) => (
              <View key={u.id} style={tw`flex-row items-center py-2.5 ${i === 0 ? '' : 'border-t border-line'}`}>
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
                <Text style={tw`flex-1 ml-3 text-[14px] font-bold text-ink`}>{u.nickname}</Text>
                <Button size="sm" variant="outline" onPress={() => run(() => api.relationships.unblock(me.id, u.id), t('차단을 해제했어요.'))}>{t('차단 해제')}</Button>
              </View>
            ))}</View>
          )}
        </View>

        <View style={[card, tw`mt-4`]}>
          <View style={tw`flex-row items-center`}><Flag size={16} color={C.accent} /><Text style={tw`ml-1.5 text-[14px] font-bold text-ink`}>{t('신고 내역')} {myReports.length}</Text></View>
          {myReports.length === 0 ? <Text style={tw`text-[12px] text-ink-3 mt-2`}>{t('신고 내역이 없어요.')}</Text> : (
            <View style={tw`mt-2`}>{myReports.map((r) => (
              <View key={r.id} style={tw`flex-row flex-wrap items-center mb-2`}>
                <Tag>{TARGET[r.targetType]}</Tag>
                <Text style={tw`ml-1.5 text-[12px] text-ink-2`}>{r.reason}</Text>
                <Text style={tw`ml-1 text-[12px] text-ink-3`}>· {relativeTime(r.createdAt)} {t('· 검토 중')}</Text>
              </View>
            ))}</View>
          )}
        </View>
        <Text style={tw`text-[11px] text-ink-3 text-center mt-4`}>{t('활동 주최자·참가자 평가와 후기는 다음 버전에서 추가될 예정이에요.')}</Text>
      </View>
    </Screen>
  );
}
