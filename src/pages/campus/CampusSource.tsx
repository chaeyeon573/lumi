import { ExternalLink } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { BackHeader, PageTitle, Btn, InfoNote, cardCls } from '@/components/ha';
import { schoolLabel } from '@/pages/home/HomeDashboard';

const en = lang === 'en';

/** S015 / S016 머리 — "‹ Recreation", 큰 제목, "UC Berkeley · Recreation" */
export function CampusHead({ title }: { title: string }) {
  const me = useViewer().me;
  return (
    <>
      <BackHeader title={title} />
      <PageTitle title={title} sub={`${schoolLabel(me) ?? (en ? 'Your university' : '우리 학교')} · ${title}`} />
    </>
  );
}

/**
 * PDF S015·S016 의 "Check the official source" 카드 + 각주.
 * 각주(라이브 값 없음)는 데이터를 실제로 못 읽었을 때만 — 읽고 있으면 출처 표시만 한다.
 */
export function CampusSource({ url, label, text, unavailableNote }: { url?: string; label?: string; text: string; unavailableNote?: string | null }) {
  return (
    <div className="space-y-3 mt-5">
      {url && (
        <div className={`${cardCls} p-4`}>
          <div className="text-[16px] font-bold">{en ? 'Check the official source' : '공식 출처 확인'}</div>
          <p className="text-[13.5px] text-ink-2 mt-1 leading-snug">{text}</p>
          <a href={url} target="_blank" rel="noreferrer"><Btn variant="outline" size="sm" className="mt-3" icon={<ExternalLink size={15} />}>{label ?? (en ? 'University Website' : '학교 웹사이트')}</Btn></a>
        </div>
      )}
      {unavailableNote && <InfoNote>{unavailableNote}</InfoNote>}
    </div>
  );
}
