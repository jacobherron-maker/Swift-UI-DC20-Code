import React, { useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useRulesReference } from '../../hooks/useRulesReference';
import type { ClassReference, RuleReferenceEntry } from '../../types/models';

const sectionIcons: Record<string, string> = {
  'Core Rules': '◆',
  'Combat Rules': '⚔',
  'General Rules': '◈',
  'Character Creation Rules': '✦',
  Classes: '♜',
};

const kindColors: Record<string, string> = {
  Overview: 'bg-violet-500/15 text-violet-200', Rule: 'bg-slate-700 text-slate-300',
  Skill: 'bg-emerald-500/15 text-emerald-200', Trade: 'bg-amber-500/15 text-amber-200',
  Language: 'bg-sky-500/15 text-sky-200', Maneuver: 'bg-red-500/15 text-red-200',
  Spell: 'bg-fuchsia-500/15 text-fuchsia-200', Condition: 'bg-orange-500/15 text-orange-200',
  Equipment: 'bg-cyan-500/15 text-cyan-200', Talent: 'bg-yellow-500/15 text-yellow-200',
  Ancestry: 'bg-teal-500/15 text-teal-200', Class: 'bg-violet-500/15 text-violet-200',
  Subclass: 'bg-purple-500/15 text-purple-200',
};

function RichRuleText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  return <div className="space-y-4">{blocks.map((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.every((line) => line.startsWith('•'))) {
      return <ul key={blockIndex} className="list-disc space-y-2 pl-6 text-slate-300">{lines.map((line, index) => <li key={index}>{line.replace(/^•\s*/, '')}</li>)}</ul>;
    }
    if (lines.length === 1 && (/^[A-Z0-9 ’'&:—-]+$/.test(lines[0]) || (lines[0].length < 60 && !/[.!?]$/.test(lines[0])))) {
      return <h3 key={blockIndex} className="pt-2 text-lg font-black text-violet-200">{lines[0]}</h3>;
    }
    return <div key={blockIndex} className="space-y-2">{lines.map((line, lineIndex) => {
      const label = line.match(/^([^:]{1,55}):\s+(.+)$/);
      if (label) return <p key={lineIndex} className="leading-7 text-slate-300"><strong className="font-black text-slate-100">{label[1]}:</strong> {label[2]}</p>;
      if (line.startsWith('•')) return <p key={lineIndex} className="ml-4 leading-7 text-slate-300">• {line.replace(/^•\s*/, '')}</p>;
      return <p key={lineIndex} className="leading-7 text-slate-300">{line}</p>;
    })}</div>;
  })}</div>;
}

function ClassTable({ className }: { className: string }) {
  const { reference } = useCharacterReference();
  const entry = reference?.classes.find(({ name }) => name === className);
  if (!entry) return null;
  return <section className="mt-8 rounded-2xl border border-violet-400/20 bg-slate-950/55 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black text-violet-200">{className} Class Table</h2><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{entry.tableSource}</span></div><div className="overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr>{entry.tableColumns.map((column) => <th key={column} className="border-b border-white/10 p-2 text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">{column}</th>)}</tr></thead><tbody>{entry.tableRows.map((row) => <tr key={row.level} className="text-slate-400 hover:bg-violet-500/5">{entry.tableColumns.map((column) => <td key={column} className="border-b border-white/5 p-2">{column === 'level' ? row.level : column === 'features' ? row.features : row[column as keyof typeof row] === undefined ? '—' : `+${row[column as keyof typeof row]}`}</td>)}</tr>)}</tbody></table></div></section>;
}

const classColumnLabels: Record<string, string> = {
  health: 'HEALTH POINTS', attribute: 'ATTRIBUTE POINTS', skill: 'SKILL POINTS', trade: 'TRADE POINTS',
  stamina: 'STAMINA POINTS', maneuvers: 'MANEUVERS KNOWN', mana: 'MANA POINTS', cantrips: 'CANTRIPS KNOWN', spells: 'SPELLS KNOWN',
};

/** Render Class documents from the same audited source record used by the builder and sheet. */
function currentClassRuleText(entry: ClassReference): string {
  const table = entry.tableRows.map((row) => {
    const values = entry.tableColumns.flatMap((column) => {
      if (column === 'level') return [`CHAR LEVEL ${row.level}`];
      if (column === 'features') return [`FEATURES ${row.features}`];
      const value = row[column as keyof typeof row];
      return typeof value === 'number' ? [`${classColumnLabels[column] ?? column.toUpperCase()} +${value}`] : [];
    });
    return `Level ${row.level}: ${values.join(' • ')}`;
  }).join('\n');
  const features = entry.features.map((level) => `LEVEL ${level.level}\n${level.features.map((feature) => `${feature.name}\n${feature.description}`).join('\n\n')}`).join('\n\n');
  const subclasses = entry.subclasses.length === 0
    ? 'No published subclass text is available for this supplemental class.'
    : entry.subclasses.map((name) => `${name}\n${(entry.subclassFeatures[name] ?? []).map((feature) => `${feature.name}\n${feature.description}`).join('\n\n')}`).join('\n\n');
  return `${entry.description}\n\nPATH & STARTING PROFILE\nPath: ${entry.path}\nLevel 1 HP: ${entry.baseHP}\nLevel 1 Resources: ${entry.levelOneResource}\n\n${entry.pathDetails}\n\nSTARTING EQUIPMENT\n${entry.startingEquipment.description}\n\nCLASS TABLE\n${table}\n\nCLASS FEATURES\n${features}\n\nSUBCLASSES\n${subclasses}`;
}

