import React, { useEffect, useState } from 'react';
import { PowerRulesText } from '../powers/PowerRulesText';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useRulesReference } from '../../hooks/useRulesReference';
import type { ClassReference, RuleReferenceEntry } from '../../types/models';
import { ruleTextBlocks } from '../../utils/ruleRules';
import type { ContentFocusRequest } from '../../navigation/appNavigation';
import { RuleAwareText } from '../rules/RuleAwareText';

/* Navigation requests intentionally synchronize this view's local filters and selection. */
/* oxlint-disable react/set-state-in-effect */

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

function InlineRuleLabels({ text }: { text: string }) {
  const label = text.match(/^([^:]{1,58}:)(.*)$/s);
  if (!label) return <RuleAwareText text={text} />;
  return <><strong className="font-black text-slate-100"><RuleAwareText text={label[1]} /></strong><RuleAwareText text={label[2]} /></>;
}

function RichRuleText({ text }: { text: string }) {
  const blocks = ruleTextBlocks(text);
  return <div className="space-y-3">{blocks.map((block, index) => {
    if (block.kind === 'heading') return <h2 key={index} className="border-b border-white/10 pb-2 pt-6 text-lg font-black uppercase tracking-[0.12em] text-violet-200 first:pt-0">{block.text}</h2>;
    if (block.kind === 'subheading') return <h3 key={index} className="pt-3 text-base font-black text-slate-100">{block.text}</h3>;
    if (block.kind === 'bullet') return <div key={index} className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-slate-950/35 px-3 py-2 text-sm leading-6 text-slate-300"><span className="theme-accent-text font-black">•</span><span><InlineRuleLabels text={block.text} /></span></div>;
    if (block.kind === 'callout') return <aside key={index} className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm leading-6 text-sky-100"><InlineRuleLabels text={block.text} /></aside>;
    return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-slate-300"><InlineRuleLabels text={block.text} /></p>;
  })}</div>;
}

function AuditedPowerText({ text }: { text: string }) {
  const [descriptionBlock = '', enhancements = ''] = text.split(/\n\nENHANCEMENTS\n/);
  const description = descriptionBlock.replace(/^DESCRIPTION\n/, '');
  return <div className="space-y-7"><section><h2 className="mb-3 border-b border-white/10 pb-2 text-lg font-black uppercase tracking-[0.12em] text-violet-200">Description</h2><PowerRulesText text={description} /></section><section><h2 className="mb-3 border-b border-white/10 pb-2 text-lg font-black uppercase tracking-[0.12em] text-violet-200">Enhancements</h2><PowerRulesText text={enhancements} enhancements /></section></div>;
}

