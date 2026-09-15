import type {
  AncestryTrait,
  Character,
  CharacterInventoryItem,
  ClassReference,
  EquipmentCatalogItem,
} from '../types/models';
import { characterCombatTraining } from './characterRules';
import { addInventoryItem, defensiveEquipmentProfile, equipmentUseCapacity, healingPotionAmount, weaponMechanicalProfile } from './equipmentRules';

export type EquipmentAccessState = 'Equipped' | 'In Inventory' | 'Trained' | 'Untrained' | 'Compatible';
export type EquipmentRangeBucket = 'Melee' | 'Short' | 'Long' | 'Special';
export type EquipmentEffectKind = 'Attack' | 'Defense' | 'Check Bonus' | 'Damage Bonus' | 'Resistance' | 'Healing' | 'Consumable' | 'Utility';

export interface EquipmentAccessResult {
  state: EquipmentAccessState;
  reason: string;
  trained: boolean | null;
  inventoryQuantity: number;
}

export interface EquipmentProvenance {
  sourceDocument: string;
  sourcePage: string;
  status: 'Source verified' | 'User-authored';
  metadataStatus: string;
}

/** Adds a stack without losing its remaining-use pool or portable custom-item snapshot. */
export function addEquipmentQuantity(
  items: CharacterInventoryItem[],
  equipment: EquipmentCatalogItem,
  quantity: number,
): CharacterInventoryItem[] {
  const addedQuantity = Math.max(1, Math.trunc(quantity));
  const stack = items.find(({ equipmentID, isEquipped, isAttuned }) => equipmentID === equipment.id && !isEquipped && !isAttuned);
  const usesPerItem = equipmentUseCapacity(equipment);
  if (stack) return items.map((entry) => entry.id === stack.id ? {
    ...entry,
    quantity: entry.quantity + addedQuantity,
    ...(usesPerItem !== undefined ? { remainingUses: (entry.remainingUses ?? entry.quantity * usesPerItem) + addedQuantity * usesPerItem } : {}),
  } : entry);
  const added = addInventoryItem(items, equipment);
  return added.map((entry, index) => index === added.length - 1 ? {
    ...entry,
    quantity: addedQuantity,
    ...(usesPerItem !== undefined ? { remainingUses: usesPerItem * addedQuantity } : {}),
  } : entry);
}

function inventoryFor(character: Character, item: EquipmentCatalogItem) {
  return (character.inventoryItems ?? []).filter(({ equipmentID }) => equipmentID === item.id);
}

export function equipmentAccessForCharacter(
  character: Character | null,
  item: EquipmentCatalogItem,
  classReference: ClassReference | null,
  ancestryTraits: AncestryTrait[] = [],
): EquipmentAccessResult | null {
  if (!character) return null;
  const inventory = inventoryFor(character, item);
  const quantity = inventory.reduce((sum, entry) => sum + entry.quantity, 0);
  const equipped = inventory.some(({ isEquipped }) => isEquipped);
  const training = classReference ? characterCombatTraining(character, classReference, ancestryTraits) : null;
  let trained: boolean | null = null;
  let trainingReason = 'This carried item has no equipment-training requirement.';
  if (item.category === 'Weapons') {
    trained = Boolean(training?.weaponTraining || training?.pactWeaponTraining);
    trainingReason = trained
      ? 'Weapon Training is active; Weapon Enhancements are available.'
      : 'Weapon Enhancements require Weapon Training.';
  } else if (item.category === 'Spell Focuses' || item.actsAsSpellFocus) {
    trained = Boolean(training?.spellFocusTraining);
    trainingReason = trained
      ? 'Spell Focus Training is active; Focus Properties apply while wielded.'
      : 'Spell Focus Properties require Spell Focus Training.';
  } else if (item.category === 'Armor') {
    const heavy = item.subtype === 'Heavy Armor';
    trained = Boolean(training && (training.pactArmorTraining || (heavy ? training.heavyArmorTraining : training.lightArmorTraining)));
    trainingReason = trained
      ? `${heavy ? 'Heavy' : 'Light'} Armor Training is active.`
      : `Wearing this without ${heavy ? 'Heavy' : 'Light'} Armor Training applies the untrained equipment penalty.`;
  } else if (item.category === 'Shields') {
    const heavy = item.subtype === 'Heavy Shield';
    trained = Boolean(training && (heavy ? training.heavyShieldTraining : training.lightShieldTraining));
    trainingReason = trained
      ? `${heavy ? 'Heavy' : 'Light'} Shield Training is active.`
      : `Using this without ${heavy ? 'Heavy' : 'Light'} Shield Training applies the untrained equipment penalty.`;
  }
  return {
    state: equipped ? 'Equipped' : quantity > 0 ? 'In Inventory' : trained === false ? 'Untrained' : trained === true ? 'Trained' : 'Compatible',
    reason: `${quantity > 0 ? `${quantity} currently in inventory. ` : ''}${trainingReason}`,
    trained,
    inventoryQuantity: quantity,
  };
}

