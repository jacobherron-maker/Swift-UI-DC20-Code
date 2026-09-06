import React, { useMemo, useRef, useState } from 'react';
import type {
  AncestryTrait,
  Character,
  CharacterCompanion,
  CharacterCompanionKind,
  CharacterInventoryItem,
  CharacterReferenceData,
  ClassReference,
  DC20Attribute,
  EquipmentCatalogItem,
  EquipmentCategory,
  Maneuver,
  MasteryLevel,
  Spell,
} from '../../types/models';
import { EquipmentCategoryValues, EquipmentSlotValues } from '../../types/models';
import { useCampaignStore } from '../../store/campaignStore';
import {
  ATTRIBUTE_NAMES,
  BARBARIAN_RAGE_STATE,
  ancestryMechanicalProfile,
  ancestryExpertise,
  ancestryTraitRulesTags,
  ancestryTraitSelectionCount,
  ancestryTraitSource,
  characterRestPoints,
  characterCombatTraining,
  characterSheetEffects,
  completeCharacterRest,
  druidWildFormProfile,
  equippedCombatModifiers,
  grantedClassLanguageLevels,
  grantedClassLanguageNames,
  masteryBonus,
  masteryRank,
  masteryTitle,
  MONK_ACTIVE_STANCE,
  MONK_ASTRAL_SELF_ACTIVE,
  MONK_COBRA_REVENGE,
  MONK_FLURRY_USED,
  MONK_KI_CURRENT,
  MONK_MEDITATION_SKILL,
  MONK_MONGOOSE_FLANKED,
  MONK_STANCE_ACTIVE,
  monkKiMaximum,
  monkKiRecoveryAmount,
  monkMeleeHeavyHitDamageBonus,
  resetCharacterTurn,
  selectedAncestryTraits,
  skillMasteryCap,
  sorcererWildMagicProfile,
} from '../../utils/characterRules';
import {
  addInventoryItem,
  consumeInventoryQuantity,
  defensiveEquipmentProfile,
  equipmentHandCost,
  equipmentTransitionActionPointCost,
  healingPotionAmount,
  isEquipmentEquippable,
  setInventoryQuantity,
  spendInventoryUse,
  toggleInventoryEquipped,
  weaponMechanicalProfile,
  WEAPON_ENHANCEMENTS,
} from '../../utils/equipmentRules';
import { generateUUID, rollDice } from '../../utils/gameUtils';
import { hasDirectMulticlassFeature, ownedClassFeatures, talentByName } from '../../utils/talentRules';

export type RedesignedSheetTab = 'sheet-checks' | 'sheet-combat' | 'sheet-features' | 'sheet-equipment' | 'sheet-misc';

export interface SheetAncestrySpell {
  name: string;
  traitName: string;
  traitDescription: string;
}

interface CharacterSheetTabContentProps {
  tab: RedesignedSheetTab;
  character: Character;
  classReference?: ClassReference;
  reference: CharacterReferenceData | null;
  equipmentCatalog: EquipmentCatalogItem[];
  knownSpells: Spell[];
  knownManeuvers: Maneuver[];
  grantedSpells: string[];
  grantedManeuvers: string[];
  ancestryGrantedSpells: SheetAncestrySpell[];
  onChange: (values: Partial<Character>) => void;
  onRoll: (label: string, modifier: number, extraAdjustment?: number) => unknown;
}

const panelClass = 'rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5';
const fieldClass = 'w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-violet-400';
const conditions = ['Bleeding', 'Blinded', 'Burning', 'Charmed', 'Dazed', 'Deafened', 'Disoriented', 'Doomed', 'Exhaustion', 'Exposed', 'Frightened', 'Hindered', 'Impaired', 'Immobilized', 'Intimidated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned', 'Taunted', 'Terrified', 'Unconscious', 'Weakened'];
const uniqueStrings = (values: string[]) => Array.from(new Set(values));

