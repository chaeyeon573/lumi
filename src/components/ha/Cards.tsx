import type { ReactNode } from 'react';
import { ArrowUpRight, Bookmark, ChevronRight, MapPin } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { Avatar, Cover } from '@/components/ui';
import { TONE, type Tone } from './tones';

const en = lang === 'en';

/** 카드 바탕 — 어두운 표면 + 가는 테두리 (PDF 의 흰 카드) */
export const cardCls = 'bg-surface border border-line rounded-[20px]';

/** 섹션 머리 (PDF: "For you            See all ›") */
export function SectionHeader({ title, action, onAction, className }: { title: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between mb-3', className)}>
      <h2 className="ha-h2">{title}</h2>
      {action && onAction && <button onClick={onAction} className="text-[13px] text-ink-2 font-medium flex items-center press">{action}<ChevronRight size={15} /></button>}
    </div>
  );
}

/** 색 칸 안의 아이콘 (PDF: 40px 둥근 네모) */
export function IconTile({ tone = 'ice', size = 44, children, className }: { tone?: Tone; size?: number; children: ReactNode; className?: string }) {
  return <span className={cn('grid place-items-center shrink-0 rounded-[14px]', TONE[tone], className)} style={{ width: size, height: size }}>{children}</span>;
}

/** 작은 배지 (PDF: "Campus event", "Source verified", "Coffee") */
export function Badge({ tone = 'ice', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center h-6 px-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap', TONE[tone], className)}>{children}</span>;
}

/** 홈 카테고리 타일 (PDF S012: 2×2 Events · Opportunities · Clubs · Meetups) */
export function CategoryTile({ tone, icon, label, onClick }: { tone: Tone; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('h-[104px] rounded-[20px] flex flex-col items-center justify-center gap-2.5 press', TONE[tone])}>
      {icon}
      <span className="text-[15px] font-bold text-ink">{label}</span>
    </button>
  );
}

export function CategoryGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)}>{children}</div>;
}

/**
 * 줄 카드 (PDF: "Make room for a good plan / Add classes and find your free time  ›").
 * 아이콘 칸 + 제목 + 한 줄 + 오른쪽(기본 ›). onClick 이 없으면 눌리지 않는 카드.
 */
export function RowCard({ tone = 'ice', icon, title, sub, right, onClick, badge, className }: {
  tone?: Tone; icon: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; badge?: ReactNode; className?: string;
}) {
  const body = (
    <>
      <IconTile tone={tone}>{icon}</IconTile>
      <span className="flex-1 min-w-0">
        {badge && <span className="block mb-1">{badge}</span>}
        <span className="block text-[15px] font-bold leading-snug truncate">{title}</span>
        {sub && <span className="block text-[13px] text-ink-3 leading-snug mt-0.5 line-clamp-2">{sub}</span>}
      </span>
      {right ?? (onClick ? <ChevronRight size={18} className="text-ink-3 shrink-0" /> : null)}
    </>
  );
  const cls = cn(cardCls, 'w-full p-4 flex items-center gap-3.5 text-left', className);
  return onClick ? <button onClick={onClick} className={cn(cls, 'press')}>{body}</button> : <div className={cls}>{body}</div>;
}

/**
 * 공고·행사 카드 (PDF S017): 진짜 사진이 있을 때만 왼쪽 사진. 없으면 글만 — 종류 칩, 제목, 한 줄 설명, 메타, "View source ↗", 책갈피.
 * (2026-11-06 사장님: 사진이 없으면 아이콘 칸·이모지 칸·머리글자 칸을 그리지 않는다)
 */
