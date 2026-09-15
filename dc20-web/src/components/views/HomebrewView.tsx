import { useEffect, useMemo, useState } from 'react';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import { useCampaignStore } from '../../store/campaignStore';
import type {
  CharacterCompanion,
  CharacterCompanionAbility,
  CharacterCompanionAbilityKind,
  CharacterCompanionKind,
  DC20Attribute,
  EquipmentCategory,
  EquipmentSlot,
  GmVaultEntry,
  Maneuver,
  Spell,
  VaultContentKind,
  VaultDistribution,
  VaultMechanicalEffects,
  VaultRecharge,
} from '../../types/models';
import { EquipmentCategoryValues, EquipmentSlotValues, VaultContentKindValues } from '../../types/models';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { companionDefaultsForKind, COMPANION_KIND_META } from '../../utils/companionRules';
import { generateUUID, sortByName } from '../../utils/gameUtils';
import type { PowerResolution } from '../../utils/powerRules';
import {
  createVaultEntry,
  duplicateVaultEntry,
  prepareVaultEntry,
  prepareVaultEntryForSave,
  restoreVaultRevision,
  vaultEffectSummary,
  vaultEntryFromEquipment,
  vaultEntryFromManeuver,
  vaultEntryFromSpell,
  vaultValidationIssues,
} from '../../utils/vaultRules';
import {
  VaultAdvancedEffects,
  VaultCampaignDistribution,
  VaultDashboard,
  VaultHistory,
  VaultLinks,
  VaultOrganizationFields,
} from './VaultWorkspacePanels';

/* Selecting a persisted entry intentionally synchronizes its editable draft. */
/* oxlint-disable react/set-state-in-effect */

interface HomebrewViewProps {
  onCreateMonster: () => void;
  onCreateItem: () => void;
  onOpenMonster: (id: string) => void;
  onOpenItem: (id: string) => void;
}

const field = 'w-full rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70';
const label = 'block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500';
const panel = 'rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5';
const ATTRIBUTES: DC20Attribute[] = ['Might', 'Agility', 'Charisma', 'Intelligence'];
const COMPANION_KINDS: CharacterCompanionKind[] = ['Pet', 'Summon', 'Familiar'];
const ABILITY_KINDS: CharacterCompanionAbilityKind[] = ['Trait', 'Feature', 'Action', 'Reaction'];
const RECHARGE_OPTIONS: VaultRecharge[] = ['Manual', 'Quick Rest', 'Short Rest', 'Long Rest'];
const NUMERIC_EFFECTS: Array<[keyof VaultMechanicalEffects, string]> = [
  ['maxHPBonus', 'Maximum HP'], ['maxStaminaBonus', 'Maximum Stamina'], ['maxManaBonus', 'Maximum Mana'],
  ['physicalDefenseBonus', 'Precision Defense'], ['areaDefenseBonus', 'Area Defense'], ['speedBonus', 'Speed'],
  ['allCheckBonus', 'All Checks'], ['martialCheckBonus', 'Martial Checks'], ['spellCheckBonus', 'Spell Checks'],
  ['spellAttackBonus', 'Spell Attacks'], ['saveDCBonus', 'Save DC'], ['weaponDamageBonus', 'Weapon Damage'],
  ['spellDamageBonus', 'Spell Damage'],
];
const RESOLUTIONS: PowerResolution[] = ['None', 'Spell Check', 'Spell Attack', 'Melee Spell Attack', 'Ranged Spell Attack', 'Area Spell Attack'];
const KIND_META: Record<VaultContentKind, { icon: string; color: string; description: string }> = {
  [VaultContentKindValues.ITEM]: { icon: '💎', color: 'text-amber-300', description: 'Equipable or attunable magic gear with routed sheet bonuses.' },
  [VaultContentKindValues.TALENT]: { icon: '✦', color: 'text-fuchsia-300', description: 'A custom talent with eligibility, limited uses, spells, and passive effects.' },
  [VaultContentKindValues.FEATURE]: { icon: '◆', color: 'text-violet-300', description: 'A boon, class-like feature, blessing, curse, or training.' },
  [VaultContentKindValues.SPELL]: { icon: '✨', color: 'text-cyan-300', description: 'A complete rollable spell with costs, resolution, and enhancements.' },
  [VaultContentKindValues.MANEUVER]: { icon: '⚔', color: 'text-orange-300', description: 'A complete rollable maneuver with costs, requirements, resolution, and enhancements.' },
  [VaultContentKindValues.COMPANION]: { icon: '🐾', color: 'text-emerald-300', description: 'A structured pet, summon, or familiar stat sheet.' },
  [VaultContentKindValues.OTHER]: { icon: '📜', color: 'text-slate-300', description: 'Any other reward or rules object, with optional sheet effects.' },
};
const commaList = (value: string) => value.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);

function NumberField({ title, value, onChange, min }: { title: string; value?: number; onChange: (value: number) => void; min?: number }) {
  return <label className={label}>{title}<input type="number" min={min} value={value ?? 0} onChange={(event) => onChange(Number(event.target.value) || 0)} className={`${field} mt-1`} /></label>;
}

function TextField({ title, value, onChange, placeholder }: { title: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className={label}>{title}<input value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`${field} mt-1`} placeholder={placeholder} /></label>;
}

