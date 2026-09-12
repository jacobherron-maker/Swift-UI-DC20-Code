import type { AncestryTrait, Character, CharacterReferenceData, DC20Attribute, MasteryLevel } from '../types/models';
import {
  ancestryExpertise,
  classTradeExpertise,
  druidWildFormProfile,
  masteryBonus,
  masteryRank,
  masteryTitle,
  MONK_ACTIVE_STANCE,
  MONK_MEDITATION_SKILL,
  MONK_STANCE_ACTIVE,
  skillMasteryCap,
  type EquippedCombatModifiers,
} from './characterRules';

export interface SheetCheckProfile {
  modifier: number;
  adjustment: number;
  effectiveMastery: MasteryLevel;
  attributes: DC20Attribute[];
  magicItemBonusAtCap: number;
  magicItemMasteryIncrease: number;
}

function characterAttributeModifier(character: Character, attribute: DC20Attribute): number {
  const wildForm = druidWildFormProfile(character);
  if (wildForm.active && attribute === 'Might') return wildForm.might;
  if (wildForm.active && attribute === 'Agility') return wildForm.agility;
  return character.attributes[attribute].modifier;
}

export function sheetAttributeCheckProfile(
  character: Character,
  attribute: DC20Attribute,
  equipment: EquippedCombatModifiers,
): Pick<SheetCheckProfile, 'modifier' | 'adjustment'> {
  const wildForm = druidWildFormProfile(character);
  return {
    modifier: characterAttributeModifier(character, attribute) + (wildForm.active ? 0 : equipment.allCheckBonus),
    adjustment: wildForm.active || attribute !== 'Agility' ? 0 : equipment.agilityCheckDisadvantage,
  };
}

export function sheetSkillCheckProfile(
  character: Character,
  name: string,
  reference: CharacterReferenceData | null,
  equipment: EquippedCombatModifiers,
  selectedTraits: AncestryTrait[],
): SheetCheckProfile {
  const wildForm = druidWildFormProfile(character);
  const skill = reference?.skills.find(({ name: candidate }) => candidate === name);
  const attributes = skill?.attribute && skill.attribute !== 'Prime' ? [skill.attribute as DC20Attribute] : [];
  const attributeModifier = skill?.attribute === 'Prime'
    ? character.primeModifier
    : attributes[0] ? characterAttributeModifier(character, attributes[0]) : 0;
  const mastery = character.skillMasteries[name] ?? 'Untrained';
  const baseRank = masteryRank(mastery);
  const cap = skillMasteryCap(character);
  const ancestryIncrease = wildForm.active ? 0 : ancestryExpertise(character, selectedTraits).skills[name] ?? 0;
  const wildFormIncrease = wildForm.active && wildForm.skillMasteries.includes(name) && baseRank < cap ? 1 : 0;
  const meditationSkill = character.class === 'Monk' ? character.build?.sheetFeatureSelections[MONK_MEDITATION_SKILL] : undefined;
  const meditationIncrease = !wildForm.active && meditationSkill === name
    && baseRank + ancestryIncrease + wildFormIncrease < cap ? 1 : 0;
  const magicItemMasteryIncrease = !wildForm.active && baseRank < cap
    ? equipment.skillMasteryIncreases[name] ?? 0 : 0;
  const magicItemBonusAtCap = !wildForm.active && baseRank >= cap
    ? equipment.skillBonusesAtCap[name] ?? 0 : 0;
  const effectiveMastery = masteryTitle(baseRank + ancestryIncrease + wildFormIncrease + meditationIncrease + magicItemMasteryIncrease);
  const monkStance = character.class === 'Monk' && character.build?.sheetFeatureStates[MONK_STANCE_ACTIVE]
    ? character.build.sheetFeatureSelections[MONK_ACTIVE_STANCE] : '';
  const adjustment = Number(wildForm.active && wildForm.skillMasteries.includes(name) && baseRank >= cap)
    + Number(!wildForm.active && monkStance === 'Gazelle Stance' && name === 'Acrobatics')
    + Number(!wildForm.active && skill?.attribute === 'Agility') * equipment.agilityCheckDisadvantage;

  return {
    modifier: attributeModifier + masteryBonus(effectiveMastery) + magicItemBonusAtCap
      + (wildForm.active ? 0 : equipment.allCheckBonus + (equipment.skillBonuses[name] ?? 0)),
    adjustment,
    effectiveMastery,
    attributes,
    magicItemBonusAtCap,
    magicItemMasteryIncrease,
  };
}

export function sheetTradeCheckProfile(
  character: Character,
  name: string,
  reference: CharacterReferenceData | null,
  equipment: EquippedCombatModifiers,
  selectedTraits: AncestryTrait[],
): SheetCheckProfile {
  const wildForm = druidWildFormProfile(character);
  const trade = reference?.trades.find(({ name: candidate }) => candidate === name);
  const attributes = (trade?.attribute ?? '').split(/, | or /)
    .filter((attribute): attribute is DC20Attribute => ['Might', 'Agility', 'Charisma', 'Intelligence'].includes(attribute));
  const attributeValues = attributes.map((attribute) => characterAttributeModifier(character, attribute));
  // A negative associated Attribute remains part of the Check; zero is only the fallback when
  // reference metadata does not name an Attribute.
  const attributeModifier = attributeValues.length > 0 ? Math.max(...attributeValues) : 0;
  const mastery = character.tradeMasteries[name] ?? 'Untrained';
  const ancestryIncrease = wildForm.active ? 0 : ancestryExpertise(character, selectedTraits).trades[name] ?? 0;
  const classIncrease = wildForm.active ? 0 : classTradeExpertise(character)[name] ?? 0;
  const effectiveMastery = masteryTitle(masteryRank(mastery) + Math.max(ancestryIncrease, classIncrease));
  const bestAttribute = attributeValues.length > 0 ? Math.max(...attributeValues) : 0;
  const nonAgilityTie = attributes.some((attribute) => attribute !== 'Agility' && characterAttributeModifier(character, attribute) === bestAttribute);
  const adjustment = !wildForm.active && attributes.includes('Agility') && !nonAgilityTie
    ? equipment.agilityCheckDisadvantage : 0;

  return {
    modifier: attributeModifier + masteryBonus(effectiveMastery)
      + (wildForm.active ? 0 : equipment.allCheckBonus + (equipment.tradeBonuses[name] ?? 0)),
    adjustment,
    effectiveMastery,
    attributes,
    magicItemBonusAtCap: 0,
    magicItemMasteryIncrease: 0,
  };
}