function ClassTable({ entry }: { entry?: ClassReference }) {
  if (!entry) return null;
  return <section className="mt-8 rounded-2xl border border-violet-400/20 bg-slate-950/55 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black text-violet-200">{entry.name} Class Table</h2><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{entry.tableSource}</span></div><div className="overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr>{entry.tableColumns.map((column) => <th key={column} className="border-b border-white/10 p-2 text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">{classColumnLabels[column] ?? column}</th>)}</tr></thead><tbody>{entry.tableRows.map((row) => <tr key={row.level} className="text-slate-400 hover:bg-violet-500/5">{entry.tableColumns.map((column) => <td key={column} className="border-b border-white/5 p-2">{column === 'level' ? row.level : column === 'features' ? row.features : row[column as keyof typeof row] === undefined ? '—' : `+${row[column as keyof typeof row]}`}</td>)}</tr>)}</tbody></table></div></section>;
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

function RuleDocument({ entry, classReference, entries, onOpenRelated, onOpenSection, onOpenSubsection }: { entry: RuleReferenceEntry; classReference?: ClassReference; entries: RuleReferenceEntry[]; onOpenRelated: (entry: RuleReferenceEntry) => void; onOpenSection: (section: string) => void; onOpenSubsection: (section: string, subsection: string) => void }) {
  const text = entry.kind === 'Class' && classReference ? currentClassRuleText(classReference) : entry.text;
  const related = (entry.relatedIDs ?? []).map((id) => entries.find((candidate) => candidate.id === id)).filter((candidate): candidate is RuleReferenceEntry => Boolean(candidate));
  return <article className="mx-auto max-w-5xl"><nav aria-label="Rule breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"><button type="button" onClick={() => onOpenSection(entry.section)} className="hover:text-violet-200">Library</button><span aria-hidden="true">›</span><button type="button" onClick={() => onOpenSection(entry.section)} className="hover:text-violet-200">{entry.section}</button><span aria-hidden="true">›</span><button type="button" onClick={() => onOpenSubsection(entry.section, entry.subsection)} className="hover:text-violet-200">{entry.subsection}</button><span aria-hidden="true">›</span><span className="text-slate-300">{entry.title}</span></nav><div className="mb-7 border-b border-white/10 pb-6"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${kindColors[entry.kind] ?? kindColors.Rule}`}>{entry.kind}</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">✓ {entry.sourceStatus ?? 'Source verified'}</span><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{entry.section} • {entry.subsection}</span></div><h1 className="mt-4 break-words text-3xl font-black leading-tight text-white sm:text-4xl">{entry.title}</h1><p className="mt-3 text-lg leading-7 text-violet-200"><RuleAwareText text={entry.summary} /></p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"><span className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">{entry.sourceDocument}</span><span className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">{entry.page}</span></div></div>
    {entry.details && entry.details.length > 0 && <section aria-label="Rule metadata" className="mb-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{entry.details.map(({ label, value }) => <div key={`${label}-${value}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-bold text-slate-200">{value}</div></div>)}</section>}
    {entry.formulas && entry.formulas.length > 0 && <section aria-label="Quick formulas" className="mb-7 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4"><h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">Quick Formulas</h2><div className="grid gap-2">{entry.formulas.map((formula) => <code key={formula} className="block whitespace-normal rounded-lg bg-slate-950/55 px-3 py-2 text-sm font-bold text-slate-200">{formula}</code>)}</div></section>}
    {entry.sourceNote && <aside className="mb-7 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><strong className="font-black">Source note:</strong> {entry.sourceNote}</aside>}
    {entry.kind === 'Spell' || entry.kind === 'Maneuver' ? <AuditedPowerText text={text} /> : <RichRuleText text={text} />}
    {entry.kind === 'Class' && <ClassTable entry={classReference} />}
    {related.length > 0 && <section className="mt-9 border-t border-white/10 pt-6"><h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Related Rules</h2><div className="mt-3 flex flex-wrap gap-2">{related.map((candidate) => <button type="button" key={candidate.id} onClick={() => onOpenRelated(candidate)} className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-left text-sm font-bold text-violet-100 hover:bg-violet-500/20"><span>{candidate.title}</span><span className="ml-2 text-[10px] uppercase text-violet-300/60">{candidate.kind}</span></button>)}</div></section>}
  </article>;
}

const characterOptionKinds = new Set(['Skill', 'Trade', 'Language', 'Ancestry', 'Talent', 'Class', 'Subclass']);

const RulesView: React.FC<{ preset?: 'all' | 'character-options'; focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void; returnContextLabel?: string; onReturnToContext?: () => void }> = ({ preset = 'all', focusRequest, onFocusHandled, returnContextLabel, onReturnToContext }) => {
  const { reference, isLoading, error } = useRulesReference();
  const { reference: characterReference } = useCharacterReference();
  const [section, setSection] = useState('Core Rules');
  const [subsection, setSubsection] = useState('All Topics');
  const [kind, setKind] = useState('All Types');
  const [search, setSearch] = useState('');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [ruleHistory, setRuleHistory] = useState<string[]>([]);
  const [ruleHistoryIndex, setRuleHistoryIndex] = useState(-1);

  useEffect(() => {
    if (focusRequest?.kind !== 'rule' || !reference) return;
    const target = reference.entries.find(({ id }) => id === focusRequest.id);
    if (target) {
      setSection(target.section);
      setSubsection('All Topics');
      setKind('All Types');
      setSearch('');
      setSelectedID(target.id);
      setRuleHistory((current) => {
        const next = [...current, target.id].slice(-40);
        setRuleHistoryIndex(next.length - 1);
        return next;
      });
    }
    onFocusHandled?.();
  }, [focusRequest, onFocusHandled, reference]);

  if (isLoading || !reference) return <div className="p-10 text-slate-300">{error ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div> : 'Loading the comprehensive rules library…'}</div>;

  const sectionEntries = reference.entries.filter((entry) => preset === 'character-options' ? characterOptionKinds.has(entry.kind) : entry.section === section);
  const subsections = Array.from(new Set(sectionEntries.map((entry) => entry.subsection))).sort((a, b) => a === 'Overview' ? -1 : b === 'Overview' ? 1 : a.localeCompare(b));
  const kinds = Array.from(new Set(sectionEntries.map((entry) => entry.kind))).sort();
  const query = search.trim().toLowerCase();
  const filtered = reference.entries.filter((entry) => {
    const auditedClass = entry.characterClass ? characterReference?.classes.find(({ name }) => name === entry.characterClass) : undefined;
    const matchesSearch = !query || [entry.title, entry.summary, entry.text, entry.keywords, entry.page, entry.sourceDocument, entry.sourceNote, JSON.stringify(entry.details ?? []), JSON.stringify(entry.formulas ?? []), entry.characterClass, entry.subclassName, auditedClass ? JSON.stringify(auditedClass) : undefined].some((value) => value?.toLowerCase().includes(query));
    const matchesPreset = preset === 'all' || characterOptionKinds.has(entry.kind);
    const matchesSection = preset === 'character-options' || query ? true : entry.section === section;
    const matchesSubsection = query || subsection === 'All Topics' || entry.subsection === subsection;
    const matchesKind = kind === 'All Types' || entry.kind === kind;
    return matchesPreset && matchesSearch && matchesSection && matchesSubsection && matchesKind;
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

  const openRelated = (entry: RuleReferenceEntry) => {
    setSection(entry.section);
    setSubsection('All Topics');
    setKind('All Types');
    setSearch('');
    setSelectedID(entry.id);
    const next = [...ruleHistory.slice(0, ruleHistoryIndex + 1), entry.id].slice(-40);
    setRuleHistory(next);
    setRuleHistoryIndex(next.length - 1);
  };

  const navigateRuleHistory = (nextIndex: number) => {
    const id = ruleHistory[nextIndex];
    const entry = reference.entries.find((candidate) => candidate.id === id);
    if (!entry) return;
    setRuleHistoryIndex(nextIndex);
    setSection(entry.section); setSubsection('All Topics'); setKind('All Types'); setSearch(''); setSelectedID(id);
  };

  const libraryTitle = preset === 'character-options' ? 'Character Options' : 'DC20 Rules Library';
  const libraryDescription = preset === 'character-options' ? 'Browse source-audited ancestries, Classes, Subclasses, talents, skills, trades, and languages in one focused index.' : 'Source-verified core rules, combat, general play, character creation, conditions, equipment, powers, Classes, and standalone Subclasses. Every document identifies its printed source and page.';
  return <div className="min-h-full bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_38%,#020617_100%)] p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-visible lg:p-7"><div className="mx-auto max-w-[1550px] lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col"><header className="mb-5 lg:shrink-0">{onReturnToContext && <button type="button" onClick={onReturnToContext} className="mb-4 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-100">← {returnContextLabel ?? 'Return to previous screen'}</button>}<p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">{preset === 'character-options' ? `${filtered.length} character-building documents` : `${reference.entries.length} source-audited reference documents`}</p><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">{libraryTitle}</h1><p className="mt-2 max-w-4xl text-slate-400">{libraryDescription}</p></header>
    {preset === 'all' && <nav className="mb-5 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:grid-cols-2 lg:shrink-0 lg:grid-cols-5">{reference.sections.map((entry) => <button type="button" key={entry.name} onClick={() => chooseSection(entry.name)} className={`rounded-xl p-3 text-left ${section === entry.name && !query ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><span className="mr-2">{sectionIcons[entry.name]}</span><span className="font-black">{entry.name}</span><span className="mt-1 block text-[10px] uppercase tracking-wider opacity-60">{entry.pageRange}</span></button>)}</nav>}
    <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[1fr_230px_190px] lg:shrink-0"><input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedID(null); }} placeholder="Search every rule, condition, class, spell, maneuver…" aria-label="Search rules" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" /><select value={subsection} disabled={Boolean(query)} onChange={(event) => { setSubsection(event.target.value); setSelectedID(null); }} aria-label="Filter rule topics" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-200 disabled:opacity-40"><option>All Topics</option>{subsections.map((topic) => <option key={topic}>{topic}</option>)}</select><select value={kind} onChange={(event) => { setKind(event.target.value); setSelectedID(null); }} aria-label="Filter document types" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-200"><option>All Types</option>{kinds.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="grid gap-4 lg:min-h-80 lg:flex-1 lg:grid-cols-[360px_1fr]"><aside className="max-h-96 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3 overscroll-contain lg:h-auto lg:max-h-none lg:min-h-0"><div className="mb-2 flex items-center justify-between px-2 py-1"><h2 className="font-black text-violet-200">{query ? 'Search Results' : section}</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.length === 0 ? <p className="p-4 text-sm text-slate-500">No rules match these filters.</p> : filtered.map((entry) => <button type="button" key={entry.id} onClick={() => openRelated(entry)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected?.id === entry.id ? 'bg-violet-500/15 ring-1 ring-violet-400/40' : 'hover:bg-white/5'}`}><div className="flex items-start justify-between gap-2"><span className="font-bold text-slate-200">{entry.title}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${kindColors[entry.kind] ?? kindColors.Rule}`}>{entry.kind}</span></div><div className="mt-1 text-xs text-slate-500">{entry.subsection} • {entry.page}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.summary}</p></button>)}</aside><main className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-6 lg:h-auto lg:min-h-0 lg:overflow-auto lg:overscroll-contain lg:p-9"><div className="mb-5 flex gap-2"><button type="button" aria-label="Previous rule" disabled={ruleHistoryIndex <= 0} onClick={() => navigateRuleHistory(ruleHistoryIndex - 1)} className="rounded-lg bg-slate-950/60 px-3 py-2 text-sm text-slate-300 disabled:opacity-25">← Back</button><button type="button" aria-label="Next rule" disabled={ruleHistoryIndex < 0 || ruleHistoryIndex >= ruleHistory.length - 1} onClick={() => navigateRuleHistory(ruleHistoryIndex + 1)} className="rounded-lg bg-slate-950/60 px-3 py-2 text-sm text-slate-300 disabled:opacity-25">Forward →</button></div>{selected ? <RuleDocument entry={selected} classReference={selectedClass} entries={reference.entries} onOpenRelated={openRelated} onOpenSection={chooseSection} onOpenSubsection={(nextSection, nextSubsection) => { setSection(nextSection); setSubsection(nextSubsection); setKind('All Types'); setSearch(''); setSelectedID(null); }} /> : <div className="grid h-full place-items-center text-slate-500">Select a reference document.</div>}</main></div>
  </div></div>;
};

export default RulesView;
