import type {
  Character,
  CharacterReferenceData,
  ClassFeatureReference,
  ClassReference,
  RuleReferenceEntry,
} from '../types/models';

export const GENERAL_TALENT_NAMES = [
  'Ancestry Increase',
  'Attribute Increase',
  'Skill Increase',
  'Martial Expansion',
  'Spellcasting Expansion',
] as const;

export type MulticlassTalentName =
  | 'Novice Multiclass'
  | 'Adept Multiclass'
  | 'Expert Multiclass'
  | 'Master Multiclass';

export type TalentCategory = 'General' | 'Class' | 'Multiclass';

export interface TalentDefinition {
  name: string;
  description: string;
  minimumLevel: number;
  isRepeatable: boolean;
  category: TalentCategory;
  className?: string;
  requirements: string[];
}

export interface OwnedClassFeature {
  className: string;
  name: string;
  description: string;
  level: number;
  subclass?: string;
  isFlavor: boolean;
  source: 'Class' | MulticlassTalentName | 'Multiclass Flavor';
}

export interface MulticlassTalentOption {
  id: string;
  className: string;
  title: string;
  description: string;
  grantedFeatures: OwnedClassFeature[];
}

export interface TalentEligibility {
  available: boolean;
  reason: string;
}

export const MULTICLASS_SELECTION_KEYS: Record<MulticlassTalentName, string> = {
  'Novice Multiclass': 'multiclass.novice',
  'Adept Multiclass': 'multiclass.adept',
  'Expert Multiclass': 'multiclass.expert',
  'Master Multiclass': 'multiclass.master',
};

export function isMulticlassTalentName(name: string): name is MulticlassTalentName {
  return Object.hasOwn(MULTICLASS_SELECTION_KEYS, name);
}

const MULTICLASS_TALENTS: TalentDefinition[] = [
  {
    name: 'Novice Multiclass',
    description: 'You can take this Talent multiple times\n\nYou gain a Level 1 Class Feature from any Class.',
    minimumLevel: 1,
    isRepeatable: true,
    category: 'Multiclass',
    requirements: [],
  },
  {
    name: 'Adept Multiclass',
    description: 'Requirement: Level 4\n\nYou can take this Talent multiple times\n\nYou gain the Level 2 Class Feature of any Class.',
    minimumLevel: 4,
    isRepeatable: true,
    category: 'Multiclass',
    requirements: ['Level 4'],
  },
  {
    name: 'Expert Multiclass',
    description: 'Requirement: Level 6\n\nYou can take this Talent multiple times\n\nYou gain 1 of the following from a Class that you have at least 1 Class Feature from:\n• Its Level 5 Class Expert Feature.\n• The Level 3 Subclass Feature and Flavor Feature of one of its Subclasses.\n\nDC Tip: You may not gain the full benefit of a Level 3 or 5 Feature gained in this way if you don’t have the Features that it upgrades.',
    minimumLevel: 6,
    isRepeatable: true,
    category: 'Multiclass',
    requirements: ['Level 6', 'At least 1 Class Feature from the chosen Class'],
  },
  {
    name: 'Master Multiclass',
    description: 'Requirement: Level 8\n\nYou can take this Talent multiple times\n\nYou gain the Level 7 Subclass Expert Feature of a Subclass you have the Level 3 Subclass Feature from.',
    minimumLevel: 8,
    isRepeatable: true,
    category: 'Multiclass',
    requirements: ['Level 8', 'The chosen Subclass’s Level 3 Feature'],
  },
];

