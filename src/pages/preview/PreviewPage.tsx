import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Search, GraduationCap } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Input } from '@/components/ui';

/**
 * 아직 안 연 학교 미리보기 (2026-11-02 사장님 A안) — 에이전트가 파일로 모아 둔 동아리·학생회·링크를 그대로 본다.
 * 서버가 server/data/collected 파일을 요청 때만 읽는다 (DB 에 없음). 앱 메뉴에는 걸지 않고 주소(/preview)로만 들어온다.
 */
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
interface School { id: string; name: string; region: string; orgs: number; withLinks: number; courses: number; collectedAt?: string; probe?: { status?: string; source?: string; sampled?: number; checkedAt?: string } }
interface Org { id: string; name: string; type: 'club' | 'greek' | 'council' | 'coop' | 'lab' | 'department'; category?: string; description: string; links: { label: string; url: string }[]; logo: { emoji: string; hue: number; url?: string }; recruiting?: { text: string; open: boolean } }
const TYPES = [['all', 'All'], ['recruiting', 'Recruiting'], ['club', 'Clubs'], ['greek', 'Greek life'], ['council', 'Student government']] as const;
const fits = (o: Org, t: string) => t === 'all' || (t === 'recruiting' ? !!o.recruiting?.open : o.type === t);

function Shell({ title, back, children }: { title: string; back?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg pb-10">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur h-14 px-3 flex items-center gap-2 border-b border-line">
        {back && <Link to="/preview" aria-label="Back" className="h-10 w-10 grid place-items-center rounded-full text-ink-2"><ChevronLeft size={22} /></Link>}
        <b className="text-[17px] font-bold truncate">{title}</b>
        <span className="ml-auto text-[11px] font-bold px-2 h-6 rounded-full bg-surface-2 text-ink-3 grid place-items-center">PREVIEW</span>
      </header>
      <div className="px-4 pt-4">{children}</div>
    </div>
  );
}

