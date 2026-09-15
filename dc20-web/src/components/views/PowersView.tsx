import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PowerRulesText } from '../powers/PowerRulesText';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import type { ContentFocusRequest } from '../../navigation/appNavigation';
import { ExplicitRuleLink, RuleAwareText } from '../rules/RuleAwareText';
import { resolveRuleAlias } from '../../rules/ruleRegistry';
import { useRulesCrossLink } from '../../rules/useRulesCrossLink';
import { useCampaignStore } from '../../store/campaignStore';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import type {
  Character,
  CombatConditionEffect,
  GmVaultEntry,
  Maneuver,
  PartyCampaignSnapshot,
  SavedCombat,
  Spell,
} from '../../types/models';
import { equippedCombatModifiers } from '../../utils/characterRules';
import { addVaultEntryToCharacter } from '../../utils/vaultRules';
import { generateUUID, rollD20WithAdjustment, sortByName } from '../../utils/gameUtils';
import { isPowerAttack, powerResolutionLabel } from '../../utils/powerRules';
import {
  addPowerCosts,
  detectedPowerConditions,
  parsePowerResourceCost,
  powerAccessForCharacter,
  powerDurationBucket,
  powerEnhancementOptions,
  powerRangeBucket,
  powerResolution,
  powerResourceKinds,
  type PowerAccessResult,
  type PowerAccessState,
  type PowerLibraryKind,
  type PowerLibraryOrigin,
  type PowerResourceCost,
} from '../../utils/powerLibraryRules';

/* Navigation requests intentionally synchronize this view's local filters and selection. */
/* oxlint-disable react/set-state-in-effect */

interface PowerProvenance {
  sourceDocument: string;
  sourcePage: string;
  status: 'Beta source verified' | 'Private custom content' | 'Campaign-shared copy';
  note?: string;
}

type PowerDocument =
  | { id: string; kind: 'Spell'; name: string; group: string; origin: PowerLibraryOrigin; spell: Spell; provenance: PowerProvenance; vaultEntry?: GmVaultEntry; party?: PartyCampaignSnapshot }
  | { id: string; kind: 'Maneuver'; name: string; group: string; origin: PowerLibraryOrigin; maneuver: Maneuver; provenance: PowerProvenance; vaultEntry?: GmVaultEntry; party?: PartyCampaignSnapshot };

interface TableModifiers {
  spellCheck: number;
  spellAttack: number;
  martialCheck: number;
  adjustment: number;
  spellDamage: number;
}

const RANGE_BUCKETS = ['All', 'Self', 'Melee / 1 Space', '2–10 Spaces', '11+ Spaces', 'Special'] as const;
const DURATION_BUCKETS = ['All', 'Instant', 'Round', 'Minute+', 'Sustained', 'Special'] as const;
const RESOURCE_FILTERS = ['All', 'Free', 'AP', 'MP', 'SP', 'Variable'] as const;
const ACCESS_FILTERS: Array<'All' | PowerAccessState> = ['All', 'Known', 'Granted', 'Available', 'Locked'];
const EMPTY_MODIFIERS: TableModifiers = { spellCheck: 0, spellAttack: 0, martialCheck: 0, adjustment: 0, spellDamage: 0 };

function canonicalID(kind: PowerLibraryKind, name: string): string {
  return `official-${kind.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function SpellTag({ tag }: { tag: string }) {
  const { registry } = useRulesCrossLink();
  return registry && resolveRuleAlias(registry, tag, true)
    ? <RuleAwareText text={tag} />
    : <ExplicitRuleLink ruleID="spell.tags">{tag}</ExplicitRuleLink>;
}

function valueFor(item: PowerDocument): Spell | Maneuver {
  return item.kind === 'Spell' ? item.spell : item.maneuver;
}

function accessTone(state: PowerAccessState): string {
  if (state === 'Known') return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
  if (state === 'Granted') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  if (state === 'Available') return 'border-violet-400/25 bg-violet-500/10 text-violet-100';
  if (state === 'Locked') return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-slate-300';
}

function provenanceTone(status: PowerProvenance['status']): string {
  if (status === 'Beta source verified') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  if (status === 'Private custom content') return 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100';
  return 'border-sky-400/20 bg-sky-500/10 text-sky-100';
}

function costLabel(cost: PowerResourceCost): string {
  return [
    cost.actionPoints ? `${cost.actionPoints} AP` : '',
    cost.manaPoints ? `${cost.manaPoints} MP` : '',
    cost.staminaPoints ? `${cost.staminaPoints} SP` : '',
  ].filter(Boolean).join(' + ') || 'No tracked resource cost';
}

function ToggleChips({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return <fieldset><legend className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{title}</legend><div className="flex flex-wrap gap-2">{options.map((option) => {
    const active = selected.includes(option);
    return <button type="button" key={option} aria-pressed={active} onClick={() => onToggle(option)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-slate-950/45 text-slate-400 hover:border-violet-400/30'}`}>{option}</button>;
  })}</div></fieldset>;
}

