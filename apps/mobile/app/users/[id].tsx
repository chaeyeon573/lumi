import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, Redirect } from 'expo-router';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { friendsOf } from '@core/lib/relations';
import { TEXT_PROMPTS } from '@core/data/prompts';
import { Screen, Avatar, Button, BottomSheet } from '@/ui';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Empty, s } from '@/lumi/Screens';
import { ReportSheet } from '@/components/a_ReportSheet';
export default function VisitorProfile() {
  const p = useLocalSearchParams<{
    id: string;
    propose?: string;
    cat?: string;
    opp?: string;
  }>();
  const v = useViewer();
  const user = v.userById(p.id);
  const orgs = useAppStore((st) => st.organizations);
  const run = useAppStore((st) => st.run);
  const [report, setReport] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  if (p.propose)
    return (
      <Redirect href={{ pathname: '/users/detail/[id]', params: p } as never} />
    );
  if (user?.id === v.me.id) return <Redirect href="/me" />;
  if (!user || user.deleted || user.suspended || v.isBlocked(user.id))
    return (
      <Screen title="Profile">
        <Empty
          title="Profile unavailable"
          detail="This profile is not available."
        />
      </Screen>
    );
  const groups = orgs.filter(
    (o) =>
      o.memberIds.includes(user.id) &&
      (user.membershipVisibility === 'public' ||
        (user.membershipVisibility === 'friends' && v.isFriend(user.id)) ||
        (user.membershipVisibility === 'school' &&
          user.affiliation.type === 'university' &&
          v.me.affiliation.type === 'university' &&
          user.affiliation.schoolId === v.me.affiliation.schoolId)),
  );
  const request = v.pendingIn(user.id);
  const outgoing = v.pendingOut(user.id);
  const friends = v.isFriend(user.id);
  const msg = v.canMessage(user.id);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Profile"
      right={
        <Pressable
          accessibilityLabel="Profile menu"
          onPress={() => setMenu(true)}
        >
          <Text style={s.heading}>···</Text>
        </Pressable>
      }
    >
      <View style={[s.row, { marginTop: 14 }]}>
        <Avatar {...user.avatar} size={74} />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { marginTop: 0 }]}>{user.nickname}</Text>
          {user.affiliation.type === 'university' &&
            user.affiliation.showSchool && (
              <Text style={s.sub}>{user.affiliation.schoolName}</Text>
            )}
          {user.affiliation.type === 'university' &&
            user.affiliation.showDepartment && (
              <Text style={s.sub}>
                {user.affiliation.department} · {user.affiliation.role}
              </Text>
            )}
        </View>
      </View>
      {v.canSeeField(user, 'bio') && (
        <Text style={[s.sub, { marginVertical: 16 }]}>{user.bio}</Text>
      )}
      <View style={[s.row, { marginVertical: 16, flexWrap: 'wrap' }]}>
        {request ? (
          <>
            <Button
              loading={busy}
              onPress={() =>
                act(() =>
                  run(() =>
                    api.relationships.respondFriendRequest(request.id, true),
                  ),
                )
              }
            >
              Accept Friend
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                act(() =>
                  run(() =>
                    api.relationships.respondFriendRequest(request.id, false),
                  ),
                )
              }
            >
              Decline
            </Button>
          </>
        ) : (
          <Button
            loading={busy}
            variant={friends ? 'outline' : 'primary'}
            disabled={!!outgoing || friends}
            onPress={() =>
              act(() =>
                run(() =>
                  api.relationships.sendFriendRequest(v.me.id, user.id),
                ),
              )
            }
          >
            {friends ? 'Friends' : outgoing ? 'Request sent' : 'Add Friend'}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!msg.ok}
          onPress={() =>
            act(async () => {
              const r = await run(() => api.chats.openDirect(v.me.id, user.id));
              nav(`/chats/${r.room.id}`);
            })
          }
        >
          Message
        </Button>
      </View>
      {!msg.ok && <Text style={s.sub}>{msg.reason}</Text>}
      <View style={[s.row, { marginTop: 10 }]}>
        {groups.length > 0 && (
          <Text style={s.sub}>{groups.length} visible Groups</Text>
        )}
        <Text style={s.sub}>{friendsOf(v.snap, user.id).length} Friends</Text>
      </View>
      {v.canSeeField(user, 'prompts') && user.prompts.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[s.heading, { marginBottom: 14 }]}>Get to know me</Text>
          {user.prompts.slice(0, 3).map((q) => (
            <View key={q.questionId} style={s.card}>
              <Text style={s.sub}>
                {TEXT_PROMPTS.find((x) => x.id === q.questionId)?.text ||
                  'A little about me'}
              </Text>
              <Text style={[s.label, { marginTop: 8 }]}>{q.answer}</Text>
            </View>
          ))}
        </View>
      )}
      {groups.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => nav(`/orgs/${o.id}`)}
          style={s.card}
        >
          <Text style={s.label}>{o.name}</Text>
          <Text style={s.sub}>Member</Text>
        </Pressable>
      ))}
      <View style={{ marginTop: 24 }}>
        <Button
          variant="outline"
          onPress={() => nav(`/users/detail/${user.id}?propose=1`)}
        >
          Suggest a Meetup
        </Button>
      </View>
      <BottomSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Profile options"
      >
        <Button
          variant="ghost"
          onPress={() => {
            setMenu(false);
            setReport(true);
          }}
        >
          Report profile
        </Button>
        <Button
          variant="ghost"
          onPress={() =>
            act(() => run(() => api.relationships.block(v.me.id, user.id)))
          }
        >
          Block profile
        </Button>
        {friends && (
          <Button
            variant="ghost"
            onPress={() =>
              act(() => run(() => api.relationships.unfriend(v.me.id, user.id)))
            }
          >
            Remove Friend
          </Button>
        )}
      </BottomSheet>
      <ReportSheet
        open={report}
        onClose={() => setReport(false)}
        targetType="user"
        targetId={user.id}
      />
    </Screen>
  );
}
