import type { ReactNode } from 'react';
import { t } from '@core/i18n';
import { Sheet, SheetContent, DialogRoot, DialogContent } from './shadcn/sheet';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** 시트 높이 제한 없이 내용에 맞춤 */
  tall?: boolean;
}

/** 아래에서 올라오는 시트 — shadcn/ui Sheet (Radix Dialog) */
export function BottomSheet({ open, onClose, title, children, className, tall }: SheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {open && <SheetContent title={title} closeLabel={t('닫기')} tall={tall} className={className}>{children}</SheetContent>}
    </Sheet>
  );
}

export function shellEl() {
  return document.getElementById('shell') ?? document.body;
}

/** 확인 대화상자 — shadcn/ui Dialog */
export function Dialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode }) {
  return (
    <DialogRoot open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      {open && <DialogContent title={title} description={description}><div className="mt-4 flex gap-2">{children}</div></DialogContent>}
    </DialogRoot>
  );
}