const CLASS_TALENT_REQUIREMENTS: Record<string, string[]> = {
  'Unfathomable Strength': ['Rage'],
  'Expanded Repertoire': ['Remarkable Repertoire'],
  'Helping Hands': ['Font of Inspiration'],
  "Champion's Resolve": ['Adaptive Tactics'],
  'Disciplined Combatant': ['Fighting Spirit'],
  'Expanded Order': ['Cleric Order'],
  'Bountiful Blessings': ['Divine Blessing'],
  'Divine Cleanse': ['Channel Divinity'],
  'Seize Momentum': ['Commander’s Call', 'Commanding Aura'],
  'Coordinated Command': ['Commander’s Call'],
  'Wild Form Expansion': ['Wild Form'],
  'Nature’s Vortex': ['Nature’s Torrent'],
  'Expanded Terrains': ['Favored Terrain'],
  'Pack Leader': ['Hunter’s Mark'],
  'Big Game Hunter': ['Hunter’s Mark'],
  'Expanded Stances': ['Monk Stance'],
  'Internal Damage': [],
  'Steel Fist': ['Monk Training'],
  'Unseen Ambusher': ['Debilitating Strike'],
  'Sinister Shot': ['Cheap Shot'],
  'Expanded Meta Magic': ['Meta Magic'],
  'Greater Innate Power': ['Innate Power'],
  'Font of Magic': ['Meta Magic'],
  'Expanded Disciplines': ['Spellblade Disciplines'],
  'Sling-Blade': ['Bound Weapon', 'Spellstrike'],
  'Adaptive Bond': ['Bound Weapon'],
  'Creature Specialist': ['Bonded Summons'],
  'Horde Summoner': ['Bonded Summons'],
  'Grand Entrance': ['Personal Demiplane'],
  'Reverse Summoning': ['Personal Demiplane'],
  'Expanded Boon': ['Pact Boon'],
  'Pact Bane': ['Pact Boon'],
  'Warlock Subcontract': ['Warlock Contract'],
  'Expanded Spell School': ['Spell School Initiate'],
  'Crowned Sigil': ['Arcane Sigil'],
  'Overly Prepared Spellcaster': ['Prepared Spell', 'Spell School Initiate'],
};

const CLASS_TALENT_NAMES: Record<string, readonly string[]> = {
  Barbarian: ['Unfathomable Strength'],
  Bard: ['Expanded Repertoire', 'Helping Hands'],
  Champion: ["Champion's Resolve", 'Disciplined Combatant'],
  Cleric: ['Expanded Order', 'Bountiful Blessings', 'Divine Cleanse'],
  Commander: ['Seize Momentum', 'Coordinated Command'],
  Druid: ['Wild Form Expansion', 'Nature’s Vortex'],
  Hunter: ['Expanded Terrains', 'Pack Leader', 'Big Game Hunter'],
  Monk: ['Expanded Stances', 'Internal Damage', 'Steel Fist'],
  Rogue: ['Unseen Ambusher', 'Sinister Shot'],
  Sorcerer: ['Expanded Meta Magic', 'Greater Innate Power', 'Font of Magic'],
  Spellblade: ['Expanded Disciplines', 'Sling-Blade', 'Adaptive Bond'],
  Summoner: ['Creature Specialist', 'Horde Summoner', 'Grand Entrance', 'Reverse Summoning'],
  Warlock: ['Expanded Boon', 'Pact Bane', 'Warlock Subcontract'],
  Wizard: ['Expanded Spell School', 'Crowned Sigil', 'Overly Prepared Spellcaster'],
};

export const TALENT_CLASS_BY_NAME: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(CLASS_TALENT_NAMES).flatMap(([className, talents]) => talents.map((talent) => [talent, className])),
);

const BETA_TALENT_PAGE_BY_CLASS: Readonly<Record<string, number>> = {
  Barbarian: 187, Bard: 187, Champion: 187, Cleric: 187,
  Commander: 188, Druid: 188, Hunter: 188, Monk: 188,
  Rogue: 189, Sorcerer: 189, Spellblade: 189,
  Warlock: 190, Wizard: 190,
};

const ONCE_ONLY_TALENTS = new Set(['Expanded Repertoire', 'Martial Expansion', 'Spellcasting Expansion']);

