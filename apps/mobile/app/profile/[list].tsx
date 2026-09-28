import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { friendsOf, followersOf, followingOf } from '@core/lib/relations';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Empty, C } from '@/ui';
import { affiliationText, VerifiedBadge } from '@/components/b_Profile';

const TITLES: Record<string, string> = { friends: t('친구'), followers: t('팔로워'), following: t('팔로잉'), likes: t('관심 목록') };

/** 친구 / 팔로워 / 팔로잉 / 관심 목록 (웹 ProfileListPage) */
export default function ProfileListScreen() {
  const { list = 'friends' } = useLocalSearchParams<{ list?: string }>();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const ids = list === 'friends' ? friendsOf(v.snap, me.id) : list === 'followers' ? followersOf(v.snap, me.id) : list === 'following' ? followingOf(v.snap, me.id) : v.snap.relationships.likes.filter((l) => l.fromId === me.id).map((l) => l.toId);
  return (
    <Screen title={TITLES[list] ?? t('목록')}>
      {list === 'likes' && <View style={tw`pt-3 flex-row items-center`}><Star size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] text-ink-3 shrink`}>{t('관심은 상대에게 보이지 않아요. 서로 관심이 있으면 메시지를 보낼 수 있어요.')}</Text></View>}
      <View style={tw`py-3`}>
        {ids.length === 0 ? <Empty title={t('아직 아무도 없어요')} /> : (
          <View style={tw`card`}>
            {ids.map((id, idx) => {
              const u = v.userById(id); const o = orgs.find((x) => x.id === id);
              const border = idx === 0 ? '' : 'border-t border-line';
              if (o) return <Pressable key={id} onPress={() => nav(`/orgs/${id}`)} style={tw`flex-row items-center px-3.5 py-3 ${border}`}><Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={40} style={{ borderRadius: 12 }} /><View style={tw`flex-1 ml-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{o.name}</Text><Text style={tw`text-[12px] text-ink-3`}>{t('조직')}</Text></View></Pressable>;
              if (!u) return null;
              return (
                <Pressable key={id} onPress={() => nav(`/users/${id}`)} style={tw`flex-row items-center px-3.5 py-3 ${border}`}>
                  <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} />
                  <View style={tw`flex-1 min-w-0 ml-3`}>
                    <View style={tw`flex-row items-center`}><Text style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text>{u.affiliation.type === 'university' && u.affiliation.emailVerified && <View style={tw`ml-1`}><VerifiedBadge /></View>}</View>
                    <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{affiliationText(u)}</Text>
                  </View>
                  {list === 'likes' && v.isMutual(id) && <Text style={tw`text-[11px] font-bold text-primary`}>{t('서로 관심')}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
