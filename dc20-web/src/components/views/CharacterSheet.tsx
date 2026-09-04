import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { CharacterAvatarEditor } from '../character/CharacterAvatar';
import type { CampaignNote, Character, CharacterInventoryItem, DC20Attribute, EquipmentCatalogItem, MasteryLevel } from '../../types/models';
import { ATTRIBUTE_NAMES, BARBARIAN_RAGE_STATE, applyDerivedCharacter, barbarianStaminaRegenAmount, characterSheetEffects, deriveCharacter, grantedClassLanguageNames, grantedClassManeuverNames, grantedClassSpellNames, masteryBonus, masteryRank, masteryTitle, rogueCheapShotDamage, rogueStaminaRegenAmount, skillMasteryCap, spellbladeDisciplineNames } from '../../utils/characterRules';
import { enforceEquipmentHandCapacity, isEquipmentEquippable, setInventoryQuantity, toggleInventoryEquipped as toggleInventoryEquippedBase } from '../../utils/equipmentRules';
import { generateUUID } from '../../utils/gameUtils';

interface CharacterSheetProps {
  character: Character;
  onClose?: () => void;
  onEdit?: () => void;
  onCharacterChange?: (character: Character) => void;
}

type SheetTab = 'overview' | 'checks' | 'powers' | 'features' | 'equipment' | 'notes';
const tabs: Array<{ id: SheetTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'checks', label: 'Checks & Saves' },
  { id: 'powers', label: 'Spells & Maneuvers' },
  { id: 'features', label: 'Features' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'notes', label: 'Notes' },
];
const conditions = ['Bleeding', 'Blinded', 'Burning', 'Charmed', 'Dazed', 'Deafened', 'Disoriented', 'Doomed', 'Exhaustion', 'Exposed', 'Frightened', 'Hindered', 'Impaired', 'Immobilized', 'Intimidated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned', 'Taunted', 'Terrified', 'Unconscious', 'Weakened'];
const panelClass = 'rounded-2xl border border-white/10 bg-slate-900/70 p-5';
const fieldClass = 'w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-violet-400';
const BARBARIAN_BATTLECRY_STATE = 'barbarian.battlecry.active';
const BARBARIAN_BATTLECRY_SELECTION = 'barbarian.battlecry.shout';
const BARBARIAN_BATTLECRY_ENHANCEMENT = 'barbarian.battlecry.enhancementSP';
const BARBARIAN_REGEN_USED = 'barbarian.staminaRegen.used';
const SUMMONER_DEMIPLANE_OPEN = 'summoner.personalDemiplane.open';
const SUMMONER_CREATURE_SPECIALIST_USED = 'summoner.creatureSpecialist.used';
const SUMMONER_HORDE_USED = 'summoner.hordeSummoner.used';
const SUMMONER_GRAND_ENTRANCE_USED = 'summoner.grandEntrance.used';
const SUMMONER_REVERSE_SUMMONING_USED = 'summoner.reverseSummoning.used';
const SUMMONER_UNDYING_MP = 'summoner.undying.mp';
const SUMMONER_UNDYING_LAST_HP = 'summoner.undying.lastHP';
const SPELLBLADE_REGEN_USED = 'spellblade.staminaRegen.used';
const SPELLBLADE_SMITE_SP = 'spellblade.smite.sp';
const SPELLBLADE_ACOLYTE_MP = 'spellblade.acolyte.mp';
const SPELLBLADE_ACOLYTE_POOL = 'spellblade.acolyte.pool';
const SPELLBLADE_LAY_ON_HANDS_USED = 'spellblade.layOnHands.used';
const SPELLBLADE_HEX_ACTIVE = 'spellblade.hex.active';
const SPELLBLADE_HEX_MP = 'spellblade.hex.mp';
const SPELLBLADE_HEX_CONDITION = 'spellblade.hex.condition';
const SPELLBLADE_DUEL_SP = 'spellblade.spellDuel.sp';
const SPELLBLADE_DUEL_MP = 'spellblade.spellDuel.mp';
const SPELLBLADE_DUEL_NEAR = 'spellblade.spellDuel.nearCaster';
const SPELLBLADE_WARDER_ACTIVE = 'spellblade.spellWarder.active';
const SPELLBLADE_WARDER_DAMAGE = 'spellblade.spellWarder.damage';
const SPELLBLADE_WARDER_HALF = 'spellblade.spellWarder.half';
const SPELLBLADE_BOUND_DAMAGE = 'spellblade.boundDamage.current';
const SPELLBLADE_ACTIVE_RUNE = 'spellblade.rune.active';
const SPELLBLADE_GLACIER_USED = 'spellblade.rune.glacier.used';
const SPELLBLADE_DAMAGE_TYPES = ['Cold', 'Corrosion', 'Fire', 'Lightning', 'Poison', 'Psychic', 'Radiant', 'Umbral'];
const ROGUE_REGEN_USED = 'rogue.staminaRegen.used';
const ROGUE_DEBILITATING_ACTIVE = 'rogue.debilitatingStrike.active';
const ROGUE_DEBILITATING_CONDITIONS = 'rogue.debilitatingStrike.conditions';
const ROGUE_CUNNING_ACTION = 'rogue.cunningAction.choice';
const ROGUE_CUNNING_ACTIVE = 'rogue.cunningAction.active';
const ROGUE_CHEAP_SHOT_CONDITIONS = 'rogue.cheapShot.conditionCount';
const ROGUE_TARGET_FLANKED = 'rogue.cheapShot.flanked';
const ROGUE_TARGET_HIDDEN = 'rogue.cheapShot.hidden';
const ROGUE_TAUNT_USED = 'rogue.tauntingShot.used';

interface RollOutcome { label: string; dice: number[]; chosen: number; modifier: number; total: number }

function ResourceControl({ label, value, maximum, tone, onChange }: { label: string; value: number; maximum: number; tone: string; onChange: (value: number) => void }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200">−</button><div className={`text-xl font-black ${tone}`}>{value} / {maximum}</div><button type="button" onClick={() => onChange(Math.min(maximum, value + 1))} className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200">+</button></div></div>;
}

