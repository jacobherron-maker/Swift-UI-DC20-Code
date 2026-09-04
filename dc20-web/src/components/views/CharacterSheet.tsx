import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { CharacterAvatarEditor } from '../character/CharacterAvatar';
import { CharacterRestControls, CharacterSheetTabContent, type RedesignedSheetTab } from '../character/CharacterSheetTabs';
import type { CampaignNote, Character, CharacterInventoryItem, DC20Attribute, EquipmentCatalogItem, MasteryLevel } from '../../types/models';
import { ATTRIBUTE_NAMES, BARBARIAN_RAGE_STATE, BARD_PERFORMANCE_STATE, ancestryGrantedSpellNames, applyDerivedCharacter, barbarianStaminaRegenAmount, bardHelpDieSize, championStaminaRegenAmount, championTacticalDieSize, characterSheetEffects, commanderHelpDieSize, commanderInspiringPresenceHealing, commanderRallyAmount, commanderStaminaRegenAmount, deriveCharacter, grantedClassLanguageNames, grantedClassManeuverNames, grantedClassSpellNames, masteryBonus, masteryRank, masteryTitle, rogueCheapShotDamage, rogueStaminaRegenAmount, skillMasteryCap, spellbladeDisciplineNames } from '../../utils/characterRules';
import { enforceEquipmentHandCapacity, isEquipmentEquippable, setInventoryQuantity, toggleInventoryEquipped as toggleInventoryEquippedBase } from '../../utils/equipmentRules';
import { generateUUID } from '../../utils/gameUtils';

interface CharacterSheetProps {
  character: Character;
  onClose?: () => void;
  onEdit?: () => void;
  onCharacterChange?: (character: Character) => void;
}

type SheetTab = RedesignedSheetTab | 'overview' | 'checks' | 'powers' | 'features' | 'equipment' | 'notes';
const tabs: Array<{ id: SheetTab; label: string }> = [
  { id: 'sheet-checks', label: 'Checks' },
  { id: 'sheet-combat', label: 'Combat' },
  { id: 'sheet-features', label: 'Features' },
  { id: 'sheet-equipment', label: 'Equipment' },
  { id: 'sheet-misc', label: 'Misc' },
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
const WARLOCK_HASTY_ACTIVE = 'warlock.hastyBargain.active';
const WARLOCK_DESPERATE_USED = 'warlock.desperateBargain.used';
const WARLOCK_LIFE_TAP_USED = 'warlock.lifeTap.used';
const WARLOCK_LIFE_TAP_ADV = 'warlock.lifeTap.advantage';
const WARLOCK_LIFE_TAP_COST = 'warlock.lifeTap.effectCost';
const WARLOCK_LIFE_TAP_HP = 'warlock.lifeTap.hpSpent';
const WARLOCK_PACT_WEAPON_STOWED = 'warlock.pactWeapon.stowed';
const WARLOCK_PACT_ARMOR_STOWED = 'warlock.pactArmor.stowed';
const WARLOCK_PACT_SPELL_FAVOR_USED = 'warlock.pactSpell.patronFavor.used';
const WARLOCK_PACT_SPELL_FAVOR_ACTIVE = 'warlock.pactSpell.patronFavor.active';
const WARLOCK_ELDRITCH_BARGAIN_ACTIVE = 'warlock.eldritchBargain.active';
const WARLOCK_ELDRITCH_BARGAIN_DEFENSE = 'warlock.eldritchBargain.defense';
const WARLOCK_FORBIDDEN_USED = 'warlock.forbiddenKnowledge.used';
const WARLOCK_FEY_STEP_USED = 'warlock.feyStep.used';
const WARLOCK_BEGUILING_USED = 'warlock.beguilingBargain.used';
const WARLOCK_PACT_BANE_ACTIVE = 'warlock.pactBane.active';
const WARLOCK_SUBCONTRACT_ACTIVE = 'warlock.subcontract.active';
const CLERIC_BLESSING_CHOICE = 'cleric.blessing.choice';
const CLERIC_BLESSING_ONE = 'cleric.blessing.one';
const CLERIC_BLESSING_TWO = 'cleric.blessing.two';
const CLERIC_BLESSING_ONE_MP = 'cleric.blessing.oneMP';
const CLERIC_BLESSING_TWO_MP = 'cleric.blessing.twoMP';
const CLERIC_BLESSING_EXTRA_MP = 'cleric.blessing.extraMP';
const CLERIC_BOUNTIFUL_USED = 'cleric.bountiful.used';
const CLERIC_CHANNEL_CHOICE = 'cleric.channel.choice';
const CLERIC_CHANNEL_USED = 'cleric.channel.used';
const CLERIC_CHANNEL_POOL = 'cleric.channel.pool';
const CLERIC_CHAOS_ACTIVE = 'cleric.chaos.active';
const CLERIC_CHAOS_USED = 'cleric.chaos.used';
const CLERIC_ORDER_USED = 'cleric.order.used';
const CLERIC_DIVINATION_ACTIVE = 'cleric.divination.active';
const CLERIC_LIGHT_ACTIVE = 'cleric.light.active';
const CLERIC_TRICKERY_ACTIVE = 'cleric.trickery.active';
const CLERIC_INTERROGATOR_USED = 'cleric.interrogator.used';
const CLERIC_OMEN_COUNT = 'cleric.omen.count';
const CLERIC_PRIEST_OVERFLOW = 'cleric.priest.overflow';
const BARD_PERFORMANCE_PENDING = 'bard.performance.pendingChoice';
const BARD_PERFORMANCE_ACTIVE = 'bard.performance.activeChoice';
const BARD_EMOTIONAL_PENDING = 'bard.performance.pendingCondition';
const BARD_EMOTIONAL_ACTIVE = 'bard.performance.condition';
const BARD_PERFORMANCE_ENHANCED = 'bard.performance.enhanced';
const BARD_PERFORMANCE_SELF = 'bard.performance.selfIncluded';
const BARD_PERFORMANCE_CHANGED = 'bard.performance.changedThisTurn';
const BARD_HELP_RESULT = 'bard.help.result';
const BARD_HELP_USES = 'bard.help.usesThisTurn';
const BARD_HELPING_HANDS_RESULT = 'bard.help.helpingHandsResult';
const BARD_HELPING_HANDS_USED = 'bard.help.helpingHandsUsed';
const BARD_JESTER_HECKLE_USED = 'bard.jester.heckleUsed';
const BARD_JESTER_PRATFALL_ACTIVE = 'bard.jester.pratfallActive';
const BARD_MIND_GAMES_DAMAGE = 'bard.eloquence.mindGamesDamage';
const CHAMPION_REGEN_USED = 'champion.staminaRegen.used';
const CHAMPION_MANEUVER_MASTER_USED = 'champion.maneuverMaster.used';
const CHAMPION_READINESS_ACTIVE = 'champion.readiness.active';
const CHAMPION_READINESS_CHOICE = 'champion.readiness.choice';
const CHAMPION_SECOND_WIND_USED = 'champion.secondWind.used';
const CHAMPION_TACTICAL_DIE = 'champion.tacticalDie.available';
const CHAMPION_TACTIC_CHOICE = 'champion.tacticalDie.tactic';
const CHAMPION_TACTIC_RESULT = 'champion.tacticalDie.result';
const CHAMPION_DISCIPLINED_USED = 'champion.disciplinedCombatant.used';
const CHAMPION_ADRENALINE_ACTIVE = 'champion.hero.adrenaline.active';
const CHAMPION_UNYIELDING_USED = 'champion.hero.unyielding.used';
const CHAMPION_KNOWLEDGE_METHOD = 'champion.knowYourEnemy.method';
const CHAMPION_KNOWLEDGE_STAT = 'champion.knowYourEnemy.stat';
const CHAMPION_RESOLVE_DAMAGE = 'champion.resolve.damage';
const CHAMPION_SENTINEL_BASH = 'champion.sentinel.defensiveBash';
const COMMANDER_REGEN_USED = 'commander.staminaRegen.used';
const COMMANDER_HELP_GRANTED = 'commander.help.granted';
const COMMANDER_HELP_RESULT = 'commander.help.result';
const COMMANDER_HELP_USES = 'commander.help.usesThisTurn';
const COMMANDER_INSPIRING_USED = 'commander.inspiringPresence.used';
const COMMANDER_INSPIRING_TARGET = 'commander.inspiringPresence.target';
const COMMANDER_INSPIRING_DEATHS_DOOR = 'commander.inspiringPresence.deathsDoor';
const COMMANDER_INSPIRING_RESULT = 'commander.inspiringPresence.result';
const COMMANDER_CALL_PRIMARY = 'commander.call.primary';
const COMMANDER_CALL_SECONDARY = 'commander.call.secondary';
const COMMANDER_CALL_EXPERT_EXTRA = 'commander.call.expertExtra';
const COMMANDER_CALL_COORDINATED = 'commander.call.coordinated';
const COMMANDER_CALL_REACTION = 'commander.call.reaction';
const COMMANDER_CALL_ATTACK_USED = 'commander.call.attack.used';
const COMMANDER_CALL_DODGE_USED = 'commander.call.dodge.used';
const COMMANDER_CALL_MOVE_USED = 'commander.call.move.used';
const COMMANDER_COORDINATED_USED = 'commander.call.coordinated.used';
const COMMANDER_CALL_RESULT = 'commander.call.result';
const COMMANDER_PROTECTIVE_ORDERS = 'commander.crusader.protectiveOrders';
const COMMANDER_MORALE_AVAILABLE = 'commander.warlord.moraleAvailable';
const COMMANDER_MORALE_USED = 'commander.warlord.moraleUsed';
const COMMANDER_RALLY_EXTRA_SP = 'commander.rally.extraSP';
const COMMANDER_RALLY_TARGET = 'commander.rally.target';
const COMMANDER_RALLY_RESULT = 'commander.rally.result';
const COMMANDER_REINFORCE_SAVE_ADV = 'commander.reinforce.saveAdvantage';
const COMMANDER_REINFORCE_ACTIVE = 'commander.reinforce.active';
const COMMANDER_PRIORITY_ACTIVE = 'commander.warlord.priorityTarget.active';

interface RollOutcome { label: string; dice: number[]; chosen: number; modifier: number; total: number }

function ResourceControl({ label, value, maximum, tone, onChange }: { label: string; value: number; maximum: number; tone: string; onChange: (value: number) => void }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200">−</button><div className={`text-xl font-black ${tone}`}>{value} / {maximum}</div><button type="button" onClick={() => onChange(Math.min(maximum, value + 1))} className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200">+</button></div></div>;
}

function Details({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <details className="group rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-start justify-between gap-3"><span><span className="font-black text-slate-200">{title}</span>{subtitle && <span className="mt-1 block text-xs text-slate-500">{subtitle}</span>}</span><span className="text-xs font-bold text-violet-300 group-open:hidden">More</span><span className="hidden text-xs font-bold text-violet-300 group-open:inline">Less</span></summary><div className="mt-4 whitespace-pre-wrap border-t border-white/5 pt-4 text-sm leading-6 text-slate-400">{children}</div></details>;
}

function ChampionControls({ character, onChange, onRoll, insightModifier, knowledgeModifier }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => RollOutcome;
  insightModifier: number;
  knowledgeModifier: number;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = new Set(build.selectedTalents ?? []);
  const dieSize = championTacticalDieSize(character.level);
  const bloodied = character.healthPoints <= Math.ceil(character.maxHealthPoints / 2);
  const readiness = selections[CHAMPION_READINESS_CHOICE] || 'Fortify';
  const tactic = selections[CHAMPION_TACTIC_CHOICE] || 'Assault';
  const knowMethod = selections[CHAMPION_KNOWLEDGE_METHOD] || 'Insight';
  const knowStat = selections[CHAMPION_KNOWLEDGE_STAT] || 'Might';
  const hasResolve = talents.has("Champion's Resolve");
  const hasDiscipline = talents.has('Disciplined Combatant');
  const tacticalDieAvailable = character.level >= 2 && Boolean(states[CHAMPION_TACTICAL_DIE]);
  const updateBuild = (values: Partial<NonNullable<Character['build']>>, characterValues: Partial<Character> = {}) => onChange({ ...characterValues, build: { ...build, ...values } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const startCombat = () => updateBuild({
    sheetFeatureStates: {
      ...states,
      [CHAMPION_READINESS_ACTIVE]: true,
      [CHAMPION_SECOND_WIND_USED]: false,
      [CHAMPION_TACTICAL_DIE]: character.level >= 2,
      [CHAMPION_DISCIPLINED_USED]: false,
      [CHAMPION_ADRENALINE_ACTIVE]: false,
      [CHAMPION_UNYIELDING_USED]: false,
      [CHAMPION_MANEUVER_MASTER_USED]: false,
      [CHAMPION_REGEN_USED]: false,
    },
    sheetFeatureCounters: { ...counters, [CHAMPION_TACTIC_RESULT]: 0 },
  });
  const endTurn = () => updateBuild({ sheetFeatureStates: {
    ...states,
    [CHAMPION_TACTICAL_DIE]: character.level >= 2 ? true : Boolean(states[CHAMPION_TACTICAL_DIE]),
    [CHAMPION_DISCIPLINED_USED]: false,
    [CHAMPION_ADRENALINE_ACTIVE]: false,
    [CHAMPION_UNYIELDING_USED]: false,
  } });
  const resetRound = () => updateBuild({ sheetFeatureStates: {
    ...states,
    [CHAMPION_MANEUVER_MASTER_USED]: false,
    [CHAMPION_REGEN_USED]: false,
  } });
  const useSecondWind = () => {
    if (states[CHAMPION_SECOND_WIND_USED] || (!bloodied && !hasDiscipline)) return;
    const restored = character.level >= 5 ? 4 : 2;
    updateBuild({ sheetFeatureStates: {
      ...states,
      [CHAMPION_SECOND_WIND_USED]: true,
      ...(character.subclass === 'Hero' ? { [CHAMPION_ADRENALINE_ACTIVE]: true } : {}),
    } }, {
      healthPoints: Math.min(character.maxHealthPoints, character.healthPoints + restored),
      stamina: Math.min(character.maxStamina, character.stamina + restored),
    });
  };
  const useStaminaRegen = () => {
    if (states[CHAMPION_REGEN_USED] || character.stamina >= character.maxStamina) return;
    updateBuild({ sheetFeatureStates: { ...states, [CHAMPION_REGEN_USED]: true } }, {
      stamina: Math.min(character.maxStamina, character.stamina + championStaminaRegenAmount(character.maxStamina)),
    });
  };
  const useTacticalDie = () => {
    if (!tacticalDieAvailable) return;
    updateBuild({
      sheetFeatureStates: { ...states, [CHAMPION_TACTICAL_DIE]: false },
      sheetFeatureCounters: { ...counters, [CHAMPION_TACTIC_RESULT]: Math.floor(Math.random() * dieSize) + 1 },
    });
  };
  const useDisciplinedReadiness = () => {
    if (!hasDiscipline || states[CHAMPION_DISCIPLINED_USED] || character.stamina < 2) return;
    updateBuild({ sheetFeatureStates: {
      ...states,
      [CHAMPION_DISCIPLINED_USED]: true,
      [CHAMPION_READINESS_ACTIVE]: true,
    } }, { stamina: character.stamina - 2 });
  };
  const gainUnyieldingSpirit = () => {
    if (character.subclass !== 'Hero' || !bloodied || states[CHAMPION_UNYIELDING_USED]) return;
    updateBuild({
      temporaryHP: (build.temporaryHP ?? 0) + 1,
      sheetFeatureStates: { ...states, [CHAMPION_UNYIELDING_USED]: true },
    });
  };
  const assessEnemy = (inCombat: boolean) => {
    if (inCombat && character.currentAP < 1) return;
    if (inCombat) onChange({ currentAP: character.currentAP - 1 });
    onRoll(`Know Your Enemy — ${knowMethod} Check`, knowMethod === 'Knowledge' ? knowledgeModifier : insightModifier);
  };
  const resolveDamage = selections[CHAMPION_RESOLVE_DAMAGE] || 'Bludgeoning';
  return <section className="mb-5 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/45 to-slate-950/70 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Live Class Features</p><h2 className="text-xl font-black text-white">Champion Controls</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={endTurn} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">End Turn</button><button type="button" onClick={startCombat} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200">Roll Initiative / New Combat</button></div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-amber-200">Master-at-Arms</h3><p className="mt-2 text-xs leading-5 text-slate-400"><strong>Weapon Master:</strong> freely swap each wielded Weapon at the start of your turn without provoking Opportunity Attacks.</p><p className="mt-2 text-xs leading-5 text-slate-400"><strong>Maneuver Master:</strong> once per Round, reduce a Maneuver’s SP cost by 1.</p><button type="button" disabled={Boolean(states[CHAMPION_MANEUVER_MASTER_USED])} onClick={() => updateBuild({ sheetFeatureStates: { ...states, [CHAMPION_MANEUVER_MASTER_USED]: true } })} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CHAMPION_MANEUVER_MASTER_USED] ? 'Reduction Used This Round' : 'Use −1 SP Maneuver Cost'}</button><button type="button" disabled={(!states[CHAMPION_MANEUVER_MASTER_USED] && !states[CHAMPION_REGEN_USED])} onClick={resetRound} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-35">Start Next Round • Reset</button></div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-sky-200">Champion Stamina Regen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Round after you perform a Maneuver, regain up to half your maximum SP.</p><p className="mt-2 text-xs font-bold text-sky-300">Up to {championStaminaRegenAmount(character.maxStamina)} SP</p><button type="button" disabled={Boolean(states[CHAMPION_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={useStaminaRegen} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CHAMPION_REGEN_USED] ? 'Used This Round' : 'Maneuver Performed • Regain SP'}</button></div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-violet-200">Combat Readiness</h3><label className="mt-2 block text-xs font-bold text-slate-400">Readiness<select value={readiness} onChange={(event) => setSelection(CHAMPION_READINESS_CHOICE, event.target.value)} className={`${fieldClass} mt-1`}><option>Fortify</option><option>Advance</option></select></label><p className="mt-2 text-xs leading-5 text-slate-400">{readiness === 'Fortify' ? 'Dodge Action benefits and ADV on your next Save until the end of Combat.' : 'Move Action benefits and ADV on your next Martial Attack or Physical Check until the end of Combat.'}</p>{states[CHAMPION_READINESS_ACTIVE] && <p className="mt-2 rounded-lg bg-violet-500/10 p-2 text-xs font-bold text-violet-100">{readiness} is ready and will be consumed by its qualifying roll.</p>}{hasDiscipline && <button type="button" disabled={Boolean(states[CHAMPION_DISCIPLINED_USED]) || character.stamina < 2} onClick={useDisciplinedReadiness} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Disciplined Combatant • 2 SP</button>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-emerald-200">Second Wind</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Combat at the start of your turn while Bloodied, regain {character.level >= 5 ? '4 HP and 4 SP' : '2 HP and 2 SP'}.{hasDiscipline ? ' Disciplined Combatant removes the Bloodied requirement.' : ''}</p><button type="button" disabled={Boolean(states[CHAMPION_SECOND_WIND_USED]) || (!bloodied && !hasDiscipline)} onClick={useSecondWind} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CHAMPION_SECOND_WIND_USED] ? 'Used This Combat' : `Start Turn • Regain ${character.level >= 5 ? 4 : 2} HP & SP`}</button>{character.subclass === 'Hero' && states[CHAMPION_ADRENALINE_ACTIVE] && <p className="mt-2 rounded-lg bg-orange-500/10 p-2 text-xs text-orange-100">Adrenaline Boost: +5 to Martial Attacks and Martial Checks until end of turn.</p>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Adaptive Tactics • d{dieSize}</h3><label className="mt-2 block text-xs font-bold text-slate-400">Tactic<select value={tactic} onChange={(event) => setSelection(CHAMPION_TACTIC_CHOICE, event.target.value)} className={`${fieldClass} mt-1`}><option>Assault</option><option>Deflect</option></select></label><p className="mt-2 text-xs leading-5 text-slate-400">{tactic === 'Assault' ? 'Add the Tactical Die to a Martial Attack result.' : `Subtract the Tactical Die from an incoming Attack result${character.subclass === 'Sentinel' ? ', including an Attack against a creature in your Melee Range' : ''}.`}</p>{hasResolve && tactic === 'Assault' && <p className="mt-2 text-xs font-bold text-rose-200">Champion’s Resolve: the Attack also deals +1 damage.</p>}{hasResolve && tactic === 'Deflect' && <label className="mt-2 block text-xs font-bold text-slate-400">Resolve Damage<select value={resolveDamage} onChange={(event) => setSelection(CHAMPION_RESOLVE_DAMAGE, event.target.value)} className={`${fieldClass} mt-1`}><option>Bludgeoning</option><option>Piercing</option><option>Slashing</option></select><span className="mt-1 block font-normal text-rose-200">If the Attack misses, its Attacker takes 1 {resolveDamage} damage.</span></label>}<button type="button" disabled={!tacticalDieAvailable} onClick={useTacticalDie} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{tacticalDieAvailable ? `Spend Tactical Die • d${dieSize}` : 'No Tactical Die Available'}</button>{(counters[CHAMPION_TACTIC_RESULT] ?? 0) > 0 && <p className="mt-2 rounded-lg bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100"><strong>{tactic}:</strong> {tactic === 'Assault' ? '+' : '−'}{counters[CHAMPION_TACTIC_RESULT]} to the Attack result.</p>}</div>}
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-cyan-200">Know Your Enemy</h3><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-400">Check<select value={knowMethod} onChange={(event) => setSelection(CHAMPION_KNOWLEDGE_METHOD, event.target.value)} className={`${fieldClass} mt-1`}><option>Insight</option><option>Knowledge</option></select></label><label className="text-xs font-bold text-slate-400">Stat<select value={knowStat} onChange={(event) => setSelection(CHAMPION_KNOWLEDGE_STAT, event.target.value)} className={`${fieldClass} mt-1`}><option>Might</option><option>Agility</option><option>PD</option><option>AD</option><option>HP</option></select></label></div><p className="mt-2 text-xs leading-5 text-slate-400">DC 10. On a Success, learn whether the creature’s {knowStat} is higher, lower, or the same as yours.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => assessEnemy(false)} className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-black text-white">Observe 1 Minute • Roll</button><button type="button" disabled={character.currentAP < 1} onClick={() => assessEnemy(true)} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">In Combat • 1 AP</button></div></div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-3"><h3 className="font-black text-amber-200">Martial Rolls & Subclass Benefits</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => onRoll('Martial Attack', character.primeModifier + character.combatMastery)} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">Roll Martial Attack • +{character.primeModifier + character.combatMastery}</button><button type="button" onClick={() => onRoll('Martial Check', character.primeModifier + character.combatMastery)} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">Roll Martial Check • +{character.primeModifier + character.combatMastery}</button></div>{character.subclass === 'Hero' && <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-300 md:grid-cols-3"><p><strong className="text-orange-200">Adrenaline Boost:</strong> Second Wind activates the +5 roll bonus above.</p><p><strong className="text-orange-200">Cut Through:</strong> Martial Heavy Hits ignore Physical Resistances.</p><div><strong className="text-orange-200">Unyielding Spirit:</strong> while Bloodied, gain 1 Temp HP at the start of your turn.<button type="button" disabled={!bloodied || Boolean(states[CHAMPION_UNYIELDING_USED])} onClick={gainUnyieldingSpirit} className="mt-2 w-full rounded-lg bg-orange-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Start Turn • Gain 1 Temp HP</button></div></div>}{character.subclass === 'Sentinel' && <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-300 md:grid-cols-3"><p><strong className="text-sky-200">Steadfast Defender:</strong> Deflect can protect a creature within your Melee Range.</p><label><strong className="text-sky-200">Defensive Bash:</strong> after a qualifying defensive Reaction, the attacker makes a Physical Save against your Attack Check.<select value={selections[CHAMPION_SENTINEL_BASH] || ''} onChange={(event) => setSelection(CHAMPION_SENTINEL_BASH, event.target.value)} className={`${fieldClass} mt-2`}><option value="">Record result…</option><option>Pushed 1 Space</option><option>Taunted until end of its next turn</option></select></label><p><strong className="text-sky-200">Not on my Watch:</strong> creatures Taunted by you deal 1 less damage to targets within 1 Space of you.</p></div>}</div>
    </div>
  </section>;
}