/** Correct stale RulesReference Talent provenance and searchable metadata at load time. */
export function auditedTalentRuleEntry(entry: RuleReferenceEntry): RuleReferenceEntry {
  if (entry.kind !== 'Talent') return entry;
  const className = TALENT_CLASS_BY_NAME[entry.title];
  const isMulticlass = isMulticlassTalentName(entry.title);
  const isSummoner = className === 'Summoner';
  const page = entry.title === 'Talents & Requirements'
    ? 'Beta 0.10.5 pp.186–191'
    : isMulticlass ? 'Beta 0.10.5 p.191'
      : isSummoner ? 'DC20 Magazine 23 pp.4–5'
        : className ? `Beta 0.10.5 p.${BETA_TALENT_PAGE_BY_CLASS[className]}`
          : 'Beta 0.10.5 p.186';
  const repeatability = entry.title === 'Talents & Requirements'
    ? []
    : [ONCE_ONLY_TALENTS.has(entry.title) ? 'once-only' : 'repeatable'];
  const keywords = Array.from(new Set([
    ...entry.keywords.split(/\s+/).filter(Boolean),
    ...repeatability,
    ...(className ? [className.toLowerCase(), 'class-talent'] : []),
    ...(isMulticlass ? ['multiclass'] : []),
    ...(CLASS_TALENT_REQUIREMENTS[entry.title] ?? []).flatMap((requirement) => requirement.toLowerCase().split(/\s+/)),
  ])).join(' ');
  return { ...entry, page, keywords, characterClass: className };
}

const GENERIC_CLASS_ENTRIES = new Set([
  'Talent',
  'Path Progression',
  'Ancestry Points',
  'Subclass',
  'Subclass Expert Feature',
  'Class Capstone Feature',
  'Subclass Capstone Feature',
  'Epic Boon',
  'Subclass Feature — Not Yet Developed',
  'Class Feature — Not Yet Developed',
  'Class Capstone Feature — Not Yet Developed',
  'Subclass Capstone Feature — Not Yet Developed',
]);

export function isFlavorFeature(name: string): boolean {
  return /\bFlavor(?: Feature)?\b/i.test(name);
}

function featureRecord(
  className: string,
  feature: ClassFeatureReference,
  level: number,
  source: OwnedClassFeature['source'],
  subclass?: string,
): OwnedClassFeature {
  return {
    className,
    name: feature.name,
    description: feature.description,
    level,
    subclass,
    isFlavor: isFlavorFeature(feature.name),
    source,
  };
}

function classLevelFeatures(reference: ClassReference, level: number): ClassFeatureReference[] {
  return reference.features.find((entry) => entry.level === level)?.features
    .filter((feature) => !GENERIC_CLASS_ENTRIES.has(feature.name)) ?? [];
}

function subclassLevelFeatures(reference: ClassReference, subclass: string, level: number): ClassFeatureReference[] {
  return (reference.subclassFeatures[subclass] ?? []).filter((feature) => feature.level === level);
}

function rawChoiceGrants(choice: string, reference: CharacterReferenceData): OwnedClassFeature[] {
  const [kind, className, detail] = choice.split('|');
  const classReference = reference.classes.find(({ name }) => name === className);
  if (!classReference) return [];
  if (kind === 'novice') {
    return classLevelFeatures(classReference, 1)
      .filter(({ name }) => name === detail && !isFlavorFeature(name))
      .map((feature) => featureRecord(className, feature, 1, 'Novice Multiclass'));
  }
  if (kind === 'adept') {
    return classLevelFeatures(classReference, 2)
      .filter(({ name }) => name === detail && !isFlavorFeature(name))
      .map((feature) => featureRecord(className, feature, 2, 'Adept Multiclass'));
  }
  if (kind === 'expert-class') {
    return classLevelFeatures(classReference, 5)
      .filter(({ name }) => name === detail)
      .map((feature) => featureRecord(className, feature, 5, 'Expert Multiclass'));
  }
  if (kind === 'expert-subclass') {
    return subclassLevelFeatures(classReference, detail, 3)
      .map((feature) => featureRecord(className, feature, 3, 'Expert Multiclass', detail));
  }
  if (kind === 'master-subclass') {
    return subclassLevelFeatures(classReference, detail, 7)
      .map((feature) => featureRecord(className, feature, 7, 'Master Multiclass', detail));
  }
  return [];
}

export function selectedMulticlassChoiceIDs(
  character: Pick<Character, 'build'>,
  talentName: MulticlassTalentName,
): string[] {
  const count = (character.build?.selectedTalents ?? []).filter((name) => name === talentName).length;
  return (character.build?.classFeatureSelections?.[MULTICLASS_SELECTION_KEYS[talentName]] ?? []).slice(0, count);
}

