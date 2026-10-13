/**
 * 수업 링크 QR 카드 (/c/<학교>/<과목>/qr) — 조교·스터디 동아리·RA 가 강의 슬라이드에 붙이거나 인쇄한다.
 * 사람 정보는 없다 (로그인 없이 열린다).
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ClassRoomInfo } from '@core/api/types';
import { api } from '@core/api';
import { Button } from '@/components/ui';
import { CopyClassLink, QrSvg, classUrl, shortUrl } from '@/components/classes/ClassLink';

const en = lang === 'en';

export function ClassQrPage() {
  const { school = '', code = '' } = useParams();
  const [info, setInfo] = useState<ClassRoomInfo | null | undefined>(undefined);
  useEffect(() => { api.classes.room(school, code).then(setInfo).catch(() => setInfo(null)); }, [school, code]);
  useEffect(() => { if (info) document.title = `${info.code} study groups · Lumi QR`; }, [info]);
  if (info === undefined) return <div className="min-h-full bg-bg" />;
  if (!info) return <div className="min-h-full bg-bg grid place-items-center text-ink-2 text-[15px] p-6">{en ? "We couldn't find this class." : '수업을 찾을 수 없어요.'}</div>;
  const url = classUrl(info.schoolId, info.code);
  return (
    <div className="min-h-full bg-bg flex flex-col items-center justify-center gap-6 p-4 sm:p-10 print:p-0">
      <div className="w-full max-w-[880px] rounded-[28px] bg-surface border border-line shadow-[var(--shadow-float)] p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 print:shadow-none">
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.14em] text-ink-3">{info.code} · {info.term}</div>
          <h1 className="mt-2 font-display text-[30px] sm:text-[44px] font-extrabold text-ink leading-[1.05]">{en ? <>{info.code} study groups 📚</> : <>{info.code} 스터디 그룹 📚</>}</h1>
          <p className="mt-3 text-[15px] sm:text-[18px] text-ink-2 leading-snug">{en ? 'Scan to get matched with classmates who are free when you are. Groups of 3–4 — plus project partners.' : '스캔하면 같은 시간에 비는 같은 수업 학생과 3~4명 스터디 그룹으로 묶어 드려요.'}</p>
          {info.count > 0 && <p className="mt-3 text-[14px] font-semibold text-primary">{en ? `${info.count} ${info.code} student${info.count === 1 ? '' : 's'} already on Lumi` : `${info.count}명이 이미 Lumi에 있어요`}</p>}
          <p className="mt-4 text-[12px] text-ink-3">{en ? 'Only classmates see each other, and only that they take the class.' : '같은 수업 학생끼리만, 수업을 듣는다는 것만 보여요.'}</p>
        </div>
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="rounded-2xl bg-white p-3 border-2 border-ink"><QrSvg value={url} size={240} /></div>
          <div className="text-center">
            <div className="font-display text-[26px] font-extrabold text-ink leading-none">lumi<span className="text-accent">.</span></div>
            <div className="mt-1 text-[13px] text-ink-2 break-all">{shortUrl(url)}</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 print:hidden">
        <Button icon={<Printer size={16} />} onClick={() => window.print()}>{en ? 'Print' : '인쇄'}</Button>
        <CopyClassLink compact schoolId={info.schoolId} code={info.code} className="h-11" />
      </div>
    </div>
  );
}
