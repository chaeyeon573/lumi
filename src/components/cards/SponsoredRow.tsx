import { ExternalLink } from 'lucide-react';
import { t } from '@core/i18n';
import type { Post } from '@core/types';
import { Cover, Tag, Button } from '@/components/ui';

/** 피드의 스폰서 글 — 접힌 행 / 펼친 딜 카드. 좋아요·댓글 없음 */
export function SponsoredRow({ post: p, expanded, onClick }: { post: Post; expanded: boolean; onClick: () => void }) {
  const ad = p.sponsored!;
  if (expanded) {
    return (
      <div onClick={onClick} className="my-2 card overflow-hidden cursor-pointer">
        {p.media[0] && <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="h-40 w-full" size={40} />}
        <div className="p-4">
          <div className="flex items-center gap-2"><Tag tone="gold">{t('광고')}</Tag><span className="text-[12px] text-ink-3">{ad.advertiser}</span></div>
          <div className="mt-2 text-[16px] font-bold">{p.text}</div>
          {ad.deal && <div className="mt-1 text-[13px] text-ink-2">{ad.deal}</div>}
          <div className="mt-3"><Button variant="secondary" icon={<ExternalLink size={15} />} onClick={(e) => { e.stopPropagation(); if (ad.url) window.open(ad.url, '_blank'); }}>{ad.cta}</Button></div>
        </div>
      </div>
    );
  }
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left press">
      {p.media[0] ? <Cover emoji={p.media[0].emoji} hue={p.media[0].hue} url={p.media[0].url} className="h-11 w-11 rounded-full shrink-0" size={18} /> : <span className="h-11 w-11 rounded-full bg-gold-soft shrink-0" />}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-ink truncate">{ad.advertiser}</span><Tag tone="gold">{t('광고')}</Tag></span>
        <span className="block text-[14px] text-ink-2 truncate mt-0.5">{p.text}</span>
      </span>
      <span className="h-8 px-3 rounded-full bg-accent text-primary text-[12px] font-semibold grid place-items-center shrink-0">{ad.cta}</span>
    </button>
  );
}
