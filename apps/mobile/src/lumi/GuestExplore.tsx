import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { api, type Snapshot } from '@core/api';
import { currentOpportunities } from '@core/lib/content-truth';
import { BRAND } from '@core/brand';
import { Screen, Button } from '@/ui';
import { Empty, Pills, s } from './Screens';
export function GuestExplore({
  onBack,
  onJoin,
}: {
  onBack: () => void;
  onJoin: () => void;
}) {
  const [content, setContent] =
    useState<Pick<Snapshot, 'schools' | 'organizations' | 'opportunities'>>();
  const [category, setCategory] = useState('Events');
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    api
      .publicContent()
      .then(setContent)
      .catch(() => setError('Could not load campus content.'));
  };
  useEffect(load, []);
  const items = currentOpportunities(content?.opportunities || []);
  return (
    <Screen
      title={BRAND.name}
      header={
        <View style={[s.row, { padding: 18 }]}>
          <Pressable onPress={onBack}>
            <Text style={s.link}>‹ Back</Text>
          </Pressable>
          <Text style={[s.heading, { flex: 1 }]}>{BRAND.name}</Text>
          <Button size="sm" onPress={onJoin}>
            Join Lumi
          </Button>
        </View>
      }
    >
      <Text style={s.title}>Explore your campus</Text>
      <Pills
        values={['Events', 'Opportunities', 'Clubs']}
        value={category}
        onChange={setCategory}
      />
      {error ? (
        <Empty title={error} action="Retry" onPress={load} />
      ) : !content ? (
        <Text style={[s.sub, { marginTop: 20 }]}>Loading campus content…</Text>
      ) : category === 'Clubs' ? (
        content.organizations.map((o) => (
          <View key={o.id} style={s.card}>
            <Text style={s.label}>{o.name}</Text>
            <Text style={s.sub}>{o.description}</Text>
            {o.links?.map((l) => (
              <Pressable
                key={l.url}
                onPress={() => {
                  if (l.url.startsWith('https://')) Linking.openURL(l.url);
                }}
              >
                <Text style={s.link}>{l.label} ↗</Text>
              </Pressable>
            ))}
          </View>
        ))
      ) : (
        items
          .filter(
            (o) =>
              category !== 'Events' ||
              ['event', 'hackathon', 'activity'].includes(o.type),
          )
          .map((o) => (
            <View key={o.id} style={s.card}>
              <Text style={s.label}>{o.title}</Text>
              <Text style={s.sub}>
                {o.host} · {o.date || o.deadline}
              </Text>
              <Text style={s.sub}>{o.description}</Text>
              <Pressable onPress={() => Linking.openURL(o.sourceUrl)}>
                <Text style={s.link}>Details & registration at source ↗</Text>
              </Pressable>
            </View>
          ))
      )}
      {content &&
        !error &&
        (category === 'Clubs'
          ? content.organizations.length === 0
          : items.length === 0) && (
          <Empty
            title={`No verified ${category.toLowerCase()} yet`}
            detail="Campus sources are not connected yet. You can browse public listings here without signing up once they're available."
          />
        )}
    </Screen>
  );
}