/** Class-restricted Talent slots granted by the Paragon subclass through Multiclass Talents. */
export function multiclassParagonTalentSlotClasses(
  character: Pick<Character, 'level' | 'build'>,
): string[] {
  const classes: string[] = [];
  if (character.level >= 6) {
    for (const choice of selectedMulticlassChoiceIDs(character, 'Expert Multiclass')) {
      const [kind, className, subclass] = choice.split('|');
      if (kind === 'expert-subclass' && subclass === 'Paragon') classes.push(className);
    }
  }
  if (character.level >= 8) {
    for (const choice of selectedMulticlassChoiceIDs(character, 'Master Multiclass')) {
      const [kind, className, subclass] = choice.split('|');
      if (kind === 'master-subclass' && subclass === 'Paragon') classes.push(className);
    }
  }
  return classes;
}

export function hasAnyMulticlassSubclass(
  character: Pick<Character, 'build'>,
  subclass: string,
  tier: 'Expert' | 'Master' = 'Expert',
): boolean {
  return multiclassSubclassCount(character, subclass, tier) > 0;
}

export function multiclassSubclassCount(
  character: Pick<Character, 'build'>,
  subclass: string,
  tier: 'Expert' | 'Master' = 'Expert',
): number {
  const talent = tier === 'Expert' ? 'Expert Multiclass' : 'Master Multiclass';
  const kind = tier === 'Expert' ? 'expert-subclass' : 'master-subclass';
  return selectedMulticlassChoiceIDs(character, talent).filter((choice) => {
    const [selectedKind, , selectedSubclass] = choice.split('|');
    return selectedKind === kind && selectedSubclass === subclass;
  }).length;
}

/** Fast feature check for calculation paths that do not load the complete reference catalog. */
export function hasDirectMulticlassFeature(
  character: Pick<Character, 'build'>,
  className: string,
  featureName: string,
): boolean {
  return Object.values(MULTICLASS_SELECTION_KEYS).some((key) => (
    (character.build?.classFeatureSelections?.[key] ?? []).some((choice) => {
      const [kind, selectedClass, detail] = choice.split('|');
      return selectedClass === className
        && ['novice', 'adept', 'expert-class'].includes(kind)
        && detail === featureName;
    })
  ));
}

/** Two different foreign Class Features automatically grant that Class’s Flavor Feature. */
export function hasAutomaticMulticlassFlavor(
  character: Pick<Character, 'build'>,
  className: string,
): boolean {
  const direct = new Set(Object.values(MULTICLASS_SELECTION_KEYS).flatMap((key) => (
    character.build?.classFeatureSelections?.[key] ?? []
  )).flatMap((choice) => {
    const [kind, selectedClass, detail] = choice.split('|');
    if (selectedClass !== className) return [];
    if (['novice', 'adept', 'expert-class'].includes(kind)) return [`${kind}|${detail}`];
    return [];
  }));
  return direct.size >= 2;
}

export function hasMulticlassSubclass(
  character: Pick<Character, 'build'>,
  className: string,
  subclass: string,
  tier: 'Expert' | 'Master' = 'Expert',
): boolean {
  const key = tier === 'Expert' ? MULTICLASS_SELECTION_KEYS['Expert Multiclass'] : MULTICLASS_SELECTION_KEYS['Master Multiclass'];
  const kind = tier === 'Expert' ? 'expert-subclass' : 'master-subclass';
  return (character.build?.classFeatureSelections?.[key] ?? []).includes(`${kind}|${className}|${subclass}`);
}

