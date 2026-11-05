import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { Visibility } from '@core/types';
import { Screen, Button, Toggle } from '@/ui';
import { useViewer } from '@/viewer';
import { s, Pills } from '@/lumi/Screens';
export default function DiscoverySettings() {
  const me = useViewer().me;
  const run = useAppStore((st) => st.run);
  const [classmates, setClassmates] = useState(me.classmateOptIn === true);
  const [memberships, setMemberships] = useState(
    me.membershipVisibility || 'private',
  );
  const [language, setLanguage] = useState(
    me.spokenLanguages?.join(', ') || '',
  );
  const [origin, setOrigin] = useState(me.countryOfOrigin || '');
  const [year, setYear] = useState(
    me.academicYear ? String(me.academicYear) : '',
  );
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Discovery & privacy">
      <Toggle
        label="Classmate discovery"
        description="Let students in the same class find you. Your timetable visibility still applies."
        checked={classmates}
        onChange={setClassmates}
      />
      <Text style={[s.label, { marginTop: 20 }]}>Membership display</Text>
      <Pills
        values={['private', 'friends', 'school', 'public']}
        value={memberships}
        onChange={(v) => setMemberships(v as Visibility)}
      />
      <Text style={[s.sub, { marginTop: 20 }]}>
        Spoken languages (optional, comma-separated)
      </Text>
      <TextInput
        accessibilityLabel="Spoken languages"
        style={s.input}
        value={language}
        onChangeText={setLanguage}
        placeholder="English, Spanish"
      />
      <Text style={s.sub}>
        Country of origin (optional, separate from language)
      </Text>
      <TextInput
        accessibilityLabel="Country of origin"
        style={s.input}
        value={origin}
        onChangeText={setOrigin}
      />
      <Text style={s.sub}>Undergraduate year (optional)</Text>
      <Pills
        values={['1', '2', '3', '4']}
        value={year}
        onChange={(v) => setYear(year === v ? '' : v)}
      />
      <Text style={[s.sub, { marginTop: 18 }]}>
        Country and language are never inferred. Housing remains controlled by
        your profile privacy settings.
      </Text>
      <View style={{ marginTop: 24 }}>
        <Button
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await run(
                () =>
                  api.users.update(me.id, {
                    classmateOptIn: classmates,
                    membershipVisibility: memberships,
                    spokenLanguages: language
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                    countryOfOrigin: origin.trim() || undefined,
                    academicYear: year
                      ? (Number(year) as 1 | 2 | 3 | 4)
                      : undefined,
                  }),
                'Privacy saved',
              );
            } catch {
              /* toast */
            } finally {
              setBusy(false);
            }
          }}
        >
          Save privacy
        </Button>
      </View>
    </Screen>
  );
}