function RuleDocument({ entry, classReference }: { entry: RuleReferenceEntry; classReference?: ClassReference }) {
  const text = entry.kind === 'Class' && classReference ? currentClassRuleText(classReference) : entry.text;
  return <article className="mx-auto max-w-4xl"><div className="mb-7 border-b border-white/10 pb-6"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${kindColors[entry.kind] ?? kindColors.Rule}`}>{entry.kind}</span><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{entry.section} • {entry.subsection}</span></div><h1 className="mt-4 break-words text-3xl font-black leading-tight text-white sm:text-4xl">{entry.title}</h1><p className="mt-3 text-lg leading-7 text-violet-200">{entry.summary}</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{entry.page}</p></div><RichRuleText text={text} />{entry.kind === 'Class' && entry.characterClass && <ClassTable className={entry.characterClass} />}</article>;
}

const RulesView: React.FC = () => {
  const { reference, isLoading, error } = useRulesReference();
  const { reference: characterReference } = useCharacterReference();
  const [section, setSection] = useState('Core Rules');
  const [subsection, setSubsection] = useState('All Topics');
  const [kind, setKind] = useState('All Types');
  const [search, setSearch] = useState('');
  const [selectedID, setSelectedID] = useState<string | null>(null);

  if (isLoading || !reference) return <div className="p-10 text-slate-300">{error ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div> : 'Loading the comprehensive rules library…'}</div>;

  const sectionEntries = reference.entries.filter((entry) => entry.section === section);
  const subsections = Array.from(new Set(sectionEntries.map((entry) => entry.subsection))).sort((a, b) => a === 'Overview' ? -1 : b === 'Overview' ? 1 : a.localeCompare(b));
  const kinds = Array.from(new Set(sectionEntries.map((entry) => entry.kind))).sort();
  const query = search.trim().toLowerCase();
  const filtered = reference.entries.filter((entry) => {
    const auditedClass = entry.characterClass ? characterReference?.classes.find(({ name }) => name === entry.characterClass) : undefined;
    const matchesSearch = !query || [entry.title, entry.summary, entry.text, entry.keywords, entry.page, entry.characterClass, entry.subclassName, auditedClass ? JSON.stringify(auditedClass) : undefined].some((value) => value?.toLowerCase().includes(query));
    const matchesSection = query ? true : entry.section === section;
    const matchesSubsection = query || subsection === 'All Topics' || entry.subsection === subsection;
    const matchesKind = kind === 'All Types' || entry.kind === kind;
    return matchesSearch && matchesSection && matchesSubsection && matchesKind;
  });
  const selected = filtered.find(({ id }) => id === selectedID) ?? filtered[0] ?? null;
  const selectedClass = selected?.characterClass ? characterReference?.classes.find(({ name }) => name === selected.characterClass) : undefined;

  const chooseSection = (name: string) => {
    setSection(name);
    setSubsection('All Topics');
    setKind('All Types');
    setSearch('');
    setSelectedID(null);
  };

  return <div className="min-h-full bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_38%,#020617_100%)] p-4 lg:p-7"><div className="mx-auto max-w-[1550px]"><header className="mb-5"><p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">475 curated reference documents</p><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">DC20 Rules Library</h1><p className="mt-2 max-w-3xl text-slate-400">Core rules, combat, general play, character creation, conditions, every class table, and standalone subclass documents—organized to match the Beta.</p></header>
    <nav className="mb-5 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:grid-cols-2 lg:grid-cols-5">{reference.sections.map((entry) => <button type="button" key={entry.name} onClick={() => chooseSection(entry.name)} className={`rounded-xl p-3 text-left ${section === entry.name && !query ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><span className="mr-2">{sectionIcons[entry.name]}</span><span className="font-black">{entry.name}</span><span className="mt-1 block text-[10px] uppercase tracking-wider opacity-60">{entry.pageRange}</span></button>)}</nav>
    <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[1fr_230px_190px]"><input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedID(null); }} placeholder="Search every rule, condition, class, spell, maneuver…" aria-label="Search rules" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" /><select value={subsection} disabled={Boolean(query)} onChange={(event) => { setSubsection(event.target.value); setSelectedID(null); }} aria-label="Filter rule topics" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-200 disabled:opacity-40"><option>All Topics</option>{subsections.map((topic) => <option key={topic}>{topic}</option>)}</select><select value={kind} onChange={(event) => { setKind(event.target.value); setSelectedID(null); }} aria-label="Filter document types" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-200"><option>All Types</option>{kinds.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]"><aside className="max-h-96 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3 overscroll-contain lg:h-[calc(100vh-310px)] lg:max-h-none lg:min-h-[620px]"><div className="mb-2 flex items-center justify-between px-2 py-1"><h2 className="font-black text-violet-200">{query ? 'Search Results' : section}</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.length === 0 ? <p className="p-4 text-sm text-slate-500">No rules match these filters.</p> : filtered.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedID(entry.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected?.id === entry.id ? 'bg-violet-500/15 ring-1 ring-violet-400/40' : 'hover:bg-white/5'}`}><div className="flex items-start justify-between gap-2"><span className="font-bold text-slate-200">{entry.title}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${kindColors[entry.kind] ?? kindColors.Rule}`}>{entry.kind}</span></div><div className="mt-1 text-xs text-slate-500">{entry.subsection} • {entry.page}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.summary}</p></button>)}</aside><main className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-6 lg:h-[calc(100vh-310px)] lg:min-h-[620px] lg:overflow-auto lg:p-9">{selected ? <RuleDocument entry={selected} classReference={selectedClass} /> : <div className="grid h-full place-items-center text-slate-500">Select a reference document.</div>}</main></div>
  </div></div>;
};

export default RulesView;