function Details({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <details className="group rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-start justify-between gap-3"><span><span className="font-black text-slate-200">{title}</span>{subtitle && <span className="mt-1 block text-xs text-slate-500">{subtitle}</span>}</span><span className="text-xs font-bold text-violet-300 group-open:hidden">More</span><span className="hidden text-xs font-bold text-violet-300 group-open:inline">Less</span></summary><div className="mt-4 whitespace-pre-wrap border-t border-white/5 pt-4 text-sm leading-6 text-slate-400">{children}</div></details>;
}

function SummonerControls({ character, onChange }: { character: Character; onChange: (values: Partial<Character>) => void }) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = new Set(build.selectedTalents ?? []);
  const grantedSpells = grantedClassSpellNames(character);
  const knownBondedSpells = Array.from(new Set([
    ...character.spells.filter((spell) => (spell.tags ?? '').split(',').some((tag) => tag.trim() === 'Summoning')).map((spell) => spell.name),
    ...grantedSpells,
  ]));
  const saveDC = 10 + character.primeModifier + character.combatMastery;
  const setState = (key: string, value: boolean) => onChange({ build: { ...build, sheetFeatureStates: { ...states, [key]: value } } });
  const spendAP = () => {
    if (character.currentAP > 0) onChange({ currentAP: character.currentAP - 1 });
  };
  const openDemiplane = () => {
    if (states[SUMMONER_DEMIPLANE_OPEN] || character.currentAP < 1) return;
    onChange({ currentAP: character.currentAP - 1, build: { ...build, sheetFeatureStates: { ...states, [SUMMONER_DEMIPLANE_OPEN]: true } } });
  };
  const selectedUndyingMP = Math.min(Math.max(1, counters[SUMMONER_UNDYING_MP] ?? 1), Math.max(1, character.manaPoints));
  const setUndyingMP = (mana: number) => onChange({ build: { ...build, sheetFeatureCounters: { ...counters, [SUMMONER_UNDYING_MP]: Math.max(1, mana) } } });
  const useUndying = () => {
    if (character.subclass !== 'Dread Lord' || character.currentAP < 1 || character.manaPoints < 1) return;
    onChange({
      currentAP: character.currentAP - 1,
      manaPoints: character.manaPoints - selectedUndyingMP,
      build: { ...build, sheetFeatureCounters: { ...counters, [SUMMONER_UNDYING_MP]: selectedUndyingMP, [SUMMONER_UNDYING_LAST_HP]: selectedUndyingMP * 2 } },
    });
  };
  const trackedUse = (key: string, activeLabel: string, availableLabel: string, resetLabel: string, disabled = false) => <><button type="button" disabled={Boolean(states[key]) || disabled} onClick={() => setState(key, true)} className="mt-3 w-full rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[key] ? activeLabel : availableLabel}</button>{states[key] && <button type="button" onClick={() => setState(key, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">{resetLabel}</button>}</>;

  return <section className="mb-5 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/45 via-violet-950/40 to-slate-950/70 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live Class Features</p><h2 className="text-xl font-black text-white">Summoner Controls</h2></div><span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100">{grantedSpells.length} feature-granted {grantedSpells.length === 1 ? 'spell' : 'spells'}</span></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-cyan-200">Bonded Summons</h3><p className="mt-2 text-xs leading-5 text-slate-400">Listed Summon Spells let their creatures use your AP. While Sustaining one or more of them, you can Sustain 1 for free.</p><div className="mt-3 flex flex-wrap gap-1.5">{knownBondedSpells.map((spell) => <span key={spell} className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-100">{spell}</span>)}</div>{character.level >= 5 && <p className="mt-3 rounded-lg bg-violet-500/10 p-2 text-xs leading-5 text-violet-100"><strong>Extended Summoning:</strong> listed Spells last until you complete a Long Rest.</p>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-violet-200">Personal Demiplane</h3><p className="mt-2 text-xs leading-5 text-slate-400">Open the portal in an unoccupied Space within 2 Spaces. It leads to your persistent 3 Space diameter demiplane and lasts until the start of your next turn.</p>{states[SUMMONER_DEMIPLANE_OPEN] ? <><div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-xs font-bold text-emerald-100">Portal open • creatures can enter or exit</div><button type="button" onClick={() => setState(SUMMONER_DEMIPLANE_OPEN, false)} className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200">Start next turn • close portal</button></> : <button type="button" disabled={character.currentAP < 1} onClick={openDemiplane} className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Open Portal • 1 AP</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Summon Exchange</h3><p className="mt-2 text-xs leading-5 text-slate-400">Switch places with a summoned creature within 10 Spaces.</p>{character.level >= 5 && <p className="mt-2 text-xs leading-5 text-violet-100"><strong>Summon Translocation:</strong> instead switch the places of two summoned creatures in range.</p>}<button type="button" disabled={character.currentAP < 1} onClick={spendAP} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Use Exchange • 1 AP</button>{character.level >= 5 && <p className="mt-3 text-xs leading-5 text-cyan-100"><strong>Summon Conduit:</strong> cast Spells from a summoned creature’s Space while it is within 10 Spaces.</p>}</div>}
      {character.subclass === 'Chimera' && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/25 p-4 lg:col-span-2"><h3 className="font-black text-emerald-200">Summon Chimera</h3><p className="mt-2 text-xs leading-5 text-slate-300">The first creature summoned by a listed Spell also gains the Base Summon Traits of another listed Spell you know. Additional Traits can use another known listed Spell’s Expanded Summon Traits, and each contributed Creature Type is added.</p><div className="mt-3 flex flex-wrap gap-1.5">{(build.classFeatureSelections['summoner.chimeraSummons'] ?? []).map((spell) => <span key={spell} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-100">{spell}</span>)}</div></div>}
      {character.subclass === 'Dread Lord' && <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4 lg:col-span-2"><h3 className="font-black text-red-200">Unending March</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Life Steal:</strong> a listed summoned creature regains 1 HP when its Unarmed Strike hits. <strong>Undying:</strong> revive one as a Reaction with 2 HP per MP spent.</p><div className="mt-3 grid items-end gap-3 sm:grid-cols-[150px_1fr]"><label className="text-xs font-bold text-slate-400">Mana to spend<input type="number" min={1} max={Math.max(1, character.manaPoints)} value={selectedUndyingMP} onChange={(event) => setUndyingMP(Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><button type="button" disabled={character.currentAP < 1 || character.manaPoints < 1} onClick={useUndying} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Use Undying • 1 AP + {selectedUndyingMP} MP</button></div>{(counters[SUMMONER_UNDYING_LAST_HP] ?? 0) > 0 && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-100">Last creature revived with <strong>{counters[SUMMONER_UNDYING_LAST_HP]} HP</strong>.</p>}</div>}
      {talents.has('Creature Specialist') && <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4"><h3 className="font-black text-amber-200">Creature Specialist</h3><p className="mt-2 text-xs leading-5 text-slate-300">Chosen Spell: <strong>{build.classFeatureSelections['summoner.creatureSpecialistSpell']?.[0] ?? 'Choose in Builder'}</strong></p>{trackedUse(SUMMONER_CREATURE_SPECIALIST_USED, 'Used', 'Use 3-point Traits benefit', 'Reset on Initiative / Long Rest')}</div>}
      {talents.has('Horde Summoner') && <div className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-4"><h3 className="font-black text-sky-200">Horde Summoner</h3><p className="mt-2 text-xs leading-5 text-slate-300">Use Additional Creatures once for free; the additional creature shares the first creature’s HP. Combo Summon can use a different known listed Spell.</p>{trackedUse(SUMMONER_HORDE_USED, 'Split Summon used', 'Use free Split Summon', 'Reset on Initiative / Long Rest')}</div>}
      {talents.has('Grand Entrance') && <div className="rounded-xl border border-orange-400/20 bg-orange-950/20 p-4"><h3 className="font-black text-orange-200">Grand Entrance</h3><p className="mt-2 text-xs leading-5 text-slate-300">Once per Combat when using Personal Demiplane, each summoned creature exiting can appear within 5 Spaces and make a free Unarmed Strike.</p>{trackedUse(SUMMONER_GRAND_ENTRANCE_USED, 'Used this Combat', states[SUMMONER_DEMIPLANE_OPEN] ? 'Apply Grand Entrance' : 'Open the portal first', 'Reset Combat use', !states[SUMMONER_DEMIPLANE_OPEN])}</div>}
      {talents.has('Reverse Summoning') && <div className="rounded-xl border border-purple-400/20 bg-purple-950/20 p-4"><h3 className="font-black text-purple-200">Reverse Summoning</h3><p className="mt-2 text-xs leading-5 text-slate-300">Once per Combat when using Personal Demiplane, chosen creatures within 1 Space make a Might Save against DC <strong>{saveDC}</strong>. Failure: trapped for 1 Round.</p>{trackedUse(SUMMONER_REVERSE_SUMMONING_USED, 'Used this Combat', states[SUMMONER_DEMIPLANE_OPEN] ? 'Apply Reverse Summoning' : 'Open the portal first', 'Reset Combat use', !states[SUMMONER_DEMIPLANE_OPEN])}</div>}
    </div>
  </section>;
}

function SpellbladeControls({ character, onChange, onRoll }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => RollOutcome;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = new Set(build.selectedTalents ?? []);
  const disciplines = spellbladeDisciplineNames(character);
  const hasDiscipline = (name: string) => disciplines.includes(name);
  const boundDamage = selections[SPELLBLADE_BOUND_DAMAGE]
    || build.classFeatureSelections['spellblade.boundDamage']?.[0]
    || 'Choose in Builder';
  const smiteSP = Math.min(Math.max(1, counters[SPELLBLADE_SMITE_SP] ?? 1), Math.max(1, character.stamina));
  const acolyteMP = Math.min(Math.max(1, counters[SPELLBLADE_ACOLYTE_MP] ?? 1), Math.max(1, character.manaPoints));
  const hexMP = Math.min(Math.max(1, counters[SPELLBLADE_HEX_MP] ?? 1), Math.max(1, character.manaPoints));
  const duelSP = Math.min(Math.max(0, counters[SPELLBLADE_DUEL_SP] ?? 0), character.stamina);
  const duelMP = Math.min(Math.max(0, counters[SPELLBLADE_DUEL_MP] ?? 0), character.manaPoints);
  const knownRunes = build.classFeatureSelections['spellblade.runes'] ?? [];
  const activeRune = knownRunes.includes(selections[SPELLBLADE_ACTIVE_RUNE]) ? selections[SPELLBLADE_ACTIVE_RUNE] : '';
  const updateBuild = (values: Partial<NonNullable<Character['build']>>) => onChange({ build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const setCounter = (key: string, value: number) => updateBuild({ sheetFeatureCounters: { ...counters, [key]: value } });
  const spendSmite = () => {
    if (character.stamina < smiteSP) return;
    onChange({ stamina: character.stamina - smiteSP, build: { ...build, sheetFeatureCounters: { ...counters, [SPELLBLADE_SMITE_SP]: smiteSP } } });
  };
  const regainStamina = () => {
    if (states[SPELLBLADE_REGEN_USED]) return;
    onChange({
      stamina: Math.min(character.maxStamina, character.stamina + barbarianStaminaRegenAmount(character.maxStamina)),
      build: { ...build, sheetFeatureStates: { ...states, [SPELLBLADE_REGEN_USED]: true } },
    });
  };
  const activateAcolyte = (mode: 'Heal' | 'Cure', layOnHands = false) => {
    const manaCost = layOnHands ? 0 : mode === 'Heal' ? acolyteMP : 1;
    if (character.currentAP < 1 || character.manaPoints < manaCost || (layOnHands && states[SPELLBLADE_LAY_ON_HANDS_USED])) return;
    const result = onRoll(`Acolyte ${mode} Spell Check`, character.primeModifier + character.combatMastery + (layOnHands ? 5 : 0));
    const pool = mode === 'Heal'
      ? (result.total < 10 ? 2 : 3 + Math.floor((result.total - 10) / 5)) + (character.level >= 5 ? Math.max(0, manaCost - 1) * 2 : 0)
      : 0;
    onChange({
      currentAP: character.currentAP - 1,
      manaPoints: character.manaPoints - manaCost,
      build: {
        ...build,
        sheetFeatureStates: { ...states, ...(layOnHands ? { [SPELLBLADE_LAY_ON_HANDS_USED]: true } : {}) },
        sheetFeatureCounters: { ...counters, [SPELLBLADE_ACOLYTE_MP]: acolyteMP, [SPELLBLADE_ACOLYTE_POOL]: pool },
      },
    });
  };
  const useHex = () => {
    if (character.currentAP < 1 || character.manaPoints < hexMP) return;
    onChange({
      currentAP: character.currentAP - 1,
      manaPoints: character.manaPoints - hexMP,
      build: { ...build, sheetFeatureStates: { ...states, [SPELLBLADE_HEX_ACTIVE]: true }, sheetFeatureCounters: { ...counters, [SPELLBLADE_HEX_MP]: hexMP } },
    });
    onRoll('Hex Warrior Spell Check', character.primeModifier + character.combatMastery);
  };
  const useSpellDuel = () => {
    if (character.stamina < duelSP || character.manaPoints < duelMP) return;
    onChange({ stamina: character.stamina - duelSP, manaPoints: character.manaPoints - duelMP });
    onRoll('Spell Breaker Martial Check', character.primeModifier + character.combatMastery + duelSP + duelMP * 2, states[SPELLBLADE_DUEL_NEAR] ? 1 : 0);
  };
  const activateWarder = (half: boolean) => {
    const damage = selections[SPELLBLADE_WARDER_DAMAGE] || 'Fire';
    if (half && (character.level < 5 || character.manaPoints < 1)) return;
    onChange({
      manaPoints: character.manaPoints - (half ? 1 : 0),
      build: {
        ...build,
        sheetFeatureStates: { ...states, [SPELLBLADE_WARDER_ACTIVE]: true },
        sheetFeatureSelections: { ...selections, [SPELLBLADE_WARDER_DAMAGE]: damage },
        sheetFeatureCounters: { ...counters, [SPELLBLADE_WARDER_HALF]: half ? 1 : 0 },
      },
    });
  };
  const applyGlacier = () => {
    if (activeRune !== 'Frost Rune' || states[SPELLBLADE_GLACIER_USED]) return;
    updateBuild({ temporaryHP: (build.temporaryHP ?? 0) + 2, sheetFeatureStates: { ...states, [SPELLBLADE_GLACIER_USED]: true } });
  };

  return <section className="mb-5 rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-950/50 via-violet-950/35 to-slate-950/70 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Live Class Features</p><h2 className="text-xl font-black text-white">Spellblade Controls</h2></div><div className="flex flex-wrap gap-1.5">{disciplines.map((discipline) => <span key={discipline} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-100">{discipline}</span>)}</div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-sky-200">Bound Weapon & Smite</h3><p className="mt-2 text-xs leading-5 text-slate-400">Spend SP on a Martial Attack with the Weapon for +1 Bound Damage per SP and 1 free Martial Enhancement.</p>{talents.has('Adaptive Bond') ? <label className="mt-3 block text-xs font-bold text-slate-400">Current Bound Damage<select value={boundDamage === 'Choose in Builder' ? '' : boundDamage} onChange={(event) => setSelection(SPELLBLADE_BOUND_DAMAGE, event.target.value)} className={`${fieldClass} mt-1`}><option value="">Choose damage</option>{SPELLBLADE_DAMAGE_TYPES.map((damage) => <option key={damage}>{damage}</option>)}</select><span className="mt-1 block font-normal text-amber-200">Adaptive Bond grants Resistance (1) to this damage.</span></label> : <p className="mt-3 rounded-lg bg-sky-500/10 p-2 text-xs font-bold text-sky-100">Bound Damage: {boundDamage}{character.level >= 5 ? ' • ignores Resistance' : ''}</p>}<div className="mt-3 grid grid-cols-[100px_1fr] items-end gap-2"><label className="text-xs font-bold text-slate-400">SP<input type="number" min={1} max={Math.max(1, character.stamina)} value={smiteSP} onChange={(event) => setCounter(SPELLBLADE_SMITE_SP, Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><button type="button" disabled={character.stamina < 1} onClick={spendSmite} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-black text-white disabled:opacity-35">Smite • +{smiteSP} {boundDamage}</button></div></div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-cyan-200">Stamina Regen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Round after you Hit with a Spell Attack or succeed on a Spell Check, regain up to half your maximum SP.</p><p className="mt-2 text-xs font-bold text-cyan-300">Up to {barbarianStaminaRegenAmount(character.maxStamina)} SP</p><button type="button" disabled={Boolean(states[SPELLBLADE_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={regainStamina} className="mt-3 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-black text-white disabled:opacity-35">{states[SPELLBLADE_REGEN_USED] ? 'Used This Round' : 'Regain Stamina'}</button>{states[SPELLBLADE_REGEN_USED] && <button type="button" onClick={() => setState(SPELLBLADE_REGEN_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next round</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Spellstrike</h3><p className="mt-2 text-xs leading-5 text-slate-300">Once on each turn, cast a Spell as part of a Martial Attack for 1 AP less. It uses the Attack Check, your Save DC, can take Martial and Spell Enhancements, and requires no Somatic Components.</p>{character.level >= 5 && <p className="mt-3 rounded-lg bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100">Expert: the Spell can target multiple creatures or an Area if at least one Spell target is also a target of the Martial Attack.</p>}</div>}
      {hasDiscipline('Magus') && <div className="rounded-xl border border-violet-400/20 bg-violet-950/25 p-4"><h3 className="font-black text-violet-200">Magus</h3><p className="mt-2 text-xs leading-5 text-slate-300">+1 maximum MP and +1 Spell are included in this sheet.</p></div>}
      {hasDiscipline('Warrior') && <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4"><h3 className="font-black text-amber-200">Warrior</h3><p className="mt-2 text-xs leading-5 text-slate-300">Heavy Armor and Heavy Shield Training. The additional Maneuver is included in the builder allowance.</p></div>}
      {hasDiscipline('Acolyte') && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4 lg:col-span-2"><h3 className="font-black text-emerald-200">Acolyte</h3><div className="mt-3 grid items-end gap-2 sm:grid-cols-[120px_1fr_1fr]"><label className="text-xs font-bold text-slate-400">MP for Heal<input type="number" min={1} max={Math.max(1, character.manaPoints)} value={acolyteMP} onChange={(event) => setCounter(SPELLBLADE_ACOLYTE_MP, Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><button type="button" disabled={character.currentAP < 1 || character.manaPoints < acolyteMP} onClick={() => activateAcolyte('Heal')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Heal • 1 AP + {acolyteMP} MP</button><button type="button" disabled={character.currentAP < 1 || character.manaPoints < 1} onClick={() => activateAcolyte('Cure')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Cure • 1 AP + 1 MP</button></div>{(counters[SPELLBLADE_ACOLYTE_POOL] ?? 0) > 0 && <p className="mt-3 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-100">Last Heal created a pool of <strong>{counters[SPELLBLADE_ACOLYTE_POOL]} HP</strong> to distribute within 5 Spaces.</p>}{character.subclass === 'Paladin' && <div className="mt-3"><button type="button" disabled={Boolean(states[SPELLBLADE_LAY_ON_HANDS_USED]) || character.currentAP < 1} onClick={() => activateAcolyte('Heal', true)} className="w-full rounded-lg bg-yellow-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[SPELLBLADE_LAY_ON_HANDS_USED] ? 'Lay on Hands used' : 'Lay on Hands • 1 AP, 0 MP, +5 Check'}</button>{states[SPELLBLADE_LAY_ON_HANDS_USED] && <button type="button" onClick={() => setState(SPELLBLADE_LAY_ON_HANDS_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset after Long Rest</button>}</div>}</div>}
      {hasDiscipline('Hex Warrior') && <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4"><h3 className="font-black text-red-200">Hex Warrior</h3><label className="mt-3 block text-xs font-bold text-slate-400">Curse Condition<select value={selections[SPELLBLADE_HEX_CONDITION] || 'Dazed'} onChange={(event) => setSelection(SPELLBLADE_HEX_CONDITION, event.target.value)} className={`${fieldClass} mt-1`}><option>Dazed</option><option>Impaired</option></select></label><label className="mt-2 block text-xs font-bold text-slate-400">MP<input type="number" min={1} max={Math.max(1, character.manaPoints)} value={hexMP} onChange={(event) => setCounter(SPELLBLADE_HEX_MP, Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><button type="button" disabled={states[SPELLBLADE_HEX_ACTIVE] || character.currentAP < 1 || character.manaPoints < hexMP} onClick={useHex} className="mt-3 w-full rounded-lg bg-red-800 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[SPELLBLADE_HEX_ACTIVE] ? 'Curse Active' : `Curse • 1 AP + ${hexMP} MP`}</button>{states[SPELLBLADE_HEX_ACTIVE] && <><p className="mt-2 text-xs text-red-100">No HP recovery • {selections[SPELLBLADE_HEX_CONDITION] || 'Dazed'} • {character.level >= 5 ? hexMP : 1} Umbral damage each turn</p><button type="button" onClick={() => setState(SPELLBLADE_HEX_ACTIVE, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">End Curse</button></>}</div>}
      {hasDiscipline('Spell Breaker') && <div className="rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-4 lg:col-span-2"><h3 className="font-black text-indigo-200">Spell Breaker</h3><div className="mt-3 grid items-end gap-2 sm:grid-cols-[90px_90px_1fr]"><label className="text-xs font-bold text-slate-400">SP<input type="number" min={0} max={character.stamina} value={duelSP} onChange={(event) => setCounter(SPELLBLADE_DUEL_SP, Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-slate-400">MP<input type="number" min={0} max={character.manaPoints} value={duelMP} onChange={(event) => setCounter(SPELLBLADE_DUEL_MP, Number(event.target.value))} className={`${fieldClass} mt-1`} /></label><button type="button" disabled={character.stamina < duelSP || character.manaPoints < duelMP} onClick={useSpellDuel} className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Roll Martial Check • +{duelSP + duelMP * 2} boost</button></div><label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={Boolean(states[SPELLBLADE_DUEL_NEAR])} onChange={(event) => setState(SPELLBLADE_DUEL_NEAR, event.target.checked)} />Within 1 Space of the Caster (ADV)</label></div>}
      {hasDiscipline('Spell Warder') && <div className="rounded-xl border border-blue-400/20 bg-blue-950/20 p-4"><h3 className="font-black text-blue-200">Spell Warder</h3><select value={selections[SPELLBLADE_WARDER_DAMAGE] || 'Fire'} onChange={(event) => setSelection(SPELLBLADE_WARDER_DAMAGE, event.target.value)} className={`${fieldClass} mt-3`}>{SPELLBLADE_DAMAGE_TYPES.map((damage) => <option key={damage}>{damage}</option>)}</select><div className="mt-2 grid gap-2"><button type="button" onClick={() => activateWarder(false)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">Gain Resistance (1)</button>{character.level >= 5 && <button type="button" disabled={character.manaPoints < 1} onClick={() => activateWarder(true)} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Gain Resistance (Half) • 1 MP</button>}{states[SPELLBLADE_WARDER_ACTIVE] && <button type="button" onClick={() => setState(SPELLBLADE_WARDER_ACTIVE, false)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">End after 1 Round</button>}</div></div>}
      {hasDiscipline('Blink Blade') && <div className="rounded-xl border border-purple-400/20 bg-purple-950/20 p-4"><h3 className="font-black text-purple-200">Blink Blade</h3><p className="mt-2 text-xs leading-5 text-slate-300">Once per turn when you make an Attack, teleport to a visible Space within 1 Space immediately before or after the Attack.</p></div>}
      {character.subclass === 'Paladin' && <div className="rounded-xl border border-yellow-400/20 bg-yellow-950/15 p-4"><h3 className="font-black text-yellow-200">Holy Warrior</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Aura:</strong> chosen creatures within 2 Spaces have ADV on Mental Saves. <strong>Divine Strike:</strong> Spellstrike can deal {build.classFeatureSelections['spellblade.paladinDamage']?.[0] || 'chosen Radiant or Umbral'} damage.</p></div>}
      {character.subclass === 'Rune Knight' && <div className="rounded-xl border border-orange-400/20 bg-orange-950/15 p-4 lg:col-span-2"><h3 className="font-black text-orange-200">Rune Weapon</h3><label className="mt-3 block text-xs font-bold text-slate-400">Active Rune<select value={activeRune} onChange={(event) => setSelection(SPELLBLADE_ACTIVE_RUNE, event.target.value)} className={`${fieldClass} mt-1`}><option value="">Choose after a Quick Rest</option>{knownRunes.map((rune) => <option key={rune}>{rune}</option>)}</select></label>{activeRune === 'Lightning Rune' && <p className="mt-2 text-xs text-yellow-100">Quickness: +1 Speed is applied to the displayed Speed.</p>}{activeRune === 'Water Rune' && <p className="mt-2 text-xs text-blue-100">Healing Waters: regain 1 additional HP when an MP Effect restores your HP.</p>}{activeRune === 'Flame Rune' && <p className="mt-2 text-xs text-orange-100">Hearth: regain 2 Rest Points on a qualifying Short Rest.</p>}{activeRune === 'Wind Rune' && <p className="mt-2 text-xs text-cyan-100">Wind Swept: +3 Jump Distance; Stand Jump no longer halves it.</p>}{activeRune === 'Earth Rune' && <p className="mt-2 text-xs text-stone-200">Unmovable: ADV against being knocked Prone or moved.</p>}{activeRune === 'Frost Rune' && <div className="mt-2"><button type="button" disabled={Boolean(states[SPELLBLADE_GLACIER_USED])} onClick={applyGlacier} className="w-full rounded-lg bg-cyan-800 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[SPELLBLADE_GLACIER_USED] ? 'Glacier applied' : 'Roll Initiative • gain 2 Temp HP'}</button>{states[SPELLBLADE_GLACIER_USED] && <button type="button" onClick={() => setState(SPELLBLADE_GLACIER_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset before next Initiative</button>}</div>}</div>}
    </div>
  </section>;
}

function RogueControls({ character, onChange, onRoll, stealthModifier }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => RollOutcome;
  stealthModifier: number;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = build.selectedTalents ?? [];
  const conditionOptions = ['Deafened', 'Exposed', 'Hindered', 'Slowed 2'];
  const selectedConditions = (selections[ROGUE_DEBILITATING_CONDITIONS] ?? '').split('|').filter(Boolean);
  const maximumConditions = character.level >= 5 ? conditionOptions.length : 1;
  const debilitatingCost = selectedConditions.length;
  const cunningActions = character.subclass === 'Swashbuckler'
    ? ['Disengage', 'Feint', 'Hide', 'Disarm', 'Dodge']
    : ['Disengage', 'Feint', 'Hide'];
  const cunningAction = cunningActions.includes(selections[ROGUE_CUNNING_ACTION]) ? selections[ROGUE_CUNNING_ACTION] : cunningActions[0];
  const distinctConditions = Math.max(0, Math.trunc(counters[ROGUE_CHEAP_SHOT_CONDITIONS] ?? 0));
  const sinisterShotCount = talents.filter((name) => name === 'Sinister Shot').length;
  const targetFlanked = Boolean(states[ROGUE_TARGET_FLANKED]);
  const targetHidden = Boolean(states[ROGUE_TARGET_HIDDEN]);
  const cheapShotQualifies = targetFlanked || targetHidden || distinctConditions > 0;
  const cheapShotDamage = rogueCheapShotDamage(character.level, distinctConditions, sinisterShotCount);
  const grantedLanguages = grantedClassLanguageNames(character);
  const skillCap = skillMasteryCap(character);
  const updateBuild = (values: Partial<NonNullable<Character['build']>>) => onChange({ build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const setCounter = (key: string, value: number) => updateBuild({ sheetFeatureCounters: { ...counters, [key]: value } });
  const toggleDebilitatingCondition = (condition: string) => {
    const next = selectedConditions.includes(condition)
      ? selectedConditions.filter((entry) => entry !== condition)
      : selectedConditions.length < maximumConditions ? [...selectedConditions, condition] : selectedConditions;
    updateBuild({
      sheetFeatureSelections: { ...selections, [ROGUE_DEBILITATING_CONDITIONS]: next.join('|') },
      sheetFeatureStates: { ...states, [ROGUE_DEBILITATING_ACTIVE]: false },
    });
  };
  const useDebilitatingStrike = () => {
    if (debilitatingCost < 1 || character.stamina < debilitatingCost) return;
    onChange({
      stamina: character.stamina - debilitatingCost,
      build: { ...build, sheetFeatureStates: { ...states, [ROGUE_DEBILITATING_ACTIVE]: true } },
    });
  };
  const regainStamina = () => {
    if (states[ROGUE_REGEN_USED]) return;
    onChange({
      stamina: Math.min(character.maxStamina, character.stamina + rogueStaminaRegenAmount(character.maxStamina)),
      build: { ...build, sheetFeatureStates: { ...states, [ROGUE_REGEN_USED]: true } },
    });
  };

  return <section className="mb-5 rounded-2xl border border-slate-400/25 bg-gradient-to-br from-slate-950/80 via-indigo-950/35 to-slate-950/70 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Live Class Features</p><h2 className="text-xl font-black text-white">Rogue Controls</h2></div><div className="flex flex-wrap gap-1.5"><span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-100">Skill cap: {masteryTitle(skillCap)} (+{skillCap * 2})</span>{grantedLanguages.map((language) => <span key={language} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">Fluent: {language}</span>)}</div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-2"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-violet-200">Debilitating Strike</h3><p className="mt-1 text-xs text-slate-500">After a Weapon Attack • Physical Save DC {10 + character.primeModifier + character.combatMastery} • 1 Round</p></div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs font-black text-violet-200">{debilitatingCost || 0} SP</span></div><p className="mt-3 text-xs leading-5 text-slate-400">Choose the effect imposed on a failed Save. Expert Rogue can spend 1 additional SP for each additional condition.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{conditionOptions.map((condition) => { const selected = selectedConditions.includes(condition); const disabled = !selected && selectedConditions.length >= maximumConditions; return <button type="button" key={condition} disabled={disabled} onClick={() => toggleDebilitatingCondition(condition)} className={`rounded-lg border px-3 py-2 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-35 ${selected ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{condition}</button>; })}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={debilitatingCost < 1 || character.stamina < debilitatingCost || Boolean(states[ROGUE_DEBILITATING_ACTIVE])} onClick={useDebilitatingStrike} className="flex-1 rounded-lg bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Apply on Hit • spend {debilitatingCost || 1} SP</button>{states[ROGUE_DEBILITATING_ACTIVE] && <button type="button" onClick={() => setState(ROGUE_DEBILITATING_ACTIVE, false)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">End after 1 Round</button>}</div>{states[ROGUE_DEBILITATING_ACTIVE] && <div className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 p-2 text-xs leading-5 text-rose-100"><strong>Target:</strong> {selectedConditions.join(', ')}{character.subclass === 'Long Death' ? ' • Bleeding from Thousand Cuts; its end DC equals your Save DC and regaining HP cannot end it.' : ''}</div>}{talents.includes('Unseen Ambusher') && <p className="mt-3 text-xs text-indigo-200"><strong>Backstab:</strong> a target you are Hidden from has DisADV on this Save.</p>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-cyan-200">Rogue Stamina Regen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Round after hitting a Flanked or Prone target, hitting a target with a Condition, hitting a target you’re Hidden from, or gaining Cunning Action’s benefit.</p><p className="mt-2 text-xs font-bold text-cyan-300">Up to {rogueStaminaRegenAmount(character.maxStamina)} SP</p><button type="button" disabled={Boolean(states[ROGUE_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={regainStamina} className="mt-3 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{states[ROGUE_REGEN_USED] ? 'Used This Round' : 'Regain Stamina'}</button>{states[ROGUE_REGEN_USED] && <button type="button" onClick={() => setState(ROGUE_REGEN_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next round</button>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-emerald-200">Cunning Action</h3><p className="mt-2 text-xs leading-5 text-slate-400">Gain {Math.ceil(character.speed / 2)} Spaces of movement immediately before or after the selected Action.</p><select value={cunningAction} onChange={(event) => setSelection(ROGUE_CUNNING_ACTION, event.target.value)} className={`${fieldClass} mt-3`}>{cunningActions.map((action) => <option key={action}>{action}</option>)}</select><button type="button" onClick={() => setState(ROGUE_CUNNING_ACTIVE, true)} className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Gain {Math.ceil(character.speed / 2)} movement</button>{states[ROGUE_CUNNING_ACTIVE] && <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-100">Cunning Action benefit active for {cunningAction}. This also qualifies Rogue Stamina Regen.</div>}{states[ROGUE_CUNNING_ACTIVE] && <button type="button" onClick={() => setState(ROGUE_CUNNING_ACTIVE, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Movement used</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-amber-200">Cheap Shot</h3><p className="mt-2 text-xs leading-5 text-slate-400">Qualifies against a Flanked or Prone target, a target with any Condition other than Invisible, or a target you’re Hidden from.</p><div className="mt-3 space-y-2 text-xs text-slate-300"><label className="flex items-center gap-2"><input type="checkbox" checked={targetFlanked} onChange={(event) => setState(ROGUE_TARGET_FLANKED, event.target.checked)} />Target is Flanked or Prone</label><label className="flex items-center gap-2"><input type="checkbox" checked={targetHidden} onChange={(event) => setState(ROGUE_TARGET_HIDDEN, event.target.checked)} />You’re Hidden from target</label><label className="block font-bold text-slate-400">Distinct Conditions other than Invisible<input type="number" min={0} max={10} value={distinctConditions} onChange={(event) => setCounter(ROGUE_CHEAP_SHOT_CONDITIONS, Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-1`} /></label></div><div className={`mt-3 rounded-lg p-3 text-sm font-black ${cheapShotQualifies ? 'bg-amber-500/15 text-amber-100' : 'bg-slate-900 text-slate-500'}`}>{cheapShotQualifies ? `+${cheapShotDamage} damage on Martial Attacks` : 'Target does not currently qualify'}</div>{sinisterShotCount > 0 && <p className="mt-2 text-xs text-amber-200">Sinister Shot ×{sinisterShotCount}: each Condition beyond the first adds +{sinisterShotCount} damage.</p>}</div>}
      {talents.includes('Unseen Ambusher') && <div className="rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-4"><h3 className="font-black text-indigo-200">Unseen Ambusher</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Skulker:</strong> ADV on Stealth Checks made in Combat. <strong>Backstab:</strong> enemies you’re Hidden from have DisADV on Debilitating Strike Saves.</p><button type="button" onClick={() => onRoll('Stealth Check (Combat)', stealthModifier, 1)} className="mt-3 w-full rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white">Roll combat Stealth with ADV</button></div>}
      {character.subclass === 'Long Death' && <div className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-4"><h3 className="font-black text-rose-200">Long Death</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Thousand Cuts:</strong> failed Debilitating Strike Saves also cause Bleeding, even against immunity. <strong>Hundred Ways to Die:</strong> ADV on Checks to determine how something died or could die easier, including poisons, toxins, and killing materials.</p></div>}
      {character.subclass === 'Swashbuckler' && <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4 lg:col-span-2"><h3 className="font-black text-fuchsia-200">Renegade Duelist</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Flourishes:</strong> Disarm and Dodge now trigger Cunning Action. <strong>Riposte:</strong> a creature in Melee Range that misses you provokes an Opportunity Attack.</p><button type="button" disabled={!cheapShotQualifies || Boolean(states[ROGUE_TAUNT_USED])} onClick={() => setState(ROGUE_TAUNT_USED, true)} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{states[ROGUE_TAUNT_USED] ? 'Taunting Shot used this Round' : `Forgo Cheap Shot • Charisma Save DC ${10 + character.primeModifier + character.combatMastery}`}</button>{states[ROGUE_TAUNT_USED] && <><p className="mt-2 rounded-lg bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100">Save Failure: target is Taunted by you until the end of your next turn.</p><button type="button" onClick={() => setState(ROGUE_TAUNT_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next round</button></>}</div>}
    </div>
  </section>;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onClose, onEdit, onCharacterChange }) => {
  const [selectedTab, setSelectedTab] = useState<SheetTab>('overview');
  const [lastRoll, setLastRoll] = useState<RollOutcome | null>(null);
  const [conditionToAdd, setConditionToAdd] = useState('Bleeding');
  const [expandedSkills, setExpandedSkills] = useState(true);
  const [expandedTrades, setExpandedTrades] = useState(false);
  const { equipment: equipmentCatalog } = useEquipmentCatalog();
  const { spells: spellCatalog, maneuvers: maneuverCatalog } = usePowerCatalog();
  const { reference } = useCharacterReference();
  const classReference = reference?.classes.find(({ name }) => name === character.class);
  const build = character.build;
  const rollAdjustment = build?.rollAdjustment ?? 0;
  const conditionLevels = build?.sheetConditionLevels ?? {};
  const featureStates = build?.sheetFeatureStates ?? {};
  const featureSelections = build?.sheetFeatureSelections ?? {};
  const featureCounters = build?.sheetFeatureCounters ?? {};
  const notes = build?.characterNotes ?? [];
  const sheetEffects = characterSheetEffects(character);
  const isBarbarian = character.class === 'Barbarian';
  const isRogue = character.class === 'Rogue';
  const isSummoner = character.class === 'Summoner';
  const isSpellblade = character.class === 'Spellblade';
  const isRaging = isBarbarian && Boolean(featureStates[BARBARIAN_RAGE_STATE]);
  const hasUnfathomableStrength = (build?.selectedTalents ?? []).includes('Unfathomable Strength');
  const battlecryShout = featureSelections[BARBARIAN_BATTLECRY_SELECTION] || 'Fortitude Shout';
  const storedBattlecryEnhancement = character.level >= 5 ? Math.max(0, featureCounters[BARBARIAN_BATTLECRY_ENHANCEMENT] ?? 0) : 0;
  const battlecryEnhancementSP = battlecryShout === 'Fortitude Shout' ? Math.min(1, storedBattlecryEnhancement)
    : battlecryShout === 'Fury Shout' ? (storedBattlecryEnhancement >= 3 ? 3 : 0)
      : Math.min(2, storedBattlecryEnhancement);
  const battlecryActive = Boolean(featureStates[BARBARIAN_BATTLECRY_STATE]);
  const grantedManeuvers = grantedClassManeuverNames(character);
  const grantedSpells = grantedClassSpellNames(character);
  const knownSpells = useMemo(() => {
    const result = [...character.spells];
    for (const name of grantedSpells) {
      if (result.some((spell) => spell.name === name)) continue;
      const spell = spellCatalog.find((entry) => entry.name === name);
      if (spell) result.push({ id: `spell|${spell.name}`, ...spell });
    }
    return result;
  }, [character.spells, grantedSpells, spellCatalog]);
  const knownManeuvers = useMemo(() => {
    const result = [...character.maneuvers];
    for (const name of grantedManeuvers) {
      if (result.some((maneuver) => maneuver.name === name)) continue;
      const maneuver = maneuverCatalog.find((entry) => entry.name === name);
      if (maneuver) result.push({ id: `maneuver|${maneuver.name}`, type: maneuver.category, ...maneuver });
    }
    return result;
  }, [character.maneuvers, grantedManeuvers, maneuverCatalog]);

  const update = (values: Partial<Character>) => {
    let next = { ...character, ...values };
    if (values.inventoryItems && classReference && reference && equipmentCatalog.length > 0) {
      next = applyDerivedCharacter(next, deriveCharacter(next, classReference, reference.ancestryTraits, equipmentCatalog));
    }
    onCharacterChange?.(next);
  };
  const updateBuild = (values: Partial<NonNullable<Character['build']>>) => {
    if (!build) return;
    update({ build: { ...build, ...values } });
  };

  const roll = (label: string, modifier: number, extraAdjustment = 0): RollOutcome => {
    const featureAdjustment = label === 'Might Save' ? (sheetEffects.saveAdvantage.Might ?? 0) : 0;
    const totalAdjustment = Math.max(-5, Math.min(5, rollAdjustment + featureAdjustment + extraAdjustment));
    const dice = Array.from({ length: 1 + Math.abs(totalAdjustment) }, () => Math.floor(Math.random() * 20) + 1);
    const chosen = totalAdjustment > 0 ? Math.max(...dice) : totalAdjustment < 0 ? Math.min(...dice) : dice[0];
    const result = { label, dice, chosen, modifier, total: chosen + modifier };
    setLastRoll(result);
    return result;
  };

  const setFeatureState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...featureStates, [key]: value } });

  const enterRage = (free = false) => {
    if (!build || !isBarbarian || isRaging || (!free && (character.currentAP < 1 || character.stamina < 1))) return;
    update({
      currentAP: free ? character.currentAP : character.currentAP - 1,
      stamina: free ? character.stamina : character.stamina - 1,
      build: { ...build, sheetFeatureStates: { ...featureStates, [BARBARIAN_RAGE_STATE]: true } },
    });
  };

  const endRage = () => {
    if (!build) return;
    update({
      inventoryItems: enforceEquipmentHandCapacity(character.inventoryItems ?? [], equipmentCatalog),
      build: { ...build, sheetFeatureStates: { ...featureStates, [BARBARIAN_RAGE_STATE]: false } },
    });
  };

  const useStaminaRegen = () => {
    if (!build || featureStates[BARBARIAN_REGEN_USED]) return;
    update({
      stamina: Math.min(character.maxStamina, character.stamina + barbarianStaminaRegenAmount(character.maxStamina)),
      build: { ...build, sheetFeatureStates: { ...featureStates, [BARBARIAN_REGEN_USED]: true } },
    });
  };

  const useBattlecry = () => {
    if (!build || character.level < 2) return;
    const enhancementCost = battlecryShout === 'Fortitude Shout' ? Math.min(1, battlecryEnhancementSP)
      : battlecryShout === 'Fury Shout' ? (battlecryEnhancementSP >= 3 ? 3 : 0)
        : Math.min(2, battlecryEnhancementSP);
    const staminaCost = 1 + enhancementCost;
    if (character.currentAP < 1 || character.stamina < staminaCost) return;
    update({
      currentAP: character.currentAP - 1,
      stamina: character.stamina - staminaCost,
      build: {
        ...build,
        sheetFeatureStates: { ...featureStates, [BARBARIAN_BATTLECRY_STATE]: true },
        sheetFeatureCounters: { ...featureCounters, [BARBARIAN_BATTLECRY_ENHANCEMENT]: enhancementCost },
      },
    });
  };

  const useElementalBlast = () => {
    if (character.subclass !== 'Elemental Fury' || !isRaging || character.currentAP < 1 || character.stamina < 1) return;
    update({ currentAP: character.currentAP - 1, stamina: character.stamina - 1 });
    roll('Elemental Blast', character.primeModifier + character.combatMastery);
  };

  const toggleInventoryEquipped = (items: CharacterInventoryItem[], inventoryID: string, catalog: EquipmentCatalogItem[]) => (
    toggleInventoryEquippedBase(items, inventoryID, catalog, {
      twoHandedWeaponHandCost: isRaging && hasUnfathomableStrength ? 1 : 2,
    })
  );

  const setCondition = (name: string, level: number) => {
    const updated = { ...conditionLevels };
    if (level <= 0) delete updated[name]; else updated[name] = Math.min(10, level);
    updateBuild({ sheetConditionLevels: updated });
  };

  const classFeatures = classReference?.features.filter(({ level }) => level <= character.level) ?? [];
  const selectedAncestryTraitIDs = new Set(build?.selectedAncestryTraitIDs ?? []);
  const ancestryTraits = reference?.ancestryTraits.filter(({ id }) => selectedAncestryTraitIDs.has(id)) ?? [];
  const skillGroups = reference?.skillGroups ?? [];
  const tradeGroups = reference?.tradeGroups ?? [];

  const skillModifier = (name: string, mastery: MasteryLevel): number => {
    const skill = reference?.skills.find(({ name: candidate }) => candidate === name);
    const attribute = skill?.attribute === 'Prime' ? character.primeModifier : character.attributes[skill?.attribute as DC20Attribute]?.modifier ?? 0;
    const expertise = character.class === 'Rogue' ? 0 : ancestryTraits.filter((trait) => trait.name === 'Skill Expertise' && build?.ancestryTraitChoices[trait.id]?.[0] === name).length;
    return attribute + masteryBonus(masteryTitle(masteryRank(mastery) + expertise));
  };

  const tradeModifier = (name: string, mastery: MasteryLevel): number => {
    const trade = reference?.trades.find(({ name: candidate }) => candidate === name);
    const availableAttributes = (trade?.attribute ?? '').split(/, | or /).filter((attribute) => ATTRIBUTE_NAMES.includes(attribute as DC20Attribute));
    const attribute = Math.max(0, ...availableAttributes.map((name) => character.attributes[name as DC20Attribute]?.modifier ?? 0));
    const expertise = ancestryTraits.filter((trait) => trait.name === 'Trade Expertise' && build?.ancestryTraitChoices[trait.id]?.[0] === name).length;
    return attribute + masteryBonus(masteryTitle(masteryRank(mastery) + expertise));
  };

  const updateNote = (note: CampaignNote) => updateBuild({ characterNotes: notes.map((entry) => entry.id === note.id ? note : entry) });
  const featureDescription = (name: string, description: string): string => {
    const selections = (classReference?.choiceGroups ?? [])
      .filter((group) => group.feature === name)
      .flatMap((group) => (build?.classFeatureSelections[group.id] ?? []).map((choice) => `${group.title}: ${choice}`));
    return selections.length > 0 ? `${description}\n\nSelected Options\n• ${selections.join('\n• ')}` : description;
  };
  const selectedTalentCounts = Object.entries((build?.selectedTalents ?? []).reduce<Record<string, number>>((counts, name) => {
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {}));

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_42%,#020617_100%)] p-4 lg:p-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 rounded-2xl border border-violet-400/20 bg-slate-950/65 p-4 shadow-2xl shadow-black/20 sm:p-5">
          <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4 xl:grid-cols-[8rem_minmax(0,1fr)_auto]"><CharacterAvatarEditor image={character.avatarDataURL} name={character.name} onChange={(avatarDataURL) => update({ avatarDataURL })} className="w-20 shrink-0 sm:w-32" compact /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300 sm:text-xs sm:tracking-[0.25em]">Interactive Character Sheet</p><h1 title={character.name} className="mt-1 truncate whitespace-nowrap text-2xl font-black text-white sm:text-4xl">{character.name}</h1><p className="mt-2 text-sm text-slate-400 sm:text-base">Level {character.level} {character.ancestry} {character.class}{character.subclass ? ` • ${character.subclass}` : ''}</p></div><div className="col-span-2 flex flex-wrap gap-2 sm:justify-end xl:col-span-1">{onEdit && <button type="button" onClick={onEdit} className="min-h-11 rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-500">Return to Builder</button>}{onClose && <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">Characters</button>}</div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><ResourceControl label="Health" value={character.healthPoints} maximum={character.maxHealthPoints} tone="text-red-300" onChange={(healthPoints) => update({ healthPoints })} /><ResourceControl label="Action Points" value={character.currentAP} maximum={character.maxAP} tone="text-violet-300" onChange={(currentAP) => update({ currentAP })} /><ResourceControl label="Stamina" value={character.stamina} maximum={character.maxStamina} tone="text-sky-300" onChange={(stamina) => update({ stamina })} /><ResourceControl label="Mana" value={character.manaPoints} maximum={character.maxManaPoints} tone="text-fuchsia-300" onChange={(manaPoints) => update({ manaPoints })} /><div className="rounded-xl border border-white/10 bg-slate-950/55 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Temporary HP</div><div className="mt-2 flex items-center justify-between"><button type="button" onClick={() => updateBuild({ temporaryHP: Math.max(0, (build?.temporaryHP ?? 0) - 1) })} className="h-8 w-8 rounded-lg bg-slate-800">−</button><span className="text-xl font-black text-emerald-300">{build?.temporaryHP ?? 0}</span><button type="button" onClick={() => updateBuild({ temporaryHP: (build?.temporaryHP ?? 0) + 1 })} className="h-8 w-8 rounded-lg bg-slate-800">+</button></div></div></div>
        </header>

        {isBarbarian && <section className="mb-5 rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-950/55 to-slate-950/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Live Class Features</p><h2 className="text-xl font-black text-white">Barbarian Controls</h2></div>{isRaging && <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">Raging</span>}</div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-orange-200">Rage</h3><p className="mt-1 text-xs text-slate-500">1 minute • ends early if Unconscious, dead, or ended freely</p></div><span className="text-2xl">🔥</span></div>{isRaging ? <><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-red-500/10 p-2 text-red-100">PD <strong>{sheetEffects.physicalDefense}</strong> <span className="text-slate-500">(base {character.physicalDefense})</span></div><div className="rounded-lg bg-orange-500/10 p-2 text-orange-100">Melee/Unarmed <strong>+{sheetEffects.martialMeleeDamageBonus} damage</strong></div><div className="rounded-lg bg-violet-500/10 p-2 text-violet-100">Might Saves <strong>ADV</strong></div><div className="rounded-lg bg-sky-500/10 p-2 text-sky-100">Physical & Elemental <strong>Resistance (Half)</strong></div>{character.subclass === 'Spirit Guardian' && <div className="col-span-2 rounded-lg bg-fuchsia-500/10 p-2 text-fuchsia-100">Spiritual Aura: <strong>Mystical Resistance (1)</strong> and a 5 Space Aura</div>}{character.subclass === 'Elemental Fury' && <div className="col-span-2 rounded-lg bg-emerald-500/10 p-2 text-emerald-100">Raging Elements: <strong>{build?.classFeatureSelections['barbarian.elementalDamage']?.[0] ?? 'Choose damage type'}</strong> • {build?.classFeatureSelections['barbarian.elementalAura']?.[0] ?? 'Choose aura type'}</div>}</div><button type="button" onClick={endRage} className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-black text-slate-200">End Rage (Free)</button></> : <div className="mt-3 space-y-2"><button type="button" disabled={character.currentAP < 1 || character.stamina < 1} onClick={() => enterRage(false)} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Enter Rage • 1 AP + 1 SP</button>{character.level >= 5 && <button type="button" onClick={() => enterRage(true)} className="w-full rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-200">Enter for free after rolling Initiative</button>}</div>}{hasUnfathomableStrength && <p className="mt-3 text-xs leading-5 text-amber-200">Unfathomable Strength: while Raging, Two-Handed Weapons use 1 hand and your Jump Distance increases by 1.</p>}</div>

            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-sky-200">Stamina Regen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per round, regain up to half your maximum SP after you score a Heavy or Critical Hit, or one is scored against you.</p><p className="mt-2 text-xs font-bold text-sky-300">Up to {barbarianStaminaRegenAmount(character.maxStamina)} SP</p><button type="button" disabled={Boolean(featureStates[BARBARIAN_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={useStaminaRegen} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{featureStates[BARBARIAN_REGEN_USED] ? 'Used This Round' : 'Regain Stamina'}</button>{featureStates[BARBARIAN_REGEN_USED] && <button type="button" onClick={() => setFeatureState(BARBARIAN_REGEN_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next round</button>}</div>

            {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-violet-200">Battlecry</h3><p className="mt-1 text-xs text-slate-500">1 AP + 1 SP • {character.level >= 5 ? '10' : '5'} Spaces • until the start of your next turn</p><label className="mt-3 block text-xs font-bold text-slate-400">Shout<select value={battlecryShout} onChange={(event) => updateBuild({ sheetFeatureSelections: { ...featureSelections, [BARBARIAN_BATTLECRY_SELECTION]: event.target.value }, sheetFeatureCounters: { ...featureCounters, [BARBARIAN_BATTLECRY_ENHANCEMENT]: 0 }, sheetFeatureStates: { ...featureStates, [BARBARIAN_BATTLECRY_STATE]: false } })} className={`${fieldClass} mt-1`}><option>Fortitude Shout</option><option>Fury Shout</option><option>Urgent Shout</option></select></label>{character.level >= 5 && <label className="mt-2 block text-xs font-bold text-slate-400">Expert Enhancement<select value={battlecryEnhancementSP} onChange={(event) => updateBuild({ sheetFeatureCounters: { ...featureCounters, [BARBARIAN_BATTLECRY_ENHANCEMENT]: Number(event.target.value) }, sheetFeatureStates: { ...featureStates, [BARBARIAN_BATTLECRY_STATE]: false } })} className={`${fieldClass} mt-1`}><option value={0}>None</option>{battlecryShout === 'Fortitude Shout' && <option value={1}>1 SP • Resistance (Half)</option>}{battlecryShout === 'Fury Shout' && <option value={3}>3 SP • +1 additional damage</option>}{battlecryShout === 'Urgent Shout' && <><option value={1}>1 SP • +2 additional Speed</option><option value={2}>2 SP • +4 additional Speed</option></>}</select></label>}{battlecryActive && <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/10 p-2 text-xs leading-5 text-violet-100">{battlecryShout === 'Fortitude Shout' ? `Resistance (${battlecryEnhancementSP >= 1 ? 'Half' : '1'}) against the next source of Physical or Elemental damage.` : battlecryShout === 'Fury Shout' ? `+${battlecryEnhancementSP >= 3 ? 2 : 1} damage on the next Attack against 1 target.` : `+${1 + Math.min(2, battlecryEnhancementSP) * 2} Speed until the start of your next turn.`}</div>}<div className="mt-3 flex gap-2"><button type="button" disabled={battlecryActive || character.currentAP < 1 || character.stamina < 1 + battlecryEnhancementSP} onClick={useBattlecry} className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{battlecryActive ? 'Active' : `Use • 1 AP + ${1 + battlecryEnhancementSP} SP`}</button>{battlecryActive && <button type="button" onClick={() => setFeatureState(BARBARIAN_BATTLECRY_STATE, false)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Clear</button>}</div></div>}
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-3"><h3 className="font-black text-amber-200">Berserker Benefits</h3><div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4"><p><strong className="text-slate-100">Charge:</strong> move up to {character.level >= 5 ? '3 Spaces and ignore Difficult Terrain' : '2 Spaces'} immediately before a Melee Martial Attack.</p><p><strong className="text-slate-100">Berserker Defense:</strong> +2 AD while unarmored; included in your displayed AD when applicable.</p><p><strong className="text-slate-100">Fast Movement:</strong> +1 Speed; included in your displayed Speed.</p><p><strong className="text-slate-100">Mighty Leap:</strong> use Might instead of Agility for Jump Distance and Falling damage.</p></div>{character.subclass === 'Elemental Fury' && isRaging && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3"><p className="text-xs leading-5 text-emerald-100"><strong>Elemental Blast:</strong> Area Spell Attack vs AD; 1 Elemental Rage damage. A single target uses PD and takes 2 damage.</p><button type="button" disabled={character.currentAP < 1 || character.stamina < 1} onClick={useElementalBlast} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Roll & Spend • 1 AP + 1 SP</button></div>}</div>
          </div>
        </section>}

        {isSummoner && <SummonerControls character={character} onChange={update} />}
        {isSpellblade && <SpellbladeControls character={character} onChange={update} onRoll={roll} />}
        {isRogue && <RogueControls character={character} onChange={update} onRoll={roll} stealthModifier={skillModifier('Stealth', character.skillMasteries.Stealth ?? 'Untrained')} />}

        <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_330px]"><nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:grid-cols-3 lg:grid-cols-6">{tabs.map((tab) => <button type="button" key={tab.id} onClick={() => setSelectedTab(tab.id)} className={`rounded-xl px-3 py-3 text-sm font-bold ${selectedTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>{tab.label}</button>)}</nav><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3"><button type="button" onClick={() => updateBuild({ rollAdjustment: Math.max(-5, rollAdjustment - 1) })} className="h-9 w-9 rounded-lg bg-slate-800 text-lg">−</button><div className="text-center"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Roll Mode</div><div className="font-black text-violet-200">{rollAdjustment > 0 ? `${rollAdjustment}× Advantage` : rollAdjustment < 0 ? `${Math.abs(rollAdjustment)}× Disadvantage` : 'Normal'}</div></div><button type="button" onClick={() => updateBuild({ rollAdjustment: Math.min(5, rollAdjustment + 1) })} className="h-9 w-9 rounded-lg bg-violet-600 text-lg">+</button></div></div>

        {lastRoll && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4"><div><span className="font-black text-violet-200">{lastRoll.label}</span><span className="ml-3 text-sm text-slate-400">Dice: {lastRoll.dice.join(', ')} • chosen {lastRoll.chosen} {lastRoll.modifier >= 0 ? '+' : '−'} {Math.abs(lastRoll.modifier)}</span></div><div className="text-3xl font-black text-white">{lastRoll.total}</div></div>}

        <main className={`${panelClass} min-h-[560px]`}>
          {selectedTab === 'overview' && <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3"><section className={panelClass}><h2 className="font-black text-violet-200">Combat</h2><div className="mt-4 grid grid-cols-2 gap-3">{[['Physical Defense', sheetEffects.physicalDefense], ['Arcane Defense', character.arcaneDefense], ['Combat Mastery', `+${character.combatMastery}`], ['Speed', sheetEffects.speed], ['Martial Check', `+${character.primeModifier + character.combatMastery}`], ['Spell Check', `+${character.primeModifier + character.combatMastery}`], ['Class Save DC', 10 + character.primeModifier + character.combatMastery], ['Death Threshold', -4]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-950/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div>{label === 'Physical Defense' && isRaging && <div className="text-[10px] font-bold text-red-300">Rage: −5</div>}{label === 'Speed' && sheetEffects.speed !== character.speed && <div className="text-[10px] font-bold text-sky-300">Active Rune: +1</div>}</div>)}</div>{sheetEffects.resistances.length > 0 && <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/5 p-2 text-xs text-sky-100"><strong>Active Resistances:</strong> {sheetEffects.resistances.join(' • ')}</div>}</section><section className={panelClass}><h2 className="font-black text-violet-200">Attributes</h2><div className="mt-4 grid grid-cols-2 gap-3">{ATTRIBUTE_NAMES.map((attribute) => <button type="button" key={attribute} onClick={() => roll(`${attribute} Check`, character.attributes[attribute].modifier)} className="rounded-lg bg-slate-950/55 p-3 text-left hover:bg-violet-500/10"><div className="text-xs text-slate-500">{attribute}</div><div className="text-xl font-black text-slate-100">{character.attributes[attribute].modifier >= 0 ? '+' : ''}{character.attributes[attribute].modifier}</div><div className="text-xs text-violet-300">Roll check</div></button>)}</div></section><section className={panelClass}><div className="flex items-center justify-between"><h2 className="font-black text-violet-200">Active Conditions</h2><div className="flex gap-2"><select value={conditionToAdd} onChange={(event) => setConditionToAdd(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select><button type="button" onClick={() => setCondition(conditionToAdd, conditionLevels[conditionToAdd] ?? 1)} className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold">Add</button></div></div><div className="mt-4 space-y-2">{Object.entries(conditionLevels).length === 0 ? <p className="text-sm text-slate-500">No active conditions.</p> : Object.entries(conditionLevels).sort().map(([condition, value]) => <div key={condition} className="flex items-center justify-between rounded-lg bg-slate-950/55 p-3"><span className="font-bold text-slate-200">{condition}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setCondition(condition, value - 1)} className="h-7 w-7 rounded bg-slate-800">−</button><span className="min-w-6 text-center font-black text-violet-200">{value}</span><button type="button" onClick={() => setCondition(condition, value + 1)} className="h-7 w-7 rounded bg-slate-800">+</button><button type="button" onClick={() => setCondition(condition, 0)} className="ml-1 text-xs font-bold text-red-300">×</button></div></div>)}</div></section><section className={`${panelClass} lg:col-span-2 xl:col-span-3`}><h2 className="font-black text-violet-200">Background</h2><h3 className="mt-3 text-lg font-black text-slate-200">{build?.backgroundName || character.background || 'Unnamed Background'}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{build?.backgroundStory || 'No background story has been written yet.'}</p></section></div>}

          {selectedTab === 'checks' && <div className="space-y-5"><section><h2 className="mb-3 font-black text-violet-200">Attribute Saves</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = character.attributes[attribute].modifier + character.combatMastery; return <button type="button" key={attribute} onClick={() => roll(`${attribute} Save`, modifier)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-violet-400/40"><div className="text-xs text-slate-500">{attribute} Save</div><div className="text-2xl font-black text-violet-200">+{modifier}</div></button>; })}</div></section><section><button type="button" onClick={() => setExpandedSkills((value) => !value)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-violet-200"><span>Skills</span><span>{expandedSkills ? 'Collapse' : 'Expand'}</span></button>{expandedSkills && <div className="space-y-5">{skillGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.skillMasteries[name] ?? 'Untrained'; const modifier = skillModifier(name, mastery); return <button type="button" key={name} onClick={() => roll(`${name} Check`, modifier)} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-violet-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{mastery}</span></span><span className="font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</span></button>; })}</div></div>)}</div>}</section><section><button type="button" onClick={() => setExpandedTrades((value) => !value)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-fuchsia-200"><span>Trades</span><span>{expandedTrades ? 'Collapse' : 'Expand'}</span></button>{expandedTrades && <div className="space-y-5">{tradeGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.tradeMasteries[name] ?? 'Untrained'; const modifier = tradeModifier(name, mastery); return <button type="button" key={name} onClick={() => roll(`${name} Trade Check`, modifier)} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-fuchsia-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{mastery}</span></span><span className="font-black text-fuchsia-200">{modifier >= 0 ? '+' : ''}{modifier}</span></button>; })}</div></div>)}</div>}</section></div>}

          {selectedTab === 'powers' && <div><div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Martial Check</div><div className="text-2xl font-black text-violet-200">+{character.primeModifier + character.combatMastery}</div></div><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Spell Check</div><div className="text-2xl font-black text-fuchsia-200">+{character.primeModifier + character.combatMastery}</div></div><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Class Save DC</div><div className="text-2xl font-black text-sky-200">{10 + character.primeModifier + character.combatMastery}</div></div></div><div className="grid gap-5 lg:grid-cols-2"><section><h2 className="mb-3 font-black text-fuchsia-200">Spells</h2><div className="space-y-2">{knownSpells.length === 0 ? <p className="text-slate-500">No spells known.</p> : knownSpells.map((spell) => <Details key={spell.id} title={spell.name} subtitle={[spell.source, spell.school, spell.cost, spell.range, grantedSpells.includes(spell.name) ? 'Granted by Summoner feature' : ''].filter(Boolean).join(' • ')}>{spell.description}{spell.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{spell.enhancements}</p></>}</Details>)}</div></section><section><h2 className="mb-3 font-black text-violet-200">Maneuvers</h2><div className="space-y-2">{knownManeuvers.length === 0 ? <p className="text-slate-500">No maneuvers known.</p> : knownManeuvers.map((maneuver) => <Details key={maneuver.id} title={maneuver.name} subtitle={[maneuver.category ?? maneuver.type, maneuver.cost, maneuver.range, grantedManeuvers.includes(maneuver.name) ? 'Granted by Bestowed Protection' : ''].filter(Boolean).join(' • ')}>{maneuver.description}{maneuver.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{maneuver.enhancements}</p></>}</Details>)}</div></section></div></div>}

          {selectedTab === 'features' && <div className="grid gap-5 lg:grid-cols-3"><section><h2 className="mb-3 font-black text-violet-200">Class Features</h2><div className="space-y-3">{classFeatures.map((entry) => <div key={entry.level}><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Level {entry.level}</h3><div className="space-y-2">{entry.features.map((feature) => <Details key={`${entry.level}-${feature.name}`} title={feature.name}>{featureDescription(feature.name, feature.description)}</Details>)}</div></div>)}{character.subclass && (classReference?.subclassFeatures[character.subclass] ?? []).filter((feature) => feature.level === undefined || feature.level <= character.level).map((feature) => <Details key={`subclass-${feature.name}`} title={feature.name} subtitle={`${character.subclass}${feature.level !== undefined ? ` • Level ${feature.level}` : ''}`}>{featureDescription(feature.name, feature.description)}</Details>)}</div></section><section><h2 className="mb-3 font-black text-fuchsia-200">Talents</h2><div className="space-y-2">{selectedTalentCounts.length === 0 ? <p className="text-slate-500">No talents selected.</p> : selectedTalentCounts.map(([name, count]) => { const talent = classReference?.talents.find(({ name: candidate }) => candidate === name); const description = talent?.description ?? 'Talent details are unavailable.'; return <Details key={name} title={`${name}${count > 1 ? ` ×${count}` : ''}`}>{featureDescription(name, description)}</Details>; })}</div></section><section><h2 className="mb-3 font-black text-emerald-200">Ancestry Traits</h2><div className="space-y-2">{ancestryTraits.length === 0 ? <p className="text-slate-500">No ancestry traits selected.</p> : ancestryTraits.map((trait) => <Details key={trait.id} title={trait.name} subtitle={`${trait.ancestry} • ${trait.cost > 0 ? '+' : ''}${trait.cost} AP`}>{trait.description}{build?.ancestryTraitChoices[trait.id]?.length ? `\n\nChoice: ${build.ancestryTraitChoices[trait.id].join(', ')}` : ''}</Details>)}</div></section></div>}

          {selectedTab === 'equipment' && <div><div className="mb-6"><h2 className="font-black text-violet-200">Inventory & Equipped Gear</h2><p className="mt-1 text-sm text-slate-500">Add equipment from the main Equipment tab. Armor and hand limits are enforced when equipping.</p></div>{(character.inventoryItems?.length ?? 0) + character.equipment.length > 0 ? <div className="space-y-2">{(character.inventoryItems ?? []).map((inventory) => { const item = equipmentCatalog.find(({ id }) => id === inventory.equipmentID); if (!item) return <div key={inventory.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-amber-200">Missing catalog item: {inventory.equipmentID}</div>; return <Details key={inventory.id} title={item.name} subtitle={`${item.category} • ${item.subtype} • ${item.slot}${inventory.isEquipped ? ' • Equipped' : ''}`}><p className="font-semibold text-violet-200">{item.summary}</p><p className="mt-3">{item.mechanics}</p><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => update({ inventoryItems: setInventoryQuantity(character.inventoryItems ?? [], inventory.id, inventory.quantity - 1) })} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-slate-200">Quantity {inventory.quantity}</span><button type="button" onClick={() => update({ inventoryItems: setInventoryQuantity(character.inventoryItems ?? [], inventory.id, inventory.quantity + 1) })} className="h-8 w-8 rounded bg-slate-800">+</button>{isEquipmentEquippable(item) && <button type="button" onClick={() => update({ inventoryItems: toggleInventoryEquipped(character.inventoryItems ?? [], inventory.id, equipmentCatalog) })} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">{inventory.isEquipped ? 'Stow' : 'Equip'}</button>}<button type="button" onClick={() => update({ inventoryItems: (character.inventoryItems ?? []).filter(({ id }) => id !== inventory.id) })} className="rounded-lg px-3 py-2 text-xs font-bold text-red-300">Remove</button></div></Details>; })}{character.equipment.map((item) => <div key={item.id} className="rounded-lg bg-slate-950/45 p-3 text-slate-300">{item.name} ×{item.quantity} <span className="text-xs text-slate-500">legacy item</span></div>)}</div> : <p className="text-slate-500">No equipment in inventory.</p>}</div>}

          {selectedTab === 'notes' && <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><aside><button type="button" onClick={() => updateBuild({ characterNotes: [...notes, { id: generateUUID(), title: 'New Note', body: '' }] })} className="mb-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white">+ New Note</button><div className="space-y-2">{notes.map((note) => <div key={note.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><input value={note.title} onChange={(event) => updateNote({ ...note, title: event.target.value })} className={`${fieldClass} font-bold`} /><button type="button" onClick={() => updateBuild({ characterNotes: notes.filter(({ id }) => id !== note.id) })} className="mt-2 text-xs font-bold text-red-300">Delete note</button></div>)}</div></aside><section className="space-y-3">{notes.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Create named notes for session details, goals, NPCs, or reminders.</div> : notes.map((note) => <div key={note.id} className={panelClass}><h2 className="font-black text-violet-200">{note.title || 'Untitled Note'}</h2><textarea value={note.body} onChange={(event) => updateNote({ ...note, body: event.target.value })} rows={10} className={`${fieldClass} mt-3`} placeholder="Write your note…" /></div>)}</section></div>}
        </main>
      </div>
    </div>
  );
};

export default CharacterSheet;
