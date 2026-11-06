import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, IdCard, ImagePlus } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { verificationStep } from '@core/lib/verification';
import { useCurrentUser } from '@core/store/useAppStore';
import { Btn, IconTile, cardCls } from '@/components/ha';
import { shrinkIdPhoto } from '@/lib/idPhoto';

const en = lang === 'en';

/** what to photograph — alumni have no student card any more (owner 2026-11-06: e-mail first, then a photo) */
export const idWhat = (alumni: boolean) => (alumni
  ? (en ? 'alumni card or diploma' : '졸업생 카드나 졸업장')
  : (en ? 'student ID' : '학생증'));

/** The one sentence under the title: who sees the photo, and that it is deleted after review */
export const ID_PRIVACY_LINE = en
  ? 'Only the Lumi team sees this photo, and we delete it as soon as we’ve checked it.'
  : '이 사진은 Lumi 팀만 보고, 확인이 끝나면 바로 지워요.';

/**
 * Take or pick a photo of the card (camera first on phones — `capture`). The picked file is shrunk and redrawn on the
 * device (src/lib/idPhoto.ts — location data is dropped) before anything leaves the phone. `value` is the JPEG data: URL.
 */
export function IdPhotoPicker({ alumni, value, onChange }: { alumni: boolean; value: string; onChange: (dataUrl: string) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (file?: File) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await shrinkIdPhoto(file)); }
    catch { setErr(en ? 'That file isn’t a photo we can read. Please take a photo of the card.' : '읽을 수 없는 파일이에요. 카드를 사진으로 찍어 주세요.'); }
    finally { setBusy(false); }
  };
  const input = (ref: React.RefObject<HTMLInputElement | null>, cam: boolean) => (
    <input ref={ref} type="file" accept="image/*" {...(cam ? { capture: 'environment' as const } : {})} className="hidden"
      onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
  );
  return (
    <div>
      {input(camera, true)}{input(library, false)}
      {value ? (
        <div className={cn(cardCls, 'p-2')}>
          <img src={value} alt={en ? `Your ${idWhat(alumni)}` : idWhat(alumni)} className="w-full max-h-[260px] object-contain rounded-[14px] bg-surface-2" />
          <div className="flex gap-2 mt-2">
            <Btn variant="outline" size="sm" className="flex-1" icon={<Camera size={16} />} onClick={() => camera.current?.click()} loading={busy}>{en ? 'Retake' : '다시 찍기'}</Btn>
            <Btn variant="outline" size="sm" className="flex-1" icon={<ImagePlus size={16} />} onClick={() => library.current?.click()} disabled={busy}>{en ? 'Choose another' : '다른 사진'}</Btn>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => camera.current?.click()} disabled={busy}
            className={cn(cardCls, 'w-full border-dashed p-6 flex flex-col items-center gap-3 text-center press disabled:opacity-60')}>
            <IconTile tone="lav" size={52}>{busy ? <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <IdCard size={26} />}</IconTile>
            <span className="text-[15px] font-bold">{en ? `Take a photo of your ${idWhat(alumni)}` : `${idWhat(alumni)} 사진 찍기`}</span>
            <span className="text-[12.5px] text-ink-3 leading-snug">{en ? 'Front side, with your name and school easy to read' : '앞면 · 이름과 학교가 잘 보이게'}</span>
          </button>
          <div className="mt-2 text-center">
            <Btn variant="link" size="sm" onClick={() => library.current?.click()} disabled={busy}>{en ? 'Choose from photos' : '사진에서 고르기'}</Btn>
          </div>
        </>
      )}
      {err && <p role="alert" className="mt-2 text-[13px] text-danger leading-snug">{err}</p>}
    </div>
  );
}

/**
 * A calm line across the top of the app while the student ID is being checked (or needs a photo / a new photo).
 * The server already hides the account and refuses posting, joining and messages — this only says why.
 */
export function VerificationBanner() {
  const me = useCurrentUser();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const step = verificationStep(me);
  if (step === 'none' || pathname === '/verify-id') return null;
  const reason = me?.verification?.reason;
  const text = step === 'review'
    ? (en ? 'We’re checking your student ID — usually within a day. You can look around in the meantime.' : '학생증을 확인하고 있어요 — 보통 하루 안에 끝나요. 그동안 둘러보세요.')
    : step === 'retake'
      ? (en ? `We couldn’t verify your photo${reason ? `: ${reason}` : '.'}` : `사진을 확인하지 못했어요${reason ? `: ${reason}` : '.'}`)
      : (en ? 'Add a photo of your student ID so people can find you.' : '학생증 사진을 올리면 다른 사람에게 보여요.');
  return (
    <div role="status" className="shrink-0 px-4 py-2.5 bg-t-lav border-b border-line flex items-center gap-3">
      <IdCard size={18} className="text-t-lav-fg shrink-0" />
      <p className="flex-1 min-w-0 text-[12.5px] text-ink leading-snug">{text}</p>
      {step !== 'review' && <Btn variant="link" size="sm" className="shrink-0" onClick={() => nav('/verify-id')}>{step === 'retake' ? (en ? 'New photo' : '다시 보내기') : (en ? 'Add photo' : '올리기')}</Btn>}
    </div>
  );
}
