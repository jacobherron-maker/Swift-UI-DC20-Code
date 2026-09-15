import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useRulesReference } from '../../hooks/useRulesReference';
import type { AncestryTrait, CharacterReferenceData, ClassFeatureReference, MasteryReference, RuleReferenceEntry } from '../../types/models';
import {
  accessibleAncestryNames,
  ancestryPointBudget,
  ancestryTraitPointTotals,
  ancestryTraitPrerequisiteMet,
  canAddAncestryTraitCopy,
  defaultBuild,
  isAutomaticAncestryTrait,
  masteryCap,
  selectedAncestryTraits,
} from '../../utils/characterRules';
import {
  CHARACTER_OPTION_CATEGORIES,
  characterOptionCategoryForEntry,
  characterOptionMechanicalFacets,
  classFeaturesAtLevel,
  MASTERY_STAGE_ROWS,
  MECHANICAL_FACETS,
  sourceMinimumLevel,
} from '../../utils/characterOptionLibraryRules';
import type { CharacterOptionCategory, MechanicalFacet } from '../../utils/characterOptionLibraryRules';
import { ruleTextBlocks } from '../../utils/ruleRules';
import { talentDefinitions } from '../../utils/talentRules';
import type { TalentDefinition } from '../../utils/talentRules';
import { RuleAwareText } from '../rules/RuleAwareText';

const categoryMeta: Record<CharacterOptionCategory, { icon: string; description: string; color: string }> = {
  Classes: { icon: '♜', description: 'Explore every Class table, feature, path, and Subclass by level.', color: 'from-violet-500/20' },
  Subclasses: { icon: '✧', description: 'Browse complete Subclass documents grouped by their parent Class.', color: 'from-fuchsia-500/20' },
  'Ancestries & Traits': { icon: '◈', description: 'Compose an Ancestry and validate trait costs, limits, and prerequisites.', color: 'from-teal-500/20' },
  Talents: { icon: '✦', description: 'Compare Talents, prerequisites, repeatability, and Multiclass progression.', color: 'from-amber-500/20' },
  Skills: { icon: '◆', description: 'Review Skills by Attribute with their uses and Mastery bonuses.', color: 'from-emerald-500/20' },
  Trades: { icon: '⚒', description: 'Browse Trades by category, Attribute, tools, and Mastery stage.', color: 'from-orange-500/20' },
  Languages: { icon: '⌁', description: 'Review Mortal, Exotic, Divine, and Outer Languages and fluency.', color: 'from-sky-500/20' },
};

const kindStyle: Record<string, string> = {
  Class: 'bg-violet-500/15 text-violet-200', Subclass: 'bg-fuchsia-500/15 text-fuchsia-200',
  Ancestry: 'bg-teal-500/15 text-teal-200', Talent: 'bg-amber-500/15 text-amber-200',
  Skill: 'bg-emerald-500/15 text-emerald-200', Trade: 'bg-orange-500/15 text-orange-200',
  Language: 'bg-sky-500/15 text-sky-200',
};

function InlineLabels({ text }: { text: string }) {
  const match = text.match(/^([^:]{1,58}:)(.*)$/s);
  if (!match) return <RuleAwareText text={text} />;
  return <><strong className="font-black text-slate-100"><RuleAwareText text={match[1]} /></strong><RuleAwareText text={match[2]} /></>;
}

function OptionRulesText({ text }: { text: string }) {
  return <div className="space-y-3">{ruleTextBlocks(text).map((block, index) => {
    if (block.kind === 'heading') return <h3 key={index} className="border-b border-white/10 pb-2 pt-5 text-base font-black uppercase tracking-[0.12em] text-violet-200 first:pt-0">{block.text}</h3>;
    if (block.kind === 'subheading') return <h4 key={index} className="pt-2 font-black text-slate-100">{block.text}</h4>;
    if (block.kind === 'bullet') return <div key={index} className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-slate-950/40 px-3 py-2 text-sm leading-6 text-slate-300"><span className="theme-accent-text font-black">•</span><span><InlineLabels text={block.text} /></span></div>;
    if (block.kind === 'callout') return <aside key={index} className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm leading-6 text-sky-100"><InlineLabels text={block.text} /></aside>;
    return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-slate-300"><InlineLabels text={block.text} /></p>;
  })}</div>;
}