export function PreviewListPage() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { fetch(`${base}/api/preview`).then((r) => r.json()).then((d) => setSchools(d.schools)).catch((e) => setErr(String(e))); }, []);
  return (
    <Shell title="Schools not open yet">
      <p className="text-[13px] text-ink-3 mb-3">Collected by the Lumi agent from each school’s official directory. Not in the live app until the school opens.</p>
      {err && <p className="text-danger text-[13px]">{err}</p>}
      {!schools && !err && <p className="text-ink-3 text-[13px]">Loading…</p>}
      <div className="space-y-2.5">
        {schools?.map((s) => (
          <Link key={s.id} to={`/preview/${s.id}`} className="card rounded-2xl px-4 py-3.5 flex items-center gap-3 press">
            <span className="h-11 w-11 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><GraduationCap size={20} /></span>
            <span className="flex-1 min-w-0">
              <b className="block text-[15px] truncate">{s.name}</b>
              <span className="block text-[12px] text-ink-3">{s.orgs ? `${s.orgs} groups · ${s.withLinks} with links` : 'Not collected yet'} · {s.region}</span>
              <span className="block text-[11px] text-ink-3">{s.courses ? `${s.courses} courses saved · ` : ''}Classes: {s.probe ? `${s.probe.status === 'applied' ? 'recipe OK' : 'no recipe yet'}${s.probe.sampled ? ` (${s.probe.sampled} sample)` : ''}` : 'not tested here'}</span>
            </span>
            <ChevronRight size={18} className="text-ink-3 shrink-0" />
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export function PreviewSchoolPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<{ school: School; orgs: Org[]; probe?: { sample?: string[]; source?: string; status?: string } } | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number][0]>('all');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { fetch(`${base}/api/preview/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))).then(setData).catch((e) => setErr(String(e))); }, [id]);
  const shown = useMemo(() => (data?.orgs ?? []).filter((o) => fits(o, type) && (!q.trim() || `${o.name} ${o.category ?? ''} ${o.description}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, q, type]);
  const count = (t: string) => (t === 'all' ? data?.orgs.length ?? 0 : data?.orgs.filter((o) => fits(o, t)).length ?? 0);
  return (
    <Shell title={data?.school.name ?? 'Preview'} back>
      {err && <p className="text-danger text-[13px]">Couldn’t load ({err})</p>}
      {data && (
        <>
          <div className="relative mb-2.5"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${data.orgs.length} groups`} className="pl-9" /></div>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-3">
            {TYPES.map(([k, l]) => <button key={k} onClick={() => setType(k)} className={cn('h-8 px-3 rounded-full text-[13px] font-semibold shrink-0', type === k ? 'bg-primary text-white v2:text-on-primary' : 'bg-surface-2 text-ink-2')}>{l} {count(k)}</button>)}
          </div>
          {data.school.courses > 0 && <CourseSearch id={id} total={data.school.courses} />}
          {data.probe?.sample?.length ? (
            <div className="card rounded-2xl p-3.5 mb-3">
              <b className="text-[13px]">Classes — sample check ({data.probe.status === 'applied' ? 'recipe OK' : 'failed'})</b>
              <p className="text-[11px] text-ink-3 mb-1.5 break-all">{data.probe.source}</p>
              <ul className="text-[12px] text-ink-2 space-y-0.5">{data.probe.sample.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ) : null}
          <div className="space-y-2">
            {shown.map((o) => (
              <div key={o.id} className="card rounded-2xl px-3.5 py-3">
                <button onClick={() => setOpen(open === o.id ? null : o.id)} className="w-full flex items-center gap-3 text-left">
                  {o.logo.url ? <img src={o.logo.url} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" loading="lazy" /> : <span className="h-10 w-10 rounded-xl grid place-items-center text-[13px] font-bold shrink-0 text-white" style={{ background: `hsl(${o.logo.hue} 55% 55%)` }}>{o.logo.emoji}</span>}
                  <span className="flex-1 min-w-0">
                    <b className="block text-[14px] leading-snug">{o.name}</b>
                    <span className="block text-[11px] text-ink-3 truncate">{o.type === 'council' ? 'Student government' : o.type === 'greek' ? 'Greek life' : 'Club'}{o.category ? ` · ${o.category}` : ''}</span>
                    {o.recruiting && <span className={cn('inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', o.recruiting.open ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-ink-3')}>{o.recruiting.text}</span>}
                  </span>
                </button>
                {open === o.id && o.description && <p className="text-[13px] text-ink-2 mt-2">{o.description}</p>}
                {o.links.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{o.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2"><ExternalLink size={11} />{l.label}</a>)}</div>}
              </div>
            ))}
            {shown.length === 0 && <p className="text-[13px] text-ink-3">Nothing matches.</p>}
          </div>
        </>
      )}
    </Shell>
  );
}

const DAY = 'MTWRFSU';
function CourseSearch({ id, total }: { id: string; total: number }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<{ code: string; title: string; term?: string; meetings?: { day: number; start: string; end: string }[]; url?: string }[]>([]);
  useEffect(() => { const t = setTimeout(() => { fetch(`${base}/api/preview/${encodeURIComponent(id)}/courses?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setList(d.courses ?? [])).catch(() => setList([])); }, 250); return () => clearTimeout(t); }, [id, q]);
  return (
    <div className="card rounded-2xl p-3.5 mb-3">
      <b className="text-[13px]">Courses saved: {total}</b>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a course code or title" className="mt-2" />
      <ul className="mt-2 space-y-1 text-[12px] text-ink-2 max-h-64 overflow-y-auto">
        {list.map((c) => <li key={`${c.code}${c.term}${c.title}`}><b className="text-ink">{c.code}</b> · {c.title}{c.meetings?.length ? ` · ${c.meetings.map((m) => `${DAY[m.day]} ${m.start}-${m.end}`).join(' ')}` : ''}{c.term && c.term !== 'catalog' ? ` · ${c.term}` : ''}</li>)}
      </ul>
    </div>
  );
}