function EnhancementPlanner({ item, quantities, payments, onQuantity, onPayment }: {
  item: PowerDocument;
  quantities: Record<string, number>;
  payments: Record<string, number>;
  onQuantity: (id: string, value: number) => void;
  onPayment: (id: string, value: number) => void;
}) {
  const enhancements = powerEnhancementOptions(valueFor(item).enhancements ?? '');
  if (enhancements.length === 0) return null;
  return <section className="mt-8 rounded-2xl border border-fuchsia-400/15 bg-slate-950/45 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Optional casting build</p><h2 className="mt-1 text-xl font-black text-white">Enhancements</h2><p className="mt-1 text-xs leading-5 text-slate-500">Select enhancements to calculate this use. The complete published wording remains inside every card.</p></div><button type="button" onClick={() => enhancements.forEach(({ id }) => onQuantity(id, 0))} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-slate-300">Clear selections</button></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{enhancements.map((enhancement) => {
    const quantity = quantities[enhancement.id] ?? 0;
    const payment = payments[enhancement.id] ?? 0;
    const variable = enhancement.variable || enhancement.repeatable;
    return <details key={enhancement.id} className={`group rounded-xl border p-3 ${quantity > 0 ? 'border-fuchsia-400/45 bg-fuchsia-500/10' : 'border-white/10 bg-slate-950/50'}`}><summary className="flex cursor-pointer list-none items-start justify-between gap-3"><span><span className="font-black text-slate-100">{enhancement.name}</span><span className="mt-1 block text-xs text-fuchsia-200">({enhancement.costText})</span></span><span className="text-xs font-black text-violet-300"><span className="group-open:hidden">More</span><span className="hidden group-open:inline">Less</span></span></summary><div className="mt-3 border-t border-white/5 pt-3"><div className="mb-3 flex flex-wrap items-center gap-2"><button type="button" aria-pressed={quantity > 0} onClick={() => onQuantity(enhancement.id, quantity > 0 ? 0 : 1)} className={`rounded-lg px-3 py-2 text-xs font-black ${quantity > 0 ? 'bg-fuchsia-700 text-white' : 'bg-slate-800 text-slate-300'}`}>{quantity > 0 ? 'Selected' : 'Add to use'}</button>{quantity > 0 && variable && <span className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-1"><button type="button" onClick={() => onQuantity(enhancement.id, Math.max(0, quantity - 1))} className="h-7 w-7 rounded bg-slate-800 font-black">−</button><span className="min-w-20 text-center text-xs font-black text-fuchsia-100">{enhancement.variable ? `X = ${quantity}` : `Uses ${quantity}`}</span><button type="button" onClick={() => onQuantity(enhancement.id, quantity + 1)} className="h-7 w-7 rounded bg-fuchsia-700 font-black">+</button></span>}{quantity > 0 && enhancement.paymentOptions.length > 1 && <select aria-label={`Payment for ${enhancement.name}`} value={payment} onChange={(event) => onPayment(enhancement.id, Number(event.target.value))} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200">{enhancement.paymentOptions.map((option, index) => <option key={option} value={index}>Pay {option}</option>)}</select>}</div>{enhancement.requirements.length > 0 && <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">{enhancement.requirements.join(' • ')}</p>}<PowerRulesText text={enhancement.description || `${enhancement.name}: (${enhancement.costText})`} enhancements /></div></details>;
  })}</div></section>;
}

function combatHistory(combat: SavedCombat, text: string, kind: 'Resource' | 'Damage' | 'Healing' | 'Condition' = 'Resource') {
  return [...(combat.history ?? []), { id: generateUUID(), timestamp: new Date().toISOString(), round: combat.round, kind, text, private: false }];
}

function CombatOutcomeControls({ item, combat, onUpdate }: { item: PowerDocument; combat: SavedCombat; onUpdate: (combat: SavedCombat) => void }) {
  const power = valueFor(item);
  const conditions = detectedPowerConditions(`${power.description}\n${power.enhancements ?? ''}`);
  const [targetID, setTargetID] = useState(combat.activeCombatantID ?? combat.combatants[0]?.id ?? '');
  const [amount, setAmount] = useState(1);
  const target = combat.combatants.find(({ id }) => id === targetID);
  const adjustHP = (mode: 'Damage' | 'Healing') => {
    if (!target || amount < 1) return;
    const hp = mode === 'Damage' ? Math.max(0, target.hp - amount) : Math.min(target.maxHP, target.hp + amount);
    onUpdate({ ...combat, combatants: combat.combatants.map((entry) => entry.id === target.id ? { ...entry, hp } : entry), history: combatHistory(combat, `${item.name} ${mode === 'Damage' ? `dealt ${amount} damage to` : `restored ${amount} HP to`} ${target.name}.`, mode) });
  };
  const applyCondition = (name: string) => {
    if (!target) return;
    const effect: CombatConditionEffect = { id: generateUUID(), name, level: 1, source: item.name, expiresAt: 'Manual', description: `Applied from ${item.name}. Consult the linked power wording for duration, Saves, and repeated effects.` };
    const activeConditions = [...(target.activeConditions ?? []), effect];
    onUpdate({ ...combat, combatants: combat.combatants.map((entry) => entry.id === target.id ? { ...entry, activeConditions, conditions: activeConditions.map(({ name: condition, level }) => `${condition}${level > 1 ? ` ${level}` : ''}`) } : entry), history: combatHistory(combat, `Applied ${name} from ${item.name} to ${target.name}.`, 'Condition') });
  };
  return <details className="mt-4 rounded-xl border border-orange-400/15 bg-orange-500/5 p-3"><summary className="cursor-pointer font-black text-orange-200">Resolve in {combat.name}</summary><p className="mt-2 text-xs leading-5 text-slate-500">Choose the target and confirm the result after resolving the complete power text. DC20 Hub will never infer a damage total or condition duration that the source leaves contextual.</p><div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto_auto]"><select value={targetID} onChange={(event) => setTargetID(event.target.value)} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">{combat.combatants.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} • {entry.hp}/{entry.maxHP} HP</option>)}</select><input type="number" min={1} value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value)))} aria-label="Damage or healing amount" className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200" /><button type="button" disabled={!target} onClick={() => adjustHP('Damage')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Damage</button><button type="button" disabled={!target} onClick={() => adjustHP('Healing')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Heal</button></div>{conditions.length > 0 && <div className="mt-3"><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Conditions named in this power</p><div className="flex flex-wrap gap-2">{conditions.map((condition) => <button type="button" key={condition} disabled={!target} onClick={() => applyCondition(condition)} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-35">Apply {condition}</button>)}</div></div>}</details>;
}