export function equipmentRangeBucket(item: EquipmentCatalogItem): EquipmentRangeBucket {
  const range = weaponMechanicalProfile(item)?.range;
  if (!range) return 'Special';
  const normal = Number(range.split('/')[0]);
  if (!Number.isFinite(normal)) return 'Special';
  if (normal <= 2) return 'Melee';
  if (normal <= 10) return 'Short';
  return 'Long';
}

export function equipmentEffectKinds(item: EquipmentCatalogItem): EquipmentEffectKind[] {
  const effects = new Set<EquipmentEffectKind>();
  const defense = defensiveEquipmentProfile(item);
  const effectText = JSON.stringify([item.equippedEffects ?? {}, item.attunedEffects ?? {}]);
  if (weaponMechanicalProfile(item) || item.category === 'Siege Weapons') effects.add('Attack');
  if (defense.physicalDefense || defense.areaDefense || defense.physicalDamageReduction || defense.elementalDamageReduction || defense.mysticalDamageReduction
    || item.properties.some((property) => ['Guard', 'Protective', 'Warded'].includes(property))) effects.add('Defense');
  if (/CheckBonus|skillBonuses|tradeBonuses|saveBonuses|Mastery/i.test(effectText)) effects.add('Check Bonus');
  if (/DamageBonus|additional \d+ damage|deal \+?\d+ .*damage/i.test(`${effectText} ${item.mechanics}`)) effects.add('Damage Bonus');
  if (/resistances|Resistance/i.test(`${effectText} ${item.mechanics}`)) effects.add('Resistance');
  if (healingPotionAmount(item) > 0 || /regain|restore.+HP/i.test(item.mechanics)) effects.add('Healing');
  if (item.properties.includes('Consumable') || item.charges !== undefined) effects.add('Consumable');
  if (effects.size === 0 || item.category === 'Trade Tools' || item.category === 'Adventuring Supplies') effects.add('Utility');
  return Array.from(effects);
}

export function equipmentProvenance(item: EquipmentCatalogItem, custom = false): EquipmentProvenance {
  if (custom || item.sourcePage === 'Custom Item' || item.sourcePage === 'GM Vault') return {
    sourceDocument: item.sourceDocument || 'Player-created Equipment Library',
    sourcePage: item.sourcePage || 'Not paginated',
    status: 'User-authored',
    metadataStatus: 'Rules text and structured effects were supplied by the creator.',
  };
  const sourceDocument = item.sourceDocument
    || (/^Beta 0\.10\.5/i.test(item.sourcePage) ? 'DC20 RPG Beta 0.10.5'
      : /^DC20 Magazine 27/i.test(item.sourcePage) ? 'DC20 Magazine 27 — Mundane Objects'
        : item.sourcePage.replace(/\s+p(?:p)?\..*$/i, ''));
  const structured = Boolean(item.weaponProfile || item.equippedEffects || item.attunedEffects || item.magicFeatures);
  const metadataStatus = structured
    ? 'Published wording is paired with explicitly audited structured mechanics.'
    : item.category === 'Weapons' || item.category === 'Armor' || item.category === 'Shields' || item.category === 'Spell Focuses'
      ? 'Published wording is unchanged; table-facing statistics are derived from its audited source row.'
      : 'Published wording is unchanged; no inferred passive character bonus is applied.';
  return { sourceDocument, sourcePage: item.sourcePage, status: 'Source verified', metadataStatus };
}

export function equipmentComparisonFacts(item: EquipmentCatalogItem): Record<string, string> {
  const weapon = weaponMechanicalProfile(item);
  const defense = defensiveEquipmentProfile(item);
  const reductions = [defense.physicalDamageReduction && 'PDR', defense.elementalDamageReduction && 'EDR', defense.mysticalDamageReduction && 'MDR'].filter(Boolean).join(', ');
  return {
    Category: item.category,
    Type: item.subtype,
    Slot: item.slot,
    Damage: weapon ? `${weapon.baseDamage} ${weapon.damageTypes.join('/')} damage` : '—',
    Range: weapon?.range ?? '—',
    Defense: defense.physicalDefense || defense.areaDefense ? `+${defense.physicalDefense} PD • +${defense.areaDefense} AD` : '—',
    Reductions: reductions || '—',
    Properties: item.properties.join(', ') || 'None',
    Attunement: item.requiresAttunement ? 'Required' : 'No',
    Uses: item.charges === undefined ? '—' : `${item.charges} ${item.usageLabel ?? 'Charges'}`,
    'Magic Power': item.magicPower === undefined ? '—' : String(item.magicPower),
    Source: equipmentProvenance(item).sourcePage,
  };
}