function CommanderControls({ character, onChange, onRoll, intimidationModifier, charismaModifier }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => RollOutcome;
  intimidationModifier: number;
  charismaModifier: number;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = new Set(build.selectedTalents ?? []);
  const expert = character.level >= 5;
  const commands: Record<string, string> = {
    Attack: 'Immediately make an Attack with ADV without spending AP, SP, or MP on the Attack.',
    Dodge: 'Immediately take the Full Dodge Action.',
    Move: 'Immediately move up to their Speed without provoking Opportunity Attacks.',
  };
  const commandState: Record<string, string> = {
    Attack: COMMANDER_CALL_ATTACK_USED,
    Dodge: COMMANDER_CALL_DODGE_USED,
    Move: COMMANDER_CALL_MOVE_USED,
  };
  const primary = selections[COMMANDER_CALL_PRIMARY] || 'Attack';
  const secondary = selections[COMMANDER_CALL_SECONDARY] || (primary === 'Attack' ? 'Dodge' : 'Attack');
  const useExpertExtra = expert && Boolean(states[COMMANDER_CALL_EXPERT_EXTRA]);
  const hasCoordinatedCommand = talents.has('Coordinated Command');
  const useCoordinatedCommand = hasCoordinatedCommand && Boolean(states[COMMANDER_CALL_COORDINATED]);
  const useAsReaction = talents.has('Seize Momentum') && Boolean(states[COMMANDER_CALL_REACTION]);
  const callCost = 1 + (useExpertExtra ? 2 : 0) + (useCoordinatedCommand ? 1 : 0);
  const callCommands = useExpertExtra ? [primary, secondary] : [primary];
  const canCall = character.currentAP >= 1
    && character.stamina >= callCost
    && callCommands.every((command) => !states[commandState[command]])
    && (!useExpertExtra || primary !== secondary)
    && (!useCoordinatedCommand || !states[COMMANDER_COORDINATED_USED]);
  const helpUses = Math.max(0, counters[COMMANDER_HELP_USES] ?? 0);
  const nextHelpDie = commanderHelpDieSize(character.level, helpUses);
  const inspiringTarget = selections[COMMANDER_INSPIRING_TARGET] || 'Self';
  const inspiringDeathsDoor = inspiringTarget === 'Self' ? character.healthPoints <= 0 : Boolean(states[COMMANDER_INSPIRING_DEATHS_DOOR]);
  const inspiringHealing = commanderInspiringPresenceHealing(character.level, inspiringDeathsDoor);
  const rallyTarget = selections[COMMANDER_RALLY_TARGET] || 'Self';
  const storedRallySP = expert ? Math.max(0, counters[COMMANDER_RALLY_EXTRA_SP] ?? 0) : 0;
  const rallyExtraSP = Math.min(Math.floor(character.stamina / 2) * 2, storedRallySP - (storedRallySP % 2));
  const rallyAmount = commanderRallyAmount(character.level, rallyExtraSP);
  const bloodied = character.healthPoints <= Math.ceil(character.maxHealthPoints / 2);
  const rallyRestoresHP = character.subclass === 'Crusader' && bloodied && rallyTarget === 'Self';
  const reinforceSaveAdvantage = expert && Boolean(states[COMMANDER_REINFORCE_SAVE_ADV]);
  const updateBuild = (values: Partial<NonNullable<Character['build']>>, characterValues: Partial<Character> = {}) => onChange({ ...characterValues, build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const nextTurn = () => updateBuild({
    sheetFeatureStates: {
      ...states,
      [COMMANDER_HELP_GRANTED]: false,
      [COMMANDER_CALL_ATTACK_USED]: false,
      [COMMANDER_CALL_DODGE_USED]: false,
      [COMMANDER_CALL_MOVE_USED]: false,
      [COMMANDER_PROTECTIVE_ORDERS]: false,
      [COMMANDER_MORALE_AVAILABLE]: false,
      [COMMANDER_REINFORCE_ACTIVE]: false,
      [COMMANDER_PRIORITY_ACTIVE]: false,
    },
    sheetFeatureCounters: { ...counters, [COMMANDER_HELP_USES]: 0, [COMMANDER_HELP_RESULT]: 0 },
  });
  const nextRound = () => updateBuild({ sheetFeatureStates: {
    ...states,
    [COMMANDER_REGEN_USED]: false,
    [COMMANDER_INSPIRING_USED]: false,
    [COMMANDER_COORDINATED_USED]: false,
  } });
  const startCombat = () => updateBuild({
    sheetFeatureStates: {
      ...states,
      [COMMANDER_REGEN_USED]: false,
      [COMMANDER_HELP_GRANTED]: false,
      [COMMANDER_INSPIRING_USED]: false,
      [COMMANDER_CALL_ATTACK_USED]: false,
      [COMMANDER_CALL_DODGE_USED]: false,
      [COMMANDER_CALL_MOVE_USED]: false,
      [COMMANDER_COORDINATED_USED]: false,
      [COMMANDER_PROTECTIVE_ORDERS]: false,
      [COMMANDER_MORALE_AVAILABLE]: false,
      [COMMANDER_MORALE_USED]: false,
      [COMMANDER_REINFORCE_ACTIVE]: false,
      [COMMANDER_PRIORITY_ACTIVE]: false,
    },
    sheetFeatureCounters: {
      ...counters,
      [COMMANDER_HELP_USES]: 0,
      [COMMANDER_HELP_RESULT]: 0,
      [COMMANDER_INSPIRING_RESULT]: 0,
      [COMMANDER_RALLY_RESULT]: 0,
    },
  });
  const useBolster = () => {
    if (character.currentAP < 1) return;
    updateBuild({
      sheetFeatureStates: { ...states, [COMMANDER_HELP_GRANTED]: true },
      sheetFeatureCounters: {
        ...counters,
        [COMMANDER_HELP_RESULT]: Math.floor(Math.random() * nextHelpDie) + 1,
        [COMMANDER_HELP_USES]: helpUses + 1,
      },
    }, { currentAP: character.currentAP - 1 });
  };
  const regainStamina = () => {
    if (!states[COMMANDER_HELP_GRANTED] || states[COMMANDER_REGEN_USED]) return;
    updateBuild({ sheetFeatureStates: { ...states, [COMMANDER_REGEN_USED]: true } }, {
      stamina: Math.min(character.maxStamina, character.stamina + commanderStaminaRegenAmount(character.maxStamina)),
    });
  };
  const useInspiringPresence = () => {
    if (states[COMMANDER_INSPIRING_USED]) return;
    const characterValues = inspiringTarget === 'Self'
      ? { healthPoints: Math.min(character.maxHealthPoints, character.healthPoints + inspiringHealing) }
      : {};
    updateBuild({
      sheetFeatureStates: { ...states, [COMMANDER_INSPIRING_USED]: true },
      sheetFeatureCounters: { ...counters, [COMMANDER_INSPIRING_RESULT]: inspiringHealing },
    }, characterValues);
  };
  const useCall = () => {
    if (!canCall) return;
    const usedStates = Object.fromEntries(callCommands.map((command) => [commandState[command], true]));
    updateBuild({
      sheetFeatureStates: {
        ...states,
        ...usedStates,
        ...(useCoordinatedCommand ? { [COMMANDER_COORDINATED_USED]: true } : {}),
        ...(character.subclass === 'Crusader' ? { [COMMANDER_PROTECTIVE_ORDERS]: true } : {}),
        ...(character.subclass === 'Warlord' && !states[COMMANDER_MORALE_USED] ? { [COMMANDER_MORALE_AVAILABLE]: true } : {}),
      },
      sheetFeatureSelections: {
        ...selections,
        [COMMANDER_CALL_RESULT]: `${callCommands.join(' + ')}${useCoordinatedCommand ? ' • two creatures' : ''}${useAsReaction ? ' • Reaction' : ''}`,
      },
    }, { currentAP: character.currentAP - 1, stamina: character.stamina - callCost });
  };
  const useRally = () => {
    if (character.currentAP < 1 || character.stamina < rallyExtraSP) return;
    const characterValues = rallyTarget !== 'Self' ? {}
      : rallyRestoresHP
        ? { healthPoints: Math.min(character.maxHealthPoints, character.healthPoints + rallyAmount) }
        : {};
    updateBuild({
      ...(rallyTarget === 'Self' && !rallyRestoresHP ? { temporaryHP: (build.temporaryHP ?? 0) + rallyAmount } : {}),
      sheetFeatureCounters: { ...counters, [COMMANDER_RALLY_RESULT]: rallyAmount },
    }, { ...characterValues, currentAP: character.currentAP - 1, stamina: character.stamina - rallyExtraSP });
  };
  const useReinforce = () => {
    const staminaCost = reinforceSaveAdvantage ? 1 : 0;
    if (character.currentAP < 1 || character.stamina < staminaCost) return;
    updateBuild({ sheetFeatureStates: { ...states, [COMMANDER_REINFORCE_ACTIVE]: true } }, {
      currentAP: character.currentAP - 1,
      stamina: character.stamina - staminaCost,
    });
  };
  const usePriorityTarget = () => {
    if (character.currentAP < 1 || character.stamina < 1) return;
    updateBuild({ sheetFeatureStates: { ...states, [COMMANDER_PRIORITY_ACTIVE]: true } }, {
      currentAP: character.currentAP - 1,
      stamina: character.stamina - 1,
    });
  };
  const useMoraleBreaker = () => {
    if (!states[COMMANDER_MORALE_AVAILABLE] || states[COMMANDER_MORALE_USED]) return;
    onRoll('Morale Breaker — Intimidation Check', intimidationModifier);
    updateBuild({ sheetFeatureStates: { ...states, [COMMANDER_MORALE_AVAILABLE]: false, [COMMANDER_MORALE_USED]: true } });
  };
  return <section className="mb-5 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/45 via-violet-950/30 to-slate-950/75 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live Class Features</p><h2 className="text-xl font-black text-white">Commander Controls</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={nextTurn} className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-black text-white">Start Next Turn</button><button type="button" onClick={nextRound} className="rounded-lg bg-violet-800 px-3 py-2 text-xs font-black text-white">Start Next Round</button><button type="button" onClick={startCombat} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200">New Combat</button></div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-emerald-200">Inspiring Presence</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Round in Combat after spending SP, restore {expert ? '2' : '1'} HP to a creature within 10 Spaces. A creature on Death’s Door restores 1 additional HP.</p><label className="mt-3 block text-xs font-bold text-slate-400">Target<select value={inspiringTarget} onChange={(event) => setSelection(COMMANDER_INSPIRING_TARGET, event.target.value)} className={`${fieldClass} mt-1`}><option>Self</option><option>Ally</option></select></label>{inspiringTarget === 'Ally' && <label className="mt-2 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={Boolean(states[COMMANDER_INSPIRING_DEATHS_DOOR])} onChange={(event) => setState(COMMANDER_INSPIRING_DEATHS_DOOR, event.target.checked)} />Ally is on Death’s Door</label>}<button type="button" disabled={Boolean(states[COMMANDER_INSPIRING_USED]) || (inspiringTarget === 'Self' && character.healthPoints >= character.maxHealthPoints)} onClick={useInspiringPresence} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[COMMANDER_INSPIRING_USED] ? 'Used This Round' : `SP Spent • Restore ${inspiringHealing} HP`}</button>{(counters[COMMANDER_INSPIRING_RESULT] ?? 0) > 0 && inspiringTarget === 'Ally' && <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-100">Ally restores {counters[COMMANDER_INSPIRING_RESULT]} HP.</p>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Bolster • Help Die d{nextHelpDie}</h3><p className="mt-2 text-xs leading-5 text-slate-400">Spend 1 AP to Help an Attack, or use Bolster as a Reaction when a valid target makes an Attack. Repeated Help Dice on the same turn decay toward d4.</p><button type="button" disabled={character.currentAP < 1} onClick={useBolster} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Bolster • 1 AP • Roll d{nextHelpDie}</button>{(counters[COMMANDER_HELP_RESULT] ?? 0) > 0 && <p className="mt-2 rounded-lg bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100">Help Die result: <strong>{counters[COMMANDER_HELP_RESULT]}</strong></p>}<button type="button" disabled={!states[COMMANDER_HELP_GRANTED] || Boolean(states[COMMANDER_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={regainStamina} className="mt-2 w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[COMMANDER_REGEN_USED] ? 'Stamina Regen Used This Round' : `Grant Help • Regain up to ${commanderStaminaRegenAmount(character.maxStamina)} SP`}</button></div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-amber-200">Natural Leader</h3><p className="mt-2 text-xs leading-5 text-slate-400">You have ADV on Checks made to convince creatures that you are an authority figure. You also have ADV on the first Charisma Check made to interact with non-hostile members of military groups.</p><div className="mt-3 grid gap-2"><button type="button" onClick={() => onRoll('Natural Leader — Authority Check', charismaModifier, 1)} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">Roll Authority Check with ADV</button><button type="button" onClick={() => onRoll('Natural Leader — First Military Charisma Check', charismaModifier, 1)} className="rounded-lg bg-orange-800 px-3 py-2 text-xs font-black text-white">Roll First Military Check with ADV</button></div><p className="mt-3 text-xs leading-5 text-slate-500">Commanding Aura reaches 5 Spaces. Commander’s Call reaches {expert ? '10' : '5'} Spaces.</p></div>
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/15 p-4 lg:col-span-2"><h3 className="font-black text-cyan-200">Commander’s Call</h3><p className="mt-1 text-xs text-slate-500">1 AP + 1 SP • willing creature who can see or hear you • each command once on each of your turns</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Command<select value={primary} onChange={(event) => setSelection(COMMANDER_CALL_PRIMARY, event.target.value)} className={`${fieldClass} mt-1`}>{Object.keys(commands).map((command) => <option key={command} disabled={Boolean(states[commandState[command]])}>{command}</option>)}</select></label>{expert && <label className="text-xs font-bold text-slate-400">Additional different command<select disabled={!useExpertExtra} value={secondary} onChange={(event) => setSelection(COMMANDER_CALL_SECONDARY, event.target.value)} className={`${fieldClass} mt-1 disabled:opacity-35`}>{Object.keys(commands).map((command) => <option key={command} disabled={command === primary || Boolean(states[commandState[command]])}>{command}</option>)}</select></label>}</div><p className="mt-2 text-xs leading-5 text-cyan-100"><strong>{primary}:</strong> {commands[primary]}</p>{useExpertExtra && <p className="mt-1 text-xs leading-5 text-cyan-100"><strong>{secondary}:</strong> {commands[secondary]}</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{expert && <label className="flex items-center gap-2 rounded-lg bg-slate-950/55 p-2 text-xs text-slate-300"><input type="checkbox" checked={useExpertExtra} onChange={(event) => setState(COMMANDER_CALL_EXPERT_EXTRA, event.target.checked)} />Expert: +2 SP for a different command</label>}{hasCoordinatedCommand && <label className="flex items-center gap-2 rounded-lg bg-slate-950/55 p-2 text-xs text-slate-300"><input type="checkbox" checked={useCoordinatedCommand} disabled={Boolean(states[COMMANDER_COORDINATED_USED])} onChange={(event) => setState(COMMANDER_CALL_COORDINATED, event.target.checked)} />Coordinated Command: +1 SP, second creature</label>}{talents.has('Seize Momentum') && <label className="flex items-center gap-2 rounded-lg bg-slate-950/55 p-2 text-xs text-slate-300"><input type="checkbox" checked={useAsReaction} onChange={(event) => setState(COMMANDER_CALL_REACTION, event.target.checked)} />Seize Momentum: use as Reaction after ally’s Heavy Hit</label>}</div><button type="button" disabled={!canCall} onClick={useCall} className="mt-3 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-black text-white disabled:opacity-35">Issue {useAsReaction ? 'Reaction' : 'Call'} • 1 AP + {callCost} SP</button>{selections[COMMANDER_CALL_RESULT] && <p className="mt-2 rounded-lg bg-cyan-500/10 p-2 text-xs text-cyan-100">Last Call: {selections[COMMANDER_CALL_RESULT]}</p>}{states[COMMANDER_PROTECTIVE_ORDERS] && <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs font-bold text-emerald-100">Protective Orders: called creature has Resistance (1) against its next damage before your next turn.</p>}</div>
      <div className="rounded-xl border border-violet-400/20 bg-violet-950/15 p-4"><h3 className="font-black text-violet-200">Rally</h3><p className="mt-2 text-xs leading-5 text-slate-400">Spend 1 AP to grant chosen creatures in your Aura {rallyAmount} Temp HP.{expert ? ' Every 2 additional SP adds 1.' : ''}</p><label className="mt-3 block text-xs font-bold text-slate-400">Tracked target<select value={rallyTarget} onChange={(event) => setSelection(COMMANDER_RALLY_TARGET, event.target.value)} className={`${fieldClass} mt-1`}><option>Self</option><option>Other creature(s)</option></select></label>{expert && <label className="mt-2 block text-xs font-bold text-slate-400">Additional SP<select value={rallyExtraSP} onChange={(event) => updateBuild({ sheetFeatureCounters: { ...counters, [COMMANDER_RALLY_EXTRA_SP]: Number(event.target.value) } })} className={`${fieldClass} mt-1`}>{Array.from({ length: Math.floor(character.stamina / 2) + 1 }, (_, index) => index * 2).map((amount) => <option key={amount} value={amount}>{amount} SP • {commanderRallyAmount(character.level, amount)} HP</option>)}</select></label>}<button type="button" disabled={character.currentAP < 1 || character.stamina < rallyExtraSP} onClick={useRally} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Rally • 1 AP{rallyExtraSP > 0 ? ` + ${rallyExtraSP} SP` : ''}</button>{rallyRestoresHP && <p className="mt-2 text-xs font-bold text-emerald-200">Restoring Rally: because you are Bloodied, restore HP instead of Temp HP.</p>}{rallyTarget !== 'Self' && (counters[COMMANDER_RALLY_RESULT] ?? 0) > 0 && <p className="mt-2 rounded-lg bg-violet-500/10 p-2 text-xs text-violet-100">Each chosen target gains {counters[COMMANDER_RALLY_RESULT]} Temp HP. A Bloodied target gains HP instead if you are a Crusader.</p>}</div>
      <div className="rounded-xl border border-rose-400/20 bg-rose-950/15 p-4"><h3 className="font-black text-rose-200">Reinforce • Reaction</h3><p className="mt-2 text-xs leading-5 text-slate-400">Spend 1 AP when a creature attacks a valid target in your Aura to impose DisADV on the Attack.</p>{expert && <label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={reinforceSaveAdvantage} onChange={(event) => setState(COMMANDER_REINFORCE_SAVE_ADV, event.target.checked)} />Spend +1 SP: target has ADV on Saves made as part of the Attack</label>}<button type="button" disabled={character.currentAP < 1 || (reinforceSaveAdvantage && character.stamina < 1)} onClick={useReinforce} className="mt-3 w-full rounded-lg bg-rose-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Reinforce • 1 AP{reinforceSaveAdvantage ? ' + 1 SP' : ''}</button>{states[COMMANDER_REINFORCE_ACTIVE] && <p className="mt-2 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-100">Attack has DisADV{reinforceSaveAdvantage ? '; target’s Saves have ADV' : ''}. Clear after resolving.</p>}</div>
      {character.subclass === 'Crusader' && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/15 p-4"><h3 className="font-black text-emerald-200">Virtuous Vanguard</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Aura of Courage:</strong> chosen creatures in your Aura resist Frightened and Intimidated. <strong>Protective Orders</strong> and <strong>Restoring Rally</strong> are applied in the controls above.</p><p className="mt-2 text-xs text-emerald-100"><strong>Gallant Hero:</strong> ADV when convincing creatures not to be afraid.</p></div>}
      {character.subclass === 'Warlord' && <div className="rounded-xl border border-orange-400/20 bg-orange-950/15 p-4 lg:col-span-2"><h3 className="font-black text-orange-200">Offensive Tactics</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Battlefield Tactics:</strong> allies in your Aura deal +1 damage on their first Melee Attack each turn against a creature they’re Flanking.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" disabled={!states[COMMANDER_MORALE_AVAILABLE] || Boolean(states[COMMANDER_MORALE_USED])} onClick={useMoraleBreaker} className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Morale Breaker • Free Intimidate</button><button type="button" disabled={character.currentAP < 1 || character.stamina < 1 || Boolean(states[COMMANDER_PRIORITY_ACTIVE])} onClick={usePriorityTarget} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Priority Target • 1 AP + 1 SP</button></div>{states[COMMANDER_MORALE_USED] && <p className="mt-2 text-xs text-orange-100">Morale Breaker used this Combat.</p>}{states[COMMANDER_PRIORITY_ACTIVE] && <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-100">Aura allies have ADV on their first Attack each turn against the chosen creature until your next turn.</p>}<p className="mt-3 text-xs text-orange-100"><strong>Battlefield Tactician:</strong> ADV on relevant battlefield, military-history, organization, and tactical-analysis Checks.</p></div>}
      {character.subclass === 'Paragon' && <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/15 p-4"><h3 className="font-black text-fuchsia-200">Paragon</h3><p className="mt-2 text-xs leading-5 text-slate-300">Your level-appropriate extra Class Talents and Level 3 Trade Point are included in the Builder’s budgets and appear in Features.</p></div>}
    </div>
  </section>;
}

function BardControls({ character, onChange, onRoll, artistryModifier }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => RollOutcome;
  artistryModifier: number;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const performances = ['Battle Ballad', 'Fast Tempo', 'Inspiring', 'Emotional'];
  const emotions = ['Charmed', 'Frightened', 'Intimidated', 'Taunted'];
  const pending = selections[BARD_PERFORMANCE_PENDING] || selections[BARD_PERFORMANCE_ACTIVE] || performances[0];
  const activeChoice = selections[BARD_PERFORMANCE_ACTIVE] || '';
  const pendingEmotion = selections[BARD_EMOTIONAL_PENDING] || selections[BARD_EMOTIONAL_ACTIVE] || emotions[0];
  const activeEmotion = selections[BARD_EMOTIONAL_ACTIVE] || emotions[0];
  const active = Boolean(states[BARD_PERFORMANCE_STATE]);
  const enhanced = character.level >= 5 && Boolean(states[BARD_PERFORMANCE_ENHANCED]);
  const appliesToSelf = Boolean(states[BARD_PERFORMANCE_SELF]);
  const helpingHands = (build.selectedTalents ?? []).includes('Helping Hands');
  const baseHelpDieSize = bardHelpDieSize(character.level);
  const helpDieSteps = character.level >= 5 ? [10, 8, 6, 4] : [8, 6, 4];
  const helpUses = Math.max(0, counters[BARD_HELP_USES] ?? 0);
  const nextHelpDieSize = helpDieSteps[Math.min(helpUses, helpDieSteps.length - 1)];
  const saveDC = 10 + character.primeModifier + character.combatMastery;
  const updateBuild = (values: Partial<NonNullable<Character['build']>>, characterValues: Partial<Character> = {}) => onChange({ ...characterValues, build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const rollDie = (size: number) => Math.floor(Math.random() * size) + 1;
  const useHelp = () => {
    if (character.currentAP < 1) return;
    const helpResult = rollDie(nextHelpDieSize);
    const useHelpingHands = helpingHands && !states[BARD_HELPING_HANDS_USED];
    updateBuild({
      sheetFeatureStates: { ...states, ...(useHelpingHands ? { [BARD_HELPING_HANDS_USED]: true } : {}) },
      sheetFeatureCounters: { ...counters, [BARD_HELP_RESULT]: helpResult, [BARD_HELP_USES]: helpUses + 1, [BARD_HELPING_HANDS_RESULT]: useHelpingHands ? rollDie(8) : 0 },
    }, { currentAP: character.currentAP - 1 });
  };
  const startPerformance = () => {
    const manaCost = 1 + (enhanced ? 2 : 0);
    if (character.currentAP < 1 || character.manaPoints < manaCost) return;
    updateBuild({
      sheetFeatureStates: { ...states, [BARD_PERFORMANCE_STATE]: true, [BARD_PERFORMANCE_CHANGED]: false },
      sheetFeatureSelections: { ...selections, [BARD_PERFORMANCE_ACTIVE]: pending, [BARD_EMOTIONAL_ACTIVE]: pendingEmotion },
    }, { currentAP: character.currentAP - 1, manaPoints: character.manaPoints - manaCost });
  };
  const changePerformance = () => {
    if (!active || states[BARD_PERFORMANCE_CHANGED] || (pending === activeChoice && (pending !== 'Emotional' || pendingEmotion === activeEmotion))) return;
    const cost = character.level >= 5 ? 0 : 1;
    if (character.currentAP < cost) return;
    updateBuild({
      sheetFeatureStates: { ...states, [BARD_PERFORMANCE_CHANGED]: true },
      sheetFeatureSelections: { ...selections, [BARD_PERFORMANCE_ACTIVE]: pending, [BARD_EMOTIONAL_ACTIVE]: pendingEmotion },
    }, { currentAP: character.currentAP - cost });
  };
  const endPerformance = () => updateBuild({ sheetFeatureStates: { ...states, [BARD_PERFORMANCE_STATE]: false, [BARD_PERFORMANCE_ENHANCED]: false, [BARD_PERFORMANCE_CHANGED]: false } });
  const useDistraction = () => {
    if (character.currentAP < 1) return;
    updateBuild({ sheetFeatureCounters: { ...counters, [BARD_HELP_RESULT]: rollDie(baseHelpDieSize), [BARD_HELPING_HANDS_RESULT]: 0 } }, { currentAP: character.currentAP - 1 });
  };
  const performanceText = activeChoice === 'Battle Ballad' ? `First Attack Check each turn: +d${enhanced ? 8 : 4}`
    : activeChoice === 'Fast Tempo' ? `Speed: +${enhanced ? 2 : 1}`
      : activeChoice === 'Inspiring' ? `Temp HP at the start of each turn: ${enhanced ? 2 : 1}`
        : activeChoice === 'Emotional' ? `Resistance: ${enhanced ? emotions.join(', ') : activeEmotion}` : '';
  return <section className="mb-5 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-950/45 to-slate-950/70 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Live Class Features</p><h2 className="text-xl font-black text-white">Bard Controls</h2></div>{active && <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-fuchsia-200">Performing</span>}</div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Font of Inspiration</h3><p className="mt-2 text-xs leading-5 text-slate-400">Help Attacks at up to 10 Spaces. When a visible creature makes a Check within range, take the Help Action as a Reaction. Repeated Help Actions on the same turn decay the die toward d4.</p><button type="button" disabled={character.currentAP < 1} onClick={useHelp} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Help Reaction • 1 AP • d{nextHelpDieSize}</button>{(counters[BARD_HELP_RESULT] ?? 0) > 0 && <p className="mt-2 rounded-lg bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100">Help Die: <strong>{counters[BARD_HELP_RESULT]}</strong>{(counters[BARD_HELPING_HANDS_RESULT] ?? 0) > 0 && <> • Helping Hands d8: <strong>{counters[BARD_HELPING_HANDS_RESULT]}</strong> for a different creature</>}</p>}{helpUses > 0 && <button type="button" onClick={() => updateBuild({ sheetFeatureStates: { ...states, [BARD_HELPING_HANDS_USED]: false }, sheetFeatureCounters: { ...counters, [BARD_HELP_USES]: 0, [BARD_HELPING_HANDS_RESULT]: 0 } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Start next turn • reset Help dice</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-2"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-fuchsia-200">Bardic Performance</h3><p className="mt-1 text-xs text-slate-500">10-Space Aura • 1 minute • chosen creatures that see or hear you</p></div>{character.level >= 5 && <label className="flex items-center gap-2 text-xs font-bold text-amber-200"><input type="checkbox" disabled={active} checked={enhanced} onChange={(event) => setState(BARD_PERFORMANCE_ENHANCED, event.target.checked)} />Enhance +2 MP</label>}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Performance<select value={pending} onChange={(event) => setSelection(BARD_PERFORMANCE_PENDING, event.target.value)} className={`${fieldClass} mt-1`} >{performances.map((option) => <option key={option}>{option}</option>)}</select></label>{pending === 'Emotional' && <label className="text-xs font-bold text-slate-400">Condition<select value={pendingEmotion} onChange={(event) => setSelection(BARD_EMOTIONAL_PENDING, event.target.value)} className={`${fieldClass} mt-1`}>{emotions.map((option) => <option key={option}>{option}</option>)}</select></label>}</div>{active ? <><div className="mt-3 rounded-lg bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100"><strong>{activeChoice}</strong> • {performanceText}</div><label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-300"><input type="checkbox" checked={appliesToSelf} onChange={(event) => setState(BARD_PERFORMANCE_SELF, event.target.checked)} />My Bard is one of the chosen creatures</label>{activeChoice === 'Inspiring' && appliesToSelf && <button type="button" onClick={() => updateBuild({ temporaryHP: (build.temporaryHP ?? 0) + (enhanced ? 2 : 1) })} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Start turn • gain {enhanced ? 2 : 1} Temp HP</button>}<div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" disabled={Boolean(states[BARD_PERFORMANCE_CHANGED]) || (character.level < 5 && character.currentAP < 1)} onClick={changePerformance} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Change Performance • {character.level >= 5 ? 'free' : '1 AP'}</button><button type="button" onClick={endPerformance} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">End Performance • free</button></div>{states[BARD_PERFORMANCE_CHANGED] && <button type="button" onClick={() => setState(BARD_PERFORMANCE_CHANGED, false)} className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400">Start next turn • reset change</button>}</> : <button type="button" disabled={character.currentAP < 1 || character.manaPoints < 1 + (enhanced ? 2 : 0)} onClick={startPerformance} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-sm font-black text-white disabled:opacity-35">Start Performance • 1 AP + {1 + (enhanced ? 2 : 0)} MP</button>}</div>}
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-violet-200">Crowd Pleaser</h3><p className="mt-2 text-xs leading-5 text-slate-400">After performing an Artistry Trade for at least 5 minutes, make its Check against each target’s Charisma Save.</p><button type="button" onClick={() => onRoll('Crowd Pleaser Artistry Trade Check', artistryModifier)} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">Roll Artistry Trade Check • +{artistryModifier}</button></div>
      {character.subclass === 'Eloquence' && <div className="rounded-xl border border-pink-400/20 bg-pink-950/20 p-4"><h3 className="font-black text-pink-200">Beguiling Presence</h3><p className="mt-2 text-xs leading-5 text-slate-400"><strong>Enthrall:</strong> Charm does not end from damage. <strong>Misleading Muse:</strong> when a creature in your Performance targets only you, make a Spell Check against its Attack Check.</p><button type="button" disabled={!active || character.currentAP < 1} onClick={() => { onChange({ currentAP: character.currentAP - 1 }); onRoll('Misleading Muse Spell Check', character.primeModifier + character.combatMastery); }} className="mt-3 w-full rounded-lg bg-pink-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Misleading Muse Reaction • 1 AP</button><button type="button" onClick={() => updateBuild({ sheetFeatureCounters: { ...counters, [BARD_MIND_GAMES_DAMAGE]: (counters[BARD_MIND_GAMES_DAMAGE] ?? 0) + 1 } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Mind Games • deal 1 Psychic</button><p className="mt-2 text-xs text-pink-100">Mind Games damage tracked: {counters[BARD_MIND_GAMES_DAMAGE] ?? 0} • Save DC {saveDC}</p></div>}
      {character.subclass === 'Jester' && <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4 lg:col-span-2"><h3 className="font-black text-amber-200">Antagonizing Act</h3><div className="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" disabled={!active || Boolean(states[BARD_JESTER_HECKLE_USED])} onClick={() => setState(BARD_JESTER_HECKLE_USED, true)} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[BARD_JESTER_HECKLE_USED] ? 'Heckle used' : 'Heckle • mark Taunted'}</button><button type="button" disabled={character.currentAP < 1} onClick={useDistraction} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Distraction • 1 AP • d{baseHelpDieSize}</button><button type="button" onClick={() => setState(BARD_JESTER_PRATFALL_ACTIVE, !states[BARD_JESTER_PRATFALL_ACTIVE])} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">{states[BARD_JESTER_PRATFALL_ACTIVE] ? 'Pratfall ADV pending' : 'Pratfall • grant ADV'}</button></div>{states[BARD_JESTER_HECKLE_USED] && <button type="button" onClick={() => setState(BARD_JESTER_HECKLE_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset Heckle next Round</button>}</div>}
    </div>
  </section>;
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

function WarlockControls({ character, onChange }: {
  character: Character;
  onChange: (values: Partial<Character>) => void;
}) {
  const build = character.build;
  if (!build) return null;
  const states = build.sheetFeatureStates ?? {};
  const selections = build.sheetFeatureSelections ?? {};
  const counters = build.sheetFeatureCounters ?? {};
  const talents = build.selectedTalents ?? [];
  const boons = new Set(build.classFeatureSelections['warlock.boon'] ?? []);
  const pactSpells = build.classFeatureSelections['warlock.pactSpells'] ?? [];
  const forbiddenSpell = build.classFeatureSelections['warlock.forbiddenKnowledge']?.[0];
  const feyAspect = build.classFeatureSelections['warlock.feyAspect']?.[0] ?? 'Charmed';
  const manaSpendLimit = Math.max(1, character.combatMastery);
  const effectCost = Math.min(manaSpendLimit, Math.max(1, Math.trunc(counters[WARLOCK_LIFE_TAP_COST] ?? 1)));
  const hpSpent = Math.min(effectCost, Math.max(1, Math.trunc(counters[WARLOCK_LIFE_TAP_HP] ?? 1)));
  const manaSpent = effectCost - hpSpent;
  const updateBuild = (values: Partial<NonNullable<Character['build']>>) => onChange({ build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const setCounter = (key: string, value: number) => updateBuild({ sheetFeatureCounters: { ...counters, [key]: value } });
  const useHastyBargain = () => {
    if (states[WARLOCK_HASTY_ACTIVE] || character.healthPoints < 1) return;
    onChange({
      healthPoints: character.healthPoints - 1,
      build: { ...build, sheetFeatureStates: { ...states, [WARLOCK_HASTY_ACTIVE]: true } },
    });
  };
  const useDesperateBargain = () => {
    if (states[WARLOCK_DESPERATE_USED] || character.currentAP < 1) return;
    onChange({
      currentAP: character.currentAP - 1,
      healthPoints: Math.min(character.maxHealthPoints, character.healthPoints + Math.max(0, character.primeModifier)),
      build: {
        ...build,
        sheetFeatureStates: { ...states, [WARLOCK_DESPERATE_USED]: true },
        sheetConditionLevels: { ...(build.sheetConditionLevels ?? {}), Exposed: 1 },
      },
    });
  };
  const useLifeTap = () => {
    if (states[WARLOCK_LIFE_TAP_USED] || character.healthPoints < hpSpent || character.manaPoints < manaSpent) return;
    onChange({
      healthPoints: character.healthPoints - hpSpent,
      manaPoints: character.manaPoints - manaSpent,
      build: {
        ...build,
        sheetFeatureStates: {
          ...states,
          [WARLOCK_LIFE_TAP_USED]: true,
          [WARLOCK_LIFE_TAP_ADV]: character.level >= 5,
        },
        sheetFeatureCounters: {
          ...counters,
          [WARLOCK_LIFE_TAP_COST]: effectCost,
          [WARLOCK_LIFE_TAP_HP]: hpSpent,
        },
      },
    });
  };
  const useFeyStep = () => {
    if (states[WARLOCK_FEY_STEP_USED] || character.currentAP < 1) return;
    onChange({
      currentAP: character.currentAP - 1,
      build: {
        ...build,
        sheetFeatureStates: { ...states, [WARLOCK_FEY_STEP_USED]: true },
        sheetConditionLevels: { ...(build.sheetConditionLevels ?? {}), Invisible: 1 },
      },
    });
  };
  const useBeguilingBargain = () => {
    if (states[WARLOCK_BEGUILING_USED] || character.healthPoints < 1) return;
    onChange({
      healthPoints: character.healthPoints - 1,
      build: { ...build, sheetFeatureStates: { ...states, [WARLOCK_BEGUILING_USED]: true } },
    });
  };
  const useEldritchBargain = () => {
    if (states[WARLOCK_ELDRITCH_BARGAIN_ACTIVE] || character.healthPoints < 1) return;
    onChange({
      healthPoints: character.healthPoints - 1,
      build: { ...build, sheetFeatureStates: { ...states, [WARLOCK_ELDRITCH_BARGAIN_ACTIVE]: true } },
    });
  };

  return <section className="mb-5 rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-purple-950/55 via-fuchsia-950/30 to-slate-950/75 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Live Class Features</p><h2 className="text-xl font-black text-white">Warlock Controls</h2></div><div className="flex flex-wrap gap-1.5">{Array.from(boons).map((boon) => <span key={boon} className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-black text-fuchsia-100">{boon}</span>)}</div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-fuchsia-200">Hasty Bargain</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per turn, spend 1 HP to gain ADV on your next Check. The advantage is consumed automatically when you roll.</p><button type="button" disabled={Boolean(states[WARLOCK_HASTY_ACTIVE]) || character.healthPoints < 1} onClick={useHastyBargain} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{states[WARLOCK_HASTY_ACTIVE] ? 'ADV ready for next Check' : 'Gain ADV • 1 HP'}</button>{states[WARLOCK_HASTY_ACTIVE] && <button type="button" onClick={() => setState(WARLOCK_HASTY_ACTIVE, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Cancel unused bargain</button>}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-red-200">Desperate Bargain</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Combat, spend 1 AP to regain {Math.max(0, character.primeModifier)} HP and become Exposed until the end of your next turn.</p><button type="button" disabled={Boolean(states[WARLOCK_DESPERATE_USED]) || character.currentAP < 1} onClick={useDesperateBargain} className="mt-3 w-full rounded-lg bg-red-800 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{states[WARLOCK_DESPERATE_USED] ? 'Used This Combat' : `Regain ${Math.max(0, character.primeModifier)} HP • 1 AP`}</button>{states[WARLOCK_DESPERATE_USED] && <button type="button" onClick={() => setState(WARLOCK_DESPERATE_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset for new Combat</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-violet-400/20 bg-violet-950/25 p-4"><h3 className="font-black text-violet-200">Life Tap</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per Long Rest or Initiative, pay HP in place of MP. Total HP + MP cannot exceed Mana Spend Limit {manaSpendLimit}.{character.level >= 5 ? ' Expert Warlock also grants ADV on the producing Check.' : ''}</p><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-400">Effect MP total<input type="number" min={1} max={manaSpendLimit} value={effectCost} onChange={(event) => setCounter(WARLOCK_LIFE_TAP_COST, Math.min(manaSpendLimit, Math.max(1, Number(event.target.value))))} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-slate-400">Pay with HP<input type="number" min={1} max={effectCost} value={hpSpent} onChange={(event) => setCounter(WARLOCK_LIFE_TAP_HP, Math.min(effectCost, Math.max(1, Number(event.target.value))))} className={`${fieldClass} mt-1`} /></label></div><p className="mt-2 text-xs text-violet-100">Cost: {hpSpent} HP + {manaSpent} MP</p><button type="button" disabled={Boolean(states[WARLOCK_LIFE_TAP_USED]) || character.healthPoints < hpSpent || character.manaPoints < manaSpent} onClick={useLifeTap} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{states[WARLOCK_LIFE_TAP_USED] ? 'Life Tap used' : 'Pay for MP Effect'}</button>{states[WARLOCK_LIFE_TAP_USED] && <button type="button" onClick={() => updateBuild({ sheetFeatureStates: { ...states, [WARLOCK_LIFE_TAP_USED]: false, [WARLOCK_LIFE_TAP_ADV]: false } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset on Initiative / Long Rest</button>}</div>}
      {(boons.has('Pact Weapon') || boons.has('Pact Armor')) && <div className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-4"><h3 className="font-black text-sky-200">Pact Armaments</h3>{boons.has('Pact Weapon') && <div className="mt-3"><p className="text-xs leading-5 text-slate-300"><strong>Pact Weapon:</strong> trained, a Spell Focus, and {character.level >= 5 ? '3' : '2'} granted Attack Maneuvers.{character.level >= 5 ? ' It gains a 1-point Weapon Property and MP converts to 2 SP of Enhancements.' : ''}</p><button type="button" onClick={() => setState(WARLOCK_PACT_WEAPON_STOWED, !states[WARLOCK_PACT_WEAPON_STOWED])} className="mt-2 w-full rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white">{states[WARLOCK_PACT_WEAPON_STOWED] ? 'Summon from Pocket Dimension' : 'Dismiss to Pocket Dimension'} • Minor Action</button></div>}{boons.has('Pact Armor') && <div className="mt-3"><p className="text-xs leading-5 text-slate-300"><strong>Pact Armor:</strong> trained, +1 AD and MDR while equipped, and {character.level >= 5 ? '3' : '2'} granted Defensive Maneuvers.{character.level >= 5 ? ' It gains a 1-point Armor Property and MP converts to 2 SP of Enhancements.' : ''}</p><button type="button" onClick={() => setState(WARLOCK_PACT_ARMOR_STOWED, !states[WARLOCK_PACT_ARMOR_STOWED])} className="mt-2 w-full rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white">{states[WARLOCK_PACT_ARMOR_STOWED] ? 'Summon from Pocket Dimension' : 'Dismiss to Pocket Dimension'} • Minor Action</button></div>}</div>}
      {boons.has('Pact Spell') && <div className="rounded-xl border border-purple-400/20 bg-purple-950/20 p-4"><h3 className="font-black text-purple-200">Pact {pactSpells.length === 1 ? 'Spell' : 'Spells'}</h3><div className="mt-2 flex flex-wrap gap-1.5">{pactSpells.map((spell) => <span key={spell} className="rounded-full bg-purple-500/10 px-2 py-1 text-[10px] font-bold text-purple-100">{spell}</span>)}</div><p className="mt-3 text-xs leading-5 text-slate-300"><strong>Death’s Toll:</strong> +1 damage to Bloodied targets. <strong>Range Increase:</strong> range 1 gains +1 Space; otherwise +5 Spaces.</p><button type="button" disabled={Boolean(states[WARLOCK_PACT_SPELL_FAVOR_USED])} onClick={() => updateBuild({ sheetFeatureStates: { ...states, [WARLOCK_PACT_SPELL_FAVOR_USED]: true, [WARLOCK_PACT_SPELL_FAVOR_ACTIVE]: true } })} className="mt-3 w-full rounded-lg bg-purple-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[WARLOCK_PACT_SPELL_FAVOR_USED] ? (states[WARLOCK_PACT_SPELL_FAVOR_ACTIVE] ? 'ADV ready for a Pact Spell Check' : 'Patron’s Favor used this Round') : 'Patron’s Favor • ADV on Pact Spell Check'}</button>{states[WARLOCK_PACT_SPELL_FAVOR_USED] && <button type="button" onClick={() => updateBuild({ sheetFeatureStates: { ...states, [WARLOCK_PACT_SPELL_FAVOR_USED]: false, [WARLOCK_PACT_SPELL_FAVOR_ACTIVE]: false } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next Round</button>}</div>}
      {boons.has('Pact Familiar') && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4"><h3 className="font-black text-emerald-200">Pact Familiar</h3><p className="mt-2 text-xs leading-5 text-slate-300">Call Familiar is granted. Your Familiar gains {character.level >= 5 ? '6 total points of free Familiar or Beast Traits; none can be Negative' : '3 additional Familiar Traits for free'}.</p></div>}
      {character.subclass === 'Eldritch' && <div className="rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-4 lg:col-span-2"><h3 className="font-black text-indigo-200">Otherworldly Gift</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="text-xs font-bold text-slate-400">Eldritch Bargain target<select value={selections[WARLOCK_ELDRITCH_BARGAIN_DEFENSE] || 'PD'} onChange={(event) => setSelection(WARLOCK_ELDRITCH_BARGAIN_DEFENSE, event.target.value)} className={`${fieldClass} mt-1`}><option>PD</option><option>AD</option></select></label><button type="button" disabled={Boolean(states[WARLOCK_ELDRITCH_BARGAIN_ACTIVE]) || character.healthPoints < 1} onClick={useEldritchBargain} className="mt-2 w-full rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[WARLOCK_ELDRITCH_BARGAIN_ACTIVE] ? `Attack targets ${selections[WARLOCK_ELDRITCH_BARGAIN_DEFENSE] || 'PD'}` : 'Use Eldritch Bargain • 1 HP'}</button>{states[WARLOCK_ELDRITCH_BARGAIN_ACTIVE] && <button type="button" onClick={() => setState(WARLOCK_ELDRITCH_BARGAIN_ACTIVE, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Attack resolved</button>}</div><div><p className="text-xs leading-5 text-slate-300"><strong>Forbidden Knowledge:</strong> {forbiddenSpell ?? 'choose after a Rest in the Builder'} • −2 MP (minimum 0) • original cost cannot exceed MSL {manaSpendLimit}.</p>{forbiddenSpell && <button type="button" disabled={Boolean(states[WARLOCK_FORBIDDEN_USED])} onClick={() => setState(WARLOCK_FORBIDDEN_USED, true)} className="mt-2 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[WARLOCK_FORBIDDEN_USED] ? 'Cast and forgotten' : 'Mark Spell cast'}</button>}{states[WARLOCK_FORBIDDEN_USED] && <button type="button" onClick={() => setState(WARLOCK_FORBIDDEN_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Choose again after Rest</button>}</div></div><p className="mt-3 text-xs text-indigo-100"><strong>Alien Comprehension:</strong> Fluent in Deep Speech.</p></div>}
      {character.subclass === 'Fey' && <div className="rounded-xl border border-pink-400/20 bg-pink-950/20 p-4 lg:col-span-2"><h3 className="font-black text-pink-200">Fey Aspect • {feyAspect}</h3><p className="mt-2 text-xs leading-5 text-slate-300">You have Resistance to {feyAspect}. Fey Step teleports up to 3 Spaces after an Attack hits and makes you Invisible until the start of your next turn.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div><button type="button" disabled={Boolean(states[WARLOCK_FEY_STEP_USED]) || character.currentAP < 1} onClick={useFeyStep} className="w-full rounded-lg bg-pink-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[WARLOCK_FEY_STEP_USED] ? 'Fey Step used' : 'Fey Step • Reaction + 1 AP'}</button>{states[WARLOCK_FEY_STEP_USED] && <button type="button" onClick={() => setState(WARLOCK_FEY_STEP_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset on Initiative / Long Rest</button>}</div><div><button type="button" disabled={Boolean(states[WARLOCK_BEGUILING_USED]) || character.healthPoints < 1} onClick={useBeguilingBargain} className="w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[WARLOCK_BEGUILING_USED] ? `${feyAspect} bargain used this Round` : `Beguiling Bargain • 1 HP • Save DC ${10 + character.primeModifier + character.combatMastery}`}</button>{states[WARLOCK_BEGUILING_USED] && <button type="button" onClick={() => setState(WARLOCK_BEGUILING_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next Round</button>}</div></div></div>}
      {talents.includes('Pact Bane') && <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4"><h3 className="font-black text-red-200">Pact Bane</h3><p className="mt-2 text-xs leading-5 text-slate-300">Track a target subjected to Bane. Pact Weapon/Spell hits deal +1 True damage; Pact Armor can Stun 1 on a nearby miss; Pact Familiar Flanks within 1 Space.</p><button type="button" onClick={() => setState(WARLOCK_PACT_BANE_ACTIVE, !states[WARLOCK_PACT_BANE_ACTIVE])} className="mt-3 w-full rounded-lg bg-red-800 px-3 py-2 text-xs font-black text-white">{states[WARLOCK_PACT_BANE_ACTIVE] ? 'Clear Bane target' : 'Track Bane target'}</button></div>}
      {talents.includes('Warlock Subcontract') && <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4"><h3 className="font-black text-amber-200">Warlock Subcontract</h3><p className="mt-2 text-xs leading-5 text-slate-300">Within 20 Spaces: Shared Telepathy, partner can use Hasty Bargain, and their willing HP can pay Warlock Features and Talents.</p><button type="button" onClick={() => setState(WARLOCK_SUBCONTRACT_ACTIVE, !states[WARLOCK_SUBCONTRACT_ACTIVE])} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">{states[WARLOCK_SUBCONTRACT_ACTIVE] ? 'Void Subcontract' : 'Create Subcontract • 1 minute'}</button>{states[WARLOCK_SUBCONTRACT_ACTIVE] && <button type="button" onClick={() => updateBuild({ temporaryHP: (build.temporaryHP ?? 0) + 1 })} className="mt-2 w-full rounded-lg bg-orange-800 px-3 py-2 text-xs font-bold text-white">Partner uses Hasty Bargain • +1 Temp HP</button>}</div>}
    </div>
  </section>;
}

function ClericControls({ character, onChange, onRoll }: {
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
  const domains = build.classFeatureSelections['cleric.domains'] ?? [];
  const domainSet = new Set(domains);
  const divineDamage = build.classFeatureSelections['cleric.divineDamage']?.[0] ?? 'Divine';
  const magicTags = build.classFeatureSelections['cleric.magicDomainTags'] ?? [];
  const magicSpells = build.classFeatureSelections['cleric.magicDomainSpells'] ?? [];
  const saveDC = 10 + character.primeModifier + character.combatMastery;
  const spellModifier = character.primeModifier + character.combatMastery;
  const expert = character.level >= 5;
  const bountiful = talents.has('Bountiful Blessings');
  const divineCleanse = talents.has('Divine Cleanse');
  const blessingOptions = ['Destruction', 'Guidance', 'Restoration', ...(character.subclass === 'Inquisitor' ? ['Chastise'] : [])];
  const blessingChoice = blessingOptions.includes(selections[CLERIC_BLESSING_CHOICE]) ? selections[CLERIC_BLESSING_CHOICE] : blessingOptions[0];
  const nextBlessingSlot: 1 | 2 = bountiful && selections[CLERIC_BLESSING_ONE] && !selections[CLERIC_BLESSING_TWO] ? 2 : 1;
  const nextBlessingManaKey = nextBlessingSlot === 1 ? CLERIC_BLESSING_ONE_MP : CLERIC_BLESSING_TWO_MP;
  const refundableBlessingMana = Math.max(0, counters[nextBlessingManaKey] ?? 0);
  const storedExtraMP = Math.max(0, Math.trunc(counters[CLERIC_BLESSING_EXTRA_MP] ?? 0));
  const blessingExtraMP = expert && ['Destruction', 'Restoration'].includes(blessingChoice)
    ? Math.min(storedExtraMP, Math.max(0, character.manaPoints + refundableBlessingMana - 1)) : 0;
  const blessingCost = 1 + blessingExtraMP;
  const channelOptions = ['Divine Rebuke', 'Lesser Divine Intervention', ...(character.subclass === 'Priest' ? ['Hand of Salvation'] : [])];
  const channelChoice = channelOptions.includes(selections[CLERIC_CHANNEL_CHOICE]) ? selections[CLERIC_CHANNEL_CHOICE] : channelOptions[0];
  const omenCount = Math.max(0, Math.trunc(counters[CLERIC_OMEN_COUNT] ?? 0));
  const overflowHealing = Math.max(0, Math.trunc(counters[CLERIC_PRIEST_OVERFLOW] ?? 0));
  const updateBuild = (values: Partial<NonNullable<Character['build']>>) => onChange({ build: { ...build, ...values } });
  const setState = (key: string, value: boolean) => updateBuild({ sheetFeatureStates: { ...states, [key]: value } });
  const setSelection = (key: string, value: string) => updateBuild({ sheetFeatureSelections: { ...selections, [key]: value } });
  const setCounter = (key: string, value: number) => updateBuild({ sheetFeatureCounters: { ...counters, [key]: value } });
  const clearBlessing = (slot: 1 | 2, refund: boolean) => {
    const selectionKey = slot === 1 ? CLERIC_BLESSING_ONE : CLERIC_BLESSING_TWO;
    const manaKey = slot === 1 ? CLERIC_BLESSING_ONE_MP : CLERIC_BLESSING_TWO_MP;
    const refundAmount = refund ? Math.max(0, counters[manaKey] ?? 0) : 0;
    onChange({
      manaPoints: Math.min(character.maxManaPoints, character.manaPoints + refundAmount),
      build: {
        ...build,
        sheetFeatureSelections: { ...selections, [selectionKey]: '' },
        sheetFeatureCounters: { ...counters, [manaKey]: 0 },
      },
    });
  };
  const petitionBlessing = (free = false) => {
    const slot = nextBlessingSlot;
    const selectionKey = slot === 1 ? CLERIC_BLESSING_ONE : CLERIC_BLESSING_TWO;
    const manaKey = slot === 1 ? CLERIC_BLESSING_ONE_MP : CLERIC_BLESSING_TWO_MP;
    const replacedMana = Math.max(0, counters[manaKey] ?? 0);
    if ((!free && character.currentAP < 1) || (!free && character.manaPoints + refundableBlessingMana < blessingCost)) return;
    onChange({
      currentAP: free ? character.currentAP : character.currentAP - 1,
      manaPoints: free
        ? Math.min(character.maxManaPoints, character.manaPoints + replacedMana)
        : Math.min(character.maxManaPoints, character.manaPoints - blessingCost + replacedMana),
      build: {
        ...build,
        sheetFeatureStates: { ...states, ...(free ? { [CLERIC_BOUNTIFUL_USED]: true } : {}) },
        sheetFeatureSelections: { ...selections, [selectionKey]: blessingChoice },
        sheetFeatureCounters: { ...counters, [manaKey]: free ? 0 : blessingCost },
      },
    });
  };
  const useChannelDivinity = () => {
    if (states[CLERIC_CHANNEL_USED] || character.currentAP < 2) return;
    let pool = 0;
    let manaPoints = character.manaPoints;
    if (channelChoice === 'Divine Rebuke') {
      onRoll('Divine Rebuke Spell Attack', spellModifier);
    } else if (channelChoice === 'Lesser Divine Intervention') {
      const outcome = onRoll('Lesser Divine Intervention Spell Check', spellModifier);
      pool = 3 + Number(expert) * 2 + Number(outcome.total >= 20) * 2;
      if (outcome.total >= 15) manaPoints = Math.min(character.maxManaPoints, manaPoints + 1);
    }
    onChange({
      currentAP: character.currentAP - 2,
      manaPoints,
      build: {
        ...build,
        sheetFeatureStates: {
          ...states,
          [CLERIC_CHANNEL_USED]: true,
          ...((channelChoice !== 'Hand of Salvation' && states[CLERIC_CHAOS_ACTIVE]) ? { [CLERIC_CHAOS_ACTIVE]: false } : {}),
        },
        sheetFeatureCounters: { ...counters, [CLERIC_CHANNEL_POOL]: pool },
      },
    });
  };
  const commune = () => {
    if (omenCount > 0) onRoll(`Divine Omen • DC ${15 + (omenCount - 1) * 5}`, spellModifier);
    updateBuild({
      sheetFeatureStates: omenCount > 0 && states[CLERIC_CHAOS_ACTIVE]
        ? { ...states, [CLERIC_CHAOS_ACTIVE]: false } : states,
      sheetFeatureCounters: { ...counters, [CLERIC_OMEN_COUNT]: omenCount + 1 },
    });
  };
  const useSavingGrace = () => {
    if (character.currentAP < 1) return;
    onRoll('Saving Grace Spell Check', spellModifier);
    onChange({
      currentAP: character.currentAP - 1,
      build: {
        ...build,
        sheetFeatureStates: states[CLERIC_CHAOS_ACTIVE]
          ? { ...states, [CLERIC_CHAOS_ACTIVE]: false } : states,
      },
    });
  };
  const blessingSummary = (name: string, mana: number) => {
    const extra = Math.max(0, mana - 1);
    if (name === 'Destruction') return `${3 + (expert ? extra * 2 : 0)} ${divineDamage} damage when the Spell Check equals or exceeds AD.`;
    if (name === 'Restoration') return `Restore ${3 + (expert ? extra * 2 : 0)} HP.`;
    if (name === 'Guidance') return 'Grant a d8 Help Die for one Check within 1 minute; that Check gains ADV.';
    return 'Brand the target for 1 minute: ADV on Insight and Intimidation against it, and once per Round add +1 Divine damage on a Hit.';
  };
  const domainNotes: Record<string, string> = {
    Knowledge: '+2 Skill Points and +1 Knowledge Trade Mastery Limit (does not stack with another Mastery Limit Feature).',
    Magic: `${magicTags.map((tag, index) => `${tag}: ${magicSpells[index] || 'spell not selected'}`).join(' • ') || 'Configure each Spell Tag and granted Spell in the Builder.'}`,
    'Divine Damage Expansion': `Spell damage can become ${divineDamage} damage; Resistance (1) to ${divineDamage} is included above.`,
    Death: 'Enemy creatures within 10 Spaces take +1 Attack damage while Well-Bloodied.',
    Grave: 'Allied creatures within 10 Spaces take 1 less Attack damage while Well-Bloodied.',
    Dark: '10-Space Darkvision (or +5 Spaces) and the special Hide option in Dim Light.',
    War: `Weapon training; granted Attack Maneuver: ${build.classFeatureSelections['cleric.warManeuver']?.[0] ?? 'choose in Builder'}.`,
    Peace: `Heavy Armor and Heavy Shield training; granted Defense Maneuver: ${build.classFeatureSelections['cleric.peaceManeuver']?.[0] ?? 'choose in Builder'}.`,
    Ancestral: '+2 Ancestry Points from any Ancestry; already included in the Builder budget.',
  };

  return <section className="mb-5 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-950/35 via-violet-950/35 to-slate-950/75 p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Live Class Features</p><h2 className="text-xl font-black text-white">Cleric Controls</h2></div><div className="flex flex-wrap gap-1.5"><span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-100">{divineDamage} Divine Damage</span>{domains.map((domain, index) => <span key={`${domain}-${index}`} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-100">{domain}</span>)}</div></div>
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-amber-300/20 bg-amber-950/20 p-4 lg:col-span-2"><h3 className="font-black text-amber-200">Divine Blessing</h3><p className="mt-2 text-xs leading-5 text-slate-400">Petition for a blessing, then apply it to one target of a Spell within 1 minute. An unused blessing returns the MP spent when it ends.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_1fr]"><select value={blessingChoice} onChange={(event) => setSelection(CLERIC_BLESSING_CHOICE, event.target.value)} className={fieldClass}>{blessingOptions.map((option) => <option key={option}>{option}</option>)}</select><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Extra MP<input type="number" min={0} max={Math.max(0, character.manaPoints + refundableBlessingMana - 1)} disabled={!expert || !['Destruction', 'Restoration'].includes(blessingChoice)} value={blessingExtraMP} onChange={(event) => setCounter(CLERIC_BLESSING_EXTRA_MP, Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-1 disabled:opacity-35`} /></label><button type="button" disabled={character.currentAP < 1 || character.manaPoints + refundableBlessingMana < blessingCost} onClick={() => petitionBlessing(false)} className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Petition • 1 AP + {blessingCost} MP</button></div><p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs leading-5 text-amber-100">{blessingSummary(blessingChoice, blessingCost)}</p>{bountiful && <button type="button" disabled={Boolean(states[CLERIC_BOUNTIFUL_USED])} onClick={() => petitionBlessing(true)} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CLERIC_BOUNTIFUL_USED] ? 'Free Combat blessing gained' : 'Bountiful Blessings • gain free blessing when Combat starts'}</button>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{([1, 2] as const).filter((slot) => slot === 1 || bountiful).map((slot) => { const name = selections[slot === 1 ? CLERIC_BLESSING_ONE : CLERIC_BLESSING_TWO]; const mana = counters[slot === 1 ? CLERIC_BLESSING_ONE_MP : CLERIC_BLESSING_TWO_MP] ?? 0; return <div key={slot} className="rounded-lg border border-white/10 bg-slate-950/55 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Blessing slot {slot}</p>{name ? <><p className="mt-1 font-black text-amber-100">{name}</p><p className="mt-1 text-xs leading-5 text-slate-400">{blessingSummary(name, mana)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => clearBlessing(slot, false)} className="flex-1 rounded bg-emerald-800 px-2 py-1.5 text-xs font-bold text-white">Apply</button><button type="button" onClick={() => clearBlessing(slot, true)} className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs font-bold text-slate-300">End unused{mana > 0 ? ` • +${mana} MP` : ''}</button></div></> : <p className="mt-2 text-xs text-slate-600">Empty</p>}</div>; })}</div>{states[CLERIC_BOUNTIFUL_USED] && <button type="button" onClick={() => setState(CLERIC_BOUNTIFUL_USED, false)} className="mt-2 text-xs font-bold text-violet-300">Reset Bountiful Blessings for new Combat</button>}</div>
      {character.level >= 2 && <div className="rounded-xl border border-violet-400/20 bg-violet-950/25 p-4"><h3 className="font-black text-violet-200">Channel Divinity</h3><select value={channelChoice} onChange={(event) => setSelection(CLERIC_CHANNEL_CHOICE, event.target.value)} className={`${fieldClass} mt-3`}>{channelOptions.map((option) => <option key={option}>{option}</option>)}</select><p className="mt-2 text-xs leading-5 text-slate-400">{channelChoice === 'Divine Rebuke' ? `Spell Attacks vs AD; Hit: ${expert ? 2 : 1} ${divineDamage} damage. Failed repeated Mental Save: Intimidated${character.subclass === 'Inquisitor' ? ' until the duration ends, even after taking damage' : ' until taking damage'}.` : channelChoice === 'Lesser Divine Intervention' ? `DC 15 Spell Check; pool starts at ${expert ? 5 : 3} HP, +2 on Success (5), and regain 1 MP on a Success.` : 'Reaction when an ally within 5 Spaces would be Hit: pull them within 1 Space; the Attack misses and they are immune to damage during the movement.'}</p><button type="button" disabled={Boolean(states[CLERIC_CHANNEL_USED]) || character.currentAP < 2} onClick={useChannelDivinity} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:opacity-35">{states[CLERIC_CHANNEL_USED] ? 'Channel Divinity used' : 'Channel • 2 AP'}</button>{(counters[CLERIC_CHANNEL_POOL] ?? 0) > 0 && <div className="mt-3 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-100"><strong>Healing pool:</strong> {counters[CLERIC_CHANNEL_POOL]} HP{divineCleanse ? ' • each beneficiary can cure one listed affliction if the Check beat its DC' : ''}</div>}{states[CLERIC_CHANNEL_USED] && <button type="button" onClick={() => updateBuild({ sheetFeatureStates: { ...states, [CLERIC_CHANNEL_USED]: false }, sheetFeatureCounters: { ...counters, [CLERIC_CHANNEL_POOL]: 0 } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset on Initiative / Long Rest</button>}</div>}
      {domainSet.has('Order') && <div className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-4"><h3 className="font-black text-sky-200">Order Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">Reaction within 10 Spaces: remove every instance of ADV and DisADV from a Check.</p><button type="button" disabled={Boolean(states[CLERIC_ORDER_USED]) || character.currentAP < 1} onClick={() => onChange({ currentAP: character.currentAP - 1, build: { ...build, sheetFeatureStates: { ...states, [CLERIC_ORDER_USED]: true } } })} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CLERIC_ORDER_USED] ? 'Used this turn' : 'Use Reaction • 1 AP'}</button>{states[CLERIC_ORDER_USED] && <button type="button" onClick={() => setState(CLERIC_ORDER_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset next turn</button>}</div>}
      {domainSet.has('Chaos') && <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4"><h3 className="font-black text-fuchsia-200">Chaos Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">Gain ADV on the next Spell Attack or Spell Check and roll on the Wild Magic Table. The sheet consumes the ADV on that roll.</p><button type="button" disabled={Boolean(states[CLERIC_CHAOS_USED])} onClick={() => updateBuild({ sheetFeatureStates: { ...states, [CLERIC_CHAOS_USED]: true, [CLERIC_CHAOS_ACTIVE]: true } })} className="mt-3 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CLERIC_CHAOS_ACTIVE] ? 'ADV ready • roll Wild Magic' : states[CLERIC_CHAOS_USED] ? 'Used' : 'Invoke Chaos'}</button>{states[CLERIC_CHAOS_USED] && <button type="button" onClick={() => updateBuild({ sheetFeatureStates: { ...states, [CLERIC_CHAOS_USED]: false, [CLERIC_CHAOS_ACTIVE]: false } })} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset on Initiative / Long Rest</button>}</div>}
      {domainSet.has('Life') && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4"><h3 className="font-black text-emerald-200">Life Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">After an MP Effect restores HP, restore 1 HP to one creature within 1 Space.</p><button type="button" disabled={character.healthPoints >= character.maxHealthPoints} onClick={() => onChange({ healthPoints: Math.min(character.maxHealthPoints, character.healthPoints + 1) })} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Restore 1 HP to self</button></div>}
      {domainSet.has('Light') && <div className="rounded-xl border border-yellow-300/20 bg-yellow-950/20 p-4"><h3 className="font-black text-yellow-200">Light Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">After an MP Effect targets a creature, one target chooses a Might or Charisma Save against DC {saveDC}. Failure: 1-Space Bright Light aura and Hindered on its next Attack.</p><button type="button" onClick={() => setState(CLERIC_LIGHT_ACTIVE, !states[CLERIC_LIGHT_ACTIVE])} className="mt-3 w-full rounded-lg bg-yellow-700 px-3 py-2 text-xs font-black text-white">{states[CLERIC_LIGHT_ACTIVE] ? 'Clear marked target' : 'Mark failed target'}</button></div>}
      {domainSet.has('Divination') && <div className="rounded-xl border border-indigo-400/20 bg-indigo-950/20 p-4"><h3 className="font-black text-indigo-200">Divination Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">You can’t be Flanked. After spending MP, you see Invisible creatures and objects until your next turn.</p><button type="button" onClick={() => setState(CLERIC_DIVINATION_ACTIVE, !states[CLERIC_DIVINATION_ACTIVE])} className="mt-3 w-full rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white">{states[CLERIC_DIVINATION_ACTIVE] ? 'Start next turn • end sight' : 'Mark MP spent • reveal Invisible'}</button></div>}
      {domainSet.has('Trickery') && <div className="rounded-xl border border-purple-400/20 bg-purple-950/20 p-4"><h3 className="font-black text-purple-200">Trickery Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">After an MP Effect targets a creature, its duplicate gives DisADV to the next Attack against it.</p><button type="button" onClick={() => setState(CLERIC_TRICKERY_ACTIVE, !states[CLERIC_TRICKERY_ACTIVE])} className="mt-3 w-full rounded-lg bg-purple-700 px-3 py-2 text-xs font-black text-white">{states[CLERIC_TRICKERY_ACTIVE] ? 'Attack resolved • remove duplicate' : 'Create duplicate'}</button></div>}
      {Object.entries(domainNotes).filter(([domain]) => domainSet.has(domain)).map(([domain, note]) => <div key={domain} className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-amber-100">{domain} Domain</h3><p className="mt-2 text-xs leading-5 text-slate-400">{note}</p></div>)}
      <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-amber-100">Divine Omen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Spend 10 minutes to ask one yes-or-no question. The first communion after a Long Rest needs no Check; each additional one raises the DC by 5.</p><button type="button" onClick={commune} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">{omenCount === 0 ? 'Commune • no Check' : `Commune • Spell Check DC ${15 + (omenCount - 1) * 5}`}</button>{omenCount > 0 && <button type="button" onClick={() => setCounter(CLERIC_OMEN_COUNT, 0)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Complete Long Rest • reset</button>}</div>
      {character.subclass === 'Inquisitor' && <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4"><h3 className="font-black text-red-200">Vanquish Heresy</h3><p className="mt-2 text-xs leading-5 text-slate-300">Iron Resolve resistances are included above. Rebuke Heretics prevents damage from ending your Divine Rebuke’s Intimidated Condition. Chastise is available in Divine Blessing.</p><button type="button" disabled={Boolean(states[CLERIC_INTERROGATOR_USED])} onClick={() => setState(CLERIC_INTERROGATOR_USED, true)} className="mt-3 w-full rounded-lg bg-red-800 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{states[CLERIC_INTERROGATOR_USED] ? 'Divine Interrogator used' : `Divine Interrogator • Charisma Save DC ${saveDC}`}</button>{states[CLERIC_INTERROGATOR_USED] && <button type="button" onClick={() => setState(CLERIC_INTERROGATOR_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset after Long Rest</button>}</div>}
      {character.subclass === 'Priest' && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4 lg:col-span-2"><h3 className="font-black text-emerald-200">Sanctification</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Divine Barrier:</strong> MP healing beyond maximum becomes Temp HP for 1 minute. <strong>Spare the Dying:</strong> MP healing on Death’s Door restores +{character.primeModifier} HP. Hand of Salvation is available under Channel Divinity.</p><div className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr]"><input type="number" min={0} value={overflowHealing} onChange={(event) => setCounter(CLERIC_PRIEST_OVERFLOW, Math.max(0, Number(event.target.value)))} className={fieldClass} /><button type="button" disabled={overflowHealing < 1} onClick={() => updateBuild({ temporaryHP: (build.temporaryHP ?? 0) + overflowHealing, sheetFeatureCounters: { ...counters, [CLERIC_PRIEST_OVERFLOW]: 0 } })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Convert overflow healing to Temp HP</button></div><p className="mt-3 text-xs text-emerald-100"><strong>All that Ails:</strong> ADV on Checks to identify a Disease, Poison, or Curse and determine its effects.</p></div>}
      {divineCleanse && <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4 lg:col-span-2"><h3 className="font-black text-cyan-200">Divine Cleanse</h3><p className="mt-2 text-xs leading-5 text-slate-300"><strong>Saving Grace:</strong> when a visible creature within 10 Spaces fails a Save, spend 1 AP as a Reaction and beat the effect’s Save DC or opposing Check. <strong>Cleansing Intervention:</strong> a Lesser Divine Intervention beneficiary can cure one Curse, Disease, Poison, Blinded, or Deafened effect if the Check beat its DC.</p><button type="button" disabled={character.currentAP < 1} onClick={useSavingGrace} className="mt-3 w-full rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Saving Grace Spell Check • 1 AP</button></div>}
    </div>
  </section>;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onClose, onEdit, onCharacterChange }) => {
  const [selectedTab, setSelectedTab] = useState<SheetTab>('sheet-checks');
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
  const isWarlock = character.class === 'Warlock';
  const isCleric = character.class === 'Cleric';
  const isBard = character.class === 'Bard';
  const isChampion = character.class === 'Champion';
  const isCommander = character.class === 'Commander';
  const hasLiveClassControls = isBarbarian || isRogue || isSummoner || isSpellblade || isWarlock || isCleric || isBard || isChampion || isCommander;
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
  const ancestryGrantedSpells = useMemo(
    () => ancestryGrantedSpellNames(character, reference?.ancestryTraits ?? []),
    [character, reference?.ancestryTraits],
  );
  const knownSpells = useMemo(() => {
    const result = [...character.spells];
    for (const name of [...grantedSpells, ...ancestryGrantedSpells.map((entry) => entry.name)]) {
      if (result.some((spell) => spell.name === name)) continue;
      const spell = spellCatalog.find((entry) => entry.name === name);
      if (spell) result.push({ id: `spell|${spell.name}`, ...spell });
      else {
        const ancestryGrant = ancestryGrantedSpells.find((entry) => entry.name === name);
        if (ancestryGrant) result.push({
          id: `ancestry-spell|${ancestryGrant.traitName}|${name}`,
          name,
          source: 'Ancestry',
          school: 'Cantrip / ancestry-granted power',
          range: 'See trait',
          duration: 'See trait',
          description: `${ancestryGrant.traitDescription}\n\nThe Beta source names this power but does not include it in the published spell catalog.`,
        });
      }
    }
    return result;
  }, [ancestryGrantedSpells, character.spells, grantedSpells, spellCatalog]);
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
    const pactSpellName = label.endsWith(' Spell Check') ? label.slice(0, -' Spell Check'.length)
      : label.endsWith(' Spell Attack') ? label.slice(0, -' Spell Attack'.length) : '';
    const pactSpells = build?.classFeatureSelections['warlock.pactSpells'] ?? [];
    const patronFavorApplies = Boolean(isWarlock && featureStates[WARLOCK_PACT_SPELL_FAVOR_ACTIVE] && pactSpells.includes(pactSpellName));
    const warlockAdvantage = isWarlock
      ? Number(Boolean(featureStates[WARLOCK_HASTY_ACTIVE]))
        + Number(Boolean(featureStates[WARLOCK_LIFE_TAP_ADV]))
        + Number(patronFavorApplies)
      : 0;
    const clericChaosApplies = Boolean(isCleric && featureStates[CLERIC_CHAOS_ACTIVE]
      && (label.endsWith(' Spell Check') || label.endsWith(' Spell Attack')));
    const championReadiness = featureSelections[CHAMPION_READINESS_CHOICE] || 'Fortify';
    const physicalCheckLabels = ['Might Check', 'Agility Check', 'Athletics Check', 'Intimidation Check', 'Acrobatics Check', 'Trickery Check', 'Stealth Check'];
    const championReadinessApplies = Boolean(isChampion && featureStates[CHAMPION_READINESS_ACTIVE] && (
      (championReadiness === 'Fortify' && label.endsWith(' Save'))
      || (championReadiness === 'Advance' && (label.includes('Martial Attack') || label.includes('Martial Check') || physicalCheckLabels.includes(label)))
    ));
    const championAdrenalineApplies = Boolean(isChampion && featureStates[CHAMPION_ADRENALINE_ACTIVE]
      && (label.includes('Martial Attack') || label.includes('Martial Check')));
    const featureAdjustment = (label === 'Might Save' ? (sheetEffects.saveAdvantage.Might ?? 0) : 0)
      + warlockAdvantage + Number(clericChaosApplies) + Number(championReadinessApplies);
    const totalAdjustment = Math.max(-5, Math.min(5, rollAdjustment + featureAdjustment + extraAdjustment));
    const dice = Array.from({ length: 1 + Math.abs(totalAdjustment) }, () => Math.floor(Math.random() * 20) + 1);
    const chosen = totalAdjustment > 0 ? Math.max(...dice) : totalAdjustment < 0 ? Math.min(...dice) : dice[0];
    const effectiveModifier = modifier + (championAdrenalineApplies ? 5 : 0);
    const result = { label, dice, chosen, modifier: effectiveModifier, total: chosen + effectiveModifier };
    setLastRoll(result);
    if (warlockAdvantage) {
      updateBuild({
        sheetFeatureStates: {
          ...featureStates,
          [WARLOCK_HASTY_ACTIVE]: false,
          [WARLOCK_LIFE_TAP_ADV]: false,
          ...(patronFavorApplies ? { [WARLOCK_PACT_SPELL_FAVOR_ACTIVE]: false } : {}),
        },
      });
    }
    if (clericChaosApplies) {
      updateBuild({ sheetFeatureStates: { ...featureStates, [CLERIC_CHAOS_ACTIVE]: false } });
    }
    if (championReadinessApplies) {
      updateBuild({ sheetFeatureStates: { ...featureStates, [CHAMPION_READINESS_ACTIVE]: false } });
    }
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
  const bardArtistryModifier = Math.max(0, ...(reference?.trades
    .filter(({ group }) => group === 'Artistry')
    .map(({ name }) => tradeModifier(name, character.tradeMasteries[name] ?? 'Untrained')) ?? []));
  const championKnowledgeModifier = Math.max(0, ...(reference?.trades
    .filter(({ group }) => group === 'Knowledge')
    .map(({ name }) => tradeModifier(name, character.tradeMasteries[name] ?? 'Untrained')) ?? []));
  const championInsightModifier = skillModifier('Insight', character.skillMasteries.Insight ?? 'Untrained');
  const commanderIntimidationModifier = skillModifier('Intimidation', character.skillMasteries.Intimidation ?? 'Untrained');
  const commanderCharismaModifier = character.attributes.Charisma.modifier;

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
          <CharacterRestControls character={character} onChange={update} />
        </header>

        {hasLiveClassControls && <details className="group mb-5 rounded-2xl border border-violet-400/20 bg-slate-950/55 p-3 sm:p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-2"><span><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Character Sheet Controls</span><span className="text-lg font-black text-white">Live Class Features • {character.class}</span></span><span className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200 group-open:hidden">Expand</span><span className="hidden rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200 group-open:inline">Collapse</span></summary>
          <div className="mt-3 border-t border-white/5 pt-4 [&>section]:mb-0">
        {isBarbarian && <section className="mb-5 rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-950/55 to-slate-950/70 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Live Class Features</p><h2 className="text-xl font-black text-white">Barbarian Controls</h2></div>{isRaging && <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">Raging</span>}</div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-orange-200">Rage</h3><p className="mt-1 text-xs text-slate-500">1 minute • ends early if Unconscious, dead, or ended freely</p></div><span className="text-2xl">🔥</span></div>{isRaging ? <><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-red-500/10 p-2 text-red-100">PD <strong>{sheetEffects.physicalDefense}</strong> <span className="text-slate-500">(base {character.physicalDefense})</span></div><div className="rounded-lg bg-orange-500/10 p-2 text-orange-100">Melee/Unarmed <strong>+{sheetEffects.martialMeleeDamageBonus} damage</strong></div><div className="rounded-lg bg-violet-500/10 p-2 text-violet-100">Might Saves <strong>ADV</strong></div><div className="rounded-lg bg-sky-500/10 p-2 text-sky-100">Physical & Elemental <strong>Resistance (Half)</strong></div>{character.subclass === 'Spirit Guardian' && <div className="col-span-2 rounded-lg bg-fuchsia-500/10 p-2 text-fuchsia-100">Spiritual Aura: <strong>Mystical Resistance (1)</strong> and a 5 Space Aura</div>}{character.subclass === 'Elemental Fury' && <div className="col-span-2 rounded-lg bg-emerald-500/10 p-2 text-emerald-100">Raging Elements: <strong>{build?.classFeatureSelections['barbarian.elementalDamage']?.[0] ?? 'Choose damage type'}</strong> • {build?.classFeatureSelections['barbarian.elementalAura']?.[0] ?? 'Choose aura type'}</div>}</div><button type="button" onClick={endRage} className="mt-3 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-black text-slate-200">End Rage (Free)</button></> : <div className="mt-3 space-y-2"><button type="button" disabled={character.currentAP < 1 || character.stamina < 1} onClick={() => enterRage(false)} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Enter Rage • 1 AP + 1 SP</button>{character.level >= 5 && <button type="button" onClick={() => enterRage(true)} className="w-full rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-200">Enter for free after rolling Initiative</button>}</div>}{hasUnfathomableStrength && <p className="mt-3 text-xs leading-5 text-amber-200">Unfathomable Strength: while Raging, Two-Handed Weapons use 1 hand and your Jump Distance increases by 1.</p>}</div>

            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-sky-200">Stamina Regen</h3><p className="mt-2 text-xs leading-5 text-slate-400">Once per round, regain up to half your maximum SP after you score a Heavy or Critical Hit, or one is scored against you.</p><p className="mt-2 text-xs font-bold text-sky-300">Up to {barbarianStaminaRegenAmount(character.maxStamina)} SP</p><button type="button" disabled={Boolean(featureStates[BARBARIAN_REGEN_USED]) || character.stamina >= character.maxStamina} onClick={useStaminaRegen} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{featureStates[BARBARIAN_REGEN_USED] ? 'Used This Round' : 'Regain Stamina'}</button>{featureStates[BARBARIAN_REGEN_USED] && <button type="button" onClick={() => setFeatureState(BARBARIAN_REGEN_USED, false)} className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Reset at start of next round</button>}</div>

            {character.level >= 2 && <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><h3 className="font-black text-violet-200">Battlecry</h3><p className="mt-1 text-xs text-slate-500">1 AP + 1 SP • {character.level >= 5 ? '10' : '5'} Spaces • until the start of your next turn</p><label className="mt-3 block text-xs font-bold text-slate-400">Shout<select value={battlecryShout} onChange={(event) => updateBuild({ sheetFeatureSelections: { ...featureSelections, [BARBARIAN_BATTLECRY_SELECTION]: event.target.value }, sheetFeatureCounters: { ...featureCounters, [BARBARIAN_BATTLECRY_ENHANCEMENT]: 0 }, sheetFeatureStates: { ...featureStates, [BARBARIAN_BATTLECRY_STATE]: false } })} className={`${fieldClass} mt-1`}><option>Fortitude Shout</option><option>Fury Shout</option><option>Urgent Shout</option></select></label>{character.level >= 5 && <label className="mt-2 block text-xs font-bold text-slate-400">Expert Enhancement<select value={battlecryEnhancementSP} onChange={(event) => updateBuild({ sheetFeatureCounters: { ...featureCounters, [BARBARIAN_BATTLECRY_ENHANCEMENT]: Number(event.target.value) }, sheetFeatureStates: { ...featureStates, [BARBARIAN_BATTLECRY_STATE]: false } })} className={`${fieldClass} mt-1`}><option value={0}>None</option>{battlecryShout === 'Fortitude Shout' && <option value={1}>1 SP • Resistance (Half)</option>}{battlecryShout === 'Fury Shout' && <option value={3}>3 SP • +1 additional damage</option>}{battlecryShout === 'Urgent Shout' && <><option value={1}>1 SP • +2 additional Speed</option><option value={2}>2 SP • +4 additional Speed</option></>}</select></label>}{battlecryActive && <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/10 p-2 text-xs leading-5 text-violet-100">{battlecryShout === 'Fortitude Shout' ? `Resistance (${battlecryEnhancementSP >= 1 ? 'Half' : '1'}) against the next source of Physical or Elemental damage.` : battlecryShout === 'Fury Shout' ? `+${battlecryEnhancementSP >= 3 ? 2 : 1} damage on the next Attack against 1 target.` : `+${1 + Math.min(2, battlecryEnhancementSP) * 2} Speed until the start of your next turn.`}</div>}<div className="mt-3 flex gap-2"><button type="button" disabled={battlecryActive || character.currentAP < 1 || character.stamina < 1 + battlecryEnhancementSP} onClick={useBattlecry} className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{battlecryActive ? 'Active' : `Use • 1 AP + ${1 + battlecryEnhancementSP} SP`}</button>{battlecryActive && <button type="button" onClick={() => setFeatureState(BARBARIAN_BATTLECRY_STATE, false)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Clear</button>}</div></div>}
            <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-3"><h3 className="font-black text-amber-200">Berserker Benefits</h3><div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4"><p><strong className="text-slate-100">Charge:</strong> move up to {character.level >= 5 ? '3 Spaces and ignore Difficult Terrain' : '2 Spaces'} immediately before a Melee Martial Attack.</p><p><strong className="text-slate-100">Berserker Defense:</strong> +2 AD while unarmored; included in your displayed AD when applicable.</p><p><strong className="text-slate-100">Fast Movement:</strong> +1 Speed; included in your displayed Speed.</p><p><strong className="text-slate-100">Mighty Leap:</strong> use Might instead of Agility for Jump Distance and Falling damage.</p></div>{character.subclass === 'Elemental Fury' && isRaging && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3"><p className="text-xs leading-5 text-emerald-100"><strong>Elemental Blast:</strong> Area Spell Attack vs AD; 1 Elemental Rage damage. A single target uses PD and takes 2 damage.</p><button type="button" disabled={character.currentAP < 1 || character.stamina < 1} onClick={useElementalBlast} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">Roll & Spend • 1 AP + 1 SP</button></div>}</div>
          </div>
        </section>}

        {isBard && <BardControls character={character} onChange={update} onRoll={roll} artistryModifier={bardArtistryModifier} />}
        {isChampion && <ChampionControls character={character} onChange={update} onRoll={roll} insightModifier={championInsightModifier} knowledgeModifier={championKnowledgeModifier} />}
        {isCommander && <CommanderControls character={character} onChange={update} onRoll={roll} intimidationModifier={commanderIntimidationModifier} charismaModifier={commanderCharismaModifier} />}
        {isSummoner && <SummonerControls character={character} onChange={update} />}
        {isSpellblade && <SpellbladeControls character={character} onChange={update} onRoll={roll} />}
        {isRogue && <RogueControls character={character} onChange={update} onRoll={roll} stealthModifier={skillModifier('Stealth', character.skillMasteries.Stealth ?? 'Untrained')} />}
        {isWarlock && <WarlockControls character={character} onChange={update} />}
        {isCleric && <ClericControls character={character} onChange={update} onRoll={roll} />}
          </div>
        </details>}

        <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_330px]"><nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:grid-cols-3 xl:grid-cols-6">{tabs.map((tab) => <button type="button" key={tab.id} onClick={() => setSelectedTab(tab.id)} className={`rounded-xl px-3 py-3 text-sm font-bold ${selectedTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>{tab.label}</button>)}</nav><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3"><button type="button" onClick={() => updateBuild({ rollAdjustment: Math.max(-5, rollAdjustment - 1) })} className="h-9 w-9 rounded-lg bg-slate-800 text-lg">−</button><div className="text-center"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Roll Mode</div><div className="font-black text-violet-200">{rollAdjustment > 0 ? `${rollAdjustment}× Advantage` : rollAdjustment < 0 ? `${Math.abs(rollAdjustment)}× Disadvantage` : 'Normal'}</div></div><button type="button" onClick={() => updateBuild({ rollAdjustment: Math.min(5, rollAdjustment + 1) })} className="h-9 w-9 rounded-lg bg-violet-600 text-lg">+</button></div></div>

        {lastRoll && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4"><div><span className="font-black text-violet-200">{lastRoll.label}</span><span className="ml-3 text-sm text-slate-400">Dice: {lastRoll.dice.join(', ')} • chosen {lastRoll.chosen} {lastRoll.modifier >= 0 ? '+' : '−'} {Math.abs(lastRoll.modifier)}</span></div><div className="text-3xl font-black text-white">{lastRoll.total}</div></div>}

        <main className={`${panelClass} min-h-[560px]`}>
          {selectedTab.startsWith('sheet-') && <CharacterSheetTabContent
            tab={selectedTab as RedesignedSheetTab}
            character={character}
            classReference={classReference}
            reference={reference}
            equipmentCatalog={equipmentCatalog}
            knownSpells={knownSpells}
            knownManeuvers={knownManeuvers}
            grantedSpells={grantedSpells}
            grantedManeuvers={grantedManeuvers}
            ancestryGrantedSpells={ancestryGrantedSpells}
            onChange={update}
            onRoll={roll}
          />}
          {selectedTab === 'overview' && <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3"><section className={panelClass}><h2 className="font-black text-violet-200">Combat</h2><div className="mt-4 grid grid-cols-2 gap-3">{[['Physical Defense', sheetEffects.physicalDefense], ['Arcane Defense', character.arcaneDefense], ['Combat Mastery', `+${character.combatMastery}`], ['Speed', sheetEffects.speed], ['Martial Check', `+${character.primeModifier + character.combatMastery}`], ['Spell Check', `+${character.primeModifier + character.combatMastery}`], ['Class Save DC', 10 + character.primeModifier + character.combatMastery], ['Death Threshold', -4]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-950/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div>{label === 'Physical Defense' && isRaging && <div className="text-[10px] font-bold text-red-300">Rage: −5</div>}{label === 'Speed' && sheetEffects.speed !== character.speed && <div className="text-[10px] font-bold text-sky-300">Active Rune: +1</div>}</div>)}</div>{sheetEffects.resistances.length > 0 && <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/5 p-2 text-xs text-sky-100"><strong>Active Resistances:</strong> {sheetEffects.resistances.join(' • ')}</div>}</section><section className={panelClass}><h2 className="font-black text-violet-200">Attributes</h2><div className="mt-4 grid grid-cols-2 gap-3">{ATTRIBUTE_NAMES.map((attribute) => <button type="button" key={attribute} onClick={() => roll(`${attribute} Check`, character.attributes[attribute].modifier)} className="rounded-lg bg-slate-950/55 p-3 text-left hover:bg-violet-500/10"><div className="text-xs text-slate-500">{attribute}</div><div className="text-xl font-black text-slate-100">{character.attributes[attribute].modifier >= 0 ? '+' : ''}{character.attributes[attribute].modifier}</div><div className="text-xs text-violet-300">Roll check</div></button>)}</div></section><section className={panelClass}><div className="flex items-center justify-between"><h2 className="font-black text-violet-200">Active Conditions</h2><div className="flex gap-2"><select value={conditionToAdd} onChange={(event) => setConditionToAdd(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select><button type="button" onClick={() => setCondition(conditionToAdd, conditionLevels[conditionToAdd] ?? 1)} className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold">Add</button></div></div><div className="mt-4 space-y-2">{Object.entries(conditionLevels).length === 0 ? <p className="text-sm text-slate-500">No active conditions.</p> : Object.entries(conditionLevels).sort().map(([condition, value]) => <div key={condition} className="flex items-center justify-between rounded-lg bg-slate-950/55 p-3"><span className="font-bold text-slate-200">{condition}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setCondition(condition, value - 1)} className="h-7 w-7 rounded bg-slate-800">−</button><span className="min-w-6 text-center font-black text-violet-200">{value}</span><button type="button" onClick={() => setCondition(condition, value + 1)} className="h-7 w-7 rounded bg-slate-800">+</button><button type="button" onClick={() => setCondition(condition, 0)} className="ml-1 text-xs font-bold text-red-300">×</button></div></div>)}</div></section><section className={`${panelClass} lg:col-span-2 xl:col-span-3`}><h2 className="font-black text-violet-200">Background</h2><h3 className="mt-3 text-lg font-black text-slate-200">{build?.backgroundName || character.background || 'Unnamed Background'}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{build?.backgroundStory || 'No background story has been written yet.'}</p></section></div>}

          {selectedTab === 'checks' && <div className="space-y-5"><section><h2 className="mb-3 font-black text-violet-200">Attribute Saves</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = character.attributes[attribute].modifier + character.combatMastery; return <button type="button" key={attribute} onClick={() => roll(`${attribute} Save`, modifier)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-violet-400/40"><div className="text-xs text-slate-500">{attribute} Save</div><div className="text-2xl font-black text-violet-200">+{modifier}</div></button>; })}</div></section><section><button type="button" onClick={() => setExpandedSkills((value) => !value)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-violet-200"><span>Skills</span><span>{expandedSkills ? 'Collapse' : 'Expand'}</span></button>{expandedSkills && <div className="space-y-5">{skillGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.skillMasteries[name] ?? 'Untrained'; const modifier = skillModifier(name, mastery); return <button type="button" key={name} onClick={() => roll(`${name} Check`, modifier)} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-violet-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{mastery}</span></span><span className="font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</span></button>; })}</div></div>)}</div>}</section><section><button type="button" onClick={() => setExpandedTrades((value) => !value)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-fuchsia-200"><span>Trades</span><span>{expandedTrades ? 'Collapse' : 'Expand'}</span></button>{expandedTrades && <div className="space-y-5">{tradeGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.tradeMasteries[name] ?? 'Untrained'; const modifier = tradeModifier(name, mastery); return <button type="button" key={name} onClick={() => roll(`${name} Trade Check`, modifier)} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-fuchsia-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{mastery}</span></span><span className="font-black text-fuchsia-200">{modifier >= 0 ? '+' : ''}{modifier}</span></button>; })}</div></div>)}</div>}</section></div>}

          {selectedTab === 'powers' && <div><div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Martial Check</div><div className="text-2xl font-black text-violet-200">+{character.primeModifier + character.combatMastery}</div></div><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Spell Check</div><div className="text-2xl font-black text-fuchsia-200">+{character.primeModifier + character.combatMastery}</div></div><div className="rounded-xl bg-slate-950/55 p-3"><div className="text-xs text-slate-500">Class Save DC</div><div className="text-2xl font-black text-sky-200">{10 + character.primeModifier + character.combatMastery}</div></div></div><div className="grid gap-5 lg:grid-cols-2"><section><h2 className="mb-3 font-black text-fuchsia-200">Spells</h2><div className="space-y-2">{knownSpells.length === 0 ? <p className="text-slate-500">No spells known.</p> : knownSpells.map((spell) => <Details key={spell.id} title={spell.name} subtitle={[spell.source, spell.school, spell.cost, spell.range, grantedSpells.includes(spell.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{spell.description}{spell.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{spell.enhancements}</p></>}<button type="button" onClick={() => roll(`${spell.name} Spell Check`, character.primeModifier + character.combatMastery)} className="mt-4 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white">Roll Spell Check</button></Details>)}</div></section><section><h2 className="mb-3 font-black text-violet-200">Maneuvers</h2><div className="space-y-2">{knownManeuvers.length === 0 ? <p className="text-slate-500">No maneuvers known.</p> : knownManeuvers.map((maneuver) => <Details key={maneuver.id} title={maneuver.name} subtitle={[maneuver.category ?? maneuver.type, maneuver.cost, maneuver.range, grantedManeuvers.includes(maneuver.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{maneuver.description}{maneuver.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{maneuver.enhancements}</p></>}</Details>)}</div></section></div></div>}

          {selectedTab === 'features' && <div className="grid gap-5 lg:grid-cols-3"><section><h2 className="mb-3 font-black text-violet-200">Class Features</h2><div className="space-y-3">{classFeatures.map((entry) => <div key={entry.level}><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Level {entry.level}</h3><div className="space-y-2">{entry.features.map((feature) => <Details key={`${entry.level}-${feature.name}`} title={feature.name}>{featureDescription(feature.name, feature.description)}</Details>)}</div></div>)}{character.subclass && (classReference?.subclassFeatures[character.subclass] ?? []).filter((feature) => feature.level === undefined || feature.level <= character.level).map((feature) => <Details key={`subclass-${feature.name}`} title={feature.name} subtitle={`${character.subclass}${feature.level !== undefined ? ` • Level ${feature.level}` : ''}`}>{featureDescription(feature.name, feature.description)}</Details>)}</div></section><section><h2 className="mb-3 font-black text-fuchsia-200">Talents</h2><div className="space-y-2">{selectedTalentCounts.length === 0 ? <p className="text-slate-500">No talents selected.</p> : selectedTalentCounts.map(([name, count]) => { const talent = classReference?.talents.find(({ name: candidate }) => candidate === name); const description = talent?.description ?? 'Talent details are unavailable.'; return <Details key={name} title={`${name}${count > 1 ? ` ×${count}` : ''}`}>{featureDescription(name, description)}</Details>; })}</div></section><section><h2 className="mb-3 font-black text-emerald-200">Ancestry Traits</h2><div className="space-y-2">{ancestryTraits.length === 0 ? <p className="text-slate-500">No ancestry traits selected.</p> : ancestryTraits.map((trait) => <Details key={trait.id} title={trait.name} subtitle={`${trait.ancestry} • ${trait.cost > 0 ? '+' : ''}${trait.cost} AP`}>{trait.description}{build?.ancestryTraitChoices[trait.id]?.length ? `\n\nChoice: ${build.ancestryTraitChoices[trait.id].join(', ')}` : ''}</Details>)}</div></section></div>}

          {selectedTab === 'equipment' && <div><div className="mb-6"><h2 className="font-black text-violet-200">Inventory & Equipped Gear</h2><p className="mt-1 text-sm text-slate-500">Add equipment from the main Equipment tab. Armor and hand limits are enforced when equipping.</p></div>{(character.inventoryItems?.length ?? 0) + character.equipment.length > 0 ? <div className="space-y-2">{(character.inventoryItems ?? []).map((inventory) => { const item = equipmentCatalog.find(({ id }) => id === inventory.equipmentID); if (!item) return <div key={inventory.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-amber-200">Missing catalog item: {inventory.equipmentID}</div>; return <Details key={inventory.id} title={item.name} subtitle={`${item.category} • ${item.subtype} • ${item.slot}${inventory.isEquipped ? ' • Equipped' : ''}`}><p className="font-semibold text-violet-200">{item.summary}</p><p className="mt-3">{item.mechanics}</p><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => update({ inventoryItems: setInventoryQuantity(character.inventoryItems ?? [], inventory.id, inventory.quantity - 1) })} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-slate-200">Quantity {inventory.quantity}</span><button type="button" onClick={() => update({ inventoryItems: setInventoryQuantity(character.inventoryItems ?? [], inventory.id, inventory.quantity + 1) })} className="h-8 w-8 rounded bg-slate-800">+</button>{isEquipmentEquippable(item) && <button type="button" onClick={() => update({ inventoryItems: toggleInventoryEquipped(character.inventoryItems ?? [], inventory.id, equipmentCatalog) })} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">{inventory.isEquipped ? 'Stow' : 'Equip'}</button>}<button type="button" onClick={() => update({ inventoryItems: (character.inventoryItems ?? []).filter(({ id }) => id !== inventory.id) })} className="rounded-lg px-3 py-2 text-xs font-bold text-red-300">Remove</button></div></Details>; })}{character.equipment.map((item) => <div key={item.id} className="rounded-lg bg-slate-950/45 p-3 text-slate-300">{item.name} ×{item.quantity} <span className="text-xs text-slate-500">legacy item</span></div>)}</div> : <p className="text-slate-500">No equipment in inventory.</p>}</div>}

          {selectedTab === 'notes' && <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><aside><button type="button" onClick={() => updateBuild({ characterNotes: [...notes, { id: generateUUID(), title: 'New Note', body: '' }] })} className="mb-3 w-full rounded-xl bg-violet-600 px-4 py-3 font-black text-white">+ New Note</button><div className="space-y-2">{notes.map((note) => <div key={note.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><input value={note.title} onChange={(event) => updateNote({ ...note, title: event.target.value })} className={`${fieldClass} font-bold`} /><button type="button" onClick={() => updateBuild({ characterNotes: notes.filter(({ id }) => id !== note.id) })} className="mt-2 text-xs font-bold text-red-300">Delete note</button></div>)}</div></aside><section className="space-y-3">{notes.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Create named notes for session details, goals, NPCs, or reminders.</div> : notes.map((note) => <div key={note.id} className={panelClass}><h2 className="font-black text-violet-200">{note.title || 'Untitled Note'}</h2><textarea value={note.body} onChange={(event) => updateNote({ ...note, body: event.target.value })} rows={10} className={`${fieldClass} mt-3`} placeholder="Write your note…" /></div>)}</section></div>}
        </main>
      </div>
    </div>
  );
};

export default CharacterSheet;