/** Every Class Feature actually owned, including explicit and automatic multiclass Flavor Features. */
export function ownedClassFeatures(
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
  reference: CharacterReferenceData,
): OwnedClassFeature[] {
  const owned: OwnedClassFeature[] = [];
  const nativeClass = reference.classes.find(({ name }) => name === character.class);
  if (nativeClass) {
    for (const entry of nativeClass.features.filter(({ level }) => level <= character.level)) {
      for (const feature of entry.features.filter(({ name }) => !GENERIC_CLASS_ENTRIES.has(name))) {
        owned.push(featureRecord(nativeClass.name, feature, entry.level, 'Class'));
      }
    }
    if (character.subclass) {
      for (const feature of (nativeClass.subclassFeatures[character.subclass] ?? [])
        .filter((candidate) => candidate.level === undefined || candidate.level <= character.level)) {
        owned.push(featureRecord(nativeClass.name, feature, feature.level ?? 3, 'Class', character.subclass));
      }
    }
  }

  for (const talent of MULTICLASS_TALENTS.map(({ name }) => name as MulticlassTalentName)) {
    for (const choice of selectedMulticlassChoiceIDs(character, talent)) {
      owned.push(...rawChoiceGrants(choice, reference));
    }
  }

  const directForeign = owned.filter(({ className, isFlavor, source }) => (
    className !== character.class && !isFlavor && source !== 'Multiclass Flavor'
  ));
  for (const classReference of reference.classes) {
    const uniqueFeatures = new Set(directForeign
      .filter(({ className, subclass }) => className === classReference.name && !subclass)
      .map(({ name }) => name));
    if (uniqueFeatures.size < 2) continue;
    for (const flavor of classLevelFeatures(classReference, 1).filter(({ name }) => isFlavorFeature(name))) {
      owned.push(featureRecord(classReference.name, flavor, 1, 'Multiclass Flavor'));
    }
  }

  return owned.filter((feature, index, all) => all.findIndex((candidate) => (
    candidate.className === feature.className
    && candidate.name === feature.name
    && candidate.subclass === feature.subclass
  )) === index);
}

export function hasClassFeature(
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
  className: string,
  featureName: string,
  reference: CharacterReferenceData,
): boolean {
  return ownedClassFeatures(character, reference).some((feature) => (
    feature.className === className && feature.name === featureName
  ));
}

export function talentDefinitions(reference: CharacterReferenceData): TalentDefinition[] {
  const generalNames = new Set<string>(GENERAL_TALENT_NAMES);
  const firstClass = reference.classes[0];
  const general = GENERAL_TALENT_NAMES.flatMap((name) => {
    const talent = firstClass?.talents.find((candidate) => candidate.name === name);
    return talent ? [{ ...talent, category: 'General' as const, requirements: [] }] : [];
  });
  const classTalents = reference.classes.flatMap((classReference) => classReference.talents
    .filter(({ name }) => !generalNames.has(name))
    .map((talent) => ({
      ...talent,
      category: 'Class' as const,
      className: classReference.name,
      requirements: CLASS_TALENT_REQUIREMENTS[talent.name] ?? [],
    })));
  return [...general, ...classTalents, ...MULTICLASS_TALENTS];
}

export function talentByName(reference: CharacterReferenceData, name: string): TalentDefinition | undefined {
  return talentDefinitions(reference).find((talent) => talent.name === name);
}

export function talentEligibility(
  talent: TalentDefinition,
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
  reference: CharacterReferenceData,
): TalentEligibility {
  if (character.level < talent.minimumLevel) {
    return { available: false, reason: `Requires Level ${talent.minimumLevel}.` };
  }
  if (talent.category !== 'Class' || !talent.className) return { available: true, reason: '' };
  const owned = ownedClassFeatures(character, reference).filter(({ className }) => className === talent.className);
  if (owned.length === 0) return { available: false, reason: `Requires at least 1 ${talent.className} Class Feature.` };
  if (talent.name === 'Internal Damage' && !owned.some(({ isFlavor }) => !isFlavor)) {
    return { available: false, reason: 'Requires 1 or more Monk Features.' };
  }
  const missing = talent.requirements.filter((requirement) => !owned.some(({ name }) => name === requirement));
  return missing.length > 0
    ? { available: false, reason: `Requires ${missing.join(' and ')}.` }
    : { available: true, reason: '' };
}

function option(
  id: string,
  className: string,
  title: string,
  grantedFeatures: OwnedClassFeature[],
): MulticlassTalentOption {
  return {
    id,
    className,
    title,
    grantedFeatures,
    description: grantedFeatures.map(({ name, description }) => `${name}\n${description}`).join('\n\n'),
  };
}

