import type { CharacterCompanion, CharacterCompanionKind } from '../types/models';

export const FAMILIAR_RULES = `Familiar Bond: Your Familiar shares your HP. If you both take damage from the same source, you only take 1 instance of that damage. While your Familiar occupies your Space, it can't be targeted by Attacks.

Shared Telepathy: While within 20 Spaces, you and your Familiar can speak Telepathically with each other.

Spell Delivery: While within 10 Spaces of your Familiar, you cast a Spell with a range of 1 Space as if you were standing in your Familiar's Space.

Pocket Dimension: Spend a Minor Action to dismiss or summon the Familiar. Items it carries are left behind.

Shared Senses: While within 20 Spaces, spend 1 AP to use its senses until the end of your next turn. You are Deafened and Blinded to your own senses for the duration.

Combat: It shares your Initiative and turn. Spend 1 AP to command it to use an Action. It can't take the Attack or Spell Action unless a Familiar Feature allows it. It moves when you take the Move Action; if not commanded, it Dodges at the end of your turn. It shares your Multiple Check Penalty.`;

export const SUMMON_RULES = `The summon shares your Initiative and acts on your turn. You can command it to take available Actions or Reactions other than Sustain, using its own AP. When you take the Move Action, it also gains the Move Action. If you don't command it, it takes the Dodge Action.

The summon shares your Prime Modifier and Combat Mastery, so its Attack, Martial, and Spell Checks match yours. Standard summoned creatures have Shared Telepathy within 20 Spaces and a Natural Weapon that deals 1 damage; record the creature-specific type, languages, defenses, and added Summon Traits below.`;

export const PET_GUIDANCE = `Pets use their own statistics unless a feature says otherwise. Define how the pet enters Initiative, whether it acts on its owner's turn, what is required to command it, and which Actions and Reactions it can take.

Use the statistics, movement, training, defenses, Traits, Features, Actions, and Reactions below as the pet's complete custom stat sheet. Any special bond or character interaction should be written in the Full Rules Text field.`;

export const COMPANION_KIND_META: Record<CharacterCompanionKind, { icon: string; title: string; summary: string; rules: string }> = {
  Pet: {
    icon: '🐕',
    title: 'Pet',
    summary: 'An independent creature with its own statistics, training, and actions.',
    rules: PET_GUIDANCE,
  },
  Summon: {
    icon: '🜂',
    title: 'Summon',
    summary: 'A conjured creature that can scale its checks from the accepting character.',
    rules: SUMMON_RULES,
  },
  Familiar: {
    icon: '🦉',
    title: 'Familiar',
    summary: 'A bonded helper with shared health, senses, spell delivery, and command rules.',
    rules: FAMILIAR_RULES,
  },
};

export function companionDefaultsForKind(kind: CharacterCompanionKind): Partial<CharacterCompanion> {
  const common: Partial<CharacterCompanion> = {
    kind,
    categoryRules: COMPANION_KIND_META[kind].rules,
    currentRP: kind === 'Pet' ? 1 : 0,
    maxRP: kind === 'Pet' ? 1 : 0,
    speed: 5,
    speedType: 'Ground',
    otherSpeeds: '',
    damage: 1,
    skills: '',
    senses: '',
    languages: '',
    reductions: '',
    resistances: '',
    vulnerabilities: '',
    immunities: '',
    abilities: [],
  };
  if (kind === 'Familiar') return {
    ...common,
    source: 'Call Familiar',
    linkedSpellName: 'Call Familiar',
    creatureType: 'Familiar',
    level: 0,
    size: 'Tiny',
    currentHP: 1,
    maxHP: 1,
    sharesHealthWithCharacter: true,
    currentAP: 0,
    maxAP: 0,
    usesOwnerStats: true,
    actsOnOwnersTurn: true,
    requiresCommand: true,
    canAttack: false,
  };
  if (kind === 'Summon') return {
    ...common,
    source: 'Custom Summoning Spell',
    linkedSpellName: '',
    creatureType: 'Summoned Creature',
    level: 0,
    size: 'Small or Medium',
    currentHP: 3,
    maxHP: 3,
    sharesHealthWithCharacter: false,
    currentAP: 2,
    maxAP: 2,
    usesOwnerStats: true,
    actsOnOwnersTurn: true,
    requiresCommand: true,
    canAttack: true,
  };
  return {
    ...common,
    source: 'GM Vault Pet',
    linkedSpellName: '',
    creatureType: 'Beast',
    level: 0,
    size: 'Medium',
    currentHP: 5,
    maxHP: 5,
    sharesHealthWithCharacter: false,
    currentAP: 2,
    maxAP: 2,
    usesOwnerStats: false,
    actsOnOwnersTurn: false,
    requiresCommand: false,
    canAttack: true,
  };
}

export function companionRulesText(companion: CharacterCompanion): string {
  const abilities = (companion.abilities ?? []).map((ability) => (
    `${ability.kind}: ${ability.name}${ability.cost ? ` (${ability.cost})` : ''}\n${ability.details}`
  ));
  return [companion.categoryRules, companion.features, ...abilities].map((entry) => entry?.trim()).filter(Boolean).join('\n\n');
}
