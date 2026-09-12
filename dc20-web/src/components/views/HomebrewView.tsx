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
  Spell,
  VaultContentKind,
  VaultMechanicalEffects,
  VaultRecharge,
} from '../../types/models';
import { EquipmentCategoryValues, EquipmentSlotValues, VaultContentKindValues } from '../../types/models';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { companionDefaultsForKind, COMPANION_KIND_META } from '../../utils/companionRules';
import { generateUUID, sortByName } from '../../utils/gameUtils';
import type { PowerResolution } from '../../utils/powerRules';
import { createVaultEntry, prepareVaultEntry, vaultEffectSummary } from '../../utils/vaultRules';

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
    const next = { ...values };
    delete next[oldName];
    if (name.trim() && amount) next[name.trim()] = amount;
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
  const { campaignData, addVaultEntry, updateVaultEntry, removeVaultEntry } = useCampaignStore();
  const partyHub = usePartyCampaigns();
  const { spells: publishedSpellReferences, isLoading: spellsLoading, error: spellsError } = usePowerCatalog();
  const [filter, setFilter] = useState<VaultContentKind | 'All'>('All');
  const [selectedID, setSelectedID] = useState<string | null>(campaignData.vaultEntries[0]?.id ?? null);
  const [draft, setDraft] = useState<GmVaultEntry | null>(campaignData.vaultEntries[0] ?? null);
  const [isNew, setIsNew] = useState(false);
  const [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState('');
  const entries = useMemo(() => campaignData.vaultEntries.filter(({ kind }) => filter === 'All' || kind === filter), [campaignData.vaultEntries, filter]);
  const spellOptions = useMemo(() => {
    const published: Spell[] = publishedSpellReferences.map((spell) => ({ id: `published-spell-${spell.name}`, ...spell }));
    const custom = campaignData.vaultEntries.flatMap(({ spell }) => spell ? [{ ...spell }] : []);
    const byName = new Map<string, Spell>();
    for (const spell of [...published, ...custom]) byName.set(spell.name, spell);
    return sortByName([...byName.values()]);
  }, [campaignData.vaultEntries, publishedSpellReferences]);
  const gmParties = partyHub.parties.filter(({ role }) => role === 'gm');

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
    const prepared = prepareVaultEntry(draft);
    if (isNew) addVaultEntry(prepared);
    else updateVaultEntry(prepared);
    setDraft(prepared);
    setIsNew(false);
    setNotice(`${prepared.name} saved privately to your GM Vault.`);
  };
  const remove = () => {
    if (!draft || isNew || !window.confirm(`Delete “${draft.name}” from your private Vault? Copies already accepted by characters remain.`)) return;
    removeVaultEntry(draft.id);
    setSelectedID(null);
    setDraft(null);
  };
  const share = async (partyId: string, shouldShare: boolean) => {
    if (!draft || isNew) return;
    setSharing(partyId);
    setNotice('');
    try {
      if (shouldShare) await partyHub.shareVaultEntry(partyId, prepareVaultEntry(draft));
      else await partyHub.removeSharedVaultEntry(partyId, draft.id);
      setNotice(`${draft.name} ${shouldShare ? 'shared with' : 'removed from'} ${gmParties.find(({ id }) => id === partyId)?.name ?? 'campaign'}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The campaign Vault could not be updated.');
    } finally {
      setSharing('');
    }
  };

  return <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(88,28,135,0.18),transparent_38%)] lg:h-full lg:flex-row lg:overflow-hidden">
    <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-[22rem] lg:overflow-y-auto lg:border-b-0 lg:border-r"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Private workshop</p><h1 className="mt-1 text-3xl font-black text-white">GM Vault</h1><p className="mt-2 text-sm leading-6 text-slate-400">Create private rewards and rules content. Nothing leaves your account until you share it with a group campaign.</p><div className="mt-5 grid grid-cols-2 gap-2">{Object.values(VaultContentKindValues).map((kind) => <button type="button" key={kind} onClick={() => beginCreate(kind)} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left text-xs font-black text-slate-200 hover:border-violet-400/35"><span className="mr-2">{KIND_META[kind].icon}</span>{kind === VaultContentKindValues.COMPANION ? 'Companion' : kind}</button>)}</div><select value={filter} onChange={(event) => setFilter(event.target.value as VaultContentKind | 'All')} className={`${field} mt-5`} aria-label="Filter Vault content"><option>All</option>{Object.values(VaultContentKindValues).map((kind) => <option key={kind}>{kind}</option>)}</select><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 lg:max-h-none">{entries.map((entry) => <button type="button" key={entry.id} onClick={() => select(entry)} className={`w-full rounded-xl border p-3 text-left ${selectedID === entry.id ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/5 bg-slate-950/45'}`}><span className="flex justify-between gap-2"><span className="truncate font-black text-slate-100">{entry.name}</span><span className={KIND_META[entry.kind].color}>{KIND_META[entry.kind].icon}</span></span><span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{entry.kind}</span></button>)}{entries.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">No Vault content in this category.</p>}</div><details className="mt-6 rounded-xl border border-white/5 bg-slate-950/45 p-3"><summary className="cursor-pointer text-xs font-black text-slate-300">Existing Homebrew Tools</summary><div className="mt-3 grid gap-2"><button type="button" onClick={onCreateMonster} className="rounded-lg bg-emerald-950/50 p-3 text-left text-xs font-bold text-emerald-200">Create custom monster →</button><button type="button" onClick={onCreateItem} className="rounded-lg bg-amber-950/50 p-3 text-left text-xs font-bold text-amber-200">Open legacy item creator →</button>{campaignData.customMonsters.slice(0, 3).map((monster) => <button type="button" key={monster.id} onClick={() => onOpenMonster(monster.id)} className="text-left text-xs text-slate-400">🐾 {monster.name}</button>)}{campaignData.customEquipment.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => onOpenItem(item.id)} className="text-left text-xs text-slate-400">🎒 {item.name}</button>)}</div></details></aside>
    <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">{!draft ? <div className="grid min-h-[60vh] place-items-center text-center"><div><div className="text-6xl">🔐</div><h2 className="mt-4 text-2xl font-black text-white">Your private creation space</h2><p className="mt-2 text-slate-400">Choose a content type to begin, or select an existing Vault entry.</p></div></div> : <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex gap-2"><span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase text-fuchsia-200">🔒 Private</span><span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{draft.kind}</span>{isNew && <span className="text-xs font-bold text-amber-300">Unsaved</span>}</div><h2 className="mt-2 text-3xl font-black text-white">{draft.name || 'Untitled'}</h2><p className="mt-1 text-sm text-slate-500">{KIND_META[draft.kind].description}</p></div><div className="flex gap-2"><button type="button" onClick={remove} disabled={isNew} className="rounded-lg px-3 py-2 text-xs font-black text-red-300 disabled:opacity-30">Delete</button><button type="button" disabled={!draft.name.trim()} onClick={save} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white disabled:opacity-35">Save to Vault</button></div></header>{notice && <p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100">{notice}</p>}
      <section className={panel}><h3 className="text-lg font-black text-white">Identity & Description</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={label}>Name<input value={draft.name} onChange={(event) => change({ name: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Tags<input value={draft.tags.join(', ')} onChange={(event) => change({ tags: commaList(event.target.value) })} className={`${field} mt-1`} placeholder="reward, fire, secret…" /></label></div><label className={`${label} mt-4`}>Short summary<input value={draft.summary} onChange={(event) => change({ summary: event.target.value })} className={`${field} mt-1`} /></label><label className={`${label} mt-4`}>{draft.companion ? 'Unique features and bond rules' : 'Full rules text'}<textarea value={draft.description} onChange={(event) => change({ description: event.target.value })} rows={8} className={`${field} mt-1 resize-y`} /></label></section>

      {draft.item && <section className={`${panel} border-amber-400/15`}><h3 className="text-lg font-black text-amber-100">Magic Item Configuration</h3><p className="mt-1 text-xs text-slate-500">Accepted items enter inventory unequipped. Bonuses and connected spells activate while equipped and, when selected, attuned.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Category<select value={draft.item.category} onChange={(event) => setItem({ category: event.target.value as EquipmentCategory })} className={`${field} mt-1`}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Subtype<input value={draft.item.subtype} onChange={(event) => setItem({ subtype: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Slot<select value={draft.item.slot} onChange={(event) => setItem({ slot: event.target.value as EquipmentSlot })} className={`${field} mt-1`}>{Object.values(EquipmentSlotValues).map((value) => <option key={value}>{value}</option>)}</select></label><NumberField title="Charges / Uses" value={draft.item.charges} min={0} onChange={(charges) => setItem({ charges: Math.max(0, charges) || undefined })} /></div><label className={`${label} mt-4`}>Properties<input value={draft.item.properties.join(', ')} onChange={(event) => setItem({ properties: commaList(event.target.value) })} className={`${field} mt-1`} /></label><div className="mt-4"><SpellGrantPicker title="Granted Spells" options={spellOptions} selected={selectedGrantedSpells} onChange={setGrantedSpells} /></div><label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-950/40 p-3 text-sm font-bold text-slate-200"><input type="checkbox" checked={Boolean(draft.item.requiresAttunement)} onChange={(event) => setItem({ requiresAttunement: event.target.checked })} />Requires Attunement before bonuses and spells activate</label>{spellsLoading && <p className="mt-3 text-xs text-slate-500">Loading the published spell catalog…</p>}{spellsError && <p className="mt-3 text-xs text-red-300">{spellsError}</p>}</section>}

      {draft.spell && <section className={`${panel} border-cyan-400/15`}><h3 className="text-lg font-black text-cyan-100">Spell Configuration</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>School<input value={draft.spell.school} onChange={(event) => setSpell({ school: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Resolution<select value={draft.spell.resolution ?? 'None'} onChange={(event) => setSpell({ resolution: event.target.value as PowerResolution })} className={`${field} mt-1`}>{RESOLUTIONS.map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Cost<input value={draft.spell.cost ?? ''} onChange={(event) => setSpell({ cost: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Range<input value={draft.spell.range} onChange={(event) => setSpell({ range: event.target.value })} className={`${field} mt-1`} /></label><label className={label}>Duration<input value={draft.spell.duration} onChange={(event) => setSpell({ duration: event.target.value })} className={`${field} mt-1`} /></label><label className={`${label} sm:col-span-2 lg:col-span-3`}>Spell tags<input value={draft.spell.tags ?? ''} onChange={(event) => setSpell({ tags: event.target.value })} className={`${field} mt-1`} /></label></div><label className={`${label} mt-4`}>Enhancements<textarea value={draft.spell.enhancements ?? ''} onChange={(event) => setSpell({ enhancements: event.target.value })} rows={6} className={`${field} mt-1 resize-y`} /></label></section>}

      {draft.companion && <CompanionBuilder companion={draft.companion} spellOptions={spellOptions} onChange={setCompanion} />}

      {(draft.kind === VaultContentKindValues.FEATURE || draft.kind === VaultContentKindValues.TALENT) && <section className={`${panel} border-fuchsia-400/15`}><h3 className="text-lg font-black text-fuchsia-100">Uses & Granted Spells</h3><p className="mt-1 text-xs text-slate-500">Accepted characters receive a charge tracker in Features. Connected spells appear in Spells & Maneuvers while this entry remains on the sheet.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField title="Maximum Charges / Uses" value={draft.charges} min={0} onChange={(charges) => change({ charges: Math.max(0, charges) || undefined, remainingCharges: Math.max(0, charges) || undefined })} /><label className={label}>Recharge<select value={draft.recharge ?? 'Long Rest'} disabled={!draft.charges} onChange={(event) => change({ recharge: event.target.value as VaultRecharge })} className={`${field} mt-1 disabled:opacity-40`}>{RECHARGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div><div className="mt-4"><SpellGrantPicker title="Connected Spells" options={spellOptions} selected={selectedGrantedSpells} onChange={setGrantedSpells} /></div>{spellsLoading && <p className="mt-3 text-xs text-slate-500">Loading the published spell catalog…</p>}{spellsError && <p className="mt-3 text-xs text-red-300">{spellsError}</p>}</section>}

      {!draft.companion && !draft.spell && <section className={`${panel} border-violet-400/15`}><h3 className="text-lg font-black text-violet-100">Mechanical Effects</h3><p className="mt-1 text-xs text-slate-500">Items apply while equipped or attuned. Talents, Features, and Other entries apply while on the sheet.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{NUMERIC_EFFECTS.map(([key, title]) => <NumberField key={key} title={title} value={draft.effects[key] as number | undefined} onChange={(value) => setEffect(key, value)} />)}{ATTRIBUTES.map((attribute) => <NumberField key={`attribute-${attribute}`} title={`${attribute} Attribute`} value={draft.effects.attributeBonuses?.[attribute]} onChange={(value) => setEffect('attributeBonuses', { ...draft.effects.attributeBonuses, [attribute]: value })} />)}{ATTRIBUTES.map((attribute) => <NumberField key={`save-${attribute}`} title={`${attribute} Save`} value={draft.effects.saveBonuses?.[attribute]} onChange={(value) => setEffect('saveBonuses', { ...draft.effects.saveBonuses, [attribute]: value })} />)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><NamedBonuses title="Skill Bonuses" values={draft.effects.skillBonuses ?? {}} onChange={(values) => setEffect('skillBonuses', values)} placeholder="Athletics" /><NamedBonuses title="Trade Bonuses" values={draft.effects.tradeBonuses ?? {}} onChange={(values) => setEffect('tradeBonuses', values)} placeholder="Alchemy" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className={label}>Resistances<input value={(draft.effects.resistances ?? []).join(', ')} onChange={(event) => setEffect('resistances', commaList(event.target.value))} className={`${field} mt-1`} /></label><label className={label}>Immunities<input value={(draft.effects.immunities ?? []).join(', ')} onChange={(event) => setEffect('immunities', commaList(event.target.value))} className={`${field} mt-1`} /></label><label className={label}>Senses<input value={(draft.effects.senses ?? []).join(', ')} onChange={(event) => setEffect('senses', commaList(event.target.value))} className={`${field} mt-1`} /></label><label className={label}>Conditional reminders<input value={(draft.effects.conditionalRules ?? []).join(', ')} onChange={(event) => setEffect('conditionalRules', commaList(event.target.value))} className={`${field} mt-1`} /></label></div>{vaultEffectSummary(draft.effects).length > 0 && <div className="mt-5 flex flex-wrap gap-2">{vaultEffectSummary(draft.effects).map((effect) => <span key={effect} className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">{effect}</span>)}</div>}</section>}

      <section className={panel}><h3 className="text-lg font-black text-white">Eligibility</h3><p className="mt-1 text-xs text-slate-500">A campaign character must meet these requirements before accepting the entry.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><NumberField title="Minimum Level" value={draft.requirements.minimumLevel} min={0} onChange={(minimumLevel) => change({ requirements: { ...draft.requirements, minimumLevel: Math.max(0, minimumLevel) } })} /><label className={label}>Allowed Classes<input value={(draft.requirements.classes ?? []).join(', ')} onChange={(event) => change({ requirements: { ...draft.requirements, classes: commaList(event.target.value) } })} className={`${field} mt-1`} /></label><label className={label}>Allowed Ancestries<input value={(draft.requirements.ancestries ?? []).join(', ')} onChange={(event) => change({ requirements: { ...draft.requirements, ancestries: commaList(event.target.value) } })} className={`${field} mt-1`} /></label><label className={label}>Requirement Notes<input value={draft.requirements.notes ?? ''} onChange={(event) => change({ requirements: { ...draft.requirements, notes: event.target.value } })} className={`${field} mt-1`} /></label></div></section>
      <section className={`${panel} border-emerald-400/15`}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-black text-emerald-100">Share with Campaigns</h3><p className="mt-1 text-xs text-slate-500">Sharing publishes a read-only copy. Share again to publish later edits.</p></div>{isNew && <span className="text-xs font-bold text-amber-200">Save first</span>}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{gmParties.map((party) => { const isShared = party.vaultEntries.some(({ id }) => id === draft.id); return <div key={party.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/45 p-3"><span><span className="block font-black text-slate-200">{party.name}</span><span className="text-xs text-slate-500">{isShared ? 'Available to members' : 'Private'}</span></span><button type="button" disabled={isNew || sharing === party.id} onClick={() => void share(party.id, !isShared)} className={`rounded-lg px-3 py-2 text-xs font-black disabled:opacity-35 ${isShared ? 'bg-slate-800 text-red-200' : 'bg-emerald-700 text-white'}`}>{sharing === party.id ? 'Saving…' : isShared ? 'Unshare' : 'Share'}</button></div>; })}{gmParties.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500 md:col-span-2">Create a signed-in group campaign to share Vault content.</p>}</div></section>
    </div>}</main>
  </div>;
}
