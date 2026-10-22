import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Users } from 'lucide-react';
import type { Organization } from '@core/types';
import { Avatar, SampleTag, Tag } from '@/components/ui';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { isSampleOrg } from '@core/lib/sampleorgs';

export function OrgCard({ org }: { org: Organization }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(`/orgs/${org.id}`)} className="card w-full flex items-center gap-3 p-3 text-left press">
      <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={48} className="!rounded-2xl" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[14px] font-bold truncate">{isSampleOrg(org.id) && <SampleTag className="mr-0" />}{org.name}{org.verified && !isSampleOrg(org.id) && <BadgeCheck size={14} className="text-gold shrink-0" />}</div>
        <div className="text-[12px] text-ink-3 flex items-center gap-2"><span>{ORG_TYPE_LABELS[org.type]}</span><span className="flex items-center gap-0.5"><Users size={11} />{org.followerIds.length}</span></div>
        {org.recruitment?.open && <Tag tone="accent" className="mt-1">{org.recruitment.title}</Tag>}
      </div>
    </button>
  );
}
