import { Screen } from '@/ui';
import { useAppStore } from '@core/store/useAppStore';
import { useContent, OpportunityRow, Empty } from '@/lumi/Screens';
export default function SavedContentScreen() {
  const v = useContent();
  const intents = useAppStore((st) => st.opportunityIntents);
  const items = v.opportunities.filter((o) =>
    intents.some(
      (i) => i.userId === v.me.id && i.opportunityId === o.id && i.saved,
    ),
  );
  return (
    <Screen title="Saved">
      {items.map((o) => (
        <OpportunityRow key={o.id} item={o} />
      ))}
      {!items.length && (
        <Empty
          title="Keep something for later"
          detail="Saved current opportunities and events will appear here."
        />
      )}
    </Screen>
  );
}