function SourceLine({ entry }: { entry: Pick<RuleReferenceEntry, 'sourceDocument' | 'page' | 'sourceStatus'> }) {
  return <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
    <span className="rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1.5">{entry.sourceDocument ?? 'Audited character reference'}</span>
    <span className="rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1.5">{entry.page}</span>
    {entry.sourceStatus && <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200">✓ {entry.sourceStatus}</span>}
  </div>;
}

function FeatureCards({ features }: { features: Array<ClassFeatureReference & { level?: number }> }) {
  if (features.length === 0) return <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No Class features are listed for this level.</p>;
  return <div className="grid gap-3">{features.map((feature, index) => <details key={`${feature.level}-${feature.name}-${index}`} open={features.length <= 4} className="group rounded-xl border border-white/10 bg-slate-950/45 p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-slate-100"><span>{feature.level ? <span className="mr-2 rounded-md bg-violet-500/15 px-2 py-1 text-[10px] uppercase tracking-wider text-violet-200">Level {feature.level}</span> : null}{feature.name}</span><span className="text-violet-300 group-open:rotate-45">＋</span></summary>
    <div className="mt-4 border-t border-white/10 pt-4"><OptionRulesText text={feature.description} /></div>
  </details>)}</div>;
}

function ClassProgressionExplorer({ reference, search, selectedClassFilter, maximumLevel, facet, pathFilter }: { reference: CharacterReferenceData; search: string; selectedClassFilter: string; maximumLevel: number; facet: string; pathFilter: string }) {
  const matchingClasses = reference.classes.filter((entry) => !selectedClassFilter || entry.name === selectedClassFilter)
    .filter((entry) => !pathFilter || entry.path === pathFilter)
    .filter((entry) => !search || `${entry.name} ${entry.description} ${entry.pathDetails} ${JSON.stringify(entry.features)} ${JSON.stringify(entry.subclassFeatures)}`.toLowerCase().includes(search))
    .filter((entry) => !facet || characterOptionMechanicalFacets({ title: entry.name, summary: entry.summary, text: `${entry.description}\n${entry.pathDetails}\n${JSON.stringify(entry.features)}\n${JSON.stringify(entry.subclassFeatures)}`, keywords: entry.path }).includes(facet as MechanicalFacet));
  const [className, setClassName] = useState(reference.classes[0]?.name ?? '');
  const [level, setLevel] = useState(1);
  const [cumulative, setCumulative] = useState(false);
  const [subclass, setSubclass] = useState('');
  const selectedClass = matchingClasses.find(({ name }) => name === className) ?? matchingClasses[0];

  if (!selectedClass) return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-8 text-center text-slate-400">No Classes match these filters.</div>;
  const safeLevel = Math.min(level, maximumLevel);
  const visibleFeatures = classFeaturesAtLevel(selectedClass, safeLevel, cumulative);
  const selectedSubclass = selectedClass.subclasses.includes(subclass) ? subclass : selectedClass.subclasses[0] || '';
  const subclassFeatures = selectedSubclass
    ? (selectedClass.subclassFeatures[selectedSubclass] ?? []).filter((feature) => cumulative ? (feature.level ?? 3) <= safeLevel : (feature.level ?? 3) === safeLevel)
    : [];

  return <div className="space-y-5">
    <section className="rounded-2xl border border-violet-400/20 bg-slate-900/75 p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-xs font-black uppercase tracking-wider text-slate-400">Class<select value={selectedClass.name} onChange={(event) => { setClassName(event.target.value); setSubclass(''); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-slate-100">{matchingClasses.map(({ name }) => <option key={name}>{name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm"><div><span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Path</span><strong className="text-violet-200">{selectedClass.path}</strong></div><div><span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Level 1 Profile</span><strong className="text-slate-200">{selectedClass.baseHP} HP · {selectedClass.levelOneResource}</strong></div></div>
      </div>
      <h2 className="mt-5 text-3xl font-black text-white">{selectedClass.name}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300"><RuleAwareText text={selectedClass.description} /></p>
      <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-4"><summary className="cursor-pointer font-black text-violet-200">Path and Starting Equipment</summary><div className="mt-4 space-y-4 border-t border-white/10 pt-4"><OptionRulesText text={selectedClass.pathDetails} /><OptionRulesText text={selectedClass.startingEquipment.description} /></div></details>
    </section>

    <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Class Progression Explorer</p><h2 className="text-xl font-black text-white">Level {safeLevel}</h2></div><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300"><input type="checkbox" checked={cumulative} onChange={(event) => setCumulative(event.target.checked)} /> Show everything through Level {safeLevel}</label></div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: maximumLevel }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => setLevel(value)} className={`rounded-lg py-2 text-sm font-black ${safeLevel === value ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>{value}</button>)}</div>
      <div className="mt-5 overflow-x-auto overscroll-contain rounded-xl border border-white/10"><table className="min-w-[840px] w-full text-sm"><thead><tr>{selectedClass.tableColumns.map((column) => <th key={column} className="border-b border-white/10 bg-slate-900 p-2 text-left text-[10px] uppercase tracking-wider text-slate-500">{column}</th>)}</tr></thead><tbody>{selectedClass.tableRows.filter((row) => row.level <= maximumLevel).map((row) => <tr key={row.level} onClick={() => setLevel(row.level)} className={`cursor-pointer ${row.level === safeLevel ? 'bg-violet-500/15 text-violet-100' : 'text-slate-400 hover:bg-white/5'}`}>{selectedClass.tableColumns.map((column) => { const value = row[column as keyof typeof row]; return <td key={column} className="border-b border-white/5 p-2">{value === undefined ? '—' : column === 'level' || column === 'features' ? String(value) : `+${value}`}</td>; })}</tr>)}</tbody></table></div>
      <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">{selectedClass.tableSource}</p>
    </section>

    <section><h2 className="mb-3 text-xl font-black text-white">{cumulative ? `Class Features Through Level ${safeLevel}` : `Level ${safeLevel} Class Features`}</h2><FeatureCards features={visibleFeatures} /></section>
    {safeLevel >= 3 && selectedClass.subclasses.length > 0 && <section className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Subclass Progression</p><h2 className="text-xl font-black text-white">{selectedSubclass}</h2></div><select value={selectedSubclass} onChange={(event) => setSubclass(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">{selectedClass.subclasses.map((name) => <option key={name}>{name}</option>)}</select></div><FeatureCards features={subclassFeatures} /></section>}
  </div>;
}

const multiclassTiers = [
  { name: 'Novice Multiclass', level: 1, sourceLevel: 1, label: 'Level 1 Class Features' },
  { name: 'Adept Multiclass', level: 4, sourceLevel: 2, label: 'Level 2 Class Features' },
  { name: 'Expert Multiclass', level: 6, sourceLevel: 5, label: 'Level 5 Class Expert or Level 3 Subclass Features' },
  { name: 'Master Multiclass', level: 8, sourceLevel: 7, label: 'Level 7 Subclass Expert Features' },
] as const;

function TalentPlanner({ reference, search, classFilter, maximumLevel, facet, prerequisitesOnly, repeatability }: { reference: CharacterReferenceData; search: string; classFilter: string; maximumLevel: number; facet: string; prerequisitesOnly: boolean; repeatability: string }) {
  const definitions = talentDefinitions(reference);
  const [talentType, setTalentType] = useState('All Talent Types');
  const [targetClass, setTargetClass] = useState(reference.classes[0]?.name ?? '');
  const [plannedTiers, setPlannedTiers] = useState<string[]>([]);
  const matching = definitions.filter((talent) => {
    const haystack = `${talent.name} ${talent.description} ${talent.requirements.join(' ')}`.toLowerCase();
    const facets = characterOptionMechanicalFacets({ title: talent.name, summary: '', text: talent.description, keywords: talent.requirements.join(' ') });
    return (!search || haystack.includes(search))
      && (!classFilter || talent.className === classFilter || talent.category !== 'Class')
      && talent.minimumLevel <= maximumLevel
      && (talentType === 'All Talent Types' || talent.category === talentType)
      && (!facet || facets.includes(facet as MechanicalFacet))
      && (!prerequisitesOnly || talent.requirements.length > 0)
      && (!repeatability || (repeatability === 'Repeatable' ? talent.isRepeatable : !talent.isRepeatable));
  });
  const target = reference.classes.find(({ name }) => name === targetClass) ?? reference.classes[0];
  const multiclassDefinitions = definitions.filter(({ category }) => category === 'Multiclass');

  const tierFeatures = (tier: (typeof multiclassTiers)[number]) => {
    if (!target) return [];
    if (tier.name === 'Expert Multiclass') {
      return [
        ...(target.features.find(({ level }) => level === 5)?.features ?? []).map((feature) => ({ ...feature, group: `${target.name} Level 5` })),
        ...target.subclasses.flatMap((subclass) => (target.subclassFeatures[subclass] ?? []).filter((feature) => feature.level === 3).map((feature) => ({ ...feature, group: `${subclass} Level 3` }))),
      ];
    }
    if (tier.name === 'Master Multiclass') return target.subclasses.flatMap((subclass) => (target.subclassFeatures[subclass] ?? []).filter((feature) => feature.level === 7).map((feature) => ({ ...feature, group: `${subclass} Level 7` })));
    return (target.features.find(({ level }) => level === tier.sourceLevel)?.features ?? []).map((feature) => ({ ...feature, group: `${target.name} Level ${tier.sourceLevel}` }));
  };

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(350px,.85fr)]">
    <section className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Talent Reference</p><h2 className="text-2xl font-black text-white">{matching.length} Matching Talents</h2></div><select value={talentType} onChange={(event) => setTalentType(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"><option>All Talent Types</option><option>General</option><option>Class</option><option>Multiclass</option></select></div><div className="grid gap-3">{matching.map((talent) => <TalentCard key={`${talent.category}-${talent.className}-${talent.name}`} talent={talent} />)}</div></section>
    <aside className="min-w-0 rounded-2xl border border-fuchsia-400/20 bg-slate-950/65 p-4 sm:p-5 xl:sticky xl:top-0 xl:self-start"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Multiclass Planner</p><h2 className="mt-1 text-2xl font-black text-white">Plan the Feature Ladder</h2><p className="mt-2 text-sm leading-6 text-slate-400">Compare the published Multiclass Talent requirements with the exact features available from a target Class. Planning here does not alter a character.</p><label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-500">Target Class<select value={target?.name ?? ''} onChange={(event) => { setTargetClass(event.target.value); setPlannedTiers([]); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100">{reference.classes.map(({ name }) => <option key={name}>{name}</option>)}</select></label><div className="mt-5 space-y-3">{multiclassTiers.map((tier) => {
      const definition = multiclassDefinitions.find(({ name }) => name === tier.name);
      const unlocked = maximumLevel >= tier.level;
      const checked = plannedTiers.includes(tier.name);
      return <details key={tier.name} className={`rounded-xl border p-3 ${unlocked ? 'border-fuchsia-400/20 bg-fuchsia-500/5' : 'border-white/10 bg-slate-900/45 opacity-65'}`}><summary className="cursor-pointer list-none"><div className="flex items-center gap-3"><input aria-label={`Plan ${tier.name}`} type="checkbox" checked={checked} disabled={!unlocked} onClick={(event) => event.stopPropagation()} onChange={(event) => setPlannedTiers((current) => event.target.checked ? [...current, tier.name] : current.filter((name) => name !== tier.name))} /><div className="min-w-0 flex-1"><strong className="block text-slate-100">{tier.name}</strong><span className="text-xs text-slate-500">Character Level {tier.level}+ · {tier.label}</span></div><span className="text-xs font-black uppercase text-fuchsia-300">{unlocked ? 'Level ready' : `Level ${tier.level} needed`}</span></div></summary><div className="mt-3 border-t border-white/10 pt-3">{definition && <OptionRulesText text={definition.description} />}<h3 className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">Feature paths from {target?.name}</h3><div className="mt-2 space-y-2">{tierFeatures(tier).map((feature, index) => <details key={`${feature.group}-${feature.name}-${index}`} className="rounded-lg bg-slate-900 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-200">{feature.group} — {feature.name}</summary><div className="mt-3"><OptionRulesText text={feature.description} /></div></details>)}</div></div></details>;
    })}</div></aside>
  </div>;
}

function TalentCard({ talent }: { talent: TalentDefinition }) {
  return <details className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-100">{talent.name}</h3><p className="mt-1 text-xs font-bold text-slate-500">{talent.category}{talent.className ? ` · ${talent.className}` : ''}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">Level {talent.minimumLevel}+</span><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">{talent.isRepeatable ? 'Repeatable' : 'Once only'}</span></div></div>{talent.requirements.length > 0 && <p className="mt-3 text-xs font-bold text-rose-200">Prerequisites: {talent.requirements.join(' · ')}</p>}</summary><div className="mt-4 border-t border-white/10 pt-4"><OptionRulesText text={talent.description} /></div></details>;
}

function AncestryPlanner({ reference, search, facet, costFilter, traitCategoryFilter }: { reference: CharacterReferenceData; search: string; facet: string; costFilter: string; traitCategoryFilter: string }) {
  const [primary, setPrimary] = useState(reference.ancestries[0] ?? '');
  const [secondary, setSecondary] = useState('');
  const [level, setLevel] = useState(1);
  const [increaseCount, setIncreaseCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const allTraits = reference.ancestryTraits;
  const build = { ...defaultBuild(), ancestrySecondary: secondary, selectedAncestryTraitIDs: Object.keys(counts).filter((id) => counts[id] > 0), ancestryTraitCounts: counts, selectedTalents: Array.from({ length: increaseCount }, () => 'Ancestry Increase') };
  const plannerCharacter = { level, class: '', subclass: '', ancestry: primary, build };
  const accessible = accessibleAncestryNames(plannerCharacter, allTraits);
  const visibleTraits = allTraits.filter(({ ancestry }) => accessible.has(ancestry));
  const chosen = selectedAncestryTraits(plannerCharacter, allTraits);
  const totals = ancestryTraitPointTotals(plannerCharacter, allTraits);
  const budget = ancestryPointBudget(plannerCharacter);
  const chosenAncestries = new Set([primary, secondary].filter(Boolean));
  const matches = (trait: AncestryTrait) => {
    const facets = characterOptionMechanicalFacets({ title: trait.name, summary: '', text: trait.description, keywords: `${trait.ancestry} ${trait.category}` });
    const matchesCost = !costFilter || (costFilter === 'Positive' ? trait.cost > 0 : costFilter === 'Negative' ? trait.cost < 0 : trait.cost === 0);
    return (!search || `${trait.name} ${trait.description} ${trait.ancestry} ${trait.category}`.toLowerCase().includes(search)) && (!facet || facets.includes(facet as MechanicalFacet)) && matchesCost && (!traitCategoryFilter || trait.category === traitCategoryFilter);
  };

  const reasonFor = (trait: AncestryTrait) => {
    const count = counts[trait.id] ?? 0;
    if (isAutomaticAncestryTrait(trait, chosenAncestries)) return 'Applied automatically';
    if (count > 0 && !trait.isRepeatable) return 'Already selected';
    if (!ancestryTraitPrerequisiteMet(plannerCharacter, trait, chosen)) return `Requires ${trait.prerequisite ?? 'another ancestry trait'}`;
    if (trait.cost < 0 && totals.negativePoints + Math.abs(trait.cost) > 2) return 'Negative Trait limit reached';
    if (trait.countsAsZeroPointTrait && totals.zeroPointTraits >= 1) return 'Minor Trait limit reached';
    if (!canAddAncestryTraitCopy(plannerCharacter, allTraits, trait)) return 'Not enough Ancestry Points';
    return '';
  };
  const changeCount = (trait: AncestryTrait, adjustment: number) => setCounts((current) => {
    const nextCount = Math.max(0, (current[trait.id] ?? 0) + adjustment);
    const next = { ...current };
    if (nextCount === 0) delete next[trait.id]; else next[trait.id] = nextCount;
    return next;
  });

  return <div className="space-y-5">
    <section className="grid gap-4 rounded-2xl border border-teal-400/20 bg-slate-950/65 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Primary Ancestry<select value={primary} onChange={(event) => { setPrimary(event.target.value); setSecondary(''); setCounts({}); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100">{reference.ancestries.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Optional Second Ancestry<select value={secondary} onChange={(event) => { setSecondary(event.target.value); setCounts({}); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"><option value="">None</option>{reference.ancestries.filter((name) => name !== primary && name !== 'Custom').map((name) => <option key={name}>{name}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs font-black uppercase tracking-wider text-slate-500">Level<select value={level} onChange={(event) => setLevel(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-black uppercase tracking-wider text-slate-500">Ancestry Increase<select value={increaseCount} onChange={(event) => setIncreaseCount(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-4"><Metric label="Point Budget" value={budget} tone="text-teal-200" /><Metric label="Net Points Spent" value={totals.spent} tone={totals.spent > budget ? 'text-rose-300' : 'text-white'} /><Metric label="Negative Points" value={`${totals.negativePoints} / 2`} tone={totals.negativePoints > 2 ? 'text-rose-300' : 'text-white'} /><Metric label="Minor Traits" value={`${totals.zeroPointTraits} / 1`} tone={totals.zeroPointTraits > 1 ? 'text-rose-300' : 'text-white'} /></section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/65 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">General Base Traits</p><div className="mt-3 grid gap-3 md:grid-cols-3">{reference.generalAncestryTraits.map((trait) => <div key={trait.id} className="rounded-xl bg-slate-950/50 p-3"><strong className="text-slate-100">{trait.name}</strong><p className="mt-2 text-sm leading-6 text-slate-400"><RuleAwareText text={trait.description} /></p></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">Ancestry-specific size traits are applied by the builder and character sheet when they replace a general size.</p></section>
    <div className="space-y-5">{Array.from(new Set(visibleTraits.map(({ ancestry }) => ancestry))).sort().map((ancestry) => {
      const traits = visibleTraits.filter((trait) => trait.ancestry === ancestry && matches(trait));
      if (traits.length === 0) return null;
      return <section key={ancestry}><h2 className="mb-3 text-xl font-black text-white">{ancestry} Traits</h2><div className="grid gap-3 lg:grid-cols-2">{traits.map((trait) => {
        const automatic = isAutomaticAncestryTrait(trait, chosenAncestries);
        const count = automatic ? 1 : (counts[trait.id] ?? 0);
        const reason = reasonFor(trait);
        return <article key={trait.id} className={`rounded-2xl border p-4 ${count > 0 ? 'border-teal-400/35 bg-teal-500/10' : 'border-white/10 bg-slate-900/65'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-100">{trait.name}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{trait.category} · {trait.cost > 0 ? `${trait.cost} points` : trait.cost < 0 ? `Grants ${Math.abs(trait.cost)} points` : '0 points'}{trait.isRepeatable ? ' · Repeatable' : ''}</p></div>{automatic ? <span className="rounded-full bg-teal-500/15 px-2 py-1 text-[10px] font-black uppercase text-teal-200">Automatic</span> : <div className="flex items-center rounded-lg border border-white/10 bg-slate-950"><button type="button" aria-label={`Remove ${trait.name}`} disabled={count === 0} onClick={() => changeCount(trait, -1)} className="px-3 py-2 font-black text-slate-300 disabled:opacity-25">−</button><span className="min-w-8 text-center text-sm font-black text-white">{count}</span><button type="button" aria-label={`Add ${trait.name}`} disabled={Boolean(reason)} title={reason} onClick={() => changeCount(trait, 1)} className="px-3 py-2 font-black text-teal-200 disabled:opacity-25">＋</button></div>}</div><div className="mt-3"><OptionRulesText text={trait.description} /></div>{trait.prerequisite && <p className="mt-3 text-xs font-bold text-amber-200">Prerequisite: {trait.prerequisite}</p>}{reason && !automatic && <p className="mt-2 text-xs font-bold text-slate-500">{reason}</p>}</article>;
      })}</div></section>;
    })}</div>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/65 p-4"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><strong className={`mt-1 block text-2xl font-black ${tone}`}>{value}</strong></div>;
}

function MasteryMatrix({ category, reference, search, attributeFilter, groupFilter }: { category: 'Skills' | 'Trades' | 'Languages'; reference: CharacterReferenceData; search: string; attributeFilter: string; groupFilter: string }) {
  const [level, setLevel] = useState(1);
  const records = category === 'Skills' ? reference.skills : category === 'Trades' ? reference.trades : reference.languages;
  const groups = category === 'Skills' ? reference.skillGroups : category === 'Trades' ? reference.tradeGroups : reference.languageGroups;
  const cap = masteryCap(level);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Reference Matrix</p><h2 className="text-2xl font-black text-white">{category}</h2></div>{category !== 'Languages' && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Character Level<select value={level} onChange={(event) => setLevel(Number(event.target.value))} className="ml-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label>}</div>
      {category === 'Languages' ? <div className="mt-4 grid gap-2 sm:grid-cols-3">{['Untrained', 'Limited', 'Fluent'].map((name, index) => <div key={name} className="rounded-xl border border-sky-400/15 bg-sky-500/5 p-3"><strong className="text-sky-100">{name}</strong><p className="mt-1 text-xs leading-5 text-slate-400">{index === 0 ? 'No fluency selected.' : index === 1 ? 'Limited fluency in the chosen Language.' : 'Fluent in the chosen Language.'}</p></div>)}</div> : <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{MASTERY_STAGE_ROWS.map((stage) => <div key={stage.name} className={`rounded-xl border p-3 ${stage.rank <= cap ? 'border-violet-400/20 bg-violet-500/10' : 'border-white/10 bg-slate-900/50 opacity-40'}`}><strong className="block text-sm text-slate-100">{stage.name}</strong><span className="text-xs font-black text-violet-200">{stage.bonus >= 0 ? '+' : ''}{stage.bonus}</span>{stage.rank === cap && <span className="ml-2 text-[9px] font-black uppercase text-emerald-300">Level cap</span>}</div>)}</div>}
    </section>
    {groups.map((group) => {
      if (groupFilter && group.name !== groupFilter) return null;
      const groupRecords = group.options.map((name) => records.find((record) => record.name === name)).filter((record): record is MasteryReference => Boolean(record)).filter((record) => (!search || `${record.name} ${record.description} ${record.attribute} ${record.tool} ${record.typicalSpeakers}`.toLowerCase().includes(search)) && (!attributeFilter || record.attribute === attributeFilter));
      if (groupRecords.length === 0) return null;
      return <section key={group.name}><div className="mb-3 flex items-center gap-3"><h2 className="text-xl font-black text-white">{group.name}</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{groupRecords.length}</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{groupRecords.map((record) => <details key={record.name} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-100">{record.name}{category === 'Trades' && record.attribute ? <span className="ml-2 text-sm font-bold text-orange-200">({record.attribute})</span> : null}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{record.attribute ? `Attribute: ${record.attribute}` : category === 'Languages' ? group.name : 'Prime Attribute'}{record.tool ? ` · Tool: ${record.tool}` : ''}</p></div><span className="text-xs font-black uppercase text-violet-300">More</span></div>{record.typicalSpeakers && <p className="mt-2 text-xs text-sky-200">Typical speakers: {record.typicalSpeakers}</p>}</summary><p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-slate-300"><RuleAwareText text={record.description} /></p></details>)}</div></section>;
    })}
  </div>;
}

function DocumentBrowser({ entries, search, classFilter, maximumLevel, facet }: { entries: RuleReferenceEntry[]; search: string; classFilter: string; maximumLevel: number; facet: string }) {
  const filtered = entries.filter((entry) => {
    const haystack = `${entry.title} ${entry.summary} ${entry.text} ${entry.keywords} ${entry.characterClass} ${entry.subclassName}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!classFilter || entry.characterClass === classFilter) && sourceMinimumLevel(entry) <= maximumLevel && (!facet || characterOptionMechanicalFacets(entry).includes(facet as MechanicalFacet));
  });
  const [selectedID, setSelectedID] = useState('');
  const selected = filtered.find(({ id }) => id === selectedID) ?? filtered[0];
  return <div className="grid gap-4 lg:min-h-[520px] lg:grid-cols-[330px_minmax(0,1fr)]"><aside className="max-h-[420px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-950/60 p-3 lg:max-h-none"><div className="mb-2 flex items-center justify-between px-2"><h2 className="font-black text-violet-200">Documents</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedID(entry.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected?.id === entry.id ? 'bg-violet-500/15 ring-1 ring-violet-400/35' : 'hover:bg-white/5'}`}><div className="flex items-start justify-between gap-2"><strong className="text-slate-200">{entry.title}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${kindStyle[entry.kind]}`}>{entry.kind}</span></div><p className="mt-1 text-xs text-slate-500">{entry.characterClass ?? entry.subsection} · {entry.page}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.summary}</p></button>)}</aside><main className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-7">{selected ? <article><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${kindStyle[selected.kind]}`}>{selected.kind}</span>{selected.characterClass && <span className="text-xs font-black uppercase tracking-wider text-slate-500">{selected.characterClass}</span>}</div><h1 className="mt-3 break-words text-3xl font-black text-white">{selected.title}</h1><p className="mt-3 text-lg leading-7 text-violet-200"><RuleAwareText text={selected.summary} /></p><div className="mt-4"><SourceLine entry={selected} /></div>{selected.details && <div className="mt-5 grid gap-2 sm:grid-cols-2">{selected.details.map(({ label, value }) => <div key={`${label}-${value}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-200">{value}</strong></div>)}</div>}<div className="mt-7"><OptionRulesText text={selected.text} /></div></article> : <div className="grid min-h-72 place-items-center text-slate-500">No documents match these filters.</div>}</main></div>;
}

const CharacterOptionsView: React.FC = () => {
  const { reference: rules, isLoading: rulesLoading, error: rulesError } = useRulesReference();
  const { reference: characterReference, isLoading: characterLoading, error: characterError } = useCharacterReference();
  const [category, setCategory] = useState<CharacterOptionCategory | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [maximumLevel, setMaximumLevel] = useState(10);
  const [attributeFilter, setAttributeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [facet, setFacet] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [traitCostFilter, setTraitCostFilter] = useState('');
  const [traitCategoryFilter, setTraitCategoryFilter] = useState('');
  const [prerequisitesOnly, setPrerequisitesOnly] = useState(false);
  const [repeatability, setRepeatability] = useState('');
  const search = searchInput.trim().toLowerCase();

  const entries = useMemo(() => rules?.entries.filter((entry) => characterOptionCategoryForEntry(entry) !== null) ?? [], [rules]);
  const categoryEntries = category ? entries.filter((entry) => characterOptionCategoryForEntry(entry) === category) : entries;
  const relevantGroups = !characterReference || !category ? [] : category === 'Skills' ? characterReference.skillGroups : category === 'Trades' ? characterReference.tradeGroups : category === 'Languages' ? characterReference.languageGroups : [];
  const categoryCount = (value: CharacterOptionCategory) => {
    if (!characterReference) return 0;
    if (value === 'Classes') return characterReference.classes.length;
    if (value === 'Subclasses') return characterReference.classes.reduce((sum, entry) => sum + entry.subclasses.length, 0);
    if (value === 'Ancestries & Traits') return characterReference.ancestryTraits.length + characterReference.generalAncestryTraits.length;
    if (value === 'Talents') return talentDefinitions(characterReference).length;
    if (value === 'Skills') return characterReference.skills.length;
    if (value === 'Trades') return characterReference.trades.length;
    return characterReference.languages.length;
  };
  const resetFilters = () => { setSearchInput(''); setClassFilter(''); setMaximumLevel(10); setAttributeFilter(''); setGroupFilter(''); setFacet(''); setPathFilter(''); setTraitCostFilter(''); setTraitCategoryFilter(''); setPrerequisitesOnly(false); setRepeatability(''); };
  const openCategory = (value: CharacterOptionCategory) => { resetFilters(); setCategory(value); };

  if (rulesLoading || characterLoading || !rules || !characterReference) return <div className="p-10 text-slate-300">{rulesError || characterError ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{rulesError ?? characterError}</div> : 'Loading character options…'}</div>;

  return <div className="min-h-full bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_38%,#020617_100%)] p-4 lg:p-7"><div className="mx-auto max-w-[1550px]">
    <header className="mb-5"><div className="flex flex-wrap items-start justify-between gap-4"><div>{category && <button type="button" onClick={() => { setCategory(null); resetFilters(); }} className="mb-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-sm font-black text-violet-100">← All Character Options</button>}<p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">{entries.length} source-linked records · {characterReference.classes.length} Classes</p><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">{category ?? 'Character Options'}</h1><p className="mt-2 max-w-4xl text-slate-400">{category ? categoryMeta[category].description : 'Explore and plan Classes, Subclasses, Ancestries, Talents, Skills, Trades, and Languages without changing a saved character.'}</p></div>{category && <button type="button" onClick={resetFilters} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900">Clear filters</button>}</div></header>

    {!category ? <section><label className="mb-5 block"><span className="sr-only">Search character options</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search Classes, Talents, Ancestries, Skills, Trades, and Languages…" className="w-full rounded-2xl border border-slate-700 bg-slate-950/65 px-5 py-4 text-slate-100 outline-none focus:border-violet-400" /></label><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{CHARACTER_OPTION_CATEGORIES.filter((value) => !search || `${value} ${categoryMeta[value].description}`.toLowerCase().includes(search) || entries.some((entry) => characterOptionCategoryForEntry(entry) === value && `${entry.title} ${entry.summary} ${entry.text}`.toLowerCase().includes(search))).map((value) => <button type="button" key={value} onClick={() => openCategory(value)} className={`group min-h-48 rounded-2xl border border-white/10 bg-gradient-to-br ${categoryMeta[value].color} to-slate-950/70 p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/40`}><div className="flex items-start justify-between gap-4"><span className="text-3xl text-violet-200">{categoryMeta[value].icon}</span><span className="rounded-full bg-slate-950/60 px-3 py-1 text-xs font-black text-slate-300">{categoryCount(value)}</span></div><h2 className="mt-7 text-2xl font-black text-white">{value}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{categoryMeta[value].description}</p><span className="mt-4 block text-xs font-black uppercase tracking-wider text-violet-300">Open {value} →</span></button>)}</div></section> : <>
      <section className="mb-5 rounded-2xl border border-white/10 bg-slate-950/65 p-4"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Search ${category.toLowerCase()} by name, wording, or mechanic…`} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" /><select value={facet} onChange={(event) => setFacet(event.target.value)} aria-label="Filter by mechanical effect" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-200"><option value="">All Mechanical Effects</option>{MECHANICAL_FACETS.map((value) => <option key={value}>{value}</option>)}</select></div>
        <details className="mt-3 rounded-xl border border-white/10 bg-slate-900/45 p-3"><summary className="cursor-pointer text-sm font-black text-violet-200">Advanced mechanical filters</summary><div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Classes', 'Subclasses', 'Talents'].includes(category) && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Class<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Classes</option>{characterReference.classes.map(({ name }) => <option key={name}>{name}</option>)}</select></label>}
          {['Classes', 'Subclasses', 'Talents'].includes(category) && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Available by Level<select value={maximumLevel} onChange={(event) => setMaximumLevel(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label>}
          {category === 'Classes' && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Class Path<select value={pathFilter} onChange={(event) => setPathFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Paths</option>{Array.from(new Set(characterReference.classes.map(({ path }) => path))).sort().map((path) => <option key={path}>{path}</option>)}</select></label>}
          {category === 'Ancestries & Traits' && <><label className="text-xs font-black uppercase tracking-wider text-slate-500">Point Cost<select value={traitCostFilter} onChange={(event) => setTraitCostFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Point Costs</option><option>Positive</option><option>Zero</option><option>Negative</option></select></label><label className="text-xs font-black uppercase tracking-wider text-slate-500">Trait Category<select value={traitCategoryFilter} onChange={(event) => setTraitCategoryFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Trait Categories</option>{Array.from(new Set(characterReference.ancestryTraits.map(({ category: traitCategory }) => traitCategory))).sort().map((traitCategory) => <option key={traitCategory}>{traitCategory}</option>)}</select></label></>}
          {['Skills', 'Trades'].includes(category) && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Attribute<select value={attributeFilter} onChange={(event) => setAttributeFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Attributes</option>{['Might', 'Agility', 'Charisma', 'Intelligence', 'Prime'].map((value) => <option key={value}>{value}</option>)}</select></label>}
          {relevantGroups.length > 0 && <label className="text-xs font-black uppercase tracking-wider text-slate-500">Category<select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Categories</option>{relevantGroups.map(({ name }) => <option key={name}>{name}</option>)}</select></label>}
          {category === 'Talents' && <><label className="text-xs font-black uppercase tracking-wider text-slate-500">Repeatability<select value={repeatability} onChange={(event) => setRepeatability(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"><option value="">All Talents</option><option>Repeatable</option><option>Once Only</option></select></label><label className="flex items-center gap-2 self-end rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-300"><input type="checkbox" checked={prerequisitesOnly} onChange={(event) => setPrerequisitesOnly(event.target.checked)} /> Has prerequisites</label></>}
        </div></details>
      </section>
      {category === 'Classes' && <ClassProgressionExplorer reference={characterReference} search={search} selectedClassFilter={classFilter} maximumLevel={maximumLevel} facet={facet} pathFilter={pathFilter} />}
      {category === 'Talents' && <TalentPlanner reference={characterReference} search={search} classFilter={classFilter} maximumLevel={maximumLevel} facet={facet} prerequisitesOnly={prerequisitesOnly} repeatability={repeatability} />}
      {category === 'Ancestries & Traits' && <AncestryPlanner reference={characterReference} search={search} facet={facet} costFilter={traitCostFilter} traitCategoryFilter={traitCategoryFilter} />}
      {(category === 'Skills' || category === 'Trades' || category === 'Languages') && <MasteryMatrix category={category} reference={characterReference} search={search} attributeFilter={attributeFilter} groupFilter={groupFilter} />}
      {category === 'Subclasses' && <DocumentBrowser entries={categoryEntries} search={search} classFilter={classFilter} maximumLevel={maximumLevel} facet={facet} />}
    </>}
  </div></div>;
};

export default CharacterOptionsView;
