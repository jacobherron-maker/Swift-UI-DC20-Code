import React, { useMemo, useState } from 'react';
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
import { EquipmentCategoryValues } from '../../types/models';
import {
  ATTRIBUTE_NAMES,
  BARBARIAN_RAGE_STATE,
  ancestryExpertise,
  characterRestPoints,
  characterCombatTraining,
  characterSheetEffects,
  completeCharacterRest,
  equippedCombatModifiers,
  masteryBonus,
  masteryRank,
  masteryTitle,
  resetCharacterTurn,
  selectedAncestryTraits,
} from '../../utils/characterRules';
import {
  addInventoryItem,
  isEquipmentEquippable,
  setInventoryQuantity,
  toggleInventoryEquipped,
} from '../../utils/equipmentRules';
import { generateUUID } from '../../utils/gameUtils';

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

function WeaponAttackCard({ item, modifier, adjustment, damageBonus, trained, onRoll }: {
  item: EquipmentCatalogItem;
  modifier: number;
  adjustment: number;
  damageBonus: number;
  trained: boolean;
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [twoHanded, setTwoHanded] = useState(false);
  const [closeRange, setCloseRange] = useState(false);
  const [concealedDraw, setConcealedDraw] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const versatile = item.properties.includes('Versatile');
  const unwieldy = item.properties.includes('Unwieldy');
  const concealable = item.properties.includes('Concealable');
  const hasAccuracy = item.mechanics.includes('Accuracy — add a d4');
  const displayedModifier = modifier + Number(versatile && twoHanded) * 2;

  const rollAttack = () => {
    const accuracyDie = hasAccuracy && trained && accuracy ? Math.floor(Math.random() * 4) + 1 : 0;
    const situational = adjustment - Number(unwieldy && closeRange) + Number(concealable && concealedDraw);
    onRoll(`${item.name} Martial Attack${accuracyDie ? ` • Accuracy d4: ${accuracyDie}` : ''}`, displayedModifier + accuracyDie, situational);
  };

  return <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-100">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.subtype} • {item.slot}</p></div><div className="text-right"><div className="text-2xl font-black text-amber-200">{displayedModifier >= 0 ? '+' : ''}{displayedModifier}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attack modifier</div></div></div>
    <p className="mt-3 text-sm font-semibold text-violet-100">{item.summary}</p>
    <div className="mt-3 flex flex-wrap gap-1.5">{item.properties.map((property) => <span key={property} className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-200">{property}</span>)}</div>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
      {versatile && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={twoHanded} onChange={(event) => setTwoHanded(event.target.checked)} />Use two hands • +2 Hit</label>}
      {unwieldy && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={closeRange} onChange={(event) => setCloseRange(event.target.checked)} />Target within 1 Space • DisADV</label>}
      {concealable && <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 text-slate-300"><input type="checkbox" checked={concealedDraw} onChange={(event) => setConcealedDraw(event.target.checked)} />First concealed draw • ADV</label>}
      {hasAccuracy && <label className={`flex items-center gap-2 rounded-lg bg-slate-900/70 p-2 ${trained ? 'text-slate-300' : 'text-slate-600'}`}><input type="checkbox" disabled={!trained} checked={accuracy} onChange={(event) => setAccuracy(event.target.checked)} />Accuracy enhancement • add d4</label>}
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider"><span className={`rounded-full px-2 py-1 ${trained ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{trained ? 'Weapon trained' : 'Enhancements unavailable'}</span>{adjustment < 0 && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-200">Untrained gear: {Math.abs(adjustment)}× DisADV</span>}{damageBonus > 0 && <span className="rounded-full bg-orange-500/10 px-2 py-1 text-orange-200">Melee use: +{damageBonus} damage</span>}</div>
    <button type="button" onClick={rollAttack} className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-black text-white">Roll {item.name} Attack</button>
    <div className="mt-3"><MoreDetails title="Weapon mechanics">{item.mechanics}</MoreDetails></div>
  </div>;
}

function ChecksTab({ character, reference, equipmentModifiers, selectedTraits, onRoll }: {
  character: Character;
  reference: CharacterReferenceData | null;
  equipmentModifiers: ReturnType<typeof equippedCombatModifiers>;
  selectedTraits: AncestryTrait[];
  onRoll: CharacterSheetTabContentProps['onRoll'];
}) {
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [tradesOpen, setTradesOpen] = useState(false);
  const build = character.build;
  const expertise = ancestryExpertise(character, selectedTraits);
  const skillModifier = (name: string, mastery: MasteryLevel) => {
    const skill = reference?.skills.find(({ name: candidate }) => candidate === name);
    const attribute = skill?.attribute === 'Prime' ? character.primeModifier : character.attributes[skill?.attribute as DC20Attribute]?.modifier ?? 0;
    return attribute + masteryBonus(masteryTitle(masteryRank(mastery) + (expertise.skills[name] ?? 0)));
  };
  const skillAdjustment = (name: string) => reference?.skills.find(({ name: candidate }) => candidate === name)?.attribute === 'Agility'
    ? equipmentModifiers.agilityCheckDisadvantage : 0;
  const tradeAttributes = (name: string) => (reference?.trades.find(({ name: candidate }) => candidate === name)?.attribute ?? '')
    .split(/, | or /).filter((attribute) => ATTRIBUTE_NAMES.includes(attribute as DC20Attribute));
  const tradeModifier = (name: string, mastery: MasteryLevel) => {
    const attribute = Math.max(0, ...tradeAttributes(name).map((candidate) => character.attributes[candidate as DC20Attribute]?.modifier ?? 0));
    return attribute + masteryBonus(masteryTitle(masteryRank(mastery) + (expertise.trades[name] ?? 0)));
  };
  const tradeAdjustment = (name: string) => {
    const attributes = tradeAttributes(name);
    const best = Math.max(...attributes.map((attribute) => character.attributes[attribute as DC20Attribute]?.modifier ?? -Infinity));
    const nonAgilityTie = attributes.some((attribute) => attribute !== 'Agility' && character.attributes[attribute as DC20Attribute]?.modifier === best);
    return attributes.includes('Agility') && !nonAgilityTie ? equipmentModifiers.agilityCheckDisadvantage : 0;
  };
  const classLanguages = character.class === 'Rogue'
    ? (build?.classFeatureSelections['rogue.language'] ?? []).slice(0, 1)
    : character.class === 'Warlock' && character.subclass === 'Eldritch' ? ['Deep Speech'] : [];
  const languageRows = Array.from(new Set(['Common', ...character.languages, ...classLanguages])).map((name) => ({
    name,
    fluency: name === 'Common' || classLanguages.includes(name) ? 'Fluent' : build?.languageFluencies?.[name] ?? 'Limited',
    group: reference?.languageGroups.find(({ options }) => options.includes(name))?.name ?? 'Other',
  })).sort((left, right) => left.group.localeCompare(right.group) || left.name.localeCompare(right.name));

  return <div className="space-y-5">
    <section className={panelClass}><SectionHeading eyebrow="Background" title={build?.backgroundName || character.background || 'Unnamed Background'} /><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{build?.backgroundStory || 'No background story has been written yet.'}</p></section>
    <section><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><SectionHeading eyebrow="Core Checks" title="Attributes" />{equipmentModifiers.agilityCheckDisadvantage < 0 && <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-200">Heavy gear: {Math.abs(equipmentModifiers.agilityCheckDisadvantage)}× Agility DisADV</span>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = character.attributes[attribute].modifier; const adjustment = attribute === 'Agility' ? equipmentModifiers.agilityCheckDisadvantage : 0; return <button type="button" key={attribute} onClick={() => onRoll(`${attribute} Check`, modifier, adjustment)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-violet-400/40 hover:bg-violet-500/10"><div className="text-xs text-slate-500">{attribute}</div><div className="text-2xl font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</div><div className="text-xs text-violet-300">Roll check</div>{adjustment < 0 && <div className="mt-1 text-[10px] font-bold text-rose-300">{Math.abs(adjustment)}× gear DisADV</div>}</button>; })}</div></section>
    <section><button type="button" onClick={() => setSkillsOpen((open) => !open)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-violet-200"><span>Skills</span><span>{skillsOpen ? 'Collapse' : 'Expand'}</span></button>{skillsOpen && <div className="space-y-5">{(reference?.skillGroups ?? []).map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.skillMasteries[name] ?? 'Untrained'; const modifier = skillModifier(name, mastery); const adjustment = skillAdjustment(name); return <button type="button" key={name} onClick={() => onRoll(`${name} Check`, modifier, adjustment)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-violet-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{mastery} (+{masteryBonus(mastery)})</span></span><span className="font-black text-violet-200">{modifier >= 0 ? '+' : ''}{modifier}</span>{adjustment < 0 && <span className="text-[10px] font-bold text-rose-300">Gear DisADV</span>}</button>; })}</div></div>)}</div>}</section>
    <section><button type="button" onClick={() => setTradesOpen((open) => !open)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-slate-950/55 p-4 font-black text-fuchsia-200"><span>Trades</span><span>{tradesOpen ? 'Collapse' : 'Expand'}</span></button>{tradesOpen && <div className="space-y-5">{(reference?.tradeGroups ?? []).map((group) => <div key={group.name}><h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{group.name}</h3><div className="grid gap-2 md:grid-cols-2">{group.options.map((name) => { const mastery = character.tradeMasteries[name] ?? 'Untrained'; const modifier = tradeModifier(name, mastery); const adjustment = tradeAdjustment(name); const attributes = tradeAttributes(name).join(' or '); return <button type="button" key={name} onClick={() => onRoll(`${name} Trade Check`, modifier, adjustment)} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-left hover:border-fuchsia-400/40"><span><span className="font-bold text-slate-200">{name}</span><span className="ml-2 text-xs text-slate-500">{attributes} • {mastery} (+{masteryBonus(mastery)})</span></span><span className="font-black text-fuchsia-200">{modifier >= 0 ? '+' : ''}{modifier}</span>{adjustment < 0 && <span className="text-[10px] font-bold text-rose-300">Gear DisADV</span>}</button>; })}</div></div>)}</div>}</section>
    <section><SectionHeading eyebrow="Communication" title="Languages" tone="text-emerald-300" /><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{languageRows.map((language) => <div key={language.name} className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><div className="flex items-center justify-between gap-3"><span className="font-black text-slate-100">{language.name}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${language.fluency === 'Fluent' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{language.fluency}</span></div><p className="mt-2 text-xs text-slate-500">{language.group}</p></div>)}</div></section>
  </div>;
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
  const hasShellRetreat = selectedTraits.some(({ name }) => name === 'Shell Retreat');
  const shellRetreatActive = Boolean(hasShellRetreat && build?.sheetFeatureStates['ancestry.shellRetreat.active']);
  const physicalDefense = effects.physicalDefense + Number(shellRetreatActive) * 5;
  const areaDefense = character.arcaneDefense + Number(shellRetreatActive) * 5;
  const speed = shellRetreatActive ? 0 : effects.speed;
  const martialCheck = character.primeModifier + character.combatMastery;
  const spellCheck = martialCheck + modifiers.spellCheckBonus;
  const spellAttack = martialCheck + modifiers.spellAttackBonus;
  const equippedWeapons = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped).flatMap((inventory) => equipmentCatalog.filter(({ id, category }) => id === inventory.equipmentID && category === EquipmentCategoryValues.WEAPONS).map((item) => ({ inventory, item })));
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
  const referenceStats: Array<[string, string | number, number | null]> = [
    ['Physical Defense', physicalDefense, null],
    ['Area Defense', areaDefense, null],
    ['Combat Mastery', `+${character.combatMastery}`, null],
    ['Speed', speed, null],
    ['Martial Check', `${martialCheck >= 0 ? '+' : ''}${martialCheck}`, martialCheck],
    ['Spell Check', `${spellCheck >= 0 ? '+' : ''}${spellCheck}`, spellCheck],
    ['Spell Attack', `${spellAttack >= 0 ? '+' : ''}${spellAttack}`, spellAttack],
    ['Class Save DC', 10 + character.primeModifier + character.combatMastery, null],
    ['Death Threshold', -4, null],
  ];

  return <div className="space-y-5">
    <section className={panelClass}><SectionHeading eyebrow="At a Glance" title="Combat Reference" /><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{referenceStats.map(([label, value, rollModifier]) => rollModifier === null ? <div key={label} className="rounded-lg bg-slate-950/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div>{(label === 'Physical Defense' || label === 'Area Defense') && <div className="mt-1 text-[10px] font-bold text-amber-200">Heavy {Number(value) + 5} • Brutal {Number(value) + 10}</div>}{label === 'Physical Defense' && physicalDefense !== character.physicalDefense && <div className="text-[10px] font-bold text-red-300">Active feature adjustment</div>}{label === 'Area Defense' && areaDefense !== character.arcaneDefense && <div className="text-[10px] font-bold text-red-300">Active feature adjustment</div>}{label === 'Speed' && shellRetreatActive && <div className="text-[10px] font-bold text-rose-300">Shell Retreat: cannot move</div>}</div> : <button type="button" key={label} onClick={() => onRoll(label, rollModifier, label === 'Martial Check' ? 0 : modifiers.attackAndSpellDisadvantage)} className="rounded-lg bg-slate-950/55 p-3 text-left hover:bg-violet-500/10"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black text-slate-100">{value}</div><div className="text-xs font-bold text-violet-300">Roll</div>{label !== 'Martial Check' && modifiers.attackAndSpellDisadvantage < 0 && <div className="text-[10px] font-bold text-rose-300">{Math.abs(modifiers.attackAndSpellDisadvantage)}× gear DisADV</div>}</button>)}</div>{effects.resistances.length > 0 && <div className="mt-3 rounded-lg border border-sky-400/15 bg-sky-500/5 p-2 text-xs text-sky-100"><strong>Active Resistances:</strong> {effects.resistances.join(' • ')}</div>}{shellRetreatActive && <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>Shell Retreat active:</strong> Physical Damage Reduction, Elemental Damage Reduction, ADV on Might Saves; you are Prone, cannot move, have DisADV on Agility Saves, and cannot take Reactions.</div>}{(modifiers.spellCheckBonus > 0 || modifiers.spellAttackBonus > 0 || modifiers.spellAttackDamageBonus > 0) && <div className="mt-3 rounded-lg border border-fuchsia-400/15 bg-fuchsia-500/5 p-2 text-xs text-fuchsia-100"><strong>Equipped Spell Focus:</strong> {[modifiers.spellCheckBonus > 0 ? `+${modifiers.spellCheckBonus} Spell Checks` : '', modifiers.spellAttackBonus > 0 ? `+${modifiers.spellAttackBonus} Spell Attacks` : '', modifiers.spellAttackDamageBonus > 0 ? `+${modifiers.spellAttackDamageBonus} Spell Attack damage` : ''].filter(Boolean).join(' • ')}</div>}</section>
    {hasShellRetreat && <section className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/45 to-slate-950/70 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><SectionHeading eyebrow="Beastborn Trait" title="Shell Retreat" tone="text-emerald-300" /><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Spend 1 AP to retreat into or emerge from your shell. The sheet applies every defense, reduction, save, movement, condition, and reaction effect while active.</p></div><button type="button" disabled={character.currentAP < 1} onClick={toggleShellRetreat} className={`rounded-xl px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35 ${shellRetreatActive ? 'bg-slate-700' : 'bg-emerald-700'}`}>{shellRetreatActive ? 'Come Out • 1 AP' : 'Retreat • 1 AP'}</button></div></section>}
    <section className={panelClass}><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><SectionHeading eyebrow="Equipped Arsenal" title="Weapon Attacks" tone="text-amber-300" /><span className="text-xs text-slate-500">Only equipped weapons appear here.</span></div>{equippedWeapons.length === 0 ? <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Equip a weapon from the Equipment tab to add its attack roll here.</p> : <div className="grid gap-3 lg:grid-cols-2">{equippedWeapons.map(({ inventory, item }) => <WeaponAttackCard key={inventory.id} item={item} modifier={martialCheck} adjustment={modifiers.attackAndSpellDisadvantage} damageBonus={effects.martialMeleeDamageBonus} trained={training.weaponTraining || training.pactWeaponTraining} onRoll={onRoll} />)}</div>}</section>
    <div className="grid gap-5 lg:grid-cols-3"><section className={`${panelClass} lg:col-span-2`}><SectionHeading eyebrow="Resist Effects" title="Saving Throws" tone="text-sky-300" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const modifier = character.attributes[attribute].modifier + character.combatMastery; const adjustment = (attribute === 'Might' ? (effects.saveAdvantage.Might ?? 0) + Number(shellRetreatActive) : 0) - Number(attribute === 'Agility' && shellRetreatActive); return <button type="button" key={attribute} onClick={() => onRoll(`${attribute} Save`, modifier, adjustment)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-sky-400/40"><div className="text-xs text-slate-500">{attribute} Save</div><div className="text-2xl font-black text-sky-200">{modifier >= 0 ? '+' : ''}{modifier}</div>{adjustment > 0 && <div className="text-[10px] font-bold text-orange-300">{adjustment}× ADV active</div>}{adjustment < 0 && <div className="text-[10px] font-bold text-rose-300">{Math.abs(adjustment)}× DisADV active</div>}</button>; })}</div></section><section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-violet-200">Active Conditions</h2><div className="flex gap-2"><select value={conditionToAdd} onChange={(event) => setConditionToAdd(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs">{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select><button type="button" onClick={() => setCondition(conditionToAdd, conditionLevels[conditionToAdd] ?? 1)} className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold">Add</button></div></div><div className="mt-4 space-y-2">{shellRetreatActive && <div className="flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3"><span className="font-bold text-emerald-100">Prone</span><span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Shell Retreat</span></div>}{Object.entries(conditionLevels).length === 0 && !shellRetreatActive ? <p className="text-sm text-slate-500">No active conditions.</p> : Object.entries(conditionLevels).sort().map(([condition, value]) => <div key={condition} className="flex items-center justify-between rounded-lg bg-slate-950/55 p-3"><span className="font-bold text-slate-200">{condition}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setCondition(condition, value - 1)} className="h-7 w-7 rounded bg-slate-800">−</button><span className="min-w-6 text-center font-black text-violet-200">{value}</span><button type="button" onClick={() => setCondition(condition, value + 1)} className="h-7 w-7 rounded bg-slate-800">+</button><button type="button" onClick={() => setCondition(condition, 0)} className="ml-1 text-xs font-bold text-red-300">×</button></div></div>)}</div></section></div>
    <section className={panelClass}><SectionHeading eyebrow="Powers" title="Spells & Maneuvers" tone="text-fuchsia-300" /><p className="mt-1 text-sm text-slate-500">Open only the list you need during combat.</p><div className="mt-4 space-y-3"><details className="group rounded-xl border border-fuchsia-400/15 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between"><span className="font-black text-fuchsia-200">Spells</span><span className="text-xs font-bold text-fuchsia-200">{knownSpells.length} • <span className="group-open:hidden">Expand</span><span className="hidden group-open:inline">Collapse</span></span></summary><div className="mt-3 space-y-2">{knownSpells.length === 0 ? <p className="text-sm text-slate-500">No spells known.</p> : knownSpells.map((spell) => { const usesAttack = /Spell Attack/i.test(spell.description); const ancestryGrant = ancestryGrantedSpells.find(({ name }) => name === spell.name); return <MoreDetails key={spell.id} title={spell.name} subtitle={[spell.source, spell.school, spell.cost, spell.range, ancestryGrant ? `Ancestry • ${ancestryGrant.traitName}` : grantedSpells.includes(spell.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{spell.description}{spell.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{spell.enhancements}</p></>}<button type="button" onClick={() => onRoll(`${spell.name} ${usesAttack ? 'Spell Attack' : 'Spell Check'}`, usesAttack ? spellAttack : spellCheck, modifiers.attackAndSpellDisadvantage)} className="mt-4 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white">Roll {usesAttack ? 'Spell Attack' : 'Spell Check'}{usesAttack && modifiers.spellAttackDamageBonus > 0 ? ` • +${modifiers.spellAttackDamageBonus} damage` : ''}</button></MoreDetails>; })}</div></details><details className="group rounded-xl border border-violet-400/15 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between"><span className="font-black text-violet-200">Maneuvers</span><span className="text-xs font-bold text-violet-200">{knownManeuvers.length} • <span className="group-open:hidden">Expand</span><span className="hidden group-open:inline">Collapse</span></span></summary><div className="mt-3 space-y-2">{knownManeuvers.length === 0 ? <p className="text-sm text-slate-500">No maneuvers known.</p> : knownManeuvers.map((maneuver) => <MoreDetails key={maneuver.id} title={maneuver.name} subtitle={[maneuver.category ?? maneuver.type, maneuver.cost, maneuver.range, grantedManeuvers.includes(maneuver.name) ? 'Granted by class feature' : ''].filter(Boolean).join(' • ')}>{maneuver.description}{maneuver.enhancements && <><h4 className="mt-4 font-black text-slate-300">Enhancements</h4><p>{maneuver.enhancements}</p></>}</MoreDetails>)}</div></details></div></section>
  </div>;
}

function FeaturesTab({ character, classReference, selectedTraits, training }: {
  character: Character;
  classReference?: ClassReference;
  selectedTraits: AncestryTrait[];
  training: ReturnType<typeof characterCombatTraining>;
}) {
  const build = character.build;
  const featureDescription = (name: string, description: string) => {
    const selections = (classReference?.choiceGroups ?? []).filter((group) => group.feature === name)
      .flatMap((group) => (build?.classFeatureSelections[group.id] ?? []).map((choice) => `${group.title}: ${choice}`));
    return selections.length > 0 ? `${description}\n\nSelected Options\n• ${selections.join('\n• ')}` : description;
  };
  const talents = Object.entries((build?.selectedTalents ?? []).reduce<Record<string, number>>((counts, name) => ({ ...counts, [name]: (counts[name] ?? 0) + 1 }), {}));
  const classFeatures = classReference?.features.filter(({ level }) => level <= character.level) ?? [];
  return <div className="grid gap-5 lg:grid-cols-3"><section className={`${panelClass} lg:col-span-3`}><SectionHeading eyebrow="Proficiencies" title="Combat Training" tone="text-amber-300" /><div className="mt-3 flex flex-wrap gap-2">{training.categories.length === 0 ? <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400">No combat training recorded</span> : training.categories.map((entry) => <span key={entry} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-100">{entry}</span>)}</div>{classReference?.pathDetails && <div className="mt-3"><MoreDetails title="Class Path & Training Rules" subtitle={character.class}>{classReference.pathDetails}</MoreDetails></div>}</section><section><h2 className="mb-3 font-black text-violet-200">Class Features</h2><div className="space-y-3">{classFeatures.map((entry) => <div key={entry.level}><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Level {entry.level}</h3><div className="space-y-2">{entry.features.map((feature) => <MoreDetails key={`${entry.level}-${feature.name}`} title={feature.name}>{featureDescription(feature.name, feature.description)}</MoreDetails>)}</div></div>)}{character.subclass && (classReference?.subclassFeatures[character.subclass] ?? []).filter((feature) => feature.level === undefined || feature.level <= character.level).map((feature) => <MoreDetails key={`subclass-${feature.name}`} title={feature.name} subtitle={`${character.subclass}${feature.level !== undefined ? ` • Level ${feature.level}` : ''}`}>{featureDescription(feature.name, feature.description)}</MoreDetails>)}</div></section><section><h2 className="mb-3 font-black text-fuchsia-200">Talents</h2><div className="space-y-2">{talents.length === 0 ? <p className="text-slate-500">No talents selected.</p> : talents.map(([name, count]) => { const talent = classReference?.talents.find(({ name: candidate }) => candidate === name); return <MoreDetails key={name} title={`${name}${count > 1 ? ` ×${count}` : ''}`}>{featureDescription(name, talent?.description ?? 'Talent details are unavailable.')}</MoreDetails>; })}</div></section><section><h2 className="mb-3 font-black text-emerald-200">Ancestry Traits</h2><div className="space-y-2">{selectedTraits.length === 0 ? <p className="text-slate-500">No ancestry traits selected.</p> : selectedTraits.map((trait) => <MoreDetails key={trait.id} title={trait.name} subtitle={`${trait.ancestry} • ${trait.cost > 0 ? '+' : ''}${trait.cost} AP`}>{trait.description}{build?.ancestryTraitChoices[trait.id]?.length ? `\n\nChoice: ${build.ancestryTraitChoices[trait.id].join(', ')}` : ''}</MoreDetails>)}</div></section></div>;
}

function EquipmentTab({ character, equipmentCatalog, onChange }: { character: Character; equipmentCatalog: EquipmentCatalogItem[]; onChange: CharacterSheetTabContentProps['onChange'] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'All'>('All');
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return equipmentCatalog.filter((item) => (category === 'All' || item.category === category) && (!query || [item.name, item.subtype, item.summary, ...item.properties].some((value) => value.toLowerCase().includes(query)))); }, [category, equipmentCatalog, search]);
  const inventory = character.inventoryItems ?? [];
  const updateInventory = (inventoryItems: CharacterInventoryItem[]) => onChange({ inventoryItems });
  const addItem = (item: EquipmentCatalogItem) => { updateInventory(addInventoryItem(inventory, item)); setNotice(`${item.name} added unequipped.`); };
  const ragingUnfathomable = Boolean(character.build?.sheetFeatureStates[BARBARIAN_RAGE_STATE] && character.build?.selectedTalents.includes('Unfathomable Strength'));
  return <div><div className="mb-6"><SectionHeading eyebrow="Carried Gear" title="Inventory & Equipped Gear" /><p className="mt-1 text-sm text-slate-500">Add items here or from the main Equipment directory. New items enter your inventory unequipped; armor and hand limits are enforced when equipping.</p></div><details className="group mb-6 rounded-2xl border border-violet-400/20 bg-slate-950/45 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="font-black text-violet-100">+ Add Equipment</span><span className="text-xs font-bold text-violet-300 group-open:hidden">Open catalog</span><span className="hidden text-xs font-bold text-violet-300 group-open:inline">Close catalog</span></summary><div className="mt-4 border-t border-white/5 pt-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Search names, types, properties, or uses…" /><select value={category} onChange={(event) => setCategory(event.target.value as EquipmentCategory | 'All')} className={fieldClass}><option value="All">All categories</option>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>{notice && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200" role="status">{notice}</p>}<div className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-slate-900/75 p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-slate-100">{item.name}</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.category} • {item.subtype}</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">{item.slot}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{item.summary}</p><button type="button" onClick={() => addItem(item)} className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-600">Add Unequipped</button></div>)}</div>{filtered.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No equipment matches those filters.</p>}</div></details>{inventory.length + character.equipment.length > 0 ? <div className="space-y-2">{inventory.map((entry) => { const item = equipmentCatalog.find(({ id }) => id === entry.equipmentID); if (!item) return <div key={entry.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-amber-200">Missing catalog item: {entry.equipmentID}</div>; return <MoreDetails key={entry.id} title={item.name} subtitle={`${item.category} • ${item.subtype} • ${item.slot}${entry.isEquipped ? ' • Equipped' : ' • Unequipped'}`}><p className="font-semibold text-violet-200">{item.summary}</p><p className="mt-3">{item.mechanics}</p><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => updateInventory(setInventoryQuantity(inventory, entry.id, entry.quantity - 1))} className="h-8 w-8 rounded bg-slate-800">−</button><span className="font-black text-slate-200">Quantity {entry.quantity}</span><button type="button" onClick={() => updateInventory(setInventoryQuantity(inventory, entry.id, entry.quantity + 1))} className="h-8 w-8 rounded bg-slate-800">+</button>{isEquipmentEquippable(item) && <button type="button" onClick={() => updateInventory(toggleInventoryEquipped(inventory, entry.id, equipmentCatalog, { twoHandedWeaponHandCost: ragingUnfathomable ? 1 : 2 }))} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">{entry.isEquipped ? 'Stow' : 'Equip'}</button>}<button type="button" onClick={() => updateInventory(inventory.filter(({ id }) => id !== entry.id))} className="rounded-lg px-3 py-2 text-xs font-bold text-red-300">Remove</button></div></MoreDetails>; })}{character.equipment.map((item) => <div key={item.id} className="rounded-lg bg-slate-950/45 p-3 text-slate-300">{item.name} ×{item.quantity} <span className="text-xs text-slate-500">legacy item</span></div>)}</div> : <p className="text-slate-500">No equipment in inventory.</p>}</div>;
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
  if (props.tab === 'sheet-checks') return <ChecksTab character={character} reference={reference} equipmentModifiers={modifiers} selectedTraits={selectedTraits} onRoll={props.onRoll} />;
  if (props.tab === 'sheet-combat') return <CombatTab character={character} training={training} modifiers={modifiers} equipmentCatalog={equipmentCatalog} knownSpells={props.knownSpells} knownManeuvers={props.knownManeuvers} grantedSpells={props.grantedSpells} grantedManeuvers={props.grantedManeuvers} ancestryGrantedSpells={props.ancestryGrantedSpells} selectedTraits={selectedTraits} onChange={props.onChange} onRoll={props.onRoll} />;
  if (props.tab === 'sheet-features') return <FeaturesTab character={character} classReference={classReference} selectedTraits={selectedTraits} training={training} />;
  if (props.tab === 'sheet-misc') return <MiscTab character={character} knownSpells={props.knownSpells} onChange={props.onChange} />;
  return <EquipmentTab character={character} equipmentCatalog={equipmentCatalog} onChange={props.onChange} />;
}
