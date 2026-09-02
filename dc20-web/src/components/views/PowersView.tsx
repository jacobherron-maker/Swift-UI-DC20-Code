import React, { useMemo, useState } from 'react';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import type { ManeuverReference, SpellReference } from '../../hooks/usePowerCatalog';

type PowerDocument =
  | { id: string; kind: 'Spell'; name: string; group: string; spell: SpellReference }
  | { id: string; kind: 'Maneuver'; name: string; group: string; maneuver: ManeuverReference };

function DetailText({ children }: { children: string }) {
  return <div className="space-y-4">{children.split(/\n\n+/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap leading-7 text-slate-300">{paragraph}</p>)}</div>;
}

function PowerDetail({ item }: { item: PowerDocument }) {
  const isSpell = item.kind === 'Spell';
  const details = isSpell ? item.spell : item.maneuver;
  const metadata = isSpell
    ? [['Source', item.spell.source], ['School', item.spell.school], ['Cost', item.spell.cost], ['Range', item.spell.range], ['Duration', item.spell.duration], ['Tags', item.spell.tags]]
    : [['Category', item.maneuver.category], ['Cost', item.maneuver.cost], ['Range', item.maneuver.range], ['Requirements', item.maneuver.requirements]];

  return <article className="mx-auto max-w-4xl">
    <div className="mb-7 border-b border-white/10 pb-6"><p className="theme-accent-text text-xs font-black uppercase tracking-[0.2em]">{item.kind} reference</p><h1 className="mt-2 text-4xl font-black text-white">{item.name}</h1><p className="mt-2 text-slate-400">{item.group}</p></div>
    <dl className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metadata.filter(([, value]) => value).map(([label, value]) => <div key={label} className="rounded-xl border border-white/8 bg-slate-950/50 p-3"><dt className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-200">{value}</dd></div>)}</dl>
    <section><h2 className="mb-3 text-xl font-black text-white">Description</h2><DetailText>{details.description}</DetailText></section>
    {details.enhancements && <section className="mt-8 rounded-2xl border border-white/10 bg-slate-950/45 p-5"><h2 className="mb-3 text-xl font-black text-white">Enhancements</h2><DetailText>{details.enhancements}</DetailText></section>}
  </article>;
}

const PowersView: React.FC = () => {
  const { spells, maneuvers, isLoading, error } = usePowerCatalog();
  const [kind, setKind] = useState<'Spell' | 'Maneuver'>('Spell');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [selectedID, setSelectedID] = useState<string | null>(null);

  const documents = useMemo<PowerDocument[]>(() => kind === 'Spell'
    ? spells.map((spell, index) => ({ id: `spell-${index}-${spell.name}`, kind: 'Spell', name: spell.name, group: `${spell.source} • ${spell.school}`, spell }))
    : maneuvers.map((maneuver, index) => ({ id: `maneuver-${index}-${maneuver.name}`, kind: 'Maneuver', name: maneuver.name, group: maneuver.category, maneuver })), [kind, maneuvers, spells]);
  const groups = useMemo(() => Array.from(new Set(documents.map((item) => item.group))).sort(), [documents]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((item) => {
      const details = item.kind === 'Spell' ? item.spell : item.maneuver;
      return (group === 'All' || item.group === group)
        && (!query || [item.name, item.group, details.description, details.enhancements].some((value) => value?.toLowerCase().includes(query)));
    });
  }, [documents, group, search]);
  const selected = filtered.find(({ id }) => id === selectedID) ?? filtered[0] ?? null;

  const chooseKind = (nextKind: typeof kind) => {
    setKind(nextKind);
    setGroup('All');
    setSelectedID(null);
  };

  if (isLoading) return <div className="p-10 text-slate-300">Loading the audited spell and maneuver library…</div>;

  return <div className="min-h-full p-4 lg:p-7"><div className="mx-auto max-w-[1500px]">
    <header className="mb-6"><p className="theme-accent-text text-xs font-black uppercase tracking-[0.28em]">Beta 0.10.5 reference library</p><h1 className="mt-1 text-4xl font-black text-white">Spells & Maneuvers</h1><p className="mt-2 max-w-3xl text-slate-400">Search complete rules text, costs, ranges, requirements, tags, durations, and enhancements without leaving the table.</p></header>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}

    <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[auto_auto_1fr_280px]">
      <button type="button" onClick={() => chooseKind('Spell')} className={`rounded-xl px-5 py-3 font-black ${kind === 'Spell' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>✨ Spells ({spells.length})</button>
      <button type="button" onClick={() => chooseKind('Maneuver')} className={`rounded-xl px-5 py-3 font-black ${kind === 'Maneuver' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>⚔ Maneuvers ({maneuvers.length})</button>
      <input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedID(null); }} placeholder={`Search ${kind.toLowerCase()}s…`} aria-label="Search spells and maneuvers" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" />
      <select value={group} onChange={(event) => { setGroup(event.target.value); setSelectedID(null); }} aria-label="Filter spells or maneuvers" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200"><option>All</option>{groups.map((value) => <option key={value}>{value}</option>)}</select>
    </div>

    <div className="grid gap-4 lg:grid-cols-[350px_1fr]"><aside className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 lg:h-[calc(100vh-245px)] lg:min-h-[620px] lg:overflow-auto"><div className="mb-2 flex items-center justify-between px-2 py-1"><h2 className="theme-accent-text font-black">{kind}s</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.length === 0 ? <p className="p-5 text-sm text-slate-500">No references match these filters.</p> : filtered.map((item) => <button type="button" key={item.id} onClick={() => setSelectedID(item.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected?.id === item.id ? 'theme-selected-card' : 'hover:bg-white/5'}`}><span className="block font-bold text-slate-100">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{item.group}</span></button>)}</aside>
      <main className="rounded-2xl border border-white/10 bg-slate-900/75 p-6 lg:h-[calc(100vh-245px)] lg:min-h-[620px] lg:overflow-auto lg:p-9">{selected ? <PowerDetail item={selected} /> : <div className="grid h-full place-items-center text-slate-500">Select a reference.</div>}</main></div>
  </div></div>;
};

export default PowersView;