function PowerTableControls({ item, character, access, modifiers, quantities, payments, onCharacterChange, combat, onCombatChange }: {
  item: PowerDocument;
  character: Character | null;
  access: PowerAccessResult;
  modifiers: TableModifiers;
  quantities: Record<string, number>;
  payments: Record<string, number>;
  onCharacterChange: (character: Character) => void;
  combat: SavedCombat | null;
  onCombatChange: (combat: SavedCombat) => void;
}) {
  const power = valueFor(item);
  const options = powerEnhancementOptions(power.enhancements ?? '');
  const [baseVariable, setBaseVariable] = useState(1);
  const [costAdjustment, setCostAdjustment] = useState<PowerResourceCost>({ actionPoints: 0, manaPoints: 0, staminaPoints: 0 });
  const [rollNotice, setRollNotice] = useState('');
  const [recordInCombat, setRecordInCombat] = useState(Boolean(combat));
  const baseCost = parsePowerResourceCost(power.cost ?? '', baseVariable);
  const calculatedCost = options.reduce((total, option) => {
    const quantity = quantities[option.id] ?? 0;
    return quantity > 0 ? addPowerCosts(total, parsePowerResourceCost(option.costText, quantity, payments[option.id] ?? 0, option.repeatable)) : total;
  }, baseCost);
  const totalCost = {
    actionPoints: Math.max(0, calculatedCost.actionPoints + costAdjustment.actionPoints),
    manaPoints: Math.max(0, calculatedCost.manaPoints + costAdjustment.manaPoints),
    staminaPoints: Math.max(0, calculatedCost.staminaPoints + costAdjustment.staminaPoints),
  };
  const resolution = powerResolution(power);
  const canUse = Boolean(character && (access.state === 'Known' || access.state === 'Granted'));
  const enough = Boolean(character && character.currentAP >= totalCost.actionPoints && character.manaPoints >= totalCost.manaPoints && character.stamina >= totalCost.staminaPoints);
  const rollModifier = item.kind === 'Spell' ? (isPowerAttack(resolution) ? modifiers.spellAttack : modifiers.spellCheck) : modifiers.martialCheck;
  const adjustment = character ? modifiers.adjustment + (character.build?.rollAdjustment ?? 0) : 0;
  const sustainSelected = /Sustain/i.test(item.kind === 'Spell' ? item.spell.duration : '') || options.some((option) => (quantities[option.id] ?? 0) > 0 && option.sustained);
  const sustainKey = `power.sustain.${item.kind}.${item.name}`;
  const sustaining = Boolean(character?.build?.sheetFeatureStates?.[sustainKey]);
  const selectedLabels = options.filter((option) => (quantities[option.id] ?? 0) > 0).map((option) => `${option.name}${(quantities[option.id] ?? 0) > 1 ? ` ×${quantities[option.id]}` : ''}`);
  const conditionalCost = options.some((option) => (quantities[option.id] ?? 0) > 0 && /cost (?:of (?:this|all other) Enhancements? )?(?:increases|is doubled)|costs? an additional/i.test(option.description));
  const makeRoll = () => {
    if (resolution === 'None') return '';
    const outcome = rollD20WithAdjustment(adjustment);
    const total = outcome.chosen + rollModifier;
    const result = `${item.name} • ${powerResolutionLabel(resolution)}: ${outcome.rolls.join(', ')} → ${outcome.chosen} ${rollModifier >= 0 ? '+' : '−'} ${Math.abs(rollModifier)} = ${total}`;
    setRollNotice(result);
    return result;
  };
  const usePower = () => {
    if (!character || !canUse || !enough) return;
    const rollText = makeRoll();
    const nextBuild = character.build && sustainSelected ? { ...character.build, sheetFeatureStates: { ...character.build.sheetFeatureStates, [sustainKey]: true } } : character.build;
    const updated: Character = { ...character, currentAP: character.currentAP - totalCost.actionPoints, manaPoints: character.manaPoints - totalCost.manaPoints, stamina: character.stamina - totalCost.staminaPoints, build: nextBuild };
    onCharacterChange(updated);
    const summary = `${character.name} used ${item.name}${selectedLabels.length ? ` with ${selectedLabels.join(', ')}` : ''} (${costLabel(totalCost)})${rollText ? ` • ${rollText.split(': ').at(-1)}` : ''}.`;
    if (combat && recordInCombat) onCombatChange({ ...combat, combatants: combat.combatants.map((entry) => entry.sourceCharacterID === character.id ? { ...entry, ap: Math.max(0, entry.ap - totalCost.actionPoints), mana: Math.max(0, (entry.mana ?? character.manaPoints) - totalCost.manaPoints), stamina: Math.max(0, (entry.stamina ?? character.stamina) - totalCost.staminaPoints) } : entry), history: combatHistory(combat, summary) });
    if (resolution === 'None') setRollNotice(`${summary} Resolve the source text without a separate Check.`);
  };
  const endSustain = () => {
    if (!character?.build) return;
    const states = { ...character.build.sheetFeatureStates };
    delete states[sustainKey];
    onCharacterChange({ ...character, build: { ...character.build, sheetFeatureStates: states } });
  };
  if (!character) return <section className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4"><h2 className="font-black text-white">Table Controls</h2><p className="mt-2 text-sm text-slate-400">Choose a character above to calculate access, rolls, resources, and live-combat actions.</p></section>;
  return <section className="mt-6 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/25 to-slate-950/55 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Table-ready use</p><h2 className="mt-1 text-xl font-black text-white">{character.name}</h2><p className="mt-1 text-xs text-slate-500">AP {character.currentAP}/{character.maxAP} • MP {character.manaPoints}/{character.maxManaPoints} • SP {character.stamina}/{character.maxStamina}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${accessTone(access.state)}`}>{access.state}</span></div><p className="mt-3 rounded-lg bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-300">{access.reason}</p>{/\bX\s*(?:AP|MP|SP)\b/i.test(power.cost ?? '') && <label className="mt-3 block text-xs font-bold text-slate-300">Base cost X<input type="number" min={1} value={baseVariable} onChange={(event) => setBaseVariable(Math.max(1, Number(event.target.value)))} className="ml-3 w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" /></label>}<div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-slate-950/55 p-3"><span className="text-[10px] font-black uppercase text-slate-500">Total cost</span><strong className="mt-1 block text-violet-100">{costLabel(totalCost)}</strong></div><div className="rounded-xl bg-slate-950/55 p-3"><span className="text-[10px] font-black uppercase text-slate-500">Roll</span><strong className="mt-1 block text-violet-100">{powerResolutionLabel(resolution)}{resolution !== 'None' ? ` ${rollModifier >= 0 ? '+' : ''}${rollModifier}` : ''}</strong>{item.kind === 'Spell' && modifiers.spellDamage !== 0 && <span className="mt-1 block text-[10px] font-bold text-fuchsia-200">Spell damage {modifiers.spellDamage > 0 ? '+' : ''}{modifiers.spellDamage}</span>}</div><div className="rounded-xl bg-slate-950/55 p-3"><span className="text-[10px] font-black uppercase text-slate-500">Adjustment</span><strong className="mt-1 block text-violet-100">{adjustment > 0 ? `${adjustment}× ADV` : adjustment < 0 ? `${Math.abs(adjustment)}× DisADV` : 'Normal'}</strong></div></div><details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"><summary className="cursor-pointer text-xs font-black text-slate-300">Manual cost adjustment</summary><p className="mt-2 text-xs leading-5 text-slate-500">Use this for class features, items, or conditional enhancement wording that changes the printed cost.</p>{conditionalCost && <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">A selected enhancement has a conditional cost. Read its complete wording and enter the difference here before spending.</p>}<div className="mt-3 grid grid-cols-3 gap-2">{([['actionPoints', 'AP'], ['manaPoints', 'MP'], ['staminaPoints', 'SP']] as const).map(([key, label]) => <label key={key} className="text-[10px] font-black uppercase text-slate-500">{label}<input type="number" value={costAdjustment[key]} onChange={(event) => setCostAdjustment((current) => ({ ...current, [key]: Number(event.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center text-sm text-slate-100" /></label>)}</div></details>{combat && <label className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500/10 p-3 text-xs font-bold text-orange-100"><input type="checkbox" checked={recordInCombat} onChange={(event) => setRecordInCombat(event.target.checked)} />Record the use and spent resources in {combat.name}</label>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{resolution !== 'None' && <button type="button" disabled={!canUse} onClick={() => void makeRoll()} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Preview Roll</button>}<button type="button" disabled={!canUse || !enough} onClick={usePower} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{!canUse ? `${access.state}: cannot use` : !enough ? 'Insufficient resources' : `${resolution === 'None' ? 'Spend & Use' : 'Spend, Use & Roll'} • ${costLabel(totalCost)}`}</button></div>{rollNotice && <p role="status" className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-100">{rollNotice}</p>}{sustaining && <button type="button" onClick={endSustain} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">End Sustained {item.name}</button>}{combat && <CombatOutcomeControls key={combat.id} item={item} combat={combat} onUpdate={onCombatChange} />}</section>;
}

function PowerDetail({ item, character, access, modifiers, onCharacterChange, combat, onCombatChange, onAcceptVault, onBack }: {
  item: PowerDocument;
  character: Character | null;
  access: PowerAccessResult;
  modifiers: TableModifiers;
  onCharacterChange: (character: Character) => void;
  combat: SavedCombat | null;
  onCombatChange: (combat: SavedCombat) => void;
  onAcceptVault: () => void;
  onBack: () => void;
}) {
  const isSpell = item.kind === 'Spell';
  const details = valueFor(item);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Record<string, number>>({});
  const metadata = isSpell
    ? [['Spell source', item.spell.source], ['School', item.spell.school], ['Cost', item.spell.cost], ['Range', item.spell.range], ['Duration', item.spell.duration || 'Not listed'], ['Resolution', [powerResolutionLabel(powerResolution(item.spell)), ...(item.spell.alternateResolutions ?? [])].join(' • ')]]
    : [['Category', item.maneuver.category ?? item.maneuver.type ?? 'Custom'], ['Cost', item.maneuver.cost || 'Base Action'], ['Range', item.maneuver.range || 'Base Action'], ['Requirements', item.maneuver.requirements ?? 'None listed'], ['Resolution', [powerResolutionLabel(powerResolution(item.maneuver)), ...(item.maneuver.alternateResolutions ?? [])].join(' • ')]];
  return <article className="mx-auto max-w-5xl"><button type="button" onClick={onBack} className="sticky top-0 z-20 mb-4 w-full rounded-xl border border-violet-400/20 bg-slate-950/95 px-4 py-3 text-left text-sm font-black text-violet-200 shadow-xl backdrop-blur lg:hidden">← Back to {item.kind}s</button><div className="mb-6 border-b border-white/10 pb-6"><div className="flex flex-wrap items-center gap-2"><span className="theme-accent-text text-xs font-black uppercase tracking-[0.2em]">{item.kind} reference</span><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${provenanceTone(item.provenance.status)}`}>{item.origin}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${accessTone(access.state)}`}>{access.state}</span></div><h1 className="mt-2 break-words text-3xl font-black text-white sm:text-4xl">{item.name}</h1><p className="mt-2 text-slate-400">{item.group}</p><p className="mt-3 text-xs leading-5 text-slate-500">{access.reason}</p>{access.canAddVaultEntry && <button type="button" onClick={onAcceptVault} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-black text-white">Add to {character?.name}</button>}</div><section className={`mb-6 rounded-xl border p-4 ${provenanceTone(item.provenance.status)}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Source provenance</p><h2 className="mt-1 font-black">{item.provenance.sourceDocument}</h2><p className="mt-1 text-sm opacity-80">{item.provenance.sourcePage}</p></div><span className="rounded-full bg-black/15 px-3 py-1 text-[10px] font-black uppercase">{item.provenance.status}</span></div>{item.provenance.note && <p className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 opacity-85">{item.provenance.note}</p>}</section><dl className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metadata.filter(([, value]) => value).map(([label, value]) => { const text = String(value ?? ''); return <div key={label} className="rounded-xl border border-white/8 bg-slate-950/50 p-3"><dt className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-200">{isSpell && (label === 'Spell source' || label === 'School') ? <ExplicitRuleLink ruleID="spell.tags">{text}</ExplicitRuleLink> : !isSpell && label === 'Category' ? <ExplicitRuleLink ruleID="maneuver.rules">{text}</ExplicitRuleLink> : <RuleAwareText text={text} />}</dd></div>; })}</dl>{isSpell && item.spell.tags && <div className="mb-7 flex flex-wrap gap-2" aria-label="Spell tags">{item.spell.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => <span key={tag} className="rounded-full border border-fuchsia-400/15 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-100"><SpellTag tag={tag} /></span>)}</div>}{details.reaction && <p className="mb-5 rounded-lg border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-100">This power includes a Reaction timing option in its rules text.</p>}{details.sourceNote && <aside className="mb-5 rounded-lg border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-sm leading-6 text-sky-100"><strong className="font-black">Source note:</strong> {details.sourceNote}</aside>}<section><h2 className="mb-3 text-xl font-black text-white">Description</h2><PowerRulesText text={details.description} /></section><EnhancementPlanner item={item} quantities={quantities} payments={payments} onQuantity={(id, value) => setQuantities((current) => ({ ...current, [id]: value }))} onPayment={(id, value) => setPayments((current) => ({ ...current, [id]: value }))} /><PowerTableControls key={combat?.id ?? 'no-combat'} item={item} character={character} access={access} modifiers={modifiers} quantities={quantities} payments={payments} onCharacterChange={onCharacterChange} combat={combat} onCombatChange={onCombatChange} /></article>;
}

const PowersView: React.FC<{ focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void }> = ({ focusRequest, onFocusHandled }) => {
  const { spells, maneuvers, isLoading, error } = usePowerCatalog();
  const { reference, isLoading: referenceLoading } = useCharacterReference();
  const { equipment: publishedEquipment } = useEquipmentCatalog();
  const { characters, selectedCharacterId, selectedCombatId, campaignData, updateCharacter, updateCombat } = useCampaignStore();
  const partyHub = usePartyCampaigns();
  const [kind, setKind] = useState<PowerLibraryKind>('Spell');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [collection, setCollection] = useState<'All' | PowerLibraryOrigin>('All');
  const [sources, setSources] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<string[]>([]);
  const [resource, setResource] = useState<(typeof RESOURCE_FILTERS)[number]>('All');
  const [range, setRange] = useState<(typeof RANGE_BUCKETS)[number]>('All');
  const [duration, setDuration] = useState<(typeof DURATION_BUCKETS)[number]>('All');
  const [reactionOnly, setReactionOnly] = useState(false);
  const [accessFilter, setAccessFilter] = useState<(typeof ACCESS_FILTERS)[number]>('All');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [characterID, setCharacterID] = useState(selectedCharacterId ?? '');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const mobileListScrollRef = useRef(0);
  const character = characters.find(({ id }) => id === characterID) ?? null;
  const selectedCombat = campaignData.combats.find(({ id }) => id === selectedCombatId) ?? null;

  useEffect(() => {
    if (focusRequest?.kind !== 'power') return;
    if (focusRequest.powerKind) setKind(focusRequest.powerKind);
    setGroup('All');
    setSearch(focusRequest.name ?? '');
    setSelectedID(null);
    setMobileDetailOpen(Boolean(focusRequest.name));
    onFocusHandled?.();
  }, [focusRequest, onFocusHandled]);

  useEffect(() => {
    if (selectedCharacterId && characters.some(({ id }) => id === selectedCharacterId)) {
      setCharacterID(selectedCharacterId);
    }
  }, [characters, selectedCharacterId]);

  const documents = useMemo<PowerDocument[]>(() => {
    const official: PowerDocument[] = kind === 'Spell'
      ? spells.map((record) => {
        const spell: Spell = { id: canonicalID('Spell', record.name), ...record };
        return { id: spell.id, kind: 'Spell', name: spell.name, group: spell.school, origin: 'Official', spell, provenance: { sourceDocument: 'DC20 RPG Beta 0.10.5', sourcePage: `Page ${record.page}`, status: 'Beta source verified', note: record.sourceNote } };
      })
      : maneuvers.map((record) => {
        const maneuver: Maneuver = { id: canonicalID('Maneuver', record.name), type: record.category, ...record };
        return { id: maneuver.id, kind: 'Maneuver', name: maneuver.name, group: maneuver.category ?? 'Custom', origin: 'Official', maneuver, provenance: { sourceDocument: 'DC20 RPG Beta 0.10.5', sourcePage: `Page ${record.page}`, status: 'Beta source verified', note: record.sourceNote } };
      });
    const privateEntries = campaignData.vaultEntries.flatMap((entry): PowerDocument[] => {
      if (kind === 'Spell' && entry.spell) return [{ id: `private-${entry.id}`, kind: 'Spell', name: entry.spell.name, group: entry.spell.school, origin: 'GM Vault', spell: entry.spell, vaultEntry: entry, provenance: { sourceDocument: 'Private GM Vault', sourcePage: 'User-authored content • not paginated', status: 'Private custom content', note: entry.spell.sourceNote } }];
      if (kind === 'Maneuver' && entry.maneuver) return [{ id: `private-${entry.id}`, kind: 'Maneuver', name: entry.maneuver.name, group: entry.maneuver.category ?? entry.maneuver.type ?? 'Custom', origin: 'GM Vault', maneuver: entry.maneuver, vaultEntry: entry, provenance: { sourceDocument: 'Private GM Vault', sourcePage: 'User-authored content • not paginated', status: 'Private custom content', note: entry.maneuver.sourceNote } }];
      return [];
    });
    const shared = partyHub.parties.flatMap((party) => party.vaultEntries.flatMap((entry): PowerDocument[] => {
      const provenance: PowerProvenance = { sourceDocument: `${party.name} • Shared GM Vault`, sourcePage: `Shared by ${party.gmDisplayName || 'Campaign GM'} • not paginated`, status: 'Campaign-shared copy' };
      if (kind === 'Spell' && entry.spell) return [{ id: `campaign-${party.id}-${entry.id}`, kind: 'Spell', name: entry.spell.name, group: entry.spell.school, origin: 'Campaign Shared', spell: entry.spell, vaultEntry: entry, party, provenance: { ...provenance, note: entry.spell.sourceNote } }];
      if (kind === 'Maneuver' && entry.maneuver) return [{ id: `campaign-${party.id}-${entry.id}`, kind: 'Maneuver', name: entry.maneuver.name, group: entry.maneuver.category ?? entry.maneuver.type ?? 'Custom', origin: 'Campaign Shared', maneuver: entry.maneuver, vaultEntry: entry, party, provenance: { ...provenance, note: entry.maneuver.sourceNote } }];
      return [];
    }));
    return sortByName([...official, ...privateEntries, ...shared]);
  }, [campaignData.vaultEntries, kind, maneuvers, partyHub.parties, spells]);

  const accessByID = useMemo(() => new Map(documents.map((item) => [item.id, powerAccessForCharacter({ character, kind: item.kind, power: valueFor(item), origin: item.origin, reference, vaultEntry: item.vaultEntry, campaignContainsCharacter: !item.party || item.party.members.some((member) => member.characterId === character?.id || member.character?.id === character?.id) })])), [character, documents, reference]);
  const groups = useMemo(() => Array.from(new Set(documents.map((item) => item.group))).sort(), [documents]);
  const sourceOptions = useMemo(() => kind === 'Spell' ? Array.from(new Set(documents.flatMap((item) => item.kind === 'Spell' ? (item.spell.source ?? '').split(',').map((value) => value.trim()).filter(Boolean) : []))).sort() : [], [documents, kind]);
  const tagOptions = useMemo(() => kind === 'Spell' ? Array.from(new Set(documents.flatMap((item) => item.kind === 'Spell' ? (item.spell.tags ?? '').split(',').map((value) => value.trim()).filter(Boolean) : []))).sort() : [], [documents, kind]);
  const resolutionOptions = useMemo(() => Array.from(new Set(documents.map((item) => powerResolution(valueFor(item)) === 'None' ? 'No casting check' : powerResolution(valueFor(item))))).sort(), [documents]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((item) => {
      const details = valueFor(item);
      const itemSources = item.kind === 'Spell' ? (item.spell.source ?? '').split(',').map((value) => value.trim()) : [];
      const itemTags = item.kind === 'Spell' ? (item.spell.tags ?? '').split(',').map((value) => value.trim()) : [];
      const resolution = powerResolution(details);
      const access = accessByID.get(item.id)?.state ?? 'No Character';
      return (collection === 'All' || item.origin === collection)
        && (group === 'All' || item.group === group)
        && (sources.length === 0 || sources.some((value) => itemSources.includes(value)))
        && (tags.length === 0 || tags.every((value) => itemTags.includes(value)))
        && (resolutions.length === 0 || resolutions.includes(resolution === 'None' ? 'No casting check' : resolution))
        && (resource === 'All' || powerResourceKinds(details.cost ?? '').includes(resource))
        && (range === 'All' || powerRangeBucket(details.range) === range)
        && (duration === 'All' || item.kind === 'Spell' && powerDurationBucket(item.spell.duration) === duration)
        && (!reactionOnly || details.reaction)
        && (accessFilter === 'All' || access === accessFilter)
        && (!query || [item.name, item.group, item.origin, details.description, details.enhancements, details.cost, details.range, item.provenance.sourceDocument, item.kind === 'Spell' ? item.spell.tags : item.maneuver.requirements].some((value) => value?.toLowerCase().includes(query)));
    });
  }, [accessByID, accessFilter, collection, documents, duration, group, range, reactionOnly, resolutions, resource, search, sources, tags]);
  const selected = filtered.find(({ id }) => id === selectedID) ?? filtered[0] ?? null;
  const access = selected ? accessByID.get(selected.id) ?? { state: 'No Character', reason: '', canAddVaultEntry: false } : null;
  const customEquipment = useMemo(() => character ? [...campaignData.customEquipment, ...(character.vaultEntries ?? []).flatMap(({ item }) => item ? [item] : []), ...(character.inventoryItems ?? []).flatMap(({ itemSnapshot }) => itemSnapshot ? [itemSnapshot] : [])] : [], [campaignData.customEquipment, character]);
  const equipment = useMemo(() => Array.from(new Map([...publishedEquipment, ...customEquipment].map((item) => [item.id, item])).values()), [customEquipment, publishedEquipment]);
  const modifiers = useMemo<TableModifiers>(() => {
    if (!character || !reference) return EMPTY_MODIFIERS;
    const classReference = reference.classes.find(({ name }) => name === character.class);
    if (!classReference) return EMPTY_MODIFIERS;
    const profile = equippedCombatModifiers(character, equipment, classReference, reference.ancestryTraits);
    const base = character.primeModifier + character.combatMastery + profile.allCheckBonus;
    return { spellCheck: base + profile.spellCheckBonus, spellAttack: base + profile.spellAttackBonus, martialCheck: base + profile.martialCheckBonus, adjustment: profile.attackAndSpellDisadvantage, spellDamage: profile.spellAttackDamageBonus };
  }, [character, equipment, reference]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => setter((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  const resetFilters = () => { setGroup('All'); setCollection('All'); setSources([]); setTags([]); setResolutions([]); setResource('All'); setRange('All'); setDuration('All'); setReactionOnly(false); setAccessFilter('All'); setSelectedID(null); setMobileDetailOpen(false); };
  const chooseKind = (nextKind: PowerLibraryKind) => { setKind(nextKind); resetFilters(); };
  const chooseItem = (id: string) => {
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    if (mobile) mobileListScrollRef.current = rootRef.current?.parentElement?.scrollTop ?? 0;
    setSelectedID(id);
    setMobileDetailOpen(true);
    setNotice('');
    requestAnimationFrame(() => {
      detailRef.current?.scrollTo({ top: 0 });
      if (mobile) rootRef.current?.parentElement?.scrollTo({ top: 0 });
    });
  };
  const backToList = () => {
    setMobileDetailOpen(false);
    requestAnimationFrame(() => rootRef.current?.parentElement?.scrollTo({ top: mobileListScrollRef.current }));
  };
  const activeFilterCount = Number(collection !== 'All') + Number(group !== 'All') + sources.length + tags.length + resolutions.length + Number(resource !== 'All') + Number(range !== 'All') + Number(duration !== 'All') + Number(reactionOnly) + Number(accessFilter !== 'All');
  const collectionCounts = Object.fromEntries((['Official', 'GM Vault', 'Campaign Shared'] as PowerLibraryOrigin[]).map((origin) => [origin, documents.filter((item) => item.origin === origin).length]));
  const acceptVault = () => {
    if (!selected?.vaultEntry || !character || !access?.canAddVaultEntry) return;
    const updated = addVaultEntryToCharacter(character, selected.vaultEntry);
    updateCharacter(updated);
    setNotice(`${selected.name} was added to ${character.name}.`);
    if (selected.party) {
      void partyHub.publishCharacter(selected.party.id, selected.party.role, updated).catch((caught) => {
        const message = caught instanceof Error ? caught.message : 'Unknown synchronization error';
        setNotice(`${selected.name} was added locally, but the campaign copy could not be synchronized: ${message}`);
      });
    }
  };

  if (isLoading || referenceLoading) return <div className="p-10 text-slate-300">Loading the audited spell and maneuver library…</div>;

  return <div ref={rootRef} className="min-h-full p-3 sm:p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-visible lg:p-7"><div className="mx-auto max-w-[1600px] lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col"><header className={`${mobileDetailOpen ? 'hidden lg:block' : ''} mb-5 lg:shrink-0`}><p className="theme-accent-text text-xs font-black uppercase tracking-[0.28em]">Source-audited Beta 0.10.5 and campaign library</p><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Spells & Maneuvers</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">Search {spells.length} official spells and {maneuvers.length} official maneuvers alongside private and campaign-shared powers. Filter by mechanics, verify provenance, check character access, and resolve powers at the table.</p></header>{error && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}{notice && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{notice}</p>}<section className={`${mobileDetailOpen ? 'hidden lg:block' : ''} mb-4 rounded-2xl border border-white/10 bg-slate-950/65 p-3 sm:p-4 lg:shrink-0`}><div className="grid gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_minmax(220px,300px)]"><button type="button" onClick={() => chooseKind('Spell')} className={`rounded-xl px-4 py-3 font-black ${kind === 'Spell' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>✨ Spells ({kind === 'Spell' ? documents.length : spells.length})</button><button type="button" onClick={() => chooseKind('Maneuver')} className={`rounded-xl px-4 py-3 font-black ${kind === 'Maneuver' ? 'btn-primary' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>⚔ Maneuvers ({kind === 'Maneuver' ? documents.length : maneuvers.length})</button><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedID(null); }} placeholder={`Search ${kind.toLowerCase()} names and full rules…`} aria-label="Search spells and maneuvers" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-400" /><select value={characterID} onChange={(event) => { setCharacterID(event.target.value); setAccessFilter('All'); }} aria-label="Choose character for power access" className="min-w-0 rounded-xl border border-violet-400/20 bg-slate-900 px-4 py-3 font-bold text-slate-200"><option value="">No character selected</option>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} • Level {entry.level} {entry.class}</option>)}</select></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{(['Official', 'GM Vault', 'Campaign Shared'] as PowerLibraryOrigin[]).map((origin) => <button type="button" key={origin} onClick={() => { setCollection(collection === origin ? 'All' : origin); setSelectedID(null); }} className={`rounded-lg border px-3 py-2 text-xs font-black ${collection === origin ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/[0.025] text-slate-400'}`}>{origin} • {collectionCounts[origin]}</button>)}</div><details className="mt-3 rounded-xl border border-white/10 bg-slate-950/45 p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-violet-200"><span>Advanced Filters {activeFilterCount > 0 && <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-1 text-[10px]">{activeFilterCount} active</span>}</span><span className="text-xs text-slate-500">Source • tags • resolution • cost • range • duration</span></summary><div className="mt-4 space-y-4 border-t border-white/5 pt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">School / Category<select value={group} onChange={(event) => { setGroup(event.target.value); setSelectedID(null); }} className="mt-1 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-slate-200"><option>All</option>{groups.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resource<select value={resource} onChange={(event) => setResource(event.target.value as typeof resource)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case text-slate-200">{RESOURCE_FILTERS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Range<select value={range} onChange={(event) => setRange(event.target.value as typeof range)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case text-slate-200">{RANGE_BUCKETS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Duration<select value={duration} disabled={kind === 'Maneuver'} onChange={(event) => setDuration(event.target.value as typeof duration)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case text-slate-200 disabled:opacity-35">{DURATION_BUCKETS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Character Access<select value={accessFilter} disabled={!character} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs normal-case text-slate-200 disabled:opacity-35">{ACCESS_FILTERS.map((value) => <option key={value}>{value}</option>)}</select></label></div><ToggleChips title="Spell sources" options={sourceOptions} selected={sources} onToggle={toggle(setSources)} /><ToggleChips title="Spell tags — selected tags all apply" options={tagOptions} selected={tags} onToggle={toggle(setTags)} /><ToggleChips title="Resolution" options={resolutionOptions} selected={resolutions} onToggle={toggle(setResolutions)} /><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100"><input type="checkbox" checked={reactionOnly} onChange={(event) => setReactionOnly(event.target.checked)} />Reaction timing only</label><button type="button" onClick={resetFilters} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-slate-300">Clear all filters</button></div></div></details></section><div className="grid gap-4 lg:min-h-80 lg:flex-1 lg:grid-cols-[370px_minmax(0,1fr)]"><aside className={`${mobileDetailOpen ? 'hidden lg:block' : 'block'} max-h-none overflow-visible rounded-2xl border border-white/10 bg-slate-950/60 p-3 lg:h-auto lg:min-h-0 lg:overflow-auto lg:overscroll-contain`}><div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg bg-slate-950/95 px-2 py-2 backdrop-blur"><h2 className="theme-accent-text font-black">{kind}s</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{filtered.length}</span></div>{filtered.length === 0 ? <p className="p-5 text-sm text-slate-500">No references match these filters.</p> : filtered.map((item) => { const itemAccess = accessByID.get(item.id); return <button type="button" key={item.id} onClick={() => chooseItem(item.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected?.id === item.id ? 'theme-selected-card' : 'hover:bg-white/5'}`}><span className="flex items-start justify-between gap-2"><span className="block font-bold text-slate-100">{item.name}</span>{itemAccess && itemAccess.state !== 'No Character' && <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${accessTone(itemAccess.state)}`}>{itemAccess.state}</span>}</span><span className="mt-1 block text-xs text-slate-500">{item.kind === 'Spell' ? `${item.spell.source} • ${item.spell.school}` : item.group} • {item.origin}</span></button>; })}</aside><main ref={detailRef} className={`${mobileDetailOpen ? 'block' : 'hidden lg:block'} rounded-2xl border border-white/10 bg-slate-900/75 p-3 sm:p-6 lg:h-auto lg:min-h-0 lg:overflow-auto lg:overscroll-contain lg:p-9`}>{selected && access ? <PowerDetail key={selected.id} item={selected} character={character} access={access} modifiers={modifiers} onCharacterChange={updateCharacter} combat={selectedCombat} onCombatChange={updateCombat} onAcceptVault={acceptVault} onBack={backToList} /> : <div className="grid min-h-64 place-items-center text-slate-500">Select a reference.</div>}</main></div></div></div>;
};

export default PowersView;