/** Valid choices for one multiclass Talent copy, with duplicate Features removed. */
export function multiclassTalentOptions(
  talentName: MulticlassTalentName,
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
  reference: CharacterReferenceData,
  currentChoice?: string,
): MulticlassTalentOption[] {
  const owned = ownedClassFeatures(character, reference);
  const ownedKeys = new Set(owned.map(({ className, name, subclass }) => `${className}|${subclass ?? ''}|${name}`));
  const alreadyChosen = new Set(MULTICLASS_TALENTS.flatMap(({ name }) => (
    selectedMulticlassChoiceIDs(character, name as MulticlassTalentName)
  )).filter((choice) => choice !== currentChoice));
  const results: MulticlassTalentOption[] = [];

  for (const classReference of reference.classes.filter(({ name }) => name !== character.class)) {
    if (talentName === 'Novice Multiclass' || talentName === 'Adept Multiclass') {
      const level = talentName === 'Novice Multiclass' ? 1 : 2;
      const kind = talentName === 'Novice Multiclass' ? 'novice' : 'adept';
      for (const feature of classLevelFeatures(classReference, level).filter(({ name }) => !isFlavorFeature(name))) {
        const id = `${kind}|${classReference.name}|${feature.name}`;
        if (alreadyChosen.has(id) || (id !== currentChoice && ownedKeys.has(`${classReference.name}||${feature.name}`))) continue;
        results.push(option(id, classReference.name, `${classReference.name} — ${feature.name}`, [
          featureRecord(classReference.name, feature, level, talentName),
        ]));
      }
    }

    if (talentName === 'Expert Multiclass') {
      if (!owned.some(({ className }) => className === classReference.name)) continue;
      for (const feature of classLevelFeatures(classReference, 5)) {
        const id = `expert-class|${classReference.name}|${feature.name}`;
        if (alreadyChosen.has(id) || (id !== currentChoice && ownedKeys.has(`${classReference.name}||${feature.name}`))) continue;
        results.push(option(id, classReference.name, `${classReference.name} — ${feature.name}`, [
          featureRecord(classReference.name, feature, 5, talentName),
        ]));
      }
      for (const subclass of classReference.subclasses) {
        const features = subclassLevelFeatures(classReference, subclass, 3);
        if (features.length === 0) continue;
        const id = `expert-subclass|${classReference.name}|${subclass}`;
        if (alreadyChosen.has(id) || (id !== currentChoice && features.some((feature) => ownedKeys.has(`${classReference.name}|${subclass}|${feature.name}`)))) continue;
        results.push(option(id, classReference.name, `${classReference.name} — ${subclass} (Level 3)`,
          features.map((feature) => featureRecord(classReference.name, feature, 3, talentName, subclass))));
      }
    }

    if (talentName === 'Master Multiclass') {
      const eligibleSubclasses = new Set(owned
        .filter(({ className, level, subclass, source }) => (
          className === classReference.name && level === 3 && subclass && source === 'Expert Multiclass'
        ))
        .map(({ subclass }) => subclass!));
      for (const subclass of eligibleSubclasses) {
        const features = subclassLevelFeatures(classReference, subclass, 7);
        if (features.length === 0) continue;
        const id = `master-subclass|${classReference.name}|${subclass}`;
        if (alreadyChosen.has(id) || (id !== currentChoice && features.some((feature) => ownedKeys.has(`${classReference.name}|${subclass}|${feature.name}`)))) continue;
        results.push(option(id, classReference.name, `${classReference.name} — ${subclass} (Level 7)`,
          features.map((feature) => featureRecord(classReference.name, feature, 7, talentName, subclass))));
      }
    }
  }

  return results.sort((left, right) => left.title.localeCompare(right.title));
}

export function multiclassChoiceIsValid(
  talentName: MulticlassTalentName,
  choice: string,
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
  reference: CharacterReferenceData,
): boolean {
  return multiclassTalentOptions(talentName, character, reference, choice).some(({ id }) => id === choice);
}