export function ListingCard({ cover, badge, badgeTone = 'ice', title, line, meta, where, sourceUrl, saved, onSave, onClick, className }: {
  cover?: { emoji: string; hue: number; url?: string }; /** @deprecated nothing is drawn without a real photo */ icon?: ReactNode; badge?: string; badgeTone?: Tone; title: string;
  /** one line of description */ line?: string; meta?: ReactNode;
  /** 근무지 — meta 줄 끝에서 잘리지 않게 따로 한 줄 (📍 Mountain View, CA) */ where?: string;
  sourceUrl?: string; saved?: boolean; onSave?: () => void; onClick?: () => void; className?: string;
}) {
  const photo = cover?.url ? cover : undefined;
  return (
    <div className={cn(cardCls, 'p-3 flex gap-3.5 relative', !photo && 'px-4', className)}>
      {photo && (
        <button onClick={onClick} className="shrink-0 press" tabIndex={-1} aria-hidden>
          <Cover emoji={photo.emoji} hue={photo.hue} url={photo.url} className="h-[88px] w-[88px] rounded-2xl" size={30} />
        </button>
      )}
      <div className="flex-1 min-w-0 pr-7">
        <button onClick={onClick} className="block w-full text-left press">
          {badge && <Badge tone={badgeTone}>{badge}</Badge>}
          <span className="block text-[15px] font-bold leading-snug mt-1.5 line-clamp-2">{title}</span>
          {line && <span className="block text-[13px] text-ink-2 mt-1 truncate">{line}</span>}
          {meta && <span className="block text-[12.5px] text-ink-3 mt-1 truncate">{meta}</span>}
          {where && <span className="flex items-center gap-1 text-[12.5px] text-ink-2 mt-0.5 min-w-0"><MapPin size={13} className="shrink-0 text-ink-3" /><span className="truncate">{where}</span></span>}
        </button>
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 mt-1.5 text-[12.5px] font-semibold text-sel-fg">{en ? 'View source' : '원문 보기'}<ArrowUpRight size={14} /></a>}
      </div>
      {onSave && (
        <button onClick={onSave} aria-label={saved ? (en ? 'Unsave' : '저장 취소') : (en ? 'Save' : '저장')} aria-pressed={saved} className={cn('absolute top-2 right-2 h-9 w-9 grid place-items-center press', saved ? 'text-sel-fg' : 'text-ink-2')}>
          <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}

/** 사람 얼굴 줄 (겹친 작은 동그라미) */
export function AvatarStack({ people, size = 28, max = 3 }: { people: { id: string; avatar: { emoji: string; hue: number; url?: string } }[]; size?: number; max?: number }) {
  return (
    <span className="flex">
      {people.slice(0, max).map((p, i) => <span key={p.id} className={cn('rounded-full ring-2 ring-surface', i > 0 && '-ml-2')}><Avatar emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={size} /></span>)}
    </span>
  );
}

/**
 * 모임 카드 (PDF S037·S038): 배지, 아이콘 칸, 제목, "Café · Choose a time together", 아래 얼굴들 + "View meetup".
 */
export function MeetupCard({ tone = 'rose', icon, badge, title, meta, people = [], footnote, action, onClick, className }: {
  tone?: Tone; icon: ReactNode; badge?: string; title: string; meta?: ReactNode; people?: { id: string; avatar: { emoji: string; hue: number; url?: string } }[];
  footnote?: ReactNode; action?: string; onClick?: () => void; className?: string;
}) {
  return (
    <button onClick={onClick} className={cn(cardCls, 'w-full p-4 text-left press', className)}>
      <span className="flex items-center gap-3.5">
        <IconTile tone={tone}>{icon}</IconTile>
        <span className="flex-1 min-w-0">
          {badge && <Badge tone={tone} className="h-5 text-[11px] px-2">{badge}</Badge>}
          <span className="block text-[15px] font-bold leading-snug mt-1 truncate">{title}</span>
          {meta && <span className="block text-[12.5px] text-ink-3 mt-0.5 truncate">{meta}</span>}
        </span>
        <ChevronRight size={18} className="text-ink-3 shrink-0" />
      </span>
      {(people.length > 0 || footnote || action) && (
        <span className="flex items-center gap-2.5 mt-3">
          {people.length > 0 && <AvatarStack people={people} />}
          <span className="flex-1 min-w-0 text-[12px] text-ink-3 truncate">{footnote}</span>
          {action && <span className="text-[12.5px] font-semibold text-sel-fg">{action}</span>}
        </span>
      )}
    </button>
  );
}

/** 사람 카드 (PDF S039): 얼굴, 이름, "Second-year · Design", 한 줄 소개, 오른쪽 알약 버튼 */
export function PersonCard({ avatar, name, meta, bio, action, onClick, className }: {
  avatar: { emoji: string; hue: number; url?: string }; name: string; meta?: ReactNode; bio?: ReactNode; action?: ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <div className={cn(cardCls, 'p-4', className)}>
      <div className="flex items-center gap-3">
        <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left press">
          <Avatar emoji={avatar.emoji} hue={avatar.hue} url={avatar.url} size={44} />
          <span className="min-w-0"><span className="block text-[15px] font-bold truncate">{name}</span>{meta && <span className="block text-[12.5px] text-ink-3 truncate">{meta}</span>}</span>
        </button>
        {action}
      </div>
      {bio && <p className="text-[13.5px] text-ink-2 mt-2.5 leading-snug line-clamp-2">{bio}</p>}
    </div>
  );
}

/**
 * 묶음 정보 카드 (PDF S020 Who it's for / Benefits / Original source, S035 When / Where).
 * 줄마다 아이콘 칸 + 작은 머리말 + 굵은 값 + 작은 설명.
 */
export interface InfoRow { tone?: Tone; icon: ReactNode; label: string; value: ReactNode; caption?: ReactNode; onClick?: () => void; right?: ReactNode }
export function InfoRows({ rows, className }: { rows: InfoRow[]; className?: string }) {
  return (
    <div className={cn(cardCls, 'divide-y divide-line', className)}>
      {rows.map((r, i) => {
        const inner = (
          <>
            <IconTile tone={r.tone ?? 'ice'} size={40}>{r.icon}</IconTile>
            <span className="flex-1 min-w-0">
              <span className="block text-[11.5px] text-ink-3">{r.label}</span>
              <span className="block text-[15px] font-bold leading-snug mt-0.5">{r.value}</span>
              {r.caption && <span className="block text-[12px] text-ink-3 mt-0.5">{r.caption}</span>}
            </span>
            {r.right ?? (r.onClick ? <ChevronRight size={18} className="text-ink-3 shrink-0" /> : null)}
          </>
        );
        return r.onClick
          ? <button key={i} onClick={r.onClick} className="w-full p-4 flex items-center gap-3.5 text-left press">{inner}</button>
          : <div key={i} className="p-4 flex items-center gap-3.5">{inner}</div>;
      })}
    </div>
  );
}

/** 글 상자 (PDF S020 설명 카드, S022 About 카드) */
export function TextCard({ title, children, className }: { title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn(cardCls, 'p-4', className)}>
      {title && <div className="text-[16px] font-bold leading-snug">{title}</div>}
      {children && <div className={cn('text-[14px] text-ink-2 leading-relaxed', !!title && 'mt-1')}>{children}</div>}
    </div>
  );
}

/** 위쪽 큰 틴트 배너 (PDF S022 커뮤니티·S046 모임 상세의 아이콘 그림 자리) */
export function HeroBanner({ tone = 'ice', icon, className }: { tone?: Tone; icon: ReactNode; className?: string }) {
  return <div className={cn('h-[100px] rounded-[20px] grid place-items-center', TONE[tone], className)}>{icon}</div>;
}