function NamedBonuses({ title, values, onChange, placeholder }: { title: string; values: Record<string, number>; onChange: (values: Record<string, number>) => void; placeholder: string }) {
  const replace = (oldName: string, name: string, amount: number) => {
    const next = Object.fromEntries(Object.entries(values).flatMap(([currentName, currentAmount]) => {
      if (currentName !== oldName) return [[currentName, currentAmount]];
      return name.trim() && amount ? [[name.trim(), amount]] : [];
    }));
    onChange(next);
  };
  return <div><div className="flex items-center justify-between"><span className={label}>{title}</span><button type="button" onClick={() => onChange({ ...values, [`New ${title}`]: 1 })} className="rounded bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-300">+ Add</button></div><div className="mt-2 space-y-2">{Object.entries(values).map(([name, amount], index) => <div key={`${title}-${index}`} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2"><input value={name} onChange={(event) => replace(name, event.target.value, amount)} className={field} placeholder={placeholder} /><input type="number" aria-label={`${name} bonus`} value={amount} onChange={(event) => replace(name, name, Number(event.target.value) || 0)} className={field} /><button type="button" onClick={() => replace(name, '', 0)} className="px-2 text-red-300">×</button></div>)}{Object.keys(values).length === 0 && <p className="text-xs text-slate-600">No named bonuses.</p>}</div></div>;
}

function SpellGrantPicker({ title, options, selected, onChange }: { title: string; options: Spell[]; selected: Spell[]; onChange: (spells: Spell[]) => void }) {
  const selectedNames = new Set(selected.map(({ name }) => name));
  const published = options.filter(({ source }) => source !== 'GM Vault');
  const custom = options.filter(({ source }) => source === 'GM Vault');
  const add = (name: string) => {
    const spell = options.find((entry) => entry.name === name);
    if (spell && !selectedNames.has(spell.name)) onChange([...selected, { ...spell }]);
  };
  return <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/10 p-4"><label className={label}>{title}<select value="" onChange={(event) => add(event.target.value)} className={`${field} mt-1`}><option value="">Choose a spell to grant…</option>{custom.length > 0 && <optgroup label="Custom GM Vault Spells">{custom.filter(({ name }) => !selectedNames.has(name)).map((spell) => <option key={`custom-${spell.id}`} value={spell.name}>{spell.name} • {spell.school}</option>)}</optgroup>}<optgroup label="Published Spells">{published.filter(({ name }) => !selectedNames.has(name)).map((spell) => <option key={`published-${spell.id}`} value={spell.name}>{spell.name} • {spell.school}</option>)}</optgroup></select></label><div className="mt-3 space-y-2">{selected.map((spell) => <details key={`${spell.source}-${spell.name}`} className="rounded-lg border border-white/10 bg-slate-950/50 p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span><span className="font-black text-cyan-100">{spell.name}</span><span className="ml-2 text-xs text-slate-500">{spell.source} • {spell.school}{spell.cost ? ` • ${spell.cost}` : ''}</span></span><button type="button" onClick={(event) => { event.preventDefault(); onChange(selected.filter(({ name }) => name !== spell.name)); }} className="rounded-lg px-2 py-1 text-xs font-black text-red-300 hover:bg-red-500/10">Remove</button></summary><p className="mt-3 whitespace-pre-wrap border-t border-white/5 pt-3 text-xs leading-5 text-slate-400">{spell.description}</p></details>)}{selected.length === 0 && <p className="text-xs text-slate-600">No spells connected.</p>}</div></div>;
}