function MoreDetails({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <details className="group rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-start justify-between gap-3"><span><span className="font-black text-slate-200">{title}</span>{subtitle && <span className="mt-1 block text-xs text-slate-500">{subtitle}</span>}</span><span className="text-xs font-bold text-violet-300 group-open:hidden">More</span><span className="hidden text-xs font-bold text-violet-300 group-open:inline">Less</span></summary><div className="mt-4 whitespace-pre-wrap border-t border-white/5 pt-4 text-sm leading-6 text-slate-400">{children}</div></details>;
}

function SectionHeading({ eyebrow, title, tone = 'text-violet-300' }: { eyebrow: string; title: string; tone?: string }) {
  return <div><p className={`text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>{eyebrow}</p><h2 className="text-xl font-black text-white">{title}</h2></div>;
}

export function CharacterRestControls({ character, onChange }: { character: Character; onChange: (character: Character) => void }) {
  const [spend, setSpend] = useState(0);
  const [notice, setNotice] = useState('');
  const build = character.build;
  if (!build) return null;
  const restPoints = characterRestPoints(character);
  const shortRestsTaken = Math.max(0, build.shortRestsTaken ?? 0);
  const maximumSpend = Math.min(restPoints, Math.max(0, character.maxHealthPoints - character.healthPoints));
  const selectedSpend = Math.min(maximumSpend, Math.max(0, spend));
  const setRestPoints = (value: number) => onChange({ ...character, build: { ...build, restPoints: Math.min(character.maxHealthPoints, Math.max(0, value)) } });
  const rest = (type: 'Quick' | 'Short' | 'Long') => {
    const before = character;
    const next = completeCharacterRest(character, type, selectedSpend);
    onChange(next);
    const healed = next.healthPoints - before.healthPoints;
    const details = [healed > 0 ? `${healed} HP restored` : 'no HP restored'];
    if (type !== 'Quick') details.push('Stamina restored');
    if (type === 'Long') details.push('Mana and Rest Points restored', 'Doomed removed', 'rest-limited features reset');
    if (type === 'Short' && build.sheetFeatureSelections['spellblade.rune.active'] === 'Flame Rune') details.push('Flame Rune restored 2 Rest Points');
    setNotice(`${type} Rest complete: ${details.join(' • ')}.`);
    setSpend(0);
  };
  const resetTurn = () => {
    onChange(resetCharacterTurn(character));
    setNotice('Turn reset: Action Points restored and tracked turn-limited effects refreshed.');
  };

  return <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Rest Points</div><div className="mt-1 text-xl font-black text-emerald-100">{restPoints} / {character.maxHealthPoints}</div></div><div className="flex gap-2"><button type="button" onClick={() => setRestPoints(restPoints - 1)} className="h-9 w-9 rounded-lg bg-slate-800 text-slate-100">−</button><button type="button" onClick={() => setRestPoints(restPoints + 1)} className="h-9 w-9 rounded-lg bg-emerald-800 text-white">+</button></div></div><label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-slate-500">Spend to recover HP<input type="number" min={0} max={maximumSpend} value={selectedSpend} onChange={(event) => setSpend(Math.min(maximumSpend, Math.max(0, Number(event.target.value))))} className={`${fieldClass} mt-1`} /></label></div>
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><button type="button" onClick={() => rest('Quick')} className="rounded-lg bg-sky-800 px-3 py-2.5 text-xs font-black text-white">Quick Rest<span className="mt-1 block text-[10px] font-medium text-sky-200">10 min • spend RP</span></button><button type="button" disabled={shortRestsTaken >= 2} onClick={() => rest('Short')} className="rounded-lg bg-violet-700 px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Short Rest<span className="mt-1 block text-[10px] font-medium text-violet-200">1 hr • SP • {shortRestsTaken}/2 used</span></button><button type="button" onClick={() => rest('Long')} className="rounded-lg bg-fuchsia-800 px-3 py-2.5 text-xs font-black text-white">Long Rest<span className="mt-1 block text-[10px] font-medium text-fuchsia-200">8 hr • MP & RP</span></button><button type="button" onClick={resetTurn} className="rounded-lg bg-amber-700 px-3 py-2.5 text-xs font-black text-white">Reset Turn<span className="mt-1 block text-[10px] font-medium text-amber-100">Restore AP</span></button></div>{notice && <p role="status" className="mt-2 text-xs text-slate-300">{notice}</p>}</div>
  </div>;
}

function WeaponAttackCard({ item, modifier, adjustment, damageBonus, heavyHitDamageBonus, meleeRangeBonus, trained, prone, canUseVersatileTwoHanded, canReload, availableAP, availableSP, onReload, onSpendEnhancements, onThrown, onRoll }: {
  item: EquipmentCatalogItem;
  modifier: number;
  adjustment: number;
  damageBonus: number;
  heavyHitDamageBonus: number;
  meleeRangeBonus: number;
  trained: boolean;
  prone: boolean;
  canUseVersatileTwoHanded: boolean;
  canReload: boolean;
  availableAP: number;
  availableSP: number;
  onReload: (resource: 'AP' | 'SP') => void;
  onSpendEnhancements: (resource: 'AP' | 'SP', amount: number, weaponWasThrown: boolean) => void;
  onThrown: () => void;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const profile = weaponMechanicalProfile(item);
  const [twoHanded, setTwoHanded] = useState(false);
  const [thrown, setThrown] = useState(false);
  const [enemyInMelee, setEnemyInMelee] = useState(false);
  const [longRange, setLongRange] = useState(false);
  const [unwieldyRange, setUnwieldyRange] = useState(false);
  const [concealedDraw, setConcealedDraw] = useState(false);
  const [activeEnhancements, setActiveEnhancements] = useState<string[]>([]);
  const [enhancementResource, setEnhancementResource] = useState<'AP' | 'SP'>('AP');
  const [loaded, setLoaded] = useState(false);
  const [hasAmmo, setHasAmmo] = useState(true);
  const [damageType, setDamageType] = useState(profile?.damageTypes[0] ?? '');
  const versatile = item.properties.includes('Versatile');
  const unwieldy = item.properties.includes('Unwieldy');
  const concealable = item.properties.includes('Concealable');
  const hasAccuracy = activeEnhancements.some((style) => style === 'Sword' || style === 'Crossbow');
  const isRangedAttack = Boolean(profile?.isNativeRanged || (profile?.canBeThrown && thrown));
  const activeRange = isRangedAttack ? (profile?.isNativeRanged ? profile.range : profile?.thrownRange) : String((item.properties.includes('Reach') ? 2 : 1) + meleeRangeBonus);
  const displayedModifier = modifier + Number(versatile && twoHanded && canUseVersatileTwoHanded) * 2;
  const activeMeleeDamageBonus = isRangedAttack ? 0 : damageBonus;
  const hitDamage = (profile?.baseDamage ?? 0) + activeMeleeDamageBonus;
  const heavyHitDamage = hitDamage + 1 + (profile?.heavyHitDamageBonus ?? 0) + (!isRangedAttack ? heavyHitDamageBonus : 0);
  const brutalHitDamage = hitDamage + 2 + (profile?.heavyHitDamageBonus ?? 0) + (!isRangedAttack ? heavyHitDamageBonus : 0);
  const enhancementCost = activeEnhancements.length;
  const enhancementResourceAvailable = enhancementResource === 'AP' ? availableAP : availableSP;
  const unavailable = (item.properties.includes('Reload') && !loaded)
    || (item.properties.includes('Ammo') && !hasAmmo)
    || enhancementCost > enhancementResourceAvailable;

  const rollAttack = () => {
    if (unavailable) return;
    const accuracyDie = hasAccuracy && trained ? Math.floor(Math.random() * 4) + 1 : 0;
    const situational = adjustment
      - Number(unwieldy && unwieldyRange)
      - Number(isRangedAttack && enemyInMelee)
      - Number(isRangedAttack && longRange)
      - Number(prone && !(isRangedAttack && item.properties.includes('Deft')))
      + Number(concealable && concealedDraw);
    const enhancements = activeEnhancements.map((style) => `${style}: ${WEAPON_ENHANCEMENTS[style]?.split(' — ')[0] ?? 'Enhancement'}`).join(', ');
    onRoll(`${item.name} ${isRangedAttack ? 'Ranged' : 'Melee'} Martial Attack • ${hitDamage} ${damageType} damage${accuracyDie ? ` • Accuracy d4: ${accuracyDie}` : ''}${enhancements ? ` • ${enhancements}` : ''}`, displayedModifier + accuracyDie, situational);
    const weaponWasThrown = Boolean(profile?.canBeThrown && thrown);
    if (enhancementCost > 0) onSpendEnhancements(enhancementResource, enhancementCost, weaponWasThrown);
    setActiveEnhancements([]);
    if (item.properties.includes('Reload')) setLoaded(false);
    if (weaponWasThrown && enhancementCost === 0) onThrown();
  };

  return <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-100">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.subtype} • {item.slot}</p></div><div className="text-right"><div className="text-2xl font-black text-amber-200">{displayedModifier >= 0 ? '+' : ''}{displayedModifier}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attack modifier</div></div></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-slate-900/75 p-2"><span className="block text-slate-500">Hit</span><strong className="text-slate-100">{hitDamage}</strong></div><div className="rounded-lg bg-amber-500/10 p-2"><span className="block text-amber-300">Heavy</span><strong className="text-amber-100">{heavyHitDamage}</strong></div><div className="rounded-lg bg-orange-500/10 p-2"><span className="block text-orange-300">Brutal</span><strong className="text-orange-100">{brutalHitDamage}</strong></div></div>
    <p className="mt-2 text-xs text-slate-500">{damageType} • Range {activeRange}{profile?.heavyHitDamageBonus ? ' • Impact included on Heavy/Brutal Hits' : ''}</p>
    <div className="mt-3 flex flex-wrap gap-1.5">{item.properties.map((property) => <span key={property} className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-200">{property}</span>)}</div>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
      {profile && profile.damageTypes.length > 1 && <label className="rounded-lg bg-slate-900/70 p-2 text-slate-300">Damage type<select value={damageType} onChange={(event) => setDamageType(event.target.value)} className={`${fieldClass} mt-1 py-1 text-xs`}>{profile.damageTypes.map((type) => <option key={type}>{type}</option>)}</select></label>}
      {versatile && <label className={`flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 ${canUseVersatileTwoHanded ? 'text-slate-300' : 'text-slate-600'}`}><input type="checkbox" disabled={!canUseVersatileTwoHanded} checked={twoHanded && canUseVersatileTwoHanded} onChange={(event) => setTwoHanded(event.target.checked)} />Use two hands • +2 Hit{!canUseVersatileTwoHanded ? ' • hand occupied' : ''}</label>}
      {profile?.canBeThrown && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={thrown} onChange={(event) => { setThrown(event.target.checked); setLongRange(false); }} />Throw weapon • Range {profile.thrownRange}</label>}
      {isRangedAttack && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={enemyInMelee} onChange={(event) => setEnemyInMelee(event.target.checked)} />Within enemy Melee Range • DisADV</label>}
      {isRangedAttack && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={longRange} onChange={(event) => setLongRange(event.target.checked)} />Target in long range • DisADV</label>}
      {unwieldy && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={unwieldyRange} onChange={(event) => setUnwieldyRange(event.target.checked)} />Target within 1 Space • DisADV</label>}
      {concealable && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={concealedDraw} onChange={(event) => setConcealedDraw(event.target.checked)} />Draw as part of Attack • ADV once per creature per Combat</label>}
      {profile && <div className="rounded-lg bg-slate-900/70 p-2 sm:col-span-2"><div className="font-bold text-slate-300">Weapon Enhancements <span className="text-slate-500">• 1 AP or 1 SP each</span></div><div className="mt-2 space-y-2">{profile.styles.map((style) => <label key={style} className={`flex items-start gap-2 ${trained ? 'text-slate-300' : 'text-slate-600'}`}><input type="checkbox" disabled={!trained} checked={activeEnhancements.includes(style)} onChange={(event) => setActiveEnhancements((selected) => event.target.checked ? [...selected, style] : selected.filter((entry) => entry !== style))} /><span><strong>{style}</strong> • {WEAPON_ENHANCEMENTS[style]}</span></label>)}</div>{activeEnhancements.length > 0 && <label className="mt-2 flex items-center gap-2 text-slate-300">Pay {enhancementCost} with<select value={enhancementResource} onChange={(event) => setEnhancementResource(event.target.value as 'AP' | 'SP')} className="rounded border border-slate-600 bg-slate-950 px-2 py-1"><option value="AP">AP ({availableAP})</option><option value="SP">SP ({availableSP})</option></select></label>}{enhancementCost > enhancementResourceAvailable && <p className="mt-1 font-bold text-rose-300">Not enough {enhancementResource} for the selected enhancements.</p>}</div>}
      {item.properties.includes('Ammo') && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={hasAmmo} onChange={(event) => setHasAmmo(event.target.checked)} />Ammunition available</label>}
      {item.properties.includes('Reload') && loaded && <div className="rounded-lg bg-emerald-500/10 p-2 font-bold text-emerald-200">Loaded • becomes unloaded after an Attack</div>}
      {item.properties.includes('Reload') && !loaded && <div className="rounded-lg bg-amber-500/10 p-2 text-amber-100"><div className="font-bold">Reload requires a free hand</div><div className="mt-2 flex gap-2"><button type="button" disabled={!canReload || availableAP < 1} onClick={() => { onReload('AP'); setLoaded(true); }} className="rounded bg-amber-700 px-2 py-1 font-bold text-white disabled:opacity-35">Spend 1 AP</button><button type="button" disabled={!canReload || availableSP < 1} onClick={() => { onReload('SP'); setLoaded(true); }} className="rounded bg-sky-700 px-2 py-1 font-bold text-white disabled:opacity-35">Spend 1 SP</button></div>{!canReload && <p className="mt-1 text-[10px] text-rose-300">No free hand; stow another item first.</p>}</div>}
    </div>
    {prone && <p className={`mt-2 text-xs font-bold ${isRangedAttack && item.properties.includes('Deft') ? 'text-emerald-300' : 'text-rose-300'}`}>{isRangedAttack && item.properties.includes('Deft') ? 'Deft removes the Prone ranged-attack DisADV.' : 'Prone adds DisADV to this Attack.'}</p>}
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider"><span className={`rounded-full px-2 py-1 ${trained ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{trained ? 'Weapon trained' : 'Enhancements unavailable'}</span>{adjustment < 0 && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-200">Untrained gear: {Math.abs(adjustment)}× DisADV</span>}{activeMeleeDamageBonus > 0 && <span className="rounded-full bg-orange-500/10 px-2 py-1 text-orange-200">Melee: +{activeMeleeDamageBonus} damage</span>}{item.properties.includes('Cumbersome') && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-200">Draw, stow, or pick up: 1 AP</span>}</div>
    <button type="button" disabled={unavailable} onClick={rollAttack} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{unavailable ? (item.properties.includes('Reload') && !loaded ? 'Reload Before Attacking' : item.properties.includes('Ammo') && !hasAmmo ? 'Ammunition Required' : `Not Enough ${enhancementResource}`) : `Roll ${item.name} Attack${profile?.canBeThrown && thrown ? ' • stow after throw' : ''}`}</button>
    {profile && <div className="mt-3"><MoreDetails title="Weapon Enhancements" subtitle={trained ? 'Spend 1 AP or 1 SP when you Attack' : 'Requires Weapon Training'}>{profile.styles.map((style) => `${style}: ${WEAPON_ENHANCEMENTS[style] ?? 'No enhancement recorded.'}`).join('\n\n')}</MoreDetails></div>}
    <div className="mt-3"><MoreDetails title="Weapon mechanics">{item.mechanics}</MoreDetails></div>
  </div>;
}

function ShieldAttackCard({ item, modifier, adjustment, trained, prone, onThrown, onRoll }: {
  item: EquipmentCatalogItem;
  modifier: number;
  adjustment: number;
  trained: boolean;
  prone: boolean;
  onThrown: () => void;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [thrown, setThrown] = useState(false);
  const [enemyInMelee, setEnemyInMelee] = useState(false);
  const [longRange, setLongRange] = useState(false);
  const canThrow = item.properties.includes('Toss');
  const profile = defensiveEquipmentProfile(item);
  const rollAdjustment = adjustment - Number(prone) - Number(thrown && enemyInMelee) - Number(thrown && longRange);
  const rollAttack = () => {
    onRoll(`${item.name} ${thrown ? 'Ranged' : 'Melee'} Martial Attack • 1 Bludgeoning damage`, modifier, rollAdjustment);
    if (thrown) onThrown();
  };
  return <div className="rounded-xl border border-sky-400/15 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-100">{item.name} Attack</h3><p className="mt-1 text-xs text-slate-500">1 Bludgeoning damage • {thrown ? 'Range 5/10' : 'Melee Range 1'}</p></div><span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-200">+{profile.physicalDefense} PD • +{profile.areaDefense} AD</span></div>{canThrow && <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2"><input type="checkbox" checked={thrown} onChange={(event) => { setThrown(event.target.checked); setLongRange(false); }} />Throw Shield</label>{thrown && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2"><input type="checkbox" checked={enemyInMelee} onChange={(event) => setEnemyInMelee(event.target.checked)} />Enemy in Melee Range • DisADV</label>}{thrown && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2"><input type="checkbox" checked={longRange} onChange={(event) => setLongRange(event.target.checked)} />Long range • DisADV</label>}</div>}{prone && <p className="mt-2 text-xs font-bold text-rose-300">Prone adds DisADV to this Attack.</p>}<button type="button" disabled={!trained} onClick={rollAttack} className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{trained ? `Roll ${item.name} Attack${thrown ? ' • stow after throw' : ''}` : 'Shield Training Required to Attack'}</button></div>;
}

function NetAttackCard({ character, modifier, onThrow, onRoll }: {
  character: Character;
  modifier: number;
  onThrow: () => void;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const might = Math.max(1, character.attributes.Might.modifier);
  const range = character.size === 'Small' ? might : might * 2;
  const throwNet = () => {
    onRoll('Net Martial Check vs Physical Save', modifier);
    onThrow();
  };
  return <div className="rounded-xl border border-emerald-400/15 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-100">Net</h3><p className="mt-1 text-xs text-slate-500">Thrown Supply • {range} Spaces ({character.size ?? 'Medium'})</p></div><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-200">No damage</span></div><div className="mt-3 space-y-1 rounded-lg bg-slate-900/70 p-3 text-xs leading-5 text-slate-300"><p><strong>Cost:</strong> 1 AP to throw.</p><p><strong>Contest:</strong> Martial Check vs Physical Save.</p><p><strong>Save Failure:</strong> Immobilized until freed. <strong>Failure (5):</strong> also Restrained.</p><p className="text-slate-500">No effect on formless creatures, creatures smaller than Small, or creatures larger than Large. Vertical range is {Math.ceil(range / 2)} Spaces.</p></div><button type="button" disabled={character.currentAP < 1} onClick={throwNet} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{character.currentAP < 1 ? '1 AP Required to Throw Net' : 'Spend 1 AP & Roll Net Check'}</button></div>;
}

function UnarmedAttackCard({ modifier, adjustment, damageBonus, impactBonus, prone, onRoll }: {
  modifier: number;
  adjustment: number;
  damageBonus: number;
  impactBonus: number;
  prone: boolean;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const hitDamage = damageBonus;
  return <div className="rounded-xl border border-orange-400/15 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-100">Unarmed Strike</h3><p className="mt-1 text-xs text-slate-500">Melee • 0 base Bludgeoning damage</p></div><div className="text-right text-xs"><div>Hit <strong>{hitDamage}</strong></div><div className="text-amber-200">Heavy <strong>{hitDamage + 1 + impactBonus}</strong></div><div className="text-orange-200">Brutal <strong>{hitDamage + 2 + impactBonus}</strong></div></div></div>{impactBonus > 0 && <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-100">Impact applies from an equipped Gauntlet or worn Heavy Armor: +1 damage on Heavy Hits.</p>}{prone && <p className="mt-2 text-xs font-bold text-rose-300">Prone adds DisADV to this Attack.</p>}<button type="button" onClick={() => onRoll(`Unarmed Strike • ${hitDamage} Bludgeoning damage`, modifier, adjustment - Number(prone))} className="mt-3 w-full rounded-lg bg-orange-700 px-3 py-2 text-sm font-black text-white">Roll Unarmed Strike</button></div>;
}

function MonkUnarmedAttackCard({ character, modifier, adjustment, damageBonus, impactBonus, prone, onChange, onRoll }: {
  character: Character;
  modifier: number;
  adjustment: number;
  damageBonus: number;
  impactBonus: number;
  prone: boolean;
  onChange: CharacterSheetTabContentProps['onChange'];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [activeEnhancements, setActiveEnhancements] = useState<string[]>([]);
  const [enhancementResource, setEnhancementResource] = useState<'AP' | 'SP'>('AP');
  const [internalDamageSP, setInternalDamageSP] = useState(0);
  const [scorpionEnhancement, setScorpionEnhancement] = useState(false);
  const build = character.build;
  if (!build) return null;
  const talents = new Set(build.selectedTalents);
  const styles = build.classFeatureSelections['monk.ironPalm'] ?? [];
  const activeStance = build.sheetFeatureStates[MONK_STANCE_ACTIVE] ? build.sheetFeatureSelections[MONK_ACTIVE_STANCE] : '';
  const astralActive = character.subclass === 'Astral Self' && Boolean(build.sheetFeatureStates[MONK_ASTRAL_SELF_ACTIVE]);
  const astralDamage = build.classFeatureSelections['monk.astralDamage']?.[0] ?? 'Mystical';
  const damageType = astralActive ? astralDamage : 'Bludgeoning';
  const hasSteelFist = talents.has('Steel Fist');
  const hasInternalDamage = talents.has('Internal Damage');
  const hitDamage = 2 + damageBonus + Number(scorpionEnhancement);
  const bearHeavyDamage = Number(activeStance === 'Bear Stance');
  const totalImpact = impactBonus + Number(hasSteelFist);
  const heavyDamage = hitDamage + 1 + totalImpact + bearHeavyDamage;
  const brutalDamage = hitDamage + 2 + totalImpact + bearHeavyDamage;
  const enhancementCost = activeEnhancements.length + Number(scorpionEnhancement);
  const baseSPCost = (enhancementResource === 'SP' ? enhancementCost : 0) + internalDamageSP;
  const baseAPCost = enhancementResource === 'AP' ? enhancementCost : 0;
  const maximumKi = monkKiMaximum(character.maxStamina, character.level);
  const currentKi = Math.min(maximumKi, Math.max(0, build.sheetFeatureCounters[MONK_KI_CURRENT] ?? maximumKi));
  const flurryUsed = Boolean(build.sheetFeatureStates[MONK_FLURRY_USED]);
  const insufficientBaseResources = character.currentAP < baseAPCost || character.stamina < baseSPCost;
  const toggleEnhancement = (style: string, checked: boolean) => setActiveEnhancements((selected) => checked ? [...selected, style] : selected.filter((entry) => entry !== style));
  const rollUnarmedAttack = (flurry: boolean) => {
    const staminaCost = baseSPCost + Number(flurry);
    if (character.currentAP < baseAPCost || character.stamina < staminaCost || (flurry && flurryUsed)) return;
    const accuracyDie = activeEnhancements.includes('Sword') ? rollDice(4)[0] : 0;
    const nextStates = { ...build.sheetFeatureStates, ...(flurry ? { [MONK_FLURRY_USED]: true } : {}) };
    const enhancementNotes = activeEnhancements.map((style) => `${style}: ${WEAPON_ENHANCEMENTS[style] ?? 'Weapon Enhancement'}`);
    if (scorpionEnhancement) enhancementNotes.push(`Scorpion: +1 damage; Physical Save DC ${10 + character.primeModifier + character.combatMastery}, Failure makes the target Impaired on its next Physical Check before the end of your next turn`);
    if (internalDamageSP > 0) enhancementNotes.push(`Internal Damage: Repeated Physical Save DC ${10 + character.primeModifier + character.combatMastery}; Failure causes Impaired for 1 minute and ${internalDamageSP} True damage at the start of each turn`);
    if (activeStance === 'Mongoose Stance') enhancementNotes.push('Mongoose: the same Attack Check can target a second creature in Melee Range');
    if (activeStance === 'Wolf Stance') enhancementNotes.push('Wolf: after the Attack, move up to 1 Space without spending movement');
    onChange({
      currentAP: character.currentAP - baseAPCost,
      stamina: character.stamina - staminaCost,
      build: { ...build, sheetFeatureStates: nextStates },
    });
    onRoll(`${flurry ? 'Flurry of Blows — ' : ''}Unarmed Melee Martial Attack • ${hitDamage} ${damageType} damage${astralActive ? ' • Reach • target PD or AD' : ''}${enhancementNotes.length ? ` • ${enhancementNotes.join(' • ')}` : ''}`, modifier + accuracyDie, adjustment - Number(prone));
    setActiveEnhancements([]);
    setScorpionEnhancement(false);
    setInternalDamageSP(0);
  };
  return <div className="rounded-xl border border-orange-400/20 bg-gradient-to-br from-orange-950/25 to-slate-950/55 p-4 lg:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-orange-100">Iron Palm • Unarmed Strike</h3><p className="mt-1 text-xs text-slate-400">Melee{astralActive ? ' • Reach • Astral Arms' : ''} • 2 base {damageType} damage</p></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><div><span className="block text-slate-500">Hit</span><strong>{hitDamage}</strong></div><div><span className="block text-amber-300">Heavy</span><strong>{heavyDamage}</strong></div><div><span className="block text-orange-300">Brutal</span><strong>{brutalDamage}</strong></div></div></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-900/70 p-3 text-xs"><div className="font-black text-slate-200">Iron Palm Enhancements</div><p className="mt-1 text-slate-500">Choose the learned style enhancements to add. Each costs 1 AP or 1 SP; Expert Monk can use both learned enhancements on one Unarmed Strike.</p><div className="mt-2 space-y-2">{styles.length === 0 ? <p className="text-amber-300">Return to the builder and choose an Iron Palm style.</p> : styles.map((style) => <label key={style} className="flex items-start gap-2 text-slate-300"><input type="checkbox" checked={activeEnhancements.includes(style)} onChange={(event) => toggleEnhancement(style, event.target.checked)} /><span><strong>{style}</strong> • {WEAPON_ENHANCEMENTS[style]}</span></label>)}</div>{enhancementCost > 0 && <label className="mt-2 flex items-center gap-2 text-slate-300">Pay with<select value={enhancementResource} onChange={(event) => setEnhancementResource(event.target.value as 'AP' | 'SP')} className="rounded border border-slate-600 bg-slate-950 px-2 py-1"><option value="AP">AP ({character.currentAP})</option><option value="SP">SP ({character.stamina})</option></select></label>}</div>
      <div className="space-y-2 rounded-lg bg-slate-900/70 p-3 text-xs"><div className="font-black text-slate-200">Active Benefits</div>{activeStance ? <p className="text-violet-200"><strong>{activeStance}</strong> is active.</p> : <p className="text-slate-500">No Monk Stance active.</p>}{activeStance === 'Cobra Stance' && <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={Boolean(build.sheetFeatureStates[MONK_COBRA_REVENGE])} onChange={(event) => onChange({ build: { ...build, sheetFeatureStates: { ...build.sheetFeatureStates, [MONK_COBRA_REVENGE]: event.target.checked } } })} />Target damaged me since the start of my last turn • +1 damage</label>}{activeStance === 'Mongoose Stance' && <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={Boolean(build.sheetFeatureStates[MONK_MONGOOSE_FLANKED])} onChange={(event) => onChange({ build: { ...build, sheetFeatureStates: { ...build.sheetFeatureStates, [MONK_MONGOOSE_FLANKED]: event.target.checked } } })} />I am Flanked • +1 damage</label>}{activeStance === 'Scorpion Stance' && <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={scorpionEnhancement} onChange={(event) => setScorpionEnhancement(event.target.checked)} />Add Scorpion Enhancement • 1 AP or 1 SP</label>}{activeStance === 'Bear Stance' && <p className="text-amber-200">Heavy-or-higher and Critical Hits deal +1 damage. A miss can ready ADV for your next melee Martial Attack this turn.</p>}{hasSteelFist && <p className="text-amber-200">Steel Fist: Impact is included in Heavy and Brutal damage.</p>}{astralActive && <p className="text-fuchsia-200">Astral Arms: Reach, {astralDamage} damage, and choose PD or AD for each Attack.</p>}</div>
      {hasInternalDamage && <label className="rounded-lg bg-rose-500/10 p-3 text-xs font-bold text-rose-100">Internal Damage SP<input type="number" min={0} max={character.stamina} value={Math.min(character.stamina, internalDamageSP)} onChange={(event) => setInternalDamageSP(Math.min(character.stamina, Math.max(0, Number(event.target.value))))} className={`${fieldClass} mt-1 py-1`} /><span className="mt-1 block font-normal text-rose-200/75">Repeated Physical Save; Failure: Impaired for 1 minute and this much True damage at the start of each turn.</span></label>}
      <div className="rounded-lg bg-sky-500/10 p-3 text-xs text-sky-100"><strong>Spiritual Balance:</strong> spending SP on this Attack regains {monkKiRecoveryAmount(maximumKi, character.level)} Ki, up to {maximumKi}. Current Ki: {currentKi}/{maximumKi}.</div>
    </div>
    {prone && <p className="mt-2 text-xs font-bold text-rose-300">Prone adds DisADV to this Attack.</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" disabled={insufficientBaseResources} onClick={() => rollUnarmedAttack(false)} className="rounded-lg bg-orange-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Roll Iron Palm{baseAPCost || baseSPCost ? ` • ${[baseAPCost ? `${baseAPCost} AP` : '', baseSPCost ? `${baseSPCost} SP` : ''].filter(Boolean).join(' + ')}` : ''}</button>{hasSteelFist && <button type="button" disabled={flurryUsed || insufficientBaseResources || character.stamina < baseSPCost + 1} onClick={() => rollUnarmedAttack(true)} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{flurryUsed ? 'Flurry Used This Turn' : `Flurry of Blows • ${baseSPCost + 1} SP`}</button>}</div>
  </div>;
}

function SpellRollControl({ spell, spellCheck, spellAttack, modifiers, prone, onRoll }: {
  spell: Spell;
  spellCheck: number;
  spellAttack: number;
  modifiers: ReturnType<typeof equippedCombatModifiers>;
  prone: boolean;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [enemyInMelee, setEnemyInMelee] = useState(false);
  const usesAttack = /Spell Attack/i.test(spell.description);
  const isAreaAttack = /Area Spell Attack/i.test(spell.description);
  const isRangedAttack = usesAttack && !isAreaAttack && !/^(?:Self|1 Space|Melee)$/i.test(spell.range.trim());
  const protectedByFocus = modifiers.focusProperties.includes('Close Quarters');
  const adjustment = modifiers.attackAndSpellDisadvantage - Number(usesAttack && prone) - Number(isRangedAttack && enemyInMelee && !protectedByFocus);
  const rangeBenefit = modifiers.focusProperties.includes('Reach') && /^1 Space$/i.test(spell.range.trim()) ? '+1 Space from Reach'
    : modifiers.focusProperties.includes('Long-Ranged') && !/^(?:Self|1 Space|Melee)$/i.test(spell.range.trim()) ? '+5 Spaces from Long-Ranged' : '';
  return <div className="mt-4 space-y-2">{isRangedAttack && <label className={`flex items-center gap-2 rounded-lg p-2 text-xs ${protectedByFocus ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-900/70 text-slate-300'}`}><input type="checkbox" checked={enemyInMelee} onChange={(event) => setEnemyInMelee(event.target.checked)} />Within enemy Melee Range {protectedByFocus ? '• Close Quarters prevents DisADV' : '• DisADV'}</label>}{rangeBenefit && <p className="rounded-lg bg-fuchsia-500/10 p-2 text-xs font-bold text-fuchsia-200">Adjusted range: {rangeBenefit}</p>}<button type="button" onClick={() => onRoll(`${spell.name} ${usesAttack ? 'Spell Attack' : 'Spell Check'}`, usesAttack ? spellAttack : spellCheck, adjustment)} className="w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white">Roll {usesAttack ? 'Spell Attack' : 'Spell Check'}{usesAttack && modifiers.spellAttackDamageBonus > 0 ? ` • +${modifiers.spellAttackDamageBonus} damage` : ''}</button></div>;
}

function EquippedRulesSummary({ modifiers }: { modifiers: ReturnType<typeof equippedCombatModifiers> }) {
  const reductions = [
    modifiers.physicalDamageReduction && 'PDR',
    modifiers.elementalDamageReduction && 'EDR',
    modifiers.mysticalDamageReduction && 'MDR',
  ].filter(Boolean);
  const contextualFocusBenefits: Record<string, string> = {
    'Close Quarters': 'No close-quarters DisADV on Ranged Spell Attacks',
    'Long-Ranged': '+5 Spaces to Spell ranges greater than 1',
    Reach: '+1 Space to Spell ranges of 1',
    Muffled: 'Verbal Components heard only within 5 Spaces',
    Reactive: 'ADV to stop Spells in a Spell Duel',
  };
  const contextual = modifiers.focusProperties.map((property) => contextualFocusBenefits[property]).filter(Boolean);
  return <>{reductions.length > 0 && <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/5 p-2 text-xs text-sky-100"><strong>Equipped Damage Reduction:</strong> {reductions.join(' • ')} <span className="text-sky-300/70">(Resistance (Half); bypassed by Heavy and Critical Hits)</span></div>}{modifiers.immuneToFlanking && <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/5 p-2 text-xs text-amber-100"><strong>Two Shields:</strong> immune to Flanking; only one Shield’s defense bonuses apply at a time.</div>}{modifiers.mountedShieldDefense && <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-500/5 p-2 text-xs text-emerald-100"><strong>Mounted Shield:</strong> your Mount also gains +{modifiers.mountedShieldDefense.physicalDefense} PD and +{modifiers.mountedShieldDefense.areaDefense} AD.</div>}{contextual.length > 0 && <div className="mt-3 rounded-lg border border-fuchsia-400/15 bg-fuchsia-500/5 p-2 text-xs text-fuchsia-100"><strong>Focus Properties:</strong> {contextual.join(' • ')}</div>}</>;
}

function ChecksTab({ character, reference, equipmentCatalog, equipmentModifiers, selectedTraits, onRoll }: {
  character: Character;
  reference: CharacterReferenceData | null;
  equipmentCatalog: EquipmentCatalogItem[];
  equipmentModifiers: ReturnType<typeof equippedCombatModifiers>;
  selectedTraits: AncestryTrait[];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [tradesOpen, setTradesOpen] = useState(false);
  const build = character.build;
  const wildForm = druidWildFormProfile(character);
  const meditationSkill = character.class === 'Monk' ? build?.sheetFeatureSelections[MONK_MEDITATION_SKILL] : undefined;
  const monkStance = character.class === 'Monk' && build?.sheetFeatureStates[MONK_STANCE_ACTIVE]
    ? build.sheetFeatureSelections[MONK_ACTIVE_STANCE] : '';
  const attributeModifier = (attribute: DC20Attribute) => wildForm.active && attribute === 'Might' ? wildForm.might
    : wildForm.active && attribute === 'Agility' ? wildForm.agility : character.attributes[attribute].modifier;
  const expertise = wildForm.active ? { skills: {}, trades: {} } : ancestryExpertise(character, selectedTraits);
  const skillModifier = (name: string, mastery: MasteryLevel) => {
    const skill = reference?.skills.find(({ name: candidate }) => candidate === name);
    const skillAttribute = skill?.attribute as DC20Attribute | 'Prime' | undefined;
    const attribute = skillAttribute === 'Prime' ? character.primeModifier
      : skillAttribute ? attributeModifier(skillAttribute) : 0;
    const baseRank = masteryRank(mastery);
    const cap = skillMasteryCap(character);
    const wildFormIncrease = wildForm.active && wildForm.skillMasteries.includes(name) && baseRank < cap ? 1 : 0;
    const meditationIncrease = !wildForm.active && meditationSkill === name && baseRank + (expertise.skills[name] ?? 0) + wildFormIncrease < cap ? 1 : 0;
    return attribute + masteryBonus(masteryTitle(baseRank + (expertise.skills[name] ?? 0) + wildFormIncrease + meditationIncrease));
  };
  const effectiveSkillMastery = (name: string, mastery: MasteryLevel) => {
    const baseRank = masteryRank(mastery);
    const cap = skillMasteryCap(character);
    const increase = wildForm.active && wildForm.skillMasteries.includes(name) && baseRank < cap ? 1 : 0;
    const meditationIncrease = !wildForm.active && meditationSkill === name && baseRank + (expertise.skills[name] ?? 0) + increase < cap ? 1 : 0;
    return masteryTitle(baseRank + (expertise.skills[name] ?? 0) + increase + meditationIncrease);
  };
  const skillAdjustment = (name: string) => {
    const atCap = masteryRank(character.skillMasteries[name] ?? 'Untrained') >= skillMasteryCap(character);
    const skillfulAdvantage = Number(wildForm.active && wildForm.skillMasteries.includes(name) && atCap);
    const gearAdjustment = !wildForm.active && reference?.skills.find(({ name: candidate }) => candidate === name)?.attribute === 'Agility'
      ? equipmentModifiers.agilityCheckDisadvantage : 0;
    return skillfulAdvantage + gearAdjustment + Number(monkStance === 'Gazelle Stance' && name === 'Acrobatics');
  };
  const tradeAttributes = (name: string) => (reference?.trades.find(({ name: candidate }) => candidate === name)?.attribute ?? '')
    .split(/, | or /).filter((attribute) => ATTRIBUTE_NAMES.includes(attribute as DC20Attribute));
  const tradeModifier = (name: string, mastery: MasteryLevel) => {
    const attribute = Math.max(0, ...tradeAttributes(name).map((candidate) => attributeModifier(candidate as DC20Attribute)));
    return attribute + masteryBonus(masteryTitle(masteryRank(mastery) + (expertise.trades[name] ?? 0)));
  };
  const tradeAdjustment = (name: string) => {
    const attributes = tradeAttributes(name);
    const best = Math.max(...attributes.map((attribute) => attributeModifier(attribute as DC20Attribute) ?? -Infinity));
    const nonAgilityTie = attributes.some((attribute) => attribute !== 'Agility' && attributeModifier(attribute as DC20Attribute) === best);
    return !wildForm.active && attributes.includes('Agility') && !nonAgilityTie ? equipmentModifiers.agilityCheckDisadvantage : 0;
  };
  const carriedToolTrades = new Set((character.inventoryItems ?? []).flatMap(({ equipmentID, quantity }) => quantity > 0
    ? equipmentCatalog.filter(({ id, category }) => id === equipmentID && category === EquipmentCategoryValues.TRADE_TOOLS).flatMap(({ properties }) => properties.slice(0, 1))
    : []));
  const classLanguages = grantedClassLanguageNames(character);
  const classLanguageLevels = grantedClassLanguageLevels(character);
  const fluencyStages = ['Untrained', 'Limited', 'Fluent'];
  const languageRows = Array.from(new Set(['Common', ...character.languages, ...classLanguages, ...Object.keys(classLanguageLevels)])).map((name) => ({
    name,
    fluency: name === 'Common' || classLanguages.includes(name) ? 'Fluent' : classLanguageLevels[name]
      ? fluencyStages[Math.min(2, fluencyStages.indexOf(build?.languageFluencies?.[name] ?? 'Untrained') + classLanguageLevels[name])]
      : build?.languageFluencies?.[name] ?? 'Limited',
    group: reference?.languageGroups.find(({ options }) => options.includes(name))?.name ?? 'Other',
  })).sort((left, right) => left.group.localeCompare(right.group) || left.name.localeCompare(right.name));
  const ancestryMechanics = ancestryMechanicalProfile(character, reference?.ancestryTraits ?? []);

  return <div className="space-y-5">
    <section className={panelClass}><SectionHeading eyebrow="Background" title={build?.backgroundName || character.background || 'Unnamed Background'} /><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{build?.backgroundStory || 'No background story has been written yet.'}</p></section>
    {wildForm.active && <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>Wild Form:</strong> Might and Agility use the Wild Form Stat Block. Ancestry Traits and ordinary equipment are inactive; Skillful selections are applied below.</section>}
    <section><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><SectionHeading eyebrow="Core Checks" title="Attributes" />{!wildForm.active && equipmentModifiers.agilityCheckDisadvantage < 0 && <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-200">Heavy gear: {Math.abs(equipmentModifiers.agilityCheckDisadvantage)}× Agility DisADV</span>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = attributeModifier(attribute); const adjustment = !wildForm.active && attribute === 'Agility' ? equipmentModifiers.agilityCheckDisadvantage : 0; return <button type="button" key={attribute} onClick={() => onRoll(`${attribute} Check`, modifier, adjustment)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-violet-400/40 hover:bg-violet-500/10"><div className="text-xs text-slate-500">{attribute}</div><div className="text-2xl font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</div><div className="text-xs text-violet-300">Roll check</div>{wildForm.active && ['Might', 'Agility'].includes(attribute) && <div className="mt-1 text-[10px] font-bold text-emerald-300">Wild Form statistic</div>}{adjustment < 0 && <div className="mt-1 text-[10px] font-bold text-rose-300">{Math.abs(adjustment)}× gear DisADV</div>}</button>; })}</div></section>
    <section><button type="button" onClick={() => setSkillsOpen((open) => !open)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-violet-200"><span>Skills</span><span>{skillsOpen ? 'Collapse' : 'Expand'}</span></button>{skillsOpen && <div className="space-y-5">{meditationSkill && <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100"><strong>Meditation:</strong> {meditationSkill} Mastery is increased by 1, up to your Skill Mastery Cap, until your next Short or Long Rest.</div>}{(reference?.skillGroups ?? []).map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.skillMasteries[name] ?? 'Untrained'; const effectiveMastery = effectiveSkillMastery(name, mastery); const modifier = skillModifier(name, mastery); const adjustment = skillAdjustment(name); return <button type="button" key={name} onClick={() => onRoll(`${name} Check`, modifier, adjustment)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-violet-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{effectiveMastery} (+{masteryBonus(effectiveMastery)})</span>{wildForm.active && wildForm.skillMasteries.includes(name) && <span className="ml-2 text-[10px] font-black uppercase text-emerald-300">Skillful</span>}{meditationSkill === name && <span className="ml-2 text-[10px] font-black uppercase text-violet-300">Meditation</span>}</span><span className="font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</span>{adjustment > 0 && <span className="text-[10px] font-bold text-emerald-300">ADV active</span>}{adjustment < 0 && <span className="text-[10px] font-bold text-rose-300">Gear DisADV</span>}</button>; })}</div></div>)}</div>}</section>
    <section><button type="button" onClick={() => setTradesOpen((open) => !open)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-fuchsia-200"><span>Trades</span><span>{tradesOpen ? 'Collapse' : 'Expand'}</span></button>{tradesOpen && <div className="space-y-5">{(reference?.tradeGroups ?? []).map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.tradeMasteries[name] ?? 'Untrained'; const modifier = tradeModifier(name, mastery); const adjustment = tradeAdjustment(name); const attributes = tradeAttributes(name).join(' or '); const trade = reference?.trades.find(({ name: candidate }) => candidate === name); const toolRequired = Boolean(trade?.tool && trade.tool !== 'None'); const toolReady = carriedToolTrades.has(name); return <button type="button" key={name} onClick={() => onRoll(`${name} Trade Check`, modifier, adjustment)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-fuchsia-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{attributes} • {mastery} (+{masteryBonus(mastery)})</span>{toolRequired && <span className={`mt-1 block text-[10px] font-bold ${toolReady ? 'text-emerald-300' : 'text-amber-300'}`}>{toolReady ? `${trade?.tool} ready` : `${trade?.tool} required for activities`}</span>}</span><span className="font-black text-fuchsia-200">{modifier >= 0 ? '+' : ''}{modifier}</span>{adjustment < 0 && <span className="text-[10px] font-bold text-rose-300">Gear DisADV</span>}</button>; })}</div></div>)}</div>}</section>
    <section><SectionHeading eyebrow="Communication" title="Languages" tone="text-emerald-300" /><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{languageRows.map((language) => <div key={language.name} className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><div className="flex items-center justify-between gap-3"><span className="font-black text-slate-100">{language.name}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${language.fluency === 'Fluent' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{language.fluency}</span></div><p className="mt-2 text-xs text-slate-500">{language.group}</p></div>)}</div></section>
    {!wildForm.active && ancestryMechanics.conditionalRolls.length > 0 && <section className={panelClass}><SectionHeading eyebrow="Ancestry" title="Situational Check & Save Benefits" tone="text-emerald-300" /><p className="mt-2 text-xs leading-5 text-slate-500">These benefits depend on the target, environment, effect, or condition. Apply the sheet’s Advantage control when the listed trigger is true.</p><div className="mt-3 space-y-2">{ancestryMechanics.conditionalRolls.map((line) => { const separator = line.indexOf(':'); return <MoreDetails key={line} title={line.slice(0, separator)}>{line.slice(separator + 1).trim()}</MoreDetails>; })}</div></section>}
  </div>;
}

function NaturalWeaponAttackCard({ character, traits, onChange, onRoll }: {
  character: Character;
  traits: AncestryTrait[];
  onChange: CharacterSheetTabContentProps['onChange'];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const build = character.build;
  const naturalWeapon = traits.find(({ name }) => name === 'Natural Weapon');
  const [ranged, setRanged] = useState(false);
  const [rend, setRend] = useState(false);
  const [styleEnhancement, setStyleEnhancement] = useState(false);
  const [resource, setResource] = useState<'AP' | 'SP'>('AP');
  if (!build || !naturalWeapon) return null;
  const has = (name: string) => traits.some((trait) => trait.name === name);
  const damageType = build.ancestryTraitChoices[naturalWeapon.id]?.[0] || 'Choose damage type';
  const styleTrait = traits.find(({ name }) => name === 'Natural Weapon Style');
  const style = styleTrait ? build.ancestryTraitChoices[styleTrait.id]?.[0] : '';
  const states = build.sheetFeatureStates;
  const retractableAdvantage = has('Retractable Natural Weapon') && !states['ancestry.retractableNaturalWeapon.used'];
  const fastReflexAdvantage = has('Fast Reflexes') && !states['ancestry.fastReflexes.firstAttackUsed'];
  const resourceCost = Number(rend) + Number(styleEnhancement);
  const available = resource === 'AP' ? character.currentAP : character.stamina;
  const rollAttack = () => {
    if (resourceCost > available) return;
    onRoll(`Natural Weapon Martial Attack • 1 ${damageType} damage${rend ? ' • Rend: failed Physical Save causes Bleeding' : ''}${has('Venomous Natural Weapon') ? ` • failed Physical Save DC ${10 + character.primeModifier + character.combatMastery} causes Impaired` : ''}${styleEnhancement && style ? ` • ${style} Enhancement: ${WEAPON_ENHANCEMENTS[style]}` : ''}`, character.primeModifier + character.combatMastery, Number(retractableAdvantage) + Number(fastReflexAdvantage));
    onChange({
      ...(resource === 'AP' ? { currentAP: character.currentAP - resourceCost } : { stamina: character.stamina - resourceCost }),
      build: { ...build, sheetFeatureStates: { ...states, 'ancestry.retractableNaturalWeapon.used': true, 'ancestry.fastReflexes.firstAttackUsed': true } },
    });
    setRend(false);
    setStyleEnhancement(false);
  };
  const range = ranged && has('Natural Projectile') ? '10' : has('Extended Natural Weapon') ? '2' : '1';
  return <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/15 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-emerald-100">Natural Weapon</h3><p className="mt-1 text-xs text-slate-500">{damageType} • Range {range} • Unarmed Strike</p></div><span className="text-2xl font-black text-emerald-200">+{character.primeModifier + character.combatMastery}</span></div><div className="mt-3 space-y-2 text-xs">{has('Natural Projectile') && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={ranged} onChange={(event) => setRanged(event.target.checked)} />Natural Projectile • Ranged Martial Attack, Range 10</label>}{has('Rend') && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={rend} onChange={(event) => setRend(event.target.checked)} />Rend • 1 AP or SP • failed Physical Save causes Bleeding</label>}{style && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={styleEnhancement} onChange={(event) => setStyleEnhancement(event.target.checked)} />{style} Weapon Enhancement • 1 AP or SP</label>}{resourceCost > 0 && <label className="flex items-center gap-2 text-slate-300">Pay {resourceCost} with<select value={resource} onChange={(event) => setResource(event.target.value as 'AP' | 'SP')} className="rounded border border-slate-600 bg-slate-950 px-2 py-1"><option value="AP">AP ({character.currentAP})</option><option value="SP">SP ({character.stamina})</option></select></label>}{has('Venomous Natural Weapon') && <p className="rounded-lg bg-fuchsia-500/10 p-2 text-fuchsia-100">On Hit: Physical Save vs DC {10 + character.primeModifier + character.combatMastery}; Failure becomes Impaired until your next turn.</p>}{retractableAdvantage && <p className="rounded-lg bg-violet-500/10 p-2 font-bold text-violet-100">Retractable: +1 ADV on this first Attack Check in Combat.</p>}{fastReflexAdvantage && <p className="rounded-lg bg-amber-500/10 p-2 font-bold text-amber-100">Fast Reflexes: +1 ADV on this first Attack Check in Combat.</p>}</div><button type="button" disabled={resourceCost > available} onClick={rollAttack} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Roll Natural Weapon Attack</button></div>;
}

function DraconicBreathWeaponCard({ character, traits, spellAttack, adjustment, onChange, onRoll }: {
  character: Character;
  traits: AncestryTrait[];
  spellAttack: number;
  adjustment: number;
  onChange: CharacterSheetTabContentProps['onChange'];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [mode, setMode] = useState<'Area' | 'Focused'>('Area');
  const [staminaSpend, setStaminaSpend] = useState(0);
  const [manaSpend, setManaSpend] = useState(0);
  const [empowered, setEmpowered] = useState(false);
  const [dyingBreath, setDyingBreath] = useState(false);
  const build = character.build;
  const breath = traits.find(({ name }) => name === 'Draconic Breath Weapon');
  if (!build || !breath) return null;
  const has = (name: string) => traits.some((trait) => trait.name === name);
  const states = build.sheetFeatureStates;
  const counters = build.sheetFeatureCounters;
  const originTrait = traits.find(({ name }) => name === 'Draconic Origin');
  const damageType = originTrait ? build.ancestryTraitChoices[originTrait.id]?.[0] || 'Draconic' : 'Draconic';
  const maximumUses = has('Second Breath') ? 2 : 1;
  const usesSpent = Math.max(0, counters['ancestry.draconicBreath.usesSpent'] ?? 0);
  const dyingBreathAvailable = has('Dying Breath') && usesSpent > 0 && !states['ancestry.dyingBreath.used'];
  const usesRequired = empowered ? 2 : 1;
  const availableUses = maximumUses - usesSpent + Number(dyingBreath && dyingBreathAvailable);
  const affinityReady = has('Draconic Affinity') && Boolean(states['ancestry.draconicAffinity.ready']);
  const actionPointCost = dyingBreath && dyingBreathAvailable ? 0 : 2;
  const damage = (mode === 'Area' ? 2 + Math.floor(staminaSpend / 2) + manaSpend : 4 + staminaSpend + manaSpend * 2)
    + (empowered ? (mode === 'Area' ? 2 : 4) : 0)
    + Number(affinityReady);
  const unavailable = character.currentAP < actionPointCost || character.stamina < staminaSpend
    || character.manaPoints < manaSpend || availableUses < usesRequired;
  const useBreath = () => {
    if (unavailable) return;
    onRoll(`Draconic Breath — ${mode} • ${damage} ${damageType} damage${mode === 'Area' ? ' • 3 Space Cone or 6 Space Line vs AD' : ' • Range 6 vs PD'}${has('Concussive Breath') ? ' • Concussive Physical Save' : ''}`, spellAttack, adjustment);
    const restoredUse = dyingBreath && dyingBreathAvailable ? 1 : 0;
    onChange({
      currentAP: character.currentAP - actionPointCost,
      stamina: character.stamina - staminaSpend,
      manaPoints: character.manaPoints - manaSpend,
      build: {
        ...build,
        sheetFeatureStates: {
          ...states,
          ...(affinityReady ? { 'ancestry.draconicAffinity.ready': false } : {}),
          ...(restoredUse ? { 'ancestry.dyingBreath.used': true } : {}),
        },
        sheetFeatureCounters: {
          ...counters,
          'ancestry.draconicBreath.usesSpent': Math.max(0, usesSpent - restoredUse + usesRequired),
        },
      },
    });
    setStaminaSpend(0);
    setManaSpend(0);
    setEmpowered(false);
    setDyingBreath(false);
  };
  return <div className="rounded-xl border border-orange-400/25 bg-orange-950/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-orange-100">Draconic Breath Weapon</h3><p className="mt-1 text-xs text-slate-500">{damageType} • {maximumUses - usesSpent}/{maximumUses} uses ready • 2 AP</p></div><span className="text-2xl font-black text-orange-200">{damage} dmg</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'Area' | 'Focused')} className={`${fieldClass} mt-1 py-1.5 text-xs`}><option>Area</option><option>Focused</option></select></label><div className="rounded-lg bg-slate-900/70 p-2 text-xs leading-5 text-slate-300">{mode === 'Area' ? 'Spell Attack vs each target’s AD • 3 Space Cone or 6 Space Line • +1 damage per 2 SP or 1 MP' : 'Spell Attack vs one target’s PD • Range 6 • +1 damage per SP and +2 per MP'}</div><label className="text-xs font-bold text-slate-400">Spend SP<input type="number" min={0} max={character.stamina} value={staminaSpend} onChange={(event) => setStaminaSpend(Math.max(0, Math.min(character.stamina, Number(event.target.value))))} className={`${fieldClass} mt-1 py-1.5 text-xs`} /></label><label className="text-xs font-bold text-slate-400">Spend MP<input type="number" min={0} max={character.manaPoints} value={manaSpend} onChange={(event) => setManaSpend(Math.max(0, Math.min(character.manaPoints, Number(event.target.value))))} className={`${fieldClass} mt-1 py-1.5 text-xs`} /></label></div>{has('Second Breath') && <label className="mt-2 flex items-start gap-2 rounded-lg bg-slate-900/70 p-2 text-xs text-slate-300"><input type="checkbox" checked={empowered} onChange={(event) => setEmpowered(event.target.checked)} />Spend 2 uses: +{mode === 'Area' ? 2 : 4} damage.</label>}{has('Draconic Affinity') && <button type="button" onClick={() => onChange({ build: { ...build, sheetFeatureStates: { ...states, 'ancestry.draconicAffinity.ready': !affinityReady } } })} className={`mt-2 w-full rounded-lg px-3 py-2 text-xs font-black ${affinityReady ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Draconic Affinity {affinityReady ? 'Ready • +1 damage' : 'Not triggered'}</button>}{dyingBreathAvailable && <label className="mt-2 flex items-start gap-2 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-100"><input type="checkbox" checked={dyingBreath} onChange={(event) => setDyingBreath(event.target.checked)} />Dying Breath reaction: restore 1 use and use it immediately for 0 AP.</label>}{has('Concussive Breath') && <p className="mt-2 rounded-lg bg-violet-500/10 p-2 text-xs text-violet-100">Concussive Breath: every target makes a Physical Save; failure pushes it 1 Space, +1 per 5 failed by.</p>}<button type="button" disabled={unavailable} onClick={useBreath} className="mt-3 w-full rounded-lg bg-orange-700 px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Roll {mode} Breath • {usesRequired} use{usesRequired === 1 ? '' : 's'}</button></div>;
}

const ANCESTRY_ACTION_TRAITS = new Set([
  'Human Determination', 'Stone Blood', 'Burst of Bravery', 'Orc Rush', 'Intimidating Shout',
  'Orc Dash', 'Imposing Presence', 'Brute', 'Strong Body', 'Healing Touch', 'Gift of the Angels',
  'Blinding Light', 'Angelic Insight', 'Intimidator', 'Charming Gaze', "Light's Bane", 'Echolocation',
  'Shoot Webs', 'Telepathic Link', 'Strong Mind', 'Draconic Ward', 'Draconic Protection',
]);

function AncestryActionControls({ character, traits, onChange, onRoll }: {
  character: Character;
  traits: AncestryTrait[];
  onChange: CharacterSheetTabContentProps['onChange'];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [determinationRoll, setDeterminationRoll] = useState('Martial Check');
  const [notice, setNotice] = useState('');
  const build = character.build;
  if (!build) return null;
  const actions = traits.filter(({ name }) => ANCESTRY_ACTION_TRAITS.has(name));
  const hasFastReflexes = traits.some(({ name }) => name === 'Fast Reflexes');
  if (actions.length === 0 && !hasFastReflexes) return null;
  const states = build.sheetFeatureStates;
  const stateKey = (name: string) => `ancestry.${name.replace(/[^a-z0-9]+/gi, '').toLowerCase()}.used`;
  const oncePerCombat = new Set(['Human Determination', 'Burst of Bravery', 'Orc Rush', 'Intimidating Shout', 'Orc Dash', 'Imposing Presence', 'Brute', 'Strong Body', 'Healing Touch', 'Gift of the Angels', 'Blinding Light', 'Intimidator', 'Strong Mind', 'Draconic Ward', 'Draconic Protection']);
  const longRestOrInitiative = new Set(['Charming Gaze']);
  const oncePerLongRest = new Set(['Angelic Insight']);
  const actionCosts: Record<string, [number, number]> = {
    'Stone Blood': [1, 0], 'Orc Rush': [1, 0], 'Intimidating Shout': [1, 0],
    'Healing Touch': [1, 0], 'Gift of the Angels': [1, 1], 'Blinding Light': [1, 0],
    'Charming Gaze': [1, 0], "Light's Bane": [1, 0], Echolocation: [1, 0],
    'Shoot Webs': [1, 0], 'Telepathic Link': [1, 0],
  };
  const modifierFor = (name: string) => name === 'Angelic Insight'
    ? character.attributes.Charisma.modifier + masteryBonus(character.skillMasteries.Insight ?? 'Untrained')
    : character.primeModifier + character.combatMastery;
  const activateTrait = (trait: AncestryTrait) => {
    const [ap, mp] = actionCosts[trait.name] ?? [0, 0];
    const key = stateKey(trait.name);
    const limited = oncePerCombat.has(trait.name) || oncePerLongRest.has(trait.name) || longRestOrInitiative.has(trait.name);
    if ((limited && states[key]) || character.currentAP < ap || character.manaPoints < mp) return;
    const sheetConditionLevels = { ...build.sheetConditionLevels };
    let temporaryHP = build.temporaryHP;
    if (trait.name === 'Stone Blood') delete sheetConditionLevels.Bleeding;
    if (trait.name === 'Burst of Bravery') ['Frightened', 'Intimidated', 'Terrified'].forEach((condition) => delete sheetConditionLevels[condition]);
    if (trait.name === 'Orc Rush') temporaryHP += character.primeModifier;
    if (trait.name === 'Draconic Ward') temporaryHP += 2;
    const rollLabel = trait.name === 'Human Determination' ? determinationRoll
      : trait.name === 'Angelic Insight' ? 'Insight Check'
        : ['Healing Touch', 'Blinding Light', 'Charming Gaze', 'Telepathic Link'].includes(trait.name) ? `${trait.name} Spell Check`
          : ['Intimidating Shout', 'Shoot Webs'].includes(trait.name) ? `${trait.name} Attack Check` : '';
    if (rollLabel) onRoll(rollLabel, modifierFor(trait.name), Number(['Human Determination', 'Angelic Insight'].includes(trait.name)));
    onChange({
      currentAP: character.currentAP - ap,
      manaPoints: character.manaPoints - mp,
      build: {
        ...build,
        temporaryHP,
        sheetConditionLevels,
        sheetFeatureStates: limited ? { ...states, [key]: true } : states,
      },
    });
    setNotice(`${trait.name} applied${ap || mp ? ` • spent ${[ap ? `${ap} AP` : '', mp ? `${mp} MP` : ''].filter(Boolean).join(' + ')}` : ''}.`);
  };
  const resetCombatUses = () => {
    const refreshedStates = { ...states };
    [...oncePerCombat, ...longRestOrInitiative].forEach((name) => { refreshedStates[stateKey(name)] = false; });
    refreshedStates['ancestry.fastReflexes.firstAttackUsed'] = false;
    refreshedStates['ancestry.retractableNaturalWeapon.used'] = false;
    refreshedStates['ancestry.dyingBreath.used'] = false;
    onChange({ build: { ...build, sheetFeatureStates: refreshedStates, sheetFeatureCounters: { ...build.sheetFeatureCounters, 'ancestry.draconicBreath.usesSpent': 0 } } });
    setNotice('Ancestry uses refreshed for a new Combat or Initiative roll. Long-Rest-only uses remain spent.');
  };
  const rollInitiative = () => {
    onRoll('Initiative Check', character.attributes.Agility.modifier + character.combatMastery, Number(hasFastReflexes));
    const refreshedStates: Record<string, boolean> = { ...states, 'ancestry.fastReflexes.firstAttackUsed': false, 'ancestry.retractableNaturalWeapon.used': false, 'ancestry.dyingBreath.used': false };
    [...oncePerCombat, ...longRestOrInitiative].forEach((name) => { refreshedStates[stateKey(name)] = false; });
    onChange({ build: { ...build, sheetFeatureStates: refreshedStates, sheetFeatureCounters: { ...build.sheetFeatureCounters, 'ancestry.draconicBreath.usesSpent': 0 } } });
    setNotice(hasFastReflexes ? 'Fast Reflexes added ADV and readied ADV for your first Attack Check.' : 'Initiative rolled.');
  };
  // Kept as a local alias because this JSX predates the handler rename; it is not a React Hook.
  const useAction = activateTrait;
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  return <section className="rounded-2xl border border-emerald-400/20 bg-emerald-950/15 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><SectionHeading eyebrow="Ancestry" title="Trait Actions" tone="text-emerald-300" /><div className="flex flex-wrap gap-2">{hasFastReflexes && <button type="button" onClick={rollInitiative} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">Roll Initiative • ADV</button>}<button type="button" onClick={resetCombatUses} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white">New Combat / Initiative</button></div></div><p className="mt-2 text-xs leading-5 text-slate-500">Buttons spend tracked resources, clear relevant conditions, add Temp HP, make the required roll, and lock limited uses. Contextual target effects remain listed in each rule.</p>{notice && <p role="status" className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100">{notice}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{actions.map((trait) => { const key = stateKey(trait.name); const limited = oncePerCombat.has(trait.name) || oncePerLongRest.has(trait.name) || longRestOrInitiative.has(trait.name); const used = limited && Boolean(states[key]); const [ap, mp] = actionCosts[trait.name] ?? [0, 0]; const disabled = used || character.currentAP < ap || character.manaPoints < mp || (trait.name === 'Human Determination' && character.healthPoints > Math.floor(character.maxHealthPoints / 2)); const recharge = oncePerLongRest.has(trait.name) ? 'Long Rest' : longRestOrInitiative.has(trait.name) ? 'Long Rest or Initiative' : oncePerCombat.has(trait.name) ? 'Combat' : 'At will'; return <div key={trait.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-emerald-100">{trait.name}</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{recharge}{ap || mp ? ` • ${[ap ? `${ap} AP` : '', mp ? `${mp} MP` : ''].filter(Boolean).join(' + ')}` : ''}</p></div>{used && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase text-rose-200">Used</span>}</div><p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-400">{trait.description}</p>{trait.name === 'Human Determination' && <select value={determinationRoll} onChange={(event) => setDeterminationRoll(event.target.value)} className={`${fieldClass} mt-2 py-1 text-xs`}><option>Attack Check</option><option>Martial Check</option><option>Spell Check</option></select>}<button type="button" disabled={disabled} onClick={() => useAction(trait)} className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{used ? 'Used' : trait.name === 'Human Determination' && character.healthPoints > Math.floor(character.maxHealthPoints / 2) ? 'Requires Bloodied' : `Use ${trait.name}`}</button></div>; })}</div></section>;
}

function CombatTab({ character, training, modifiers, equipmentCatalog, knownSpells, knownManeuvers, grantedSpells, grantedManeuvers, ancestryGrantedSpells, selectedTraits, onChange, onRoll }: {
  character: Character;
  training: ReturnType<typeof characterCombatTraining>;
  modifiers: ReturnType<typeof equippedCombatModifiers>;
  equipmentCatalog: EquipmentCatalogItem[];
  knownSpells: Spell[];
  knownManeuvers: Maneuver[];
  grantedSpells: string[];
  grantedManeuvers: string[];
  ancestryGrantedSpells: SheetAncestrySpell[];
  selectedTraits: AncestryTrait[];
  onChange: CharacterSheetTabContentProps['onChange'];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [conditionToAdd, setConditionToAdd] = useState('Bleeding');
  const build = character.build;
  const conditionLevels = build?.sheetConditionLevels ?? {};
  const effects = characterSheetEffects(character);
  const slingBladeRangeBonus = (character.build?.selectedTalents ?? []).filter((name) => name === 'Sling-Blade').length * 2;
  const wildForm = druidWildFormProfile(character);
  const sorcererWildMagic = sorcererWildMagicProfile(character);
  const sorcererTransformation = sorcererWildMagic.transformation;
  const ancestryMechanics = ancestryMechanicalProfile(character, selectedTraits);
  const hasShellRetreat = wildForm.active
    ? wildForm.shellRetreatAvailable
    : selectedTraits.some(({ name }) => name === 'Shell Retreat');
  const shellRetreatActive = wildForm.active
    ? wildForm.shellRetreatActive
    : Boolean(hasShellRetreat && build?.sheetFeatureStates['ancestry.shellRetreat.active']);
  const physicalDefense = wildForm.active ? wildForm.physicalDefense
    : sorcererTransformation ? sorcererTransformation.physicalDefense
      : effects.physicalDefense + Number(shellRetreatActive) * 5;
  const areaDefense = wildForm.active ? wildForm.areaDefense
    : sorcererTransformation ? sorcererTransformation.areaDefense
      : effects.areaDefense + Number(shellRetreatActive) * 5;
  const speed = wildForm.active ? wildForm.speed : shellRetreatActive ? 0 : effects.speed;
  const martialCheck = character.primeModifier + character.combatMastery;
  const spellCheck = martialCheck + (wildForm.active ? 0 : modifiers.spellCheckBonus);
  const spellAttack = martialCheck + (wildForm.active ? 0 : modifiers.spellAttackBonus);
  const attackAndSpellAdjustment = wildForm.active ? 0 : modifiers.attackAndSpellDisadvantage;
  const equippedWeapons = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped).flatMap((inventory) => equipmentCatalog.filter(({ id, category }) => id === inventory.equipmentID && category === EquipmentCategoryValues.WEAPONS).map((item) => ({ inventory, item })));
  const equippedShields = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped).flatMap((inventory) => equipmentCatalog.filter(({ id, category }) => id === inventory.equipmentID && category === EquipmentCategoryValues.SHIELDS).map((item) => ({ inventory, item })));
  const equippedNets = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped).flatMap((inventory) => equipmentCatalog.filter(({ id, name }) => id === inventory.equipmentID && name === 'Net').map((item) => ({ inventory, item })));
  const equippedHandItems = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped).flatMap((inventory) => equipmentCatalog.filter(({ id }) => id === inventory.equipmentID).map((item) => ({ inventory, item })));
  const prone = shellRetreatActive || Boolean(conditionLevels.Prone);
  const selectedShieldInventoryID = build?.sheetFeatureSelections['equipment.activeShield'];
  const activeShield = equippedShields.find(({ inventory }) => inventory.id === selectedShieldInventoryID)
    ?? equippedShields.reduce<(typeof equippedShields)[number] | undefined>((best, candidate) => {
      if (!best) return candidate;
      const bestProfile = defensiveEquipmentProfile(best.item);
      const candidateProfile = defensiveEquipmentProfile(candidate.item);
      return candidateProfile.physicalDefense + candidateProfile.areaDefense > bestProfile.physicalDefense + bestProfile.areaDefense ? candidate : best;
    }, undefined);
  const canUseVersatileTwoHanded = (inventoryID: string) => equippedHandItems
    .filter(({ inventory }) => inventory.id !== inventoryID)
    .reduce((hands, { item }) => hands + (item.name === 'Buckler' ? 0 : equipmentHandCost(item.slot)), 0) === 0;
  const stowThrownItem = (inventoryID: string, actionPointCost = 0) => onChange({
    ...(actionPointCost > 0 ? { currentAP: character.currentAP - actionPointCost } : {}),
    inventoryItems: (character.inventoryItems ?? []).map((item) => item.id === inventoryID ? { ...item, isEquipped: false } : item),
  });
  const setCondition = (name: string, level: number) => {
    if (!build) return;
    const updated = { ...conditionLevels };
    if (level <= 0) delete updated[name]; else updated[name] = Math.min(10, level);
    onChange({ build: { ...build, sheetConditionLevels: updated } });
  };
  const toggleShellRetreat = () => {
    if (!build || character.currentAP < 1) return;
    onChange({
      currentAP: character.currentAP - 1,
      build: { ...build, sheetFeatureStates: { ...build.sheetFeatureStates, 'ancestry.shellRetreat.active': !shellRetreatActive } },
    });
  };
  const saveAttributeModifier = (attribute: DC20Attribute) => wildForm.active && attribute === 'Might'
    ? wildForm.might : wildForm.active && attribute === 'Agility'
      ? wildForm.agility : character.attributes[attribute].modifier;
  const activeResistances = wildForm.active
    ? wildForm.resistances
    : uniqueStrings([...effects.resistances, ...ancestryMechanics.resistances]);
  const referenceStats: Array<[string, string | number, number | null]> = [
    ['Physical Defense', physicalDefense, null],
    ['Area Defense', areaDefense, null],
    ['Combat Mastery', `+${character.combatMastery}`, null],
    ['Speed', speed, null],
    ['Martial Check', `${martialCheck >= 0 ? '+' : ''}${martialCheck}`, martialCheck],
    ['Spell Check', `${spellCheck >= 0 ? '+' : ''}${spellCheck}`, spellCheck],
    ['Spell Attack', `${spellAttack >= 0 ? '+' : ''}${spellAttack}`, spellAttack],
    ['Class Save DC', 10 + character.primeModifier + character.combatMastery, null],
    ...(!wildForm.active ? [
      ['Death Threshold', ancestryMechanics.deathDoorThreshold, null],
      ['Death’s Door AP', ancestryMechanics.deathDoorActionPoints, null],
    ] as Array<[string, string | number, number | null]> : []),
  ];

  return <div className="space-y-5">
    <section className={panelClass}>
      <SectionHeading eyebrow="At a Glance" title="Combat Reference" />
      {wildForm.active && <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>Wild Form active:</strong> {wildForm.size} {wildForm.creatureType} • {wildForm.currentHP}/{wildForm.maximumHP} Wild Form HP • PDR {wildForm.physicalDamageReduction ? 1 : 0} • EDR {wildForm.elementalDamageReduction ? 1 : 0} • MDR 0. Ancestry Traits and ordinary equipment are inactive.{wildForm.beastTraits.length > 0 ? ` Wild Form Beast Traits: ${wildForm.beastTraits.join(', ')}.` : ''}</div>}
      {sorcererTransformation && <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs leading-5 text-cyan-100"><div className="flex flex-wrap items-center justify-between gap-3"><span><strong>Wild Magic transformation:</strong> {sorcererTransformation.size} {sorcererTransformation.name} • {sorcererTransformation.currentHP}/{sorcererTransformation.maximumHP} form HP{sorcererTransformation.flySpeed ? ` • Fly Speed ${sorcererTransformation.flySpeed}` : ''}</span><button type="button" onClick={() => onRoll(`${sorcererTransformation.name} Attack • ${sorcererTransformation.damage} damage`, sorcererTransformation.attackCheck)} className="rounded-lg bg-cyan-700 px-3 py-2 font-black text-white">Roll Attack +{sorcererTransformation.attackCheck}</button></div></div>}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{referenceStats.map(([label, value, rollModifier]) => rollModifier === null
        ? <div key={label} className="rounded-lg bg-slate-950/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div>{(label === 'Physical Defense' || label === 'Area Defense') && <div className="mt-1 text-[10px] font-bold text-amber-200">Heavy {Number(value) + 5} • Brutal {Number(value) + 10}</div>}{label === 'Physical Defense' && physicalDefense !== character.physicalDefense && <div className="text-[10px] font-bold text-red-300">Active feature adjustment</div>}{label === 'Area Defense' && areaDefense !== character.arcaneDefense && <div className="text-[10px] font-bold text-red-300">Active feature adjustment</div>}{label === 'Speed' && shellRetreatActive && <div className="text-[10px] font-bold text-rose-300">Shell Retreat: cannot move</div>}</div>
        : <button type="button" key={label} onClick={() => onRoll(label, rollModifier, (label === 'Martial Check' ? 0 : attackAndSpellAdjustment) - Number(label === 'Spell Attack' && prone))} className="rounded-lg bg-slate-950/55 p-3 text-left hover:bg-violet-500/10"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div><div className="text-xs font-bold text-violet-300">Roll</div>{label !== 'Martial Check' && attackAndSpellAdjustment < 0 && <div className="text-[10px] font-bold text-rose-300">{Math.abs(attackAndSpellAdjustment)}× gear DisADV</div>}{label === 'Spell Attack' && prone && <div className="text-[10px] font-bold text-rose-300">Prone DisADV</div>}</button>)}</div>
      {activeResistances.length > 0 && <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/5 p-2 text-xs text-sky-100"><strong>Active Resistances:</strong> {activeResistances.join(' • ')}</div>}
      {!wildForm.active && ancestryMechanics.vulnerabilities.length > 0 && <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-500/5 p-2 text-xs text-rose-100"><strong>Vulnerabilities:</strong> {ancestryMechanics.vulnerabilities.join(' • ')}</div>}
      {!wildForm.active && ancestryMechanics.defenses.length > 0 && <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-500/5 p-2 text-xs text-emerald-100"><strong>Ancestry Defenses:</strong> {ancestryMechanics.defenses.join(' • ')}</div>}
      {!wildForm.active && ancestryMechanics.senses.length > 0 && <div className="mt-3 rounded-lg border border-violet-400/15 bg-violet-500/5 p-2 text-xs text-violet-100"><strong>Senses:</strong> {ancestryMechanics.senses.join(' • ')}</div>}
      {!wildForm.active && ancestryMechanics.movement.length > 0 && <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/5 p-2 text-xs text-amber-100"><strong>Movement:</strong> {ancestryMechanics.movement.join(' • ')}</div>}
      {shellRetreatActive && <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>Shell Retreat active:</strong> Physical Damage Reduction, Elemental Damage Reduction, ADV on Might Saves; you are Prone, cannot move, have DisADV on Agility Saves, and cannot take Reactions.</div>}
      {!wildForm.active && (modifiers.spellCheckBonus > 0 || modifiers.spellAttackBonus > 0 || modifiers.spellAttackDamageBonus > 0) && <div className="mt-3 rounded-lg border border-fuchsia-400/15 bg-fuchsia-500/5 p-2 text-xs text-fuchsia-100"><strong>Equipped Spell Focus:</strong> {[modifiers.spellCheckBonus > 0 ? `+${modifiers.spellCheckBonus} Spell Checks` : '', modifiers.spellAttackBonus > 0 ? `+${modifiers.spellAttackBonus} Spell Attacks` : '', modifiers.spellAttackDamageBonus > 0 ? `+${modifiers.spellAttackDamageBonus} Spell Attack damage` : ''].filter(Boolean).join(' • ')}</div>}
      {!wildForm.active && <EquippedRulesSummary modifiers={modifiers} />}
    </section>
    {hasShellRetreat && <section className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/45 to-slate-950/70 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><SectionHeading eyebrow={wildForm.active ? 'Wild Form Beast Trait' : 'Beastborn Trait'} title="Shell Retreat" tone="text-emerald-300" /><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Spend 1 AP to retreat into or emerge from your shell. The sheet applies every defense, reduction, save, movement, condition, and reaction effect while active.</p></div><button type="button" disabled={character.currentAP < 1} onClick={toggleShellRetreat} className={`rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35 ${shellRetreatActive ? 'bg-slate-700' : 'bg-emerald-700'}`}>{shellRetreatActive ? 'Come Out • 1 AP' : 'Retreat • 1 AP'}</button></div></section>}
    {!wildForm.active && <AncestryActionControls character={character} traits={selectedTraits} onChange={onChange} onRoll={onRoll} />}
    {!wildForm.active && selectedTraits.some(({ name }) => name === 'Draconic Breath Weapon') && <section className={panelClass}><SectionHeading eyebrow="Dragonborn" title="Breath Weapon" tone="text-orange-300" /><div className="mt-4"><DraconicBreathWeaponCard character={character} traits={selectedTraits} spellAttack={spellAttack} adjustment={attackAndSpellAdjustment - Number(prone)} onChange={onChange} onRoll={onRoll} /></div></section>}
    {!wildForm.active && equippedShields.length > 1 && build && <section className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4"><SectionHeading eyebrow="Wielding Two Shields" title="Active Shield Bonus" tone="text-amber-300" /><p className="mt-2 text-xs leading-5 text-slate-400">You are immune to Flanking. Only the selected Shield contributes its PD and AD bonuses; all wielded Bulky and Rigid drawbacks still apply.</p><div className="mt-3 flex flex-wrap gap-2">{equippedShields.map(({ inventory, item }) => { const profile = defensiveEquipmentProfile(item); return <button type="button" key={inventory.id} onClick={() => onChange({ inventoryItems: character.inventoryItems, build: { ...build, sheetFeatureSelections: { ...build.sheetFeatureSelections, 'equipment.activeShield': inventory.id } } })} className={`rounded-lg px-3 py-2 text-xs font-black ${activeShield?.inventory.id === inventory.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{item.name} • +{profile.physicalDefense} PD / +{profile.areaDefense} AD</button>; })}</div></section>}
    <section className={panelClass}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><SectionHeading eyebrow={wildForm.active ? 'Wild Form' : 'Equipped Arsenal'} title="Martial Attacks" tone="text-amber-300" /><span className="text-xs text-slate-500">{wildForm.active ? 'The Wild Form Natural Weapon uses your normal Martial Check.' : 'Published damage, ranges, properties, and situational penalties are applied here.'}</span></div>
      {wildForm.active
        ? <button type="button" onClick={() => onRoll(`Wild Form Natural Weapon • 1 ${wildForm.naturalWeaponDamageType} damage • Unarmed Strike`, martialCheck, -Number(prone))} className="w-full rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4 text-left hover:bg-emerald-500/15"><span className="block font-black text-emerald-100">Wild Form Natural Weapon</span><span className="mt-1 block text-xs text-slate-400">1 {wildForm.naturalWeaponDamageType} damage • Range 1 • Unarmed Strike</span><span className="mt-2 block text-2xl font-black text-emerald-200">+{martialCheck}</span></button>
        : <><div className="grid gap-3 lg:grid-cols-2">{character.class === 'Monk' || hasDirectMulticlassFeature(character, 'Monk', 'Monk Training') ? <MonkUnarmedAttackCard character={character} modifier={martialCheck} adjustment={attackAndSpellAdjustment} damageBonus={effects.martialMeleeDamageBonus} impactBonus={modifiers.unarmedHeavyHitDamageBonus} prone={prone} onChange={onChange} onRoll={onRoll} /> : <UnarmedAttackCard modifier={martialCheck} adjustment={attackAndSpellAdjustment} damageBonus={effects.martialMeleeDamageBonus} impactBonus={modifiers.unarmedHeavyHitDamageBonus} prone={prone} onRoll={onRoll} />}<NaturalWeaponAttackCard character={character} traits={selectedTraits} onChange={onChange} onRoll={onRoll} />{equippedWeapons.map(({ inventory, item }) => <WeaponAttackCard key={inventory.id} item={item} modifier={martialCheck} adjustment={attackAndSpellAdjustment} damageBonus={effects.martialMeleeDamageBonus} heavyHitDamageBonus={monkMeleeHeavyHitDamageBonus(character)} meleeRangeBonus={slingBladeRangeBonus} trained={training.weaponTraining || training.pactWeaponTraining} prone={prone} canUseVersatileTwoHanded={canUseVersatileTwoHanded(inventory.id)} canReload={canUseVersatileTwoHanded(inventory.id)} availableAP={character.currentAP} availableSP={character.stamina} onReload={(resource) => onChange(resource === 'AP' ? { currentAP: character.currentAP - 1 } : { stamina: character.stamina - 1 })} onSpendEnhancements={(resource, amount, weaponWasThrown) => onChange({ ...(resource === 'AP' ? { currentAP: character.currentAP - amount } : { stamina: character.stamina - amount }), ...(weaponWasThrown ? { inventoryItems: (character.inventoryItems ?? []).map((entry) => entry.id === inventory.id ? { ...entry, isEquipped: false } : entry) } : {}) })} onThrown={() => stowThrownItem(inventory.id)} onRoll={onRoll} />)}{equippedShields.map(({ inventory, item }) => <ShieldAttackCard key={`shield-${inventory.id}`} item={item} modifier={martialCheck} adjustment={attackAndSpellAdjustment} trained={item.subtype === 'Heavy Shield' ? training.heavyShieldTraining : training.lightShieldTraining} prone={prone} onThrown={() => stowThrownItem(inventory.id)} onRoll={onRoll} />)}{equippedNets.map(({ inventory }) => <NetAttackCard key={`net-${inventory.id}`} character={character} modifier={martialCheck} onThrow={() => stowThrownItem(inventory.id, 1)} onRoll={onRoll} />)}</div>{equippedWeapons.length === 0 && equippedShields.length === 0 && equippedNets.length === 0 && !selectedTraits.some(({ name }) => name === 'Natural Weapon') && character.class !== 'Monk' && !hasDirectMulticlassFeature(character, 'Monk', 'Monk Training') && <p className="mt-3 text-center text-xs text-slate-500">Equip a weapon, shield, or Net to add its attack controls.</p>}</>}
    </section>
    <div className="grid gap-5 lg:grid-cols-3"><section className={`${panelClass} lg:col-span-2`}><SectionHeading eyebrow="Resist Effects" title="Saving Throws" tone="text-sky-300" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = saveAttributeModifier(attribute) + character.combatMastery; const adjustment = wildForm.active ? Number(attribute === 'Might' && shellRetreatActive) - Number(attribute === 'Agility' && shellRetreatActive) : (effects.saveAdvantage[attribute] ?? 0) + Number(attribute === 'Might' && shellRetreatActive) - Number(attribute === 'Agility' && shellRetreatActive); return <button type="button" key={attribute} onClick={() => onRoll(`${attribute} Save`, modifier, adjustment)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-sky-400/40"><div className="text-xs text-slate-500">{attribute} Save</div><div className="text-2xl font-black text-sky-200">{modifier >= 0 ? '+' : ''}{modifier}</div>{wildForm.active && (attribute === 'Might' || attribute === 'Agility') && <div className="text-[10px] font-bold text-emerald-300">Wild Form statistic</div>}{adjustment > 0 && <div className="text-[10px] font-bold text-orange-300">{adjustment}× ADV active</div>}{adjustment < 0 && <div className="text-[10px] font-bold text-rose-300">{Math.abs(adjustment)}× DisADV active</div>}</button>; })}</div></section><section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-violet-200">Active Conditions</h2><div className="flex gap-2"><select value={conditionToAdd} onChange={(event) => setConditionToAdd(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select><button type="button" onClick={() => setCondition(conditionToAdd, conditionLevels[conditionToAdd] ?? 1)} className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold">Add</button></div></div><div className="mt-4 space-y-2">{shellRetreatActive && <div className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3"><span className="font-bold text-emerald-100">Prone</span><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Shell Retreat</span></div>}{wildForm.active && wildForm.bleedingImmune && <div className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3"><span className="font-bold text-emerald-100">Immune to Bleeding</span><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Plant Form</span></div>}{Object.entries(conditionLevels).length === 0 && !shellRetreatActive ? <p className="text-sm text-slate-500">No active conditions.</p> : Object.entries(conditionLevels).sort().map(([condition, value]) => <div key={condition} className="flex items-center justify-between rounded-lg bg-slate-950/55 p-3"><span className="font-bold text-slate-200">{condition}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setCondition(condition, value - 1)} className="h-7 w-7 rounded bg-slate-800">−</button><span className="min-w-6 text-center font-black text-violet-200">{value}</span><button type="button" onClick={() => setCondition(condition, value + 1)} className="h-7 w-7 rounded bg-slate-800">+</button><button type="button" onClick={() => setCondition(condition, 0)} className="ml-1 text-xs font-bold text-red-300">×</button></div></div>)}</div></section></div>
    {wildForm.active
      ? <section className="rounded-2xl border border-emerald-400/20 bg-emerald-950/15 p-4 text-sm leading-6 text-emerald-100"><strong>Spells & Maneuvers unavailable in Wild Form.</strong> Your Druid Class Features, Druid Subclass Features, and Druid Talents remain available in the live controls above.</section>
      : <section className={panelClass}><SectionHeading eyebrow="Powers" title="Spells & Maneuvers" tone="text-fuchsia-300" /><p className="mt-1 text-sm text-slate-500">Open only the list you need during combat. Equipped focus properties are applied to the rolls and range reminders below.</p><div className="mt-4 space-y-3"><details className="group rounded-xl border border-fuchsia-400/15 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between"><span className="font-black text-fuchsia-200">Spells</span><span className="text-xs font-bold text-fuchsia-200">{knownSpells.length} • <span className="group-open:hidden">Expand</span><span className="hidden group-open:inline">Collapse</span></span></summary><div className="mt-3 space-y-2">{knownSpells.length === 0 ? <p className="text-sm text-slate-500">No spells known.</p> : knownSpells.map((spell) => { const ancestryGrant = ancestryGrantedSpells.find(({ name }) => name === spell.name); return <MoreDetails key={spell.id} title={spell.name} subtitle={[spell.source, spell.school, spell.cost, spell.range, ancestryGrant ? `Ancestry • ${ancestryGrant.traitName}` : grantedSpells.includes(spell.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{ancestryGrant && <div className="mb-4 rounded-lg border border-emerald-400/15 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>{ancestryGrant.traitName}:</strong> {ancestryGrant.traitDescription}</div>}{spell.description}{spell.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{spell.enhancements}</p></>}<SpellRollControl spell={spell} spellCheck={spellCheck} spellAttack={spellAttack} modifiers={modifiers} prone={prone} onRoll={onRoll} /></MoreDetails>; })}</div></details><details className="group rounded-xl border border-violet-400/15 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between"><span className="font-black text-violet-200">Maneuvers</span><span className="text-xs font-bold text-violet-200">{knownManeuvers.length} • <span className="group-open:hidden">Expand</span><span className="hidden group-open:inline">Collapse</span></span></summary><div className="mt-3 space-y-2">{knownManeuvers.length === 0 ? <p className="text-sm text-slate-500">No maneuvers known.</p> : knownManeuvers.map((maneuver) => <MoreDetails key={maneuver.id} title={maneuver.name} subtitle={[maneuver.category ?? maneuver.type, maneuver.cost, maneuver.range, grantedManeuvers.includes(maneuver.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{maneuver.description}{maneuver.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{maneuver.enhancements}</p></>}</MoreDetails>)}</div></details></div></section>}
  </div>;
}

function FeaturesTab({ character, classReference, reference, selectedTraits, training }: {
  character: Character;
  classReference?: ClassReference;
  reference: CharacterReferenceData | null;
  selectedTraits: AncestryTrait[];
  training: ReturnType<typeof characterCombatTraining>;
}) {
  const build = character.build;
  const featureDescription = (name: string, description: string, ownerClass = character.class) => {
    const ownerReference = reference?.classes.find(({ name: candidate }) => candidate === ownerClass);
    const selections = (ownerReference?.choiceGroups ?? []).filter((group) => group.feature === name)
      .flatMap((group) => (build?.classFeatureSelections[group.id] ?? []).map((choice) => `${group.title}: ${choice}`));
    return selections.length > 0 ? `${description}\n\nSelected Options\n• ${selections.join('\n• ')}` : description;
  };
  const talents = Object.entries((build?.selectedTalents ?? []).reduce<Record<string, number>>((counts, name) => ({ ...counts, [name]: (counts[name] ?? 0) + 1 }), {}));
  const classFeatures = classReference?.features.filter(({ level }) => level <= character.level) ?? [];
  const multiclassFeatures = reference ? ownedClassFeatures(character, reference).filter(({ source }) => source !== 'Class') : [];
  return <div className="grid gap-5 lg:grid-cols-3"><section className={`${panelClass} lg:col-span-3`}><SectionHeading eyebrow="Proficiencies" title="Combat Training" tone="text-amber-300" /><div className="mt-3 flex flex-wrap gap-2">{training.categories.length === 0 ? <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400">No combat training recorded</span> : training.categories.map((entry) => <span key={entry} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-100">{entry}</span>)}</div>{classReference?.pathDetails && <div className="mt-3"><MoreDetails title="Class Path & Training Rules" subtitle={character.class}>{classReference.pathDetails}</MoreDetails></div>}</section><section><h2 className="mb-3 font-black text-violet-200">Class Features</h2><div className="space-y-3">{classFeatures.map((entry) => <div key={entry.level}><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Level {entry.level}</h3><div className="space-y-2">{entry.features.map((feature) => <MoreDetails key={`${entry.level}-${feature.name}`} title={feature.name}>{featureDescription(feature.name, feature.description)}</MoreDetails>)}</div></div>)}{character.subclass && (classReference?.subclassFeatures[character.subclass] ?? []).filter((feature) => feature.level === undefined || feature.level <= character.level).map((feature) => <MoreDetails key={`subclass-${feature.name}`} title={feature.name} subtitle={`${character.subclass}${feature.level !== undefined ? ` • Level ${feature.level}` : ''}`}>{featureDescription(feature.name, feature.description)}</MoreDetails>)}{multiclassFeatures.length > 0 && <div><h3 className="mb-2 mt-4 text-xs font-black uppercase tracking-wider text-cyan-300">Multiclass Features</h3><div className="space-y-2">{multiclassFeatures.map((feature) => <MoreDetails key={`${feature.className}-${feature.subclass ?? ''}-${feature.name}`} title={feature.name} subtitle={`${feature.className}${feature.subclass ? ` • ${feature.subclass}` : ''} • Level ${feature.level} • ${feature.source}`}>{featureDescription(feature.name, feature.description, feature.className)}</MoreDetails>)}</div></div>}</div></section><section><h2 className="mb-3 font-black text-fuchsia-200">Talents</h2><div className="space-y-2">{talents.length === 0 ? <p className="text-slate-500">No talents selected.</p> : talents.map(([name, count]) => { const talent = reference ? talentByName(reference, name) : undefined; return <MoreDetails key={name} title={`${name}${count > 1 ? ` ×${count}` : ''}`} subtitle={talent ? `${talent.category}${talent.className ? ` • ${talent.className}` : ''}` : undefined}>{featureDescription(name, talent?.description ?? 'Talent details are unavailable.', talent?.className)}</MoreDetails>; })}</div></section><section><h2 className="mb-3 font-black text-emerald-200">Ancestry Traits</h2><div className="space-y-2">{selectedTraits.length === 0 ? <p className="text-slate-500">No ancestry traits selected.</p> : selectedTraits.map((trait) => { const count = ancestryTraitSelectionCount(character, trait); const source = ancestryTraitSource(trait); const tags = ancestryTraitRulesTags(trait); return <MoreDetails key={trait.id} title={`${trait.name}${count > 1 ? ` ×${count}` : ''}`} subtitle={`${trait.ancestry} • ${trait.category} • ${trait.cost > 0 ? '+' : ''}${trait.cost} AP each • ${source.title}, p. ${source.page}`}><div className="mb-3 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">{tag}</span>)}</div>{trait.description}{build?.ancestryTraitChoices[trait.id]?.filter(Boolean).length ? `\n\nChoice${(build.ancestryTraitChoices[trait.id]?.filter(Boolean).length ?? 0) > 1 ? 's' : ''}: ${build.ancestryTraitChoices[trait.id].filter(Boolean).join(', ')}` : ''}</MoreDetails>; })}</div></section></div>;
}

function CustomEquipmentRecordEditor({ item, onSave }: {
  item: EquipmentCatalogItem;
  onSave: (item: EquipmentCatalogItem) => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.mechanics);
  const [saved, setSaved] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    onSave({ ...item, name: name.trim(), summary: description.trim(), mechanics: description.trim() });
    setSaved(true);
  };
  return <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} className={`${fieldClass} mt-1`} /></label>
    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); }} className={`${fieldClass} mt-1 min-h-24 resize-y`} /></label>
    <div className="mt-3 flex items-center justify-end gap-3">{saved && <span role="status" className="text-xs font-bold text-emerald-300">Changes saved</span>}<button type="button" disabled={!name.trim()} onClick={save} className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-black text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35">Save Name &amp; Description</button></div>
  </div>;
}

function CustomEquipmentLibraryEditor() {
  const customEquipment = useCampaignStore((state) => state.campaignData.customEquipment);
  const updateCustomEquipment = useCampaignStore((state) => state.updateCustomEquipment);
  const [selectedID, setSelectedID] = useState('');
  const selected = customEquipment.find(({ id }) => id === selectedID) ?? customEquipment[0];
  if (!selected) return null;
  return <details className="group mb-6 rounded-2xl border border-violet-400/20 bg-slate-950/45 p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span><span className="block text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Custom Item Library</span><span className="font-black text-violet-100">Edit Custom Items</span></span><span className="text-xs font-black text-violet-300 group-open:hidden">Expand</span><span className="hidden text-xs font-black text-violet-300 group-open:inline">Collapse</span></summary>
    <div className="mt-4 grid gap-4 border-t border-white/5 pt-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="space-y-2">{customEquipment.map((item) => <button type="button" key={item.id} onClick={() => setSelectedID(item.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-bold ${selected.id === item.id ? 'border-violet-400/50 bg-violet-500/15 text-violet-100' : 'border-white/10 bg-slate-900/65 text-slate-300 hover:border-violet-400/30'}`}>{item.name}</button>)}</div>
      <CustomEquipmentRecordEditor key={selected.id} item={selected} onSave={updateCustomEquipment} />
    </div>
  </details>;
}

function EquipmentTab({ character, equipmentCatalog, onChange, onRoll }: { character: Character; equipmentCatalog: EquipmentCatalogItem[]; onChange: CharacterSheetTabContentProps['onChange']; onRoll: CharacterSheetTabContentProps['onRoll'] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'All'>('All');
  const [notice, setNotice] = useState('');
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemDescription, setCustomItemDescription] = useState('');
  const addCustomEquipment = useCampaignStore((state) => state.addCustomEquipment);
  const catalogDetailsRef = useRef<HTMLDetailsElement>(null);
  const openCustomItemForm = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (catalogDetailsRef.current) catalogDetailsRef.current.open = true;
    setShowCustomItemForm(true);
  };
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return equipmentCatalog.filter((item) => (category === 'All' || item.category === category) && (!query || [item.name, item.subtype, item.summary, ...item.properties].some((value) => value.toLowerCase().includes(query)))); }, [category, equipmentCatalog, search]);
  const inventory = character.inventoryItems ?? [];
  const updateInventory = (inventoryItems: CharacterInventoryItem[]) => onChange({ inventoryItems });
  const addItem = (item: EquipmentCatalogItem) => { updateInventory(addInventoryItem(inventory, item)); setNotice(`${item.name} added unequipped.`); };
  const createCustomItem = () => {
    const name = customItemName.trim();
    if (!name) return;
    const description = customItemDescription.trim();
    const item: EquipmentCatalogItem = {
      id: `custom-equipment-${generateUUID()}`,
      name,
      category: EquipmentCategoryValues.ADVENTURING_SUPPLIES,
      subtype: 'Custom Item',
      summary: description,
      mechanics: description,
      properties: [],
      slot: EquipmentSlotValues.CARRIED,
      sourcePage: 'Custom Item',
    };
    addCustomEquipment(item);
    addItem(item);
    setCustomItemName('');
    setCustomItemDescription('');
    setShowCustomItemForm(false);
  };
  const drinkPotion = (entry: CharacterInventoryItem, item: EquipmentCatalogItem) => {
    const amount = healingPotionAmount(item);
    const healthPoints = Math.min(character.maxHealthPoints, character.healthPoints + amount);
    onChange({ healthPoints, inventoryItems: consumeInventoryQuantity(inventory, entry.id) });
    setNotice(`${item.name} consumed: restored ${healthPoints - character.healthPoints} HP${healthPoints === character.maxHealthPoints ? ' (maximum HP reached)' : ''}.`);
  };
  const spendMedicineKitUse = (entry: CharacterInventoryItem, treatment: 'Wound' | 'Poison or Disease') => {
    const remaining = entry.remainingUses ?? entry.quantity * 5;
    if (remaining <= 0) { setNotice('The Medicine Kit is empty. Resupply it before treating a creature.'); return; }
    if (character.currentAP < 1) { setNotice('Treating with a Medicine Kit requires 1 AP for the Object Action.'); return; }
    onChange({ currentAP: character.currentAP - 1, inventoryItems: spendInventoryUse(inventory, entry.id) });
    const mastery = character.skillMasteries.Medicine ?? 'Untrained';
    const modifier = character.attributes.Intelligence.modifier + masteryBonus(mastery);
    onRoll(treatment === 'Wound' ? 'Medicine Kit — Treat Wound (DC 10)' : 'Medicine Kit — Treat Poison or Disease (effect DC)', modifier);
    setNotice(treatment === 'Wound'
      ? 'Spent 1 Medicine Kit use. Success restores 1 HP, +1 per Success (each 5), but not above Bloodied.'
      : 'Spent 1 Medicine Kit use. Success cures one Basic Poison or Disease; Success (each 5) also restores +1 HP.');
  };
  const resupplyMedicineKit = (entry: CharacterInventoryItem) => {
    const current = entry.remainingUses ?? entry.quantity * 5;
    if (current >= entry.quantity * 5) return;
    updateInventory(inventory.map((item) => item.id === entry.id ? { ...item, remainingUses: current + 1 } : item));
    setNotice('Medicine Kit resupplied by 1 use after buying supplies (5 gold) or succeeding on the gathering check.');
  };
  const ragingUnfathomable = Boolean(character.build?.sheetFeatureStates[BARBARIAN_RAGE_STATE] && character.build?.selectedTalents.includes('Unfathomable Strength'));
  const toggleGear = (entry: CharacterInventoryItem, item: EquipmentCatalogItem) => {
    const nextInventory = toggleInventoryEquipped(inventory, entry.id, equipmentCatalog, { twoHandedWeaponHandCost: ragingUnfathomable ? 1 : 2 });
    const actionPointCost = equipmentTransitionActionPointCost(inventory, nextInventory, equipmentCatalog);
    if (character.currentAP < actionPointCost) { setNotice(`${item.name} requires ${actionPointCost} AP for this equipment change.`); return; }
    onChange({
      currentAP: character.currentAP - actionPointCost,
      inventoryItems: nextInventory,
    });
    setNotice(`${item.name} ${entry.isEquipped ? 'stowed' : 'equipped'}${actionPointCost ? ` for ${actionPointCost} AP` : ''}.`);
  };
  return <div><div className="mb-6"><SectionHeading eyebrow="Carried Gear" title="Inventory & Equipped Gear" /><p className="mt-1 text-sm text-slate-500">Add items here or from the main Equipment directory. New items enter your inventory unequipped; armor and hand limits are enforced when equipping.</p></div><details ref={catalogDetailsRef} className="group mb-6 rounded-2xl border border-violet-400/20 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="font-black text-violet-100">+ Add Equipment</span><span className="flex items-center gap-3"><button type="button" onClick={openCustomItemForm} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-200 hover:bg-violet-500/20">+ Add Custom Item</button><span className="text-xs font-bold text-violet-300 group-open:hidden">Open catalog</span><span className="hidden text-xs font-bold text-violet-300 group-open:inline">Close catalog</span></span></summary><div className="mt-4 border-t border-white/5 pt-4">{showCustomItemForm && <div className="mb-4 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3"><h3 className="text-sm font-black text-violet-200">Create Custom Item</h3><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input value={customItemName} onChange={(event) => setCustomItemName(event.target.value)} className={`${fieldClass} mt-1 w-full`} placeholder="Item name" /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea value={customItemDescription} onChange={(event) => setCustomItemDescription(event.target.value)} className={`${fieldClass} mt-1 min-h-20 w-full resize-y`} placeholder="What the item is or does…" /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowCustomItemForm(false)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Cancel</button><button type="button" disabled={!customItemName.trim()} onClick={createCustomItem} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35">Create &amp; Add to Inventory</button></div></div>}<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Search names, types, properties, or uses…" /><select value={category} onChange={(event) => setCategory(event.target.value as EquipmentCategory | 'All')} className={fieldClass}><option value="All">All categories</option>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>{notice && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200" role="status">{notice}</p>}<div className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-slate-900/75 p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-slate-100">{item.name}</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.category} • {item.subtype}</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">{item.slot}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{item.summary}</p><button type="button" onClick={() => addItem(item)} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-600">Add Unequipped</button></div>)}</div>{filtered.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No equipment matches those filters.</p>}</div></details>{inventory.length + character.equipment.length > 0 ? <div className="space-y-2">{inventory.map((entry) => { const item = equipmentCatalog.find(({ id }) => id === entry.equipmentID); if (!item) return <div key={entry.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-amber-200">Missing catalog item: {entry.equipmentID}</div>; const potionHealing = healingPotionAmount(item); const medicineUses = item.name === 'Medicine Kit' ? entry.remainingUses ?? entry.quantity * 5 : undefined; return <MoreDetails key={entry.id} title={item.name} subtitle={`${item.category} • ${item.subtype} • ${item.slot}${entry.isEquipped ? ' • Equipped' : ' • Unequipped'}${medicineUses !== undefined ? ` • ${medicineUses}/${entry.quantity * 5} uses` : ''}`}><p className="font-semibold text-violet-200">{item.summary}</p><p className="mt-3">{item.mechanics}</p><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => updateInventory(setInventoryQuantity(inventory, entry.id, entry.quantity - 1))} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-slate-200">Quantity {entry.quantity}</span><button type="button" onClick={() => updateInventory(setInventoryQuantity(inventory, entry.id, entry.quantity + 1))} className="h-8 w-8 rounded bg-slate-800">+</button>{potionHealing > 0 && <button type="button" onClick={() => drinkPotion(entry, item)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Drink • Heal {potionHealing} HP</button>}{medicineUses !== undefined && <button type="button" disabled={medicineUses <= 0 || character.currentAP < 1} onClick={() => spendMedicineKitUse(entry, 'Wound')} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Treat Wound • 1 AP + Roll</button>}{medicineUses !== undefined && <button type="button" disabled={medicineUses <= 0 || character.currentAP < 1} onClick={() => spendMedicineKitUse(entry, 'Poison or Disease')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Treat Poison/Disease • 1 AP + Roll</button>}{medicineUses !== undefined && medicineUses < entry.quantity * 5 && <button type="button" onClick={() => resupplyMedicineKit(entry)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white">Resupply +1 Use</button>}{isEquipmentEquippable(item) && <button type="button" disabled={(item.category === EquipmentCategoryValues.SHIELDS || item.properties.includes('Cumbersome')) && character.currentAP < 1} onClick={() => toggleGear(entry, item)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">{entry.isEquipped ? 'Stow' : 'Equip'}{item.category === EquipmentCategoryValues.SHIELDS || item.properties.includes('Cumbersome') ? ' • 1 AP' : ''}</button>}<button type="button" onClick={() => updateInventory(inventory.filter(({ id }) => id !== entry.id))} className="rounded-lg px-3 py-2 text-xs font-bold text-red-300">Remove</button></div></MoreDetails>; })}{character.equipment.map((item) => <div key={item.id} className="rounded-lg bg-slate-950/45 p-3 text-slate-300">{item.name} ×{item.quantity} <span className="text-xs text-slate-500">legacy item</span></div>)}</div> : <p className="text-slate-500">No equipment in inventory.</p>}</div>;
}

const familiarRules = `Familiar Bond: Your Familiar shares your HP. If you both take damage from the same source, you only take 1 instance of that damage. While your Familiar occupies your Space, it can't be targeted by Attacks.

Shared Telepathy: While within 20 Spaces, you and your Familiar can speak Telepathically with each other.

Spell Delivery: While within 10 Spaces of your Familiar, you cast a Spell with a range of 1 Space as if you were standing in your Familiar's Space.

Pocket Dimension: Spend a Minor Action to dismiss or summon the Familiar. Items it carries are left behind.

Shared Senses: While within 20 Spaces, spend 1 AP to use its senses until the end of your next turn. You are Deafened and Blinded to your own senses for the duration.

Combat: It shares your Initiative and turn. Spend 1 AP to command it to use an Action. It can't take the Attack or Spell Action unless a Familiar Feature allows it. It moves when you take the Move Action; if not commanded, it Dodges at the end of your turn. It shares your Multiple Check Penalty.`;

const summonRules = `The summon shares your Initiative and acts on your turn. You can command it to take available Actions or Reactions other than Sustain, using its own AP. When you take the Move Action, it also gains the Move Action. If you don't command it, it takes the Dodge Action.

The summon shares your Prime Modifier and Combat Mastery, so its Attack, Martial, and Spell Checks match yours. Standard summoned creatures have Shared Telepathy within 20 Spaces and a Natural Weapon that deals 1 damage; record the creature-specific type, languages, defenses, and added Summon Traits below.`;

function companionAttributes(character: Character, source: string): Record<DC20Attribute, number> {
  const pm = character.primeModifier;
  if (source === 'Summon Beast' || source === 'Summon Construct' || source === 'Summon Plant') return { Might: pm, Agility: 2, Charisma: -2, Intelligence: -2 };
  if (source === 'Summon Celestial' || source === 'Summon Fiend') return { Might: -1, Agility: -1, Charisma: pm, Intelligence: 0 };
  if (source === 'Summon Aberration') return { Might: -1, Agility: 0, Charisma: -1, Intelligence: pm };
  if (source === 'Summon Dragon') return { Might: pm, Agility: -2, Charisma: 1, Intelligence: -1 };
  if (source === 'Summon Undead') return { Might: pm, Agility: 1, Charisma: -1, Intelligence: -2 };
  if (source === 'Summon Ooze') return { Might: 1, Agility: pm, Charisma: -1, Intelligence: -2 };
  return { Might: 0, Agility: 0, Charisma: 0, Intelligence: 0 };
}

function createCompanion(character: Character, kind: CharacterCompanionKind, spell?: Spell): CharacterCompanion {
  const source = spell?.name ?? (kind === 'Familiar' ? 'Call Familiar' : kind === 'Summon' ? 'Summoning Spell' : 'Player Companion');
  const familiar = source === 'Call Familiar' || kind === 'Familiar';
  const summon = !familiar && kind === 'Summon';
  const defense = familiar ? 8 + character.combatMastery : summon ? 8 + character.combatMastery + character.primeModifier : 8;
  const maxHP = familiar ? character.maxHealthPoints : summon ? 3 : 1;
  const spellRules = spell ? `${spell.description}${spell.enhancements ? `\n\nSpell Enhancements\n${spell.enhancements}` : ''}` : '';
  return {
    id: generateUUID(),
    name: familiar ? 'My Familiar' : summon ? source.replace(/^Summon /, '') : 'New Pet',
    kind: familiar ? 'Familiar' : kind,
    source,
    size: familiar ? 'Tiny' : summon ? 'Small or Medium' : 'Medium',
    currentHP: familiar ? character.healthPoints : maxHP,
    maxHP,
    sharesHealthWithCharacter: familiar,
    currentAP: familiar ? character.currentAP : summon ? 2 : 2,
    maxAP: familiar ? character.maxAP : 2,
    physicalDefense: defense,
    areaDefense: defense,
    speed: source === 'Summon Beast' ? 7 : 5,
    primeModifier: familiar || summon ? character.primeModifier : 0,
    combatMastery: familiar || summon ? character.combatMastery : 0,
    attackCheck: familiar || summon ? character.primeModifier + character.combatMastery : 0,
    saveDC: familiar || summon ? 10 + character.primeModifier + character.combatMastery : 10,
    attributes: companionAttributes(character, source),
    features: [familiar ? familiarRules : summon ? summonRules : '', spellRules].filter(Boolean).join('\n\nSource Spell\n'),
    notes: '',
  };
}

function CompanionSheet({ character, companion, onChange, onRemove }: { character: Character; companion: CharacterCompanion; onChange: (values: Partial<CharacterCompanion>) => void; onRemove: () => void }) {
  const hp = companion.sharesHealthWithCharacter ? character.healthPoints : companion.currentHP;
  const maxHP = companion.sharesHealthWithCharacter ? character.maxHealthPoints : companion.maxHP;
  const changeHP = (value: number) => companion.sharesHealthWithCharacter
    ? onChange({ currentHP: Math.min(character.maxHealthPoints, Math.max(0, value)) })
    : onChange({ currentHP: Math.min(companion.maxHP, Math.max(0, value)) });
  return <details open className="group rounded-2xl border border-emerald-400/20 bg-slate-950/50 p-4 sm:p-5"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><span><span className="font-black text-emerald-100">{companion.name || 'Unnamed Companion'}</span><span className="mt-1 block text-xs text-slate-500">{companion.kind} • {companion.source} • {companion.size}</span></span><span className="text-xs font-black text-emerald-300 group-open:hidden">Open sheet</span><span className="hidden text-xs font-black text-emerald-300 group-open:inline">Collapse sheet</span></summary><div className="mt-4 border-t border-white/5 pt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-slate-400">Name<input value={companion.name} onChange={(event) => onChange({ name: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-slate-400">Kind<select value={companion.kind} onChange={(event) => onChange({ kind: event.target.value as CharacterCompanionKind })} className={`${fieldClass} mt-1`}><option>Familiar</option><option>Summon</option><option>Pet</option></select></label><label className="text-xs font-bold text-slate-400">Source<input value={companion.source} onChange={(event) => onChange({ source: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-slate-400">Size<input value={companion.size} onChange={(event) => onChange({ size: event.target.value })} className={`${fieldClass} mt-1`} /></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-red-400/15 bg-red-950/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-red-300">Health {companion.sharesHealthWithCharacter ? '• shared' : ''}</div><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => changeHP(hp - 1)} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-red-100">{hp} / {maxHP}</span><button type="button" onClick={() => changeHP(hp + 1)} className="h-8 w-8 rounded bg-red-800">+</button></div><label className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400"><input type="checkbox" checked={companion.sharesHealthWithCharacter} onChange={(event) => onChange({ sharesHealthWithCharacter: event.target.checked, currentHP: event.target.checked ? character.healthPoints : companion.currentHP, maxHP: event.target.checked ? character.maxHealthPoints : companion.maxHP })} />Share character HP</label></div><div className="rounded-xl bg-slate-900/65 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Action Points</div><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => onChange({ currentAP: Math.max(0, companion.currentAP - 1) })} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-violet-100">{companion.currentAP} / {companion.maxAP}</span><button type="button" onClick={() => onChange({ currentAP: Math.min(companion.maxAP, companion.currentAP + 1) })} className="h-8 w-8 rounded bg-violet-800">+</button></div></div>{([['PD', 'physicalDefense'], ['AD', 'areaDefense'], ['Speed', 'speed'], ['Attack Check', 'attackCheck'], ['Save DC', 'saveDC'], ['Prime Modifier', 'primeModifier'], ['Combat Mastery', 'combatMastery']] as const).map(([label, key]) => <label key={key} className="rounded-xl bg-slate-900/65 p-3 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}<input type="number" value={companion[key]} onChange={(event) => onChange({ [key]: Number(event.target.value) })} className={`${fieldClass} mt-2 text-base font-black normal-case tracking-normal`} /></label>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => <label key={attribute} className="text-xs font-bold text-slate-400">{attribute}<input type="number" value={companion.attributes[attribute]} onChange={(event) => onChange({ attributes: { ...companion.attributes, [attribute]: Number(event.target.value) } })} className={`${fieldClass} mt-1`} /></label>)}</div><label className="mt-4 block text-xs font-bold text-slate-400">Features & Summon Traits<textarea rows={9} value={companion.features} onChange={(event) => onChange({ features: event.target.value })} className={`${fieldClass} mt-1`} placeholder="List attacks, traits, actions, immunities, resistances, and spell enhancements…" /></label><label className="mt-3 block text-xs font-bold text-slate-400">Notes<textarea rows={3} value={companion.notes} onChange={(event) => onChange({ notes: event.target.value })} className={`${fieldClass} mt-1`} /></label><button type="button" onClick={onRemove} className="mt-4 rounded-lg px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/10">Remove companion</button></div></details>;
}

function MiscTab({ character, knownSpells, onChange }: { character: Character; knownSpells: Spell[]; onChange: CharacterSheetTabContentProps['onChange'] }) {
  const [selectedSpell, setSelectedSpell] = useState('');
  const build = character.build;
  if (!build) return null;
  const companions = build.sheetCompanions ?? [];
  const summonSpells = knownSpells.filter((spell) => spell.name === 'Call Familiar' || /^Summon /i.test(spell.name) || (spell.tags ?? '').split(',').some((tag) => tag.trim().toLowerCase() === 'summoning'));
  const save = (sheetCompanions: CharacterCompanion[], characterValues: Partial<Character> = {}) => onChange({ ...characterValues, build: { ...build, sheetCompanions } });
  const add = (kind: CharacterCompanionKind, spell?: Spell) => save([...companions, createCompanion(character, kind, spell)]);
  const update = (id: string, values: Partial<CharacterCompanion>) => {
    const companion = companions.find((entry) => entry.id === id);
    if (!companion) return;
    const next = companions.map((entry) => entry.id === id ? { ...entry, ...values } : entry);
    const characterValues = companion.sharesHealthWithCharacter && values.currentHP !== undefined ? { healthPoints: values.currentHP } : {};
    save(next, characterValues);
  };
  return <div className="space-y-5"><section className={panelClass}><SectionHeading eyebrow="Miscellaneous" title="Pets & Summons" tone="text-emerald-300" /><p className="mt-2 text-sm leading-6 text-slate-400">Create persistent stat sheets for familiars, summoned creatures, and pets. Known summoning powers prefill the shared DC20 statistics and source text; every field stays editable for enhancements and table rulings.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"><select value={selectedSpell} onChange={(event) => setSelectedSpell(event.target.value)} className={fieldClass}><option value="">Choose a known familiar or summon…</option>{summonSpells.map((spell) => <option key={spell.id} value={spell.name}>{spell.name}</option>)}</select><button type="button" disabled={!selectedSpell} onClick={() => { const spell = summonSpells.find(({ name }) => name === selectedSpell); if (spell) add(spell.name === 'Call Familiar' ? 'Familiar' : 'Summon', spell); }} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-35">Add from Power</button><button type="button" onClick={() => add('Summon')} className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-black text-white">+ Custom Summon</button><button type="button" onClick={() => add('Pet')} className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-black text-white">+ Pet</button></div>{summonSpells.length === 0 && <p className="mt-3 text-xs text-amber-200">This character does not currently know Call Familiar or a Summoning spell. Custom summons and pets remain available.</p>}</section>{companions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">No companions tracked yet.</div> : <div className="space-y-4">{companions.map((companion) => <CompanionSheet key={companion.id} character={character} companion={companion} onChange={(values) => update(companion.id, values)} onRemove={() => save(companions.filter(({ id }) => id !== companion.id))} />)}</div>}</div>;
}

export function CharacterSheetTabContent(props: CharacterSheetTabContentProps) {
  const { character, classReference, reference, equipmentCatalog } = props;
  if (!classReference) return <p className="text-sm text-amber-200">Class reference data is unavailable for this character.</p>;
  const selectedTraits = selectedAncestryTraits(character, reference?.ancestryTraits ?? []);
  const training = characterCombatTraining(character, classReference, reference?.ancestryTraits ?? []);
  const modifiers = equippedCombatModifiers(character, equipmentCatalog, classReference, reference?.ancestryTraits ?? []);
  if (props.tab === 'sheet-checks') return <ChecksTab character={character} reference={reference} equipmentCatalog={equipmentCatalog} equipmentModifiers={modifiers} selectedTraits={selectedTraits} onRoll={props.onRoll} />;
  if (props.tab === 'sheet-combat') return <CombatTab character={character} training={training} modifiers={modifiers} equipmentCatalog={equipmentCatalog} knownSpells={props.knownSpells} knownManeuvers={props.knownManeuvers} grantedSpells={props.grantedSpells} grantedManeuvers={props.grantedManeuvers} ancestryGrantedSpells={props.ancestryGrantedSpells} selectedTraits={selectedTraits} onChange={props.onChange} onRoll={props.onRoll} />;
  if (props.tab === 'sheet-features') return <FeaturesTab character={character} classReference={classReference} reference={reference} selectedTraits={selectedTraits} training={training} />;
  if (props.tab === 'sheet-misc') return <MiscTab character={character} knownSpells={props.knownSpells} onChange={props.onChange} />;
  return <><CustomEquipmentLibraryEditor /><EquipmentTab character={character} equipmentCatalog={equipmentCatalog} onChange={props.onChange} onRoll={props.onRoll} /></>;
}