function CompanionToggle({ checked, title, detail, onChange }: { checked: boolean; title: string; detail: string; onChange: (value: boolean) => void }) {
  return <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${checked ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-white/10 bg-slate-950/40'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5" /><span><span className="block text-sm font-black text-slate-200">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span></label>;
}

function CompanionAbilityEditor({ ability, onChange, onRemove }: { ability: CharacterCompanionAbility; onChange: (ability: CharacterCompanionAbility) => void; onRemove: () => void }) {
  return <article className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><div className="grid gap-3 md:grid-cols-[9rem_minmax(0,1fr)_10rem_auto]"><label className={label}>Type<select value={ability.kind} onChange={(event) => onChange({ ...ability, kind: event.target.value as CharacterCompanionAbilityKind })} className={`${field} mt-1`}>{ABILITY_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label><TextField title="Name" value={ability.name} onChange={(name) => onChange({ ...ability, name })} /><TextField title="Cost" value={ability.cost} onChange={(cost) => onChange({ ...ability, cost })} placeholder="1 AP, Reaction…" /><button type="button" onClick={onRemove} className="self-end rounded-lg px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/10">Remove</button></div><label className={`${label} mt-3`}>Rules and mechanical details<textarea rows={4} value={ability.details} onChange={(event) => onChange({ ...ability, details: event.target.value })} className={`${field} mt-1 resize-y`} /></label></article>;
}

function CompanionBuilder({ companion, spellOptions, onChange }: { companion: CharacterCompanion; spellOptions: Spell[]; onChange: (values: Partial<CharacterCompanion>) => void }) {
  const meta = COMPANION_KIND_META[companion.kind];
  const relevantPublished = spellOptions.filter((spell) => spell.source !== 'GM Vault' && (companion.kind === 'Familiar'
    ? spell.name === 'Call Familiar' || /familiar/i.test(spell.tags ?? '')
    : spell.name !== 'Call Familiar' && (/^Summon /i.test(spell.name) || /(^|,)\s*Summoning\s*(,|$)/i.test(spell.tags ?? ''))));
  const linkedSpellOptions = companion.kind === 'Pet' ? [] : sortByName([
    ...spellOptions.filter(({ source }) => source === 'GM Vault'),
    ...relevantPublished,
  ]);
  const abilities = companion.abilities ?? [];
  const changeKind = (kind: CharacterCompanionKind) => {
    if (kind !== companion.kind) onChange({ ...companionDefaultsForKind(kind), kind });
  };
  const setAbility = (changed: CharacterCompanionAbility) => onChange({ abilities: abilities.map((ability) => ability.id === changed.id ? changed : ability) });
  const addAbility = (kind: CharacterCompanionAbilityKind) => onChange({ abilities: [...abilities, { id: generateUUID(), kind, name: `New ${kind}`, cost: '', details: '' }] });

  return <div className="space-y-5">
    <section className={`${panel} border-emerald-400/20`}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Companion Category</p><h3 className="mt-1 text-xl font-black text-white">Choose how this creature works</h3><div className="mt-4 grid gap-3 md:grid-cols-3">{COMPANION_KINDS.map((kind) => { const option = COMPANION_KIND_META[kind]; const active = companion.kind === kind; return <button type="button" key={kind} onClick={() => changeKind(kind)} className={`rounded-xl border p-4 text-left transition ${active ? 'border-emerald-400/60 bg-emerald-500/15' : 'border-white/10 bg-slate-950/40 hover:border-emerald-400/25'}`}><span className="text-2xl">{option.icon}</span><span className="mt-2 block font-black text-slate-100">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.summary}</span></button>; })}</div></section>

    <section className={`${panel} border-emerald-400/15`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">{meta.icon} {meta.title} Rules</p><h3 className="mt-1 text-lg font-black text-emerald-100">Category Setup</h3></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-200">Structured companion</span></div>{companion.kind !== 'Pet' && <label className={`${label} mt-4`}>Connected {companion.kind === 'Familiar' ? 'familiar' : 'summoning'} spell<select value={companion.linkedSpellName ?? ''} onChange={(event) => { const linkedSpellName = event.target.value; onChange({ linkedSpellName, source: linkedSpellName || (companion.kind === 'Familiar' ? 'Call Familiar' : 'Custom Summoning Spell') }); }} className={`${field} mt-1`}><option value="">No connected spell</option>{linkedSpellOptions.map((spell) => <option key={`${spell.source}-${spell.id}`} value={spell.name}>{spell.source === 'GM Vault' ? 'Custom • ' : ''}{spell.name} • {spell.school}</option>)}</select></label>}<details open className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-emerald-100">Built-in {meta.title} guidance</summary><p className="mt-3 whitespace-pre-wrap border-t border-white/5 pt-3 text-sm leading-6 text-slate-400">{meta.rules}</p></details><div className="mt-4 grid gap-3 md:grid-cols-2">{companion.kind !== 'Pet' && <CompanionToggle checked={Boolean(companion.usesOwnerStats)} title="Scale checks from the owner" detail="When accepted, Prime Modifier, Combat Mastery, Attack Check, and Save DC come from that character." onChange={(usesOwnerStats) => onChange({ usesOwnerStats })} />}<CompanionToggle checked={Boolean(companion.actsOnOwnersTurn)} title="Acts on the owner’s turn" detail="Records that the companion shares the owner’s Initiative and turn." onChange={(actsOnOwnersTurn) => onChange({ actsOnOwnersTurn })} /><CompanionToggle checked={Boolean(companion.requiresCommand)} title="Requires a command" detail="The owner must use the command procedure described in the rules text before it acts." onChange={(requiresCommand) => onChange({ requiresCommand })} />{companion.kind === 'Familiar' && <CompanionToggle checked={Boolean(companion.sharesHealthWithCharacter)} title="Shares the owner’s HP" detail="The accepted familiar mirrors the character’s current and maximum HP." onChange={(sharesHealthWithCharacter) => onChange({ sharesHealthWithCharacter })} />}<CompanionToggle checked={Boolean(companion.canAttack)} title="Can take Attack or Spell Actions" detail={companion.kind === 'Familiar' ? 'Leave off unless a Familiar Feature explicitly allows it.' : 'Turn off for a noncombat companion.'} onChange={(canAttack) => onChange({ canAttack })} /></div></section>

    <section className={panel}><h3 className="text-lg font-black text-violet-200">Identity & Baseline</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><TextField title="Creature Type" value={companion.creatureType} onChange={(creatureType) => onChange({ creatureType })} placeholder="Beast, Construct…" /><TextField title="Source" value={companion.source} onChange={(source) => onChange({ source })} /><TextField title="Size" value={companion.size} onChange={(size) => onChange({ size })} /><NumberField title="Level" value={companion.level} min={-1} onChange={(level) => onChange({ level: Math.max(-1, Math.trunc(level)) })} /></div></section>

    <section className={panel}><h3 className="text-lg font-black text-violet-200">Core Statistics</h3><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6"><NumberField title="Maximum HP" value={companion.maxHP} min={1} onChange={(maxHP) => onChange({ maxHP: Math.max(1, maxHP), currentHP: Math.max(1, maxHP) })} /><NumberField title="Maximum AP" value={companion.maxAP} min={0} onChange={(maxAP) => onChange({ maxAP: Math.max(0, maxAP), currentAP: Math.max(0, maxAP) })} /><NumberField title="Maximum RP" value={companion.maxRP} min={0} onChange={(maxRP) => onChange({ maxRP: Math.max(0, maxRP), currentRP: Math.max(0, maxRP) })} /><NumberField title="Precision Defense" value={companion.physicalDefense} onChange={(physicalDefense) => onChange({ physicalDefense })} /><NumberField title="Area Defense" value={companion.areaDefense} onChange={(areaDefense) => onChange({ areaDefense })} /><NumberField title="Attack Check" value={companion.attackCheck} onChange={(attackCheck) => onChange({ attackCheck })} /><NumberField title="Save DC" value={companion.saveDC} onChange={(saveDC) => onChange({ saveDC })} /><NumberField title="Baseline Damage" value={companion.damage} min={0} onChange={(damage) => onChange({ damage: Math.max(0, damage) })} /><NumberField title="Prime Modifier" value={companion.primeModifier} onChange={(primeModifier) => onChange({ primeModifier })} /><NumberField title="Combat Mastery" value={companion.combatMastery} min={0} onChange={(combatMastery) => onChange({ combatMastery: Math.max(0, combatMastery) })} /></div><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{ATTRIBUTES.map((attribute) => <NumberField key={attribute} title={attribute} value={companion.attributes[attribute]} onChange={(value) => onChange({ attributes: { ...companion.attributes, [attribute]: value } })} />)}</div></section>

    <details open className={`${panel} p-0`}><summary className="cursor-pointer px-4 py-4 text-lg font-black text-violet-200 sm:px-5">Movement, Training & Defenses</summary><div className="grid gap-4 border-t border-white/5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"><NumberField title="Speed" value={companion.speed} min={0} onChange={(speed) => onChange({ speed: Math.max(0, speed) })} /><TextField title="Primary Speed" value={companion.speedType} onChange={(speedType) => onChange({ speedType })} placeholder="Ground, Fly, Swim…" /><TextField title="Other Speeds" value={companion.otherSpeeds} onChange={(otherSpeeds) => onChange({ otherSpeeds })} /><TextField title="Skills" value={companion.skills} onChange={(skills) => onChange({ skills })} /><TextField title="Senses" value={companion.senses} onChange={(senses) => onChange({ senses })} /><TextField title="Languages" value={companion.languages} onChange={(languages) => onChange({ languages })} /><TextField title="Damage Reductions" value={companion.reductions} onChange={(reductions) => onChange({ reductions })} /><TextField title="Resistances" value={companion.resistances} onChange={(resistances) => onChange({ resistances })} /><TextField title="Vulnerabilities" value={companion.vulnerabilities} onChange={(vulnerabilities) => onChange({ vulnerabilities })} /><TextField title="Immunities" value={companion.immunities} onChange={(immunities) => onChange({ immunities })} /></div></details>

    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-xl font-black text-violet-200">Traits, Features & Actions</h3><p className="text-sm text-slate-500">Build the companion’s stat block like a custom monster.</p></div><div className="flex flex-wrap gap-2">{ABILITY_KINDS.map((kind) => <button type="button" key={kind} onClick={() => addAbility(kind)} className="rounded-lg border border-dashed border-violet-400/40 px-3 py-2 text-xs font-black text-violet-300 hover:bg-violet-500/10">+ {kind}</button>)}</div></div>{abilities.map((ability) => <CompanionAbilityEditor key={ability.id} ability={ability} onChange={setAbility} onRemove={() => onChange({ abilities: abilities.filter(({ id }) => id !== ability.id) })} />)}{abilities.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Add a Trait, Feature, Action, or Reaction to begin the stat block.</div>}</section>

    <section className={panel}><label className={label}>GM and player notes<textarea value={companion.notes} onChange={(event) => onChange({ notes: event.target.value })} rows={5} className={`${field} mt-1 resize-y`} /></label></section>
  </div>;
}

export default function HomebrewView({ onCreateMonster, onCreateItem, onOpenMonster, onOpenItem }: HomebrewViewProps) {
  const { campaignData, addCustomMonster, addVaultEntry, updateVaultEntry, removeVaultEntry } = useCampaignStore();
  const partyHub = usePartyCampaigns();
  const { spells: publishedSpellReferences, maneuvers: publishedManeuverReferences, isLoading: spellsLoading, error: spellsError } = usePowerCatalog();
  const { equipment: publishedEquipment } = useEquipmentCatalog();
  const { monsters: sourceMonsters } = useSourceMonsters();
  const [filter, setFilter] = useState<VaultContentKind | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Draft' | 'Ready' | 'Archived'>('Active');
  const [folderFilter, setFolderFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'Updated' | 'Name' | 'Kind'>('Updated');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedID, setSelectedID] = useState<string | null>(campaignData.vaultEntries[0]?.id ?? null);
  const [draft, setDraft] = useState<GmVaultEntry | null>(campaignData.vaultEntries[0] ?? null);
  const [isNew, setIsNew] = useState(false);
  const [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState('');
  const folders = useMemo(() => Array.from(new Set(campaignData.vaultEntries.map(({ folder }) => folder?.trim()).filter((value): value is string => Boolean(value)))).sort(), [campaignData.vaultEntries]);
  const entries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return campaignData.vaultEntries.filter((entry) => (
      (filter === 'All' || entry.kind === filter)
      && (statusFilter === 'Active' ? entry.status !== 'Archived' : (entry.status ?? 'Draft') === statusFilter)
      && (folderFilter === 'All' || (folderFilter === 'Unfiled' ? !entry.folder : entry.folder === folderFilter))
      && (!favoritesOnly || entry.favorite)
      && (!needle || [entry.name, entry.summary, entry.description, entry.folder, ...entry.tags].some((value) => value?.toLocaleLowerCase().includes(needle)))
    )).sort((left, right) => sort === 'Name' ? left.name.localeCompare(right.name)
      : sort === 'Kind' ? left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
        : right.updatedAt.localeCompare(left.updatedAt));
  }, [campaignData.vaultEntries, favoritesOnly, filter, folderFilter, search, sort, statusFilter]);
  const spellOptions = useMemo(() => {
    const published: Spell[] = publishedSpellReferences.map((spell) => ({ id: `published-spell-${spell.name}`, ...spell }));
    const custom = campaignData.vaultEntries.flatMap(({ spell }) => spell ? [{ ...spell }] : []);
    const byName = new Map<string, Spell>();
    for (const spell of [...published, ...custom]) byName.set(spell.name, spell);
    return sortByName([...byName.values()]);
  }, [campaignData.vaultEntries, publishedSpellReferences]);
  const maneuverTemplates = useMemo<Maneuver[]>(() => publishedManeuverReferences.map((maneuver) => ({ id: `published-maneuver-${maneuver.name}`, ...maneuver })), [publishedManeuverReferences]);
  const gmParties = partyHub.parties.filter(({ role }) => role === 'gm');
  const validationIssues = useMemo(() => draft ? vaultValidationIssues(draft) : [], [draft]);

  useEffect(() => {
    if (!isNew) {
      const selected = campaignData.vaultEntries.find(({ id }) => id === selectedID);
      setDraft(selected ? structuredClone(selected) : null);
    }
  }, [campaignData.vaultEntries, isNew, selectedID]);

  const beginCreate = (kind: VaultContentKind) => {
    const entry = createVaultEntry(kind);
    setSelectedID(entry.id);
    setDraft(entry);
    setIsNew(true);
    setNotice('');
  };
  const beginFromTemplate = (entry: GmVaultEntry) => {
    setSelectedID(entry.id);
    setDraft(entry);
    setIsNew(true);
    setNotice('Template copied into a new private draft.');
  };
  const select = (entry: GmVaultEntry) => {
    setSelectedID(entry.id);
    setDraft(structuredClone(entry));
    setIsNew(false);
    setNotice('');
  };
  const change = (values: Partial<GmVaultEntry>) => setDraft((current) => current ? { ...current, ...values } : current);
  const setEffect = (key: keyof VaultMechanicalEffects, value: unknown) => setDraft((current) => current ? { ...current, effects: { ...current.effects, [key]: value } } : current);
  const setItem = (values: Partial<NonNullable<GmVaultEntry['item']>>) => setDraft((current) => current?.item ? { ...current, item: { ...current.item, ...values } } : current);
  const setSpell = (values: Partial<NonNullable<GmVaultEntry['spell']>>) => setDraft((current) => current?.spell ? { ...current, spell: { ...current.spell, ...values } } : current);
  const setManeuver = (values: Partial<NonNullable<GmVaultEntry['maneuver']>>) => setDraft((current) => current?.maneuver ? { ...current, maneuver: { ...current.maneuver, ...values } } : current);
  const setCompanion = (values: Partial<CharacterCompanion>) => setDraft((current) => current?.companion ? { ...current, companion: { ...current.companion, ...values } } : current);
  const setGrantedSpells = (spells: Spell[]) => setDraft((current) => current ? {
    ...current,
    grantedSpells: spells,
    ...(current.item ? { item: { ...current.item, grantedSpells: spells.map(({ name }) => name) } } : {}),
  } : current);
  const selectedGrantedSpells = useMemo(() => {
    if (!draft) return [];
    const snapshots = draft.grantedSpells ?? [];
    const names = draft.item?.grantedSpells ?? snapshots.map(({ name }) => name);
    return names.flatMap((name) => {
      const spell = snapshots.find((entry) => entry.name === name) ?? spellOptions.find((entry) => entry.name === name);
      return spell ? [{ ...spell }] : [];
    });
  }, [draft, spellOptions]);
  const save = () => {
    if (!draft?.name.trim()) return;
    const previous = isNew ? undefined : campaignData.vaultEntries.find(({ id }) => id === draft.id);
    const linked = (draft.linkedEntryIDs ?? []).flatMap((id) => {
      const entry = campaignData.vaultEntries.find((candidate) => candidate.id === id);
      return entry ? [{ ...entry, bundledEntries: [] }] : [];
    });
    const prepared = prepareVaultEntryForSave({ ...draft, bundledEntries: linked }, previous);
    if (isNew) addVaultEntry(prepared);
    else updateVaultEntry(prepared);
    setDraft(prepared);
    setIsNew(false);
    setNotice(`${prepared.name} saved privately to your GM Vault.`);
  };
  const duplicate = () => {
    if (!draft) return;
    beginFromTemplate(duplicateVaultEntry(draft));
  };
  const restore = (snapshot: string) => {
    if (!draft) return;
    const restored = restoreVaultRevision(draft, snapshot);
    if (!restored) { setNotice('That saved version could not be restored.'); return; }
    updateVaultEntry(restored);
    setDraft(restored);
    setNotice(`${restored.name} restored as version ${restored.version}.`);
  };
  const remove = () => {
    if (!draft || isNew || !window.confirm(`Delete “${draft.name}” from your private Vault? Copies already accepted by characters remain.`)) return;
    removeVaultEntry(draft.id);
    setSelectedID(null);
    setDraft(null);
  };
  const share = async (partyId: string, shouldShare: boolean, distribution?: VaultDistribution) => {
    if (!draft || isNew) return;
    setSharing(partyId);
    setNotice('');
    try {
      if (shouldShare) {
        const bundledEntries = (draft.linkedEntryIDs ?? []).flatMap((id) => {
          const entry = campaignData.vaultEntries.find((candidate) => candidate.id === id);
          return entry ? [{ ...prepareVaultEntry(entry), bundledEntries: [] }] : [];
        });
        await partyHub.shareVaultEntry(partyId, prepareVaultEntry({ ...draft, distribution: distribution ?? draft.distribution, bundledEntries }));
      }
      else await partyHub.removeSharedVaultEntry(partyId, draft.id);
      setNotice(`${draft.name} ${shouldShare ? 'shared with' : 'removed from'} ${gmParties.find(({ id }) => id === partyId)?.name ?? 'campaign'}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The campaign Vault could not be updated.');
    } finally {
      setSharing('');
    }
  };
  const duplicateMonster = (monster: typeof campaignData.customMonsters[number]) => {
    const copy = structuredClone(monster);
    copy.id = `custom-${generateUUID()}`;
    copy.name = `${monster.name} (Copy)`;
    addCustomMonster(copy);
    onOpenMonster(copy.id);
  };

  return <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(88,28,135,0.18),transparent_38%)] lg:h-full lg:flex-row lg:overflow-hidden">
    <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-[22rem] lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <button type="button" onClick={() => { setDraft(null); setSelectedID(null); setIsNew(false); }} className="text-left"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Private workshop</p><h1 className="mt-1 text-3xl font-black text-white">GM Vault</h1></button>
      <p className="mt-2 text-sm leading-6 text-slate-400">Create private rewards and rules content. Nothing leaves your account until you publish it.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">{Object.values(VaultContentKindValues).map((kind) => <button type="button" key={kind} onClick={() => beginCreate(kind)} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left text-xs font-black text-slate-200 hover:border-violet-400/35"><span className="mr-2">{KIND_META[kind].icon}</span>{kind === VaultContentKindValues.COMPANION ? 'Companion' : kind}</button>)}</div>
      <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${field} mt-5`} placeholder="Search Vault…" aria-label="Search Vault" />
      <div className="mt-2 grid grid-cols-2 gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value as VaultContentKind | 'All')} className={field} aria-label="Filter Vault content type"><option>All</option>{Object.values(VaultContentKindValues).map((kind) => <option key={kind}>{kind}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={field} aria-label="Filter Vault status"><option>Active</option><option>Draft</option><option>Ready</option><option>Archived</option></select><select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} className={field} aria-label="Filter Vault folder"><option>All</option><option>Unfiled</option>{folders.map((folder) => <option key={folder}>{folder}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={field} aria-label="Sort Vault"><option>Updated</option><option>Name</option><option>Kind</option></select></div>
      <label className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.025] p-2 text-xs font-bold text-slate-400"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} /> Favorites only</label>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 lg:max-h-none">{entries.map((entry) => <button type="button" key={entry.id} onClick={() => select(entry)} className={`w-full rounded-xl border p-3 text-left ${selectedID === entry.id ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/5 bg-slate-950/45'}`}><span className="flex justify-between gap-2"><span className="truncate font-black text-slate-100">{entry.favorite ? '★ ' : ''}{entry.name}</span><span className={KIND_META[entry.kind].color}>{KIND_META[entry.kind].icon}</span></span><span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{entry.kind} • {entry.status ?? 'Draft'}{entry.folder ? ` • ${entry.folder}` : ''}</span></button>)}{entries.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">No Vault content matches these filters.</p>}</div>
      <details className="mt-6 rounded-xl border border-white/5 bg-slate-950/45 p-3"><summary className="cursor-pointer text-xs font-black text-slate-300">Specialized builders</summary><div className="mt-3 grid gap-2"><button type="button" onClick={onCreateMonster} className="rounded-lg bg-emerald-950/50 p-3 text-left text-xs font-bold text-emerald-200">Create custom monster →</button><button type="button" onClick={onCreateItem} className="rounded-lg bg-amber-950/50 p-3 text-left text-xs font-bold text-amber-200">Open legacy item creator →</button></div></details>
    </aside>
    <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">{!draft ? <VaultDashboard entries={campaignData.vaultEntries} monsters={campaignData.customMonsters} sourceMonsters={sourceMonsters} customEquipment={campaignData.customEquipment} publishedEquipment={publishedEquipment} spells={spellOptions} maneuvers={maneuverTemplates} onCreate={beginCreate} onSelect={select} onEquipmentTemplate={(item) => beginFromTemplate(vaultEntryFromEquipment(item))} onSpellTemplate={(spell) => beginFromTemplate(vaultEntryFromSpell(spell))} onManeuverTemplate={(maneuver) => beginFromTemplate(vaultEntryFromManeuver(maneuver))} onMonsterTemplate={duplicateMonster} onOpenMonster={onOpenMonster} onOpenItem={onOpenItem} onDuplicateMonster={duplicateMonster} /> : <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase text-fuchsia-200">🔒 Private</span><span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{draft.kind}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-400">v{draft.version ?? 1}</span>{isNew && <span className="text-xs font-bold text-amber-300">Unsaved</span>}</div><h2 className="mt-2 text-3xl font-black text-white">{draft.name || 'Untitled'}</h2><p className="mt-1 text-sm text-slate-500">{KIND_META[draft.kind].description}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setDraft(null); setSelectedID(null); setIsNew(false); }} className="rounded-lg px-3 py-2 text-xs font-black text-slate-300">Dashboard</button><button type="button" onClick={duplicate} className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs font-black text-sky-200">Duplicate</button><button type="button" onClick={remove} disabled={isNew} className="rounded-lg px-3 py-2 text-xs font-black text-red-300 disabled:opacity-30">Delete</button><button type="button" disabled={!draft.name.trim()} onClick={save} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white disabled:opacity-35">Save to Vault</button></div></header>{notice && <p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100">{notice}</p>}{validationIssues.length > 0 && <details className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3"><summary className="cursor-pointer text-sm font-black text-amber-100">Publishing preflight • {validationIssues.length} item{validationIssues.length === 1 ? '' : 's'} to finish</summary><ul className="mt-2 list-disc pl-5 text-xs leading-5 text-amber-200">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></details>}
      <section className={panel}><h3 className="text-lg font-black text-white">Identity & Description</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={label}>Name<input value={draft.name} onChange={(event) => change({ name: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Tags<input value={draft.tags.join(', ')} onChange={(event) => change({ tags: commaList(event.target.value) })} className={`${field} mt-1`} placeholder="reward, fire, secret…" /></label></div><VaultOrganizationFields entry={draft} folders={folders} onChange={change} /><label className={`${label} mt-4`}>Short summary<input value={draft.summary} onChange={(event) => change({ summary: event.target.value })} className={`${field} mt-1`} /></label><label className={`${label} mt-4`}>{draft.companion ? 'Unique features and bond rules' : 'Full rules text'}<textarea value={draft.description} onChange={(event) => change({ description: event.target.value })} rows={8} className={`${field} mt-1 resize-y`} /></label></section>

      {draft.item && <section className={`${panel} border-amber-400/15`}><h3 className="text-lg font-black text-amber-100">Magic Item Configuration</h3><p className="mt-1 text-xs text-slate-500">Accepted items enter inventory unequipped. Bonuses and connected spells activate while equipped and, when selected, attuned.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Category<select value={draft.item.category} onChange={(event) => setItem({ category: event.target.value as EquipmentCategory })} className={`${field} mt-1`}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Subtype<input value={draft.item.subtype} onChange={(event) => setItem({ subtype: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Slot<select value={draft.item.slot} onChange={(event) => setItem({ slot: event.target.value as EquipmentSlot })} className={`${field} mt-1`}>{Object.values(EquipmentSlotValues).map((value) => <option key={value}>{value}</option>)}</select></label><NumberField title="Charges / Uses" value={draft.item.charges} min={0} onChange={(charges) => setItem({ charges: Math.max(0, charges) || undefined })} /></div><label className={`${label} mt-4`}>Properties<input value={draft.item.properties.join(', ')} onChange={(event) => setItem({ properties: commaList(event.target.value) })} className={`${field} mt-1`} /></label><div className="mt-4"><SpellGrantPicker title="Granted Spells" options={spellOptions} selected={selectedGrantedSpells} onChange={setGrantedSpells} /></div><label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-950/40 p-3 text-sm font-bold text-slate-200"><input type="checkbox" checked={Boolean(draft.item.requiresAttunement)} onChange={(event) => setItem({ requiresAttunement: event.target.checked })} />Requires Attunement before bonuses and spells activate</label>{spellsLoading && <p className="mt-3 text-xs text-slate-500">Loading the published spell catalog…</p>}{spellsError && <p className="mt-3 text-xs text-red-300">{spellsError}</p>}</section>}

      {draft.spell && <section className={`${panel} border-cyan-400/15`}><h3 className="text-lg font-black text-cyan-100">Spell Configuration</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>School<input value={draft.spell.school} onChange={(event) => setSpell({ school: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Resolution<select value={draft.spell.resolution ?? 'None'} onChange={(event) => setSpell({ resolution: event.target.value as PowerResolution })} className={`${field} mt-1`}>{RESOLUTIONS.map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Cost<input value={draft.spell.cost ?? ''} onChange={(event) => setSpell({ cost: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Range<input value={draft.spell.range} onChange={(event) => setSpell({ range: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Duration<input value={draft.spell.duration} onChange={(event) => setSpell({ duration: event.target.value })} className={`${field} mt-1`} /></label><label className={`${label} sm:col-span-2 lg:col-span-3`}>Spell tags<input value={draft.spell.tags ?? ''} onChange={(event) => setSpell({ tags: event.target.value })} className={`${field} mt-1`} /></label></div><label className={`${label} mt-4`}>Enhancements<textarea value={draft.spell.enhancements ?? ''} onChange={(event) => setSpell({ enhancements: event.target.value })} rows={6} className={`${field} mt-1 resize-y`} /></label></section>}

      {draft.maneuver && <section className={`${panel} border-orange-400/15`}><h3 className="text-lg font-black text-orange-100">Maneuver Configuration</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Category<select value={draft.maneuver.category ?? 'Utility'} onChange={(event) => setManeuver({ category: event.target.value, type: event.target.value })} className={`${field} mt-1`}><option>Attack</option><option>Defense</option><option>Grapple</option><option>Utility</option><option>Custom</option></select></label><label className={label}>Resolution<select value={draft.maneuver.resolution ?? 'None'} onChange={(event) => setManeuver({ resolution: event.target.value as PowerResolution })} className={`${field} mt-1`}>{RESOLUTIONS.map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Cost<input value={draft.maneuver.cost ?? ''} onChange={(event) => setManeuver({ cost: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Range<input value={draft.maneuver.range} onChange={(event) => setManeuver({ range: event.target.value })} className={`${field} mt-1`} /></label><label className={`${label} sm:col-span-2 lg:col-span-4`}>Requirements<input value={draft.maneuver.requirements ?? ''} onChange={(event) => setManeuver({ requirements: event.target.value })} className={`${field} mt-1`} /></label></div><label className={`${label} mt-4`}>Enhancements<textarea value={draft.maneuver.enhancements ?? ''} onChange={(event) => setManeuver({ enhancements: event.target.value })} rows={6} className={`${field} mt-1 resize-y`} /></label></section>}

      {draft.companion && <CompanionBuilder companion={draft.companion} spellOptions={spellOptions} onChange={setCompanion} />}

      {(draft.kind === VaultContentKindValues.FEATURE || draft.kind === VaultContentKindValues.TALENT) && <section className={`${panel} border-fuchsia-400/15`}><h3 className="text-lg font-black text-fuchsia-100">Uses & Granted Spells</h3><p className="mt-1 text-xs text-slate-500">Accepted characters receive a charge tracker in Features. Connected spells appear in Spells & Maneuvers while this entry remains on the sheet.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField title="Maximum Charges / Uses" value={draft.charges} min={0} onChange={(charges) => change({ charges: Math.max(0, charges) || undefined, remainingCharges: Math.max(0, charges) || undefined })} /><label className={label}>Recharge<select value={draft.recharge ?? 'Long Rest'} disabled={!draft.charges} onChange={(event) => change({ recharge: event.target.value as VaultRecharge })} className={`${field} mt-1 disabled:opacity-40`}>{RECHARGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div><div className="mt-4"><SpellGrantPicker title="Connected Spells" options={spellOptions} selected={selectedGrantedSpells} onChange={setGrantedSpells} /></div>{spellsLoading && <p className="mt-3 text-xs text-slate-500">Loading the published spell catalog…</p>}{spellsError && <p className="mt-3 text-xs text-red-300">{spellsError}</p>}</section>}

      {!draft.companion && <section className={`${panel} border-violet-400/15`}><h3 className="text-lg font-black text-violet-100">Mechanical Effects</h3><p className="mt-1 text-xs text-slate-500">Items apply while equipped or attuned. Talents, Features, and Other entries apply while on the sheet. Spell and Maneuver effects remain attached to their custom power record.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{NUMERIC_EFFECTS.map(([key, title]) => <NumberField key={key} title={title} value={draft.effects[key] as number | undefined} onChange={(value) => setEffect(key, value)} />)}{ATTRIBUTES.map((attribute) => <NumberField key={`attribute-${attribute}`} title={`${attribute} Attribute`} value={draft.effects.attributeBonuses?.[attribute]} onChange={(value) => setEffect('attributeBonuses', { ...draft.effects.attributeBonuses, [attribute]: value })} />)}{ATTRIBUTES.map((attribute) => <NumberField key={`save-${attribute}`} title={`${attribute} Save`} value={draft.effects.saveBonuses?.[attribute]} onChange={(value) => setEffect('saveBonuses', { ...draft.effects.saveBonuses, [attribute]: value })} />)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><NamedBonuses title="Skill Bonuses" values={draft.effects.skillBonuses ?? {}} onChange={(values) => setEffect('skillBonuses', values)} placeholder="Athletics" /><NamedBonuses title="Trade Bonuses" values={draft.effects.tradeBonuses ?? {}} onChange={(values) => setEffect('tradeBonuses', values)} placeholder="Alchemy" /></div>{vaultEffectSummary(draft.effects).length > 0 && <div className="mt-5 flex flex-wrap gap-2">{vaultEffectSummary(draft.effects).map((effect) => <span key={effect} className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">{effect}</span>)}</div>}</section>}

      {!draft.companion && <VaultAdvancedEffects entry={draft} onChange={change} onEffect={setEffect} />}

      <VaultLinks entry={draft} options={campaignData.vaultEntries} onChange={(linkedEntryIDs) => change({ linkedEntryIDs })} />

      <section className={panel}><h3 className="text-lg font-black text-white">Eligibility</h3><p className="mt-1 text-xs text-slate-500">A campaign character must meet these requirements before accepting the entry.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><NumberField title="Minimum Level" value={draft.requirements.minimumLevel} min={0} onChange={(minimumLevel) => change({ requirements: { ...draft.requirements, minimumLevel: Math.max(0, minimumLevel) } })} /><label className={label}>Allowed Classes<input value={(draft.requirements.classes ?? []).join(', ')} onChange={(event) => change({ requirements: { ...draft.requirements, classes: commaList(event.target.value) } })} className={`${field} mt-1`} /></label><label className={label}>Allowed Ancestries<input value={(draft.requirements.ancestries ?? []).join(', ')} onChange={(event) => change({ requirements: { ...draft.requirements, ancestries: commaList(event.target.value) } })} className={`${field} mt-1`} /></label><label className={label}>Requirement Notes<input value={draft.requirements.notes ?? ''} onChange={(event) => change({ requirements: { ...draft.requirements, notes: event.target.value } })} className={`${field} mt-1`} /></label></div></section>
      <VaultHistory entry={draft} onRestore={restore} />
      <VaultCampaignDistribution entry={draft} parties={gmParties} sharingPartyID={sharing} disabled={isNew || validationIssues.length > 0} onPublish={(partyId, distribution) => void share(partyId, true, distribution)} onUnshare={(partyId) => void share(partyId, false)} />
    </div>}</main>
  </div>;
}
