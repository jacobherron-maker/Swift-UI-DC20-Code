import type {
  CharacterReferenceData,
  EquipmentCatalogItem,
  RuleReferenceEntry,
  RulesReferenceData,
} from '../types/models';
import { auditedTalentRuleEntry, talentDefinitions } from './talentRules';
import type { PowerResolution } from './powerRules';
import {
  ARTIFICER_SOURCE,
  PSION_SUBCLASS_SOURCE,
  artificerInfusions,
  artificerRituals,
  augmentCharacterReference,
} from '../data/supplementalClasses';

export interface AuditedSpellRecord {
  name: string;
  source: string;
  school: string;
  tags: string;
  cost: string;
  range: string;
  duration: string;
  page: number;
  resolution: PowerResolution;
  alternateResolutions?: PowerResolution[];
  reaction: boolean;
  sourceNote?: string;
  description: string;
  enhancements: string;
}

export interface AuditedManeuverRecord {
  name: string;
  category: string;
  cost: string;
  range: string;
  requirements: string;
  page: number;
  resolution: PowerResolution;
  alternateResolutions?: PowerResolution[];
  reaction: boolean;
  sourceNote?: string;
  description: string;
  enhancements: string;
}

const BETA_SOURCE = 'DC20 RPG Beta 0.10.5';
const PSION_SOURCE = 'DC20 Magazine 01 — Psion v2';
const SUMMONER_SOURCE = 'DC20 Magazine 23 — The Summoner v1.0';

export const AUDITED_SECTION_RANGES: RulesReferenceData['sections'] = [
  { name: 'Core Rules', pageRange: 'Beta 0.10.5 pp.9–39' },
  { name: 'Combat Rules', pageRange: 'Beta 0.10.5 pp.40–150' },
  { name: 'General Rules', pageRange: 'Beta 0.10.5 pp.151–180' },
  { name: 'Character Creation Rules', pageRange: 'Beta 0.10.5 pp.181–206' },
  { name: 'Classes', pageRange: 'Beta 0.10.5 pp.207–267 + supplements' },
];

/** Printed page references verified against the PDF, not PDF-file indices. */
const PAGE_BY_TITLE: Readonly<Record<string, string>> = {
  'Core Rules Overview': 'Beta 0.10.5 pp.9–39',
  Attributes: 'Beta 0.10.5 pp.10–11',
  'Prime Modifier': 'Beta 0.10.5 p.12',
  Skills: 'Beta 0.10.5 pp.12–14',
  Trades: 'Beta 0.10.5 pp.15–18',
  Languages: 'Beta 0.10.5 p.19',
  'Mastery & Training': 'Beta 0.10.5 pp.20–23',
  'Skill Mastery': 'Beta 0.10.5 pp.20–21',
  'Trade Mastery & Point Conversion': 'Beta 0.10.5 pp.21–22',
  'Language Mastery & Point Conversion': 'Beta 0.10.5 pp.22–23',
  'Combat Mastery & Combat Training': 'Beta 0.10.5 p.23',
  'Checks & Saves': 'Beta 0.10.5 pp.24–29',
  'Check Formulas': 'Beta 0.10.5 pp.25–26',
  'Saves, Save Categories, & Save DC': 'Beta 0.10.5 pp.27–28',
  'Dynamic Attack Saves': 'Beta 0.10.5 p.28',
  'Checks Against Defenses, Saves, and DCs': 'Beta 0.10.5 p.29',
  'Advantage & Disadvantage': 'Beta 0.10.5 p.30',
  'Multiple Check Penalty': 'Beta 0.10.5 p.31',
  'Critical Outcomes & Degrees of Success': 'Beta 0.10.5 pp.31–32',
  'Attacks & Attack Ranges': 'Beta 0.10.5 p.33',
  'Precision Defense & Area Defense': 'Beta 0.10.5 p.34',
  'Health, Temporary HP, & Thresholds': 'Beta 0.10.5 pp.34–35',
  'Death’s Door & Death Saves': 'Beta 0.10.5 p.35',
  'Damage, Heavy Hits, & Critical Hits': 'Beta 0.10.5 p.36',
  'Damage Types, Resistance, & Damage Reduction': 'Beta 0.10.5 pp.37–39',

  'Combat Rules Overview': 'Beta 0.10.5 pp.40–150',
  'Action Points': 'Beta 0.10.5 p.41',
  'Mana Points & Mana Spend Limit': 'Beta 0.10.5 p.41',
  'Stamina Points & Stamina Spend Limit': 'Beta 0.10.5 p.42',
  'Grit Points': 'Beta 0.10.5 p.42',
  'Actions & Minor Actions': 'Beta 0.10.5 p.43',
  'Offensive Actions': 'Beta 0.10.5 p.43',
  'Defensive Actions': 'Beta 0.10.5 p.44',
  'Utility Actions': 'Beta 0.10.5 p.44',
  'Skill-Based Actions': 'Beta 0.10.5 pp.45–46',
  'Held Actions': 'Beta 0.10.5 p.46',
  Reactions: 'Beta 0.10.5 p.47',
  'Opportunity Attacks': 'Beta 0.10.5 p.47',
  'Spell Duels': 'Beta 0.10.5 pp.47–48, 66',
  Maneuvers: 'Beta 0.10.5 pp.49–51',
  Spellcasting: 'Beta 0.10.5 pp.60–61',
  'Spell Sources, Schools, & Tags': 'Beta 0.10.5 pp.62–65',
  'Combo Spellcasting & Wild Magic': 'Beta 0.10.5 pp.66–67',
  'Starting Combat & Encounter DC': 'Beta 0.10.5 p.146',
  'Alternating Initiative': 'Beta 0.10.5 pp.147–150',

  'General Rules Overview': 'Beta 0.10.5 pp.151–180',
  'Spaces, Distance, & Difficult Terrain': 'Beta 0.10.5 p.152',
  Jumping: 'Beta 0.10.5 p.152',
  Falling: 'Beta 0.10.5 p.153',
  'Climbing & Swimming': 'Beta 0.10.5 p.153',
  'Holding Breath & Suffocating': 'Beta 0.10.5 p.154',
  'Line of Sight, Cover, & Concealment': 'Beta 0.10.5 p.155',
  'Illumination & Special Vision': 'Beta 0.10.5 pp.155–156',
  'Areas of Effect': 'Beta 0.10.5 pp.157–159',
  'Creature Sizes & Grappling': 'Beta 0.10.5 p.160',
  'Moving Through Creatures, Collision, & Throwing': 'Beta 0.10.5 pp.161–162',
  'Improvised, Unarmed, & Natural Weapons': 'Beta 0.10.5 p.162',
  'Non-Lethal Attacks, Dual Wielding, & Flanking': 'Beta 0.10.5 p.162',
  'Prone, Hidden Creatures, & Underwater Combat': 'Beta 0.10.5 p.163',
  'Equipment Rules': 'Beta 0.10.5 pp.164–172',
  Weapons: 'Beta 0.10.5 pp.164–168',
  'Spell Focuses': 'Beta 0.10.5 p.169',
  Armor: 'Beta 0.10.5 p.170',
  Shields: 'Beta 0.10.5 p.171',
  'Adventuring Supplies': 'Beta 0.10.5 p.172',
  'Trade Tools': 'Beta 0.10.5 pp.15–26',
  'Condition Rules': 'Beta 0.10.5 pp.173–176',
  Resting: 'Beta 0.10.5 p.177',
  'Setting Difficulty Classes': 'Beta 0.10.5 pp.178–179',
  'Degrees, Complications, & Failing Forward': 'Beta 0.10.5 p.179',

  'Character Creation Overview': 'Beta 0.10.5 pp.181–185',
  'Step 1: Attributes & Prime Modifier': 'Beta 0.10.5 p.182',
  'Step 2: Save Masteries': 'Beta 0.10.5 p.182',
  'Step 3: Background': 'Beta 0.10.5 pp.182–183',
  'Step 4: Health Points': 'Beta 0.10.5 p.183',
  'Step 5: Stamina & Mana': 'Beta 0.10.5 p.183',
  'Step 6: Defenses': 'Beta 0.10.5 p.183',
  'Step 7: Combat Modifiers': 'Beta 0.10.5 p.183',
  'Step 8: Ancestry': 'Beta 0.10.5 pp.184, 194–196',
  'Step 9: Class': 'Beta 0.10.5 p.184',
  'Step 10: Weapons & Inventory': 'Beta 0.10.5 p.184',
  'Player Character Progression': 'Beta 0.10.5 p.185',
  'Character Paths': 'Beta 0.10.5 p.192',
  'Paragon Subclass': 'Beta 0.10.5 p.192',
  'Ancestry System': 'Beta 0.10.5 pp.194–196',
  'Ancestry Advancement, Refunds, & Variants': 'Beta 0.10.5 p.196',
  'Classes Overview': 'Beta 0.10.5 pp.207–267 + supplements',
};

const CONDITION_PAGE: Readonly<Record<string, number>> = {
  'Bleeding X': 173, Blinded: 173, 'Burning X': 173, Charmed: 173, 'Dazed X': 173,
  Deafened: 173, 'Disoriented X': 173, 'Doomed X': 173, 'Exhaustion X': 173,
  'Exposed X': 173, Frightened: 173, 'Hindered X': 173, Immobilized: 173, 'Impaired X': 173,
  Incapacitated: 174, Intimidated: 174, Invisible: 174, Paralyzed: 174, Petrified: 174,
  Restrained: 174, 'Slowed X': 174, 'Stunned X': 174, Surprised: 174, Taunted: 174,
  Terrified: 174, Tethered: 174, Unconscious: 174, 'Weakened X': 174,
};

const ANCESTRY_PAGE: Readonly<Record<string, string>> = {
  Angelborn: 'Beta 0.10.5 p.202', Beastborn: 'Beta 0.10.5 pp.204–206', Dragonborn: 'Beta 0.10.5 p.200',
  Dwarf: 'Beta 0.10.5 p.198', Elf: 'Beta 0.10.5 p.197', Fiendborn: 'Beta 0.10.5 p.203',
  Giantborn: 'Beta 0.10.5 p.201', Gnome: 'Beta 0.10.5 p.199', Halfling: 'Beta 0.10.5 p.198',
  Human: 'Beta 0.10.5 p.197', Orc: 'Beta 0.10.5 p.199', Psyborn: 'DC20 Magazine 01 — Psion v2 p.5',
};

const FORMULAS: Readonly<Record<string, string[]>> = {
  Attributes: ['Prime Modifier = highest Attribute'],
  'Prime Modifier': ['Prime Modifier = highest Attribute'],
  Skills: ['Skill Check = d20 + associated Attribute + Skill Mastery'],
  Trades: ['Trade Check = d20 + appropriate Attribute + Trade Mastery'],
  'Combat Mastery & Combat Training': ['Combat Mastery = half character level, rounded up'],
  'Check Formulas': [
    'Flat Attribute Check = d20 + Attribute',
    'Attack, Spell, or Martial Check = d20 + Prime Modifier + Combat Mastery',
    'Skill Check = d20 + Attribute + Skill Mastery',
    'Trade Check = d20 + Attribute + Trade Mastery',
    'Language Check = d20 + Intelligence or Charisma',
  ],
  'Saves, Save Categories, & Save DC': [
    'Attribute Save = d20 + Attribute + Combat Mastery',
    'Save DC = 10 + Prime Modifier + Combat Mastery',
  ],
  'Precision Defense & Area Defense': [
    'PD = 8 + Combat Mastery + Agility + Intelligence + bonuses',
    'AD = 8 + Combat Mastery + Might + Charisma + bonuses',
  ],
  'Health, Temporary HP, & Thresholds': [
    'Starting HP = Class HP + Might + Ancestry HP',
    'Death Threshold = 0 − Prime Modifier − Combat Mastery',
  ],
  'Grit Points': ['Maximum Grit = Charisma + 2 (minimum 0)'],
  'Mana Points & Mana Spend Limit': ['Mana Spend Limit = Combat Mastery'],
  'Stamina Points & Stamina Spend Limit': ['Stamina Spend Limit = Combat Mastery'],
  Jumping: ['Jump Distance = Agility (minimum 1)'],
  'Holding Breath & Suffocating': ['Breath Duration = Might (minimum 1)'],
  'Step 4: Health Points': ['Starting HP = Class HP + Might + Ancestry HP'],
  'Step 6: Defenses': [
    'PD = 8 + Combat Mastery + Agility + Intelligence + bonuses',
    'AD = 8 + Combat Mastery + Might + Charisma + bonuses',
  ],
  'Step 7: Combat Modifiers': [
    'Attack, Martial, and Spell Check bonus = Prime Modifier + Combat Mastery',
    'Save DC = 10 + Prime Modifier + Combat Mastery',
    'Death Threshold = 0 − Prime Modifier − Combat Mastery',
  ],
};

const TEXT_OVERRIDES: Readonly<Record<string, string>> = {
  'Condition Rules': `CONDITION RESISTANCE, IMMUNITY, & VULNERABILITY
Condition Resistance: You have ADV on Checks and Saves against the Condition.
Condition Immunity: You can’t be subjected to the Condition.
Condition Vulnerability: You have DisADV on Checks and Saves against the Condition.

CONDITION STACKING
A target can be affected by a Condition with an X value multiple times. If you gain multiple stacks of the same Condition, you add their X values together. If a stacking Condition doesn’t include an X value, the value equals 1. Track different durations independently so each source ends at the correct time.

OVERLAPPING CONDITIONS
Charmed, Frightened, Restrained, Taunted, Terrified, and Tethered can affect a creature from multiple sources. Their effects overlap as described on pages 175–176 rather than increasing a numerical penalty unless the individual Condition says otherwise.

EXCLUDED CONDITIONS
The following Conditions don’t stack or overlap in any way: Blinded, Deafened, Immobilized, Incapacitated, Invisible, Paralyzed, Petrified, Surprised, and Unconscious.`,
  Invisible: 'Creatures can’t see you unless they have the ability to see the Invisible (see “Unseen” on page 163 for more information).',
};

const RELATED: Readonly<Record<string, string[]>> = {
  Attributes: ['Prime Modifier', 'Check Formulas', 'Step 1: Attributes & Prime Modifier'],
  'Prime Modifier': ['Attributes', 'Check Formulas', 'Saves, Save Categories, & Save DC'],
  Skills: ['Skill Mastery', 'Check Formulas', 'Skill-Based Actions'],
  Trades: ['Trade Mastery & Point Conversion', 'Check Formulas', 'Trade Tools'],
  Languages: ['Language Mastery & Point Conversion', 'Check Formulas'],
  'Mastery & Training': ['Skill Mastery', 'Trade Mastery & Point Conversion', 'Language Mastery & Point Conversion', 'Combat Mastery & Combat Training'],
  'Checks & Saves': ['Check Formulas', 'Saves, Save Categories, & Save DC', 'Advantage & Disadvantage', 'Critical Outcomes & Degrees of Success'],
  'Advantage & Disadvantage': ['Multiple Check Penalty', 'Critical Outcomes & Degrees of Success'],
  'Attacks & Attack Ranges': ['Precision Defense & Area Defense', 'Damage, Heavy Hits, & Critical Hits'],
  'Health, Temporary HP, & Thresholds': ['Death’s Door & Death Saves', 'Resting'],
  'Actions & Minor Actions': ['Offensive Actions', 'Defensive Actions', 'Utility Actions', 'Skill-Based Actions', 'Held Actions', 'Reactions'],
  'Opportunity Attacks': ['Reactions', 'Attacks & Attack Ranges'],
  Maneuvers: ['Stamina Points & Stamina Spend Limit', 'Combat Mastery & Combat Training'],
  Spellcasting: ['Mana Points & Mana Spend Limit', 'Spell Sources, Schools, & Tags', 'Spell Duels'],
  'Starting Combat & Encounter DC': ['Alternating Initiative', 'Advantage & Disadvantage'],
  'Creature Sizes & Grappling': ['Offensive Actions', 'Moving Through Creatures, Collision, & Throwing'],
  'Equipment Rules': ['Weapons', 'Spell Focuses', 'Armor', 'Shields', 'Adventuring Supplies', 'Trade Tools'],
  'Condition Rules': ['Resting'],
  'Character Creation Overview': ['Step 1: Attributes & Prime Modifier', 'Step 3: Background', 'Step 8: Ancestry', 'Step 9: Class', 'Step 10: Weapons & Inventory'],
  'Player Character Progression': ['Character Paths', 'Talents & Requirements', 'Ancestry System'],
  'Character Paths': ['Maneuvers', 'Spellcasting', 'Player Character Progression'],
  'Ancestry System': ['Ancestry Advancement, Refunds, & Variants', 'Step 8: Ancestry'],
};

export type RuleTextBlockKind = 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'callout';

export interface RuleTextBlock {
  kind: RuleTextBlockKind;
  text: string;
}

function looksLikeHeading(line: string): boolean {
  return /^#{1,4}\s+/.test(line)
    || /^LEVEL \d+$/i.test(line)
    || (/^[A-Z0-9][A-Z0-9 ’'&:/—-]+$/.test(line) && line.length <= 90);
}

function looksLikeSubheading(line: string, nextLine = ''): boolean {
  return /^[^.!?]{1,70} — [+-]?\d+ Ancestry Points?$/.test(line)
    || (/^[A-Z][^.!?]{1,64}$/.test(line) && Boolean(nextLine) && !/^(?:Requirement|Properties):/.test(line));
}

/** Converts PDF-derived prose into semantic blocks without changing the source wording. */
export function ruleTextBlocks(text: string): RuleTextBlock[] {
  const lines = text.trim().replace(/\r/g, '').replace(/\s*•\s*/g, '\n• ')
    .split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index): RuleTextBlock => {
    const cleaned = line.replace(/^#{1,4}\s+/, '');
    if (looksLikeHeading(line)) return { kind: 'heading', text: cleaned };
    if (/^(?:DC Tip|Beta Note|Source note):/i.test(line)) return { kind: 'callout', text: line };
    if (/^(?:•|-|\d+\.)\s+/.test(line)) return { kind: 'bullet', text: line.replace(/^(?:•|-|\d+\.)\s+/, '') };
    if (looksLikeSubheading(line, lines[index + 1])) return { kind: 'subheading', text: line };
    return { kind: 'paragraph', text: line };
  });
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function normalizeCitation(value: string): string {
  return value
    .replace(/(pp?\.)\s+/g, '$1')
    .replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

export function sourcePages(page: string): number[] {
  const pages: number[] = [];
  const pattern = /pp?\.\s*(\d+)(?:\s*[–-]\s*(\d+))?((?:\s*,\s*\d+)*)/gi;
  for (const match of page.matchAll(pattern)) {
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    for (let value = start; value <= end; value += 1) pages.push(value);
    pages.push(...match[3].split(',').map((value) => value.trim()).filter(Boolean).map(Number).filter(Number.isFinite));
  }
  return unique(pages);
}

function sourceFor(entry: RuleReferenceEntry): Pick<RuleReferenceEntry, 'sourceDocument' | 'sourceStatus'> {
  if (entry.page.startsWith('Beta 0.10.5')) {
    return { sourceDocument: BETA_SOURCE, sourceStatus: 'Beta source verified' };
  }
  if (entry.page.startsWith('DC20 Magazine 09')) {
    return { sourceDocument: PSION_SUBCLASS_SOURCE, sourceStatus: 'Supplemental source verified' };
  }
  if (entry.page.startsWith('DC20 Magazine 16') || entry.characterClass === 'Artificer') {
    return { sourceDocument: ARTIFICER_SOURCE, sourceStatus: 'Supplemental source verified' };
  }
  if (entry.characterClass === 'Psion' || entry.title === 'Psyborn') {
    return { sourceDocument: PSION_SOURCE, sourceStatus: 'Supplemental source verified' };
  }
  if (entry.characterClass === 'Summoner') {
    return { sourceDocument: SUMMONER_SOURCE, sourceStatus: 'Supplemental source verified' };
  }
  return { sourceDocument: BETA_SOURCE, sourceStatus: 'Beta source verified' };
}

function canonicalAncestryText(name: string, reference: CharacterReferenceData): string | undefined {
  const traits = [...reference.ancestryTraits, ...reference.generalAncestryTraits]
    .filter((trait) => trait.ancestry === name);
  if (traits.length === 0) return undefined;
  const groups = Array.from(new Set(traits.map(({ category }) => category)));
  return groups.map((category) => {
    const entries = traits.filter((trait) => trait.category === category).map((trait) => {
      const cost = `${trait.cost > 0 ? '+' : ''}${trait.cost} Ancestry Point${Math.abs(trait.cost) === 1 ? '' : 's'}`;
      const requirement = trait.prerequisite ? `\nRequirement: ${trait.prerequisite}` : '';
      return `${trait.name} — ${cost}${requirement}\n${trait.description}`;
    });
    return `${category.toUpperCase()} TRAITS\n${entries.join('\n\n')}`;
  }).join('\n\n');
}

function canonicalSubclassText(entry: RuleReferenceEntry, reference: CharacterReferenceData): string | undefined {
  const classRecord = reference.classes.find(({ name }) => name === entry.characterClass);
  const features = classRecord?.subclassFeatures[entry.title] ?? [];
  if (!classRecord || features.length === 0) return undefined;
  return features.map((feature) => {
    const level = feature.level ? `LEVEL ${feature.level}\n` : '';
    return `${level}${feature.name}\n${feature.description}`;
  }).join('\n\n');
}

function canonicalClassText(name: string, reference: CharacterReferenceData): string | undefined {
  const classRecord = reference.classes.find((entry) => entry.name === name);
  if (!classRecord) return undefined;
  const table = [
    classRecord.tableColumns.map((column) => column.toUpperCase()).join(' | '),
    ...classRecord.tableRows.map((row) => classRecord.tableColumns.map((column) => String(row[column as keyof typeof row] ?? '—')).join(' | ')),
  ].join('\n');
  const features = classRecord.features.flatMap((level) => level.features.map((feature) => (
    `LEVEL ${level.level}\n${feature.name}\n${feature.description}`
  ))).join('\n\n');
  return `${classRecord.description}\n\n${classRecord.pathTitle.toUpperCase()}\n${classRecord.pathDetails}\n\nCLASS TABLE\n${table}\n\nCLASS FEATURES\n${features}`;
}

function supplementalRuleEntries(reference: CharacterReferenceData): RuleReferenceEntry[] {
  const base = (
    id: string,
    title: string,
    subsection: string,
    summary: string,
    text: string,
    page: string,
    kind: RuleReferenceEntry['kind'],
    characterClass?: string,
  ): RuleReferenceEntry => ({
    id,
    title,
    section: 'Classes',
    subsection,
    summary,
    text,
    page,
    kind,
    keywords: `${title} ${subsection} ${summary}`,
    characterClass,
  });
  const entries: RuleReferenceEntry[] = [];
  const psion = reference.classes.find(({ name }) => name === 'Psion');
  for (const subclass of ['Oracle', 'Psi-Knight', 'Paragon']) {
    const features = psion?.subclassFeatures[subclass] ?? [];
    if (features.length) entries.push(base(
      `Classes|Psion|${subclass}`,
      subclass,
      'Psion Subclasses',
      features.map(({ name }) => name).join(' • '),
      features.map(({ level, name, description }) => `LEVEL ${level}\n${name}\n${description}`).join('\n\n'),
      'DC20 Magazine 09 p.3',
      'Subclass',
      'Psion',
    ));
  }
  for (const title of ['Greater Telekinesis', 'Psionic Fortress']) {
    const talent = psion?.talents.find(({ name }) => name === title);
    if (talent) entries.push(base(
      `Classes|Psion|Talent|${title}`,
      title,
      'Psion Class Talents',
      `Psion Class Talent • Level ${talent.minimumLevel}+`,
      talent.description,
      'DC20 Magazine 09 p.3',
      'Talent',
      'Psion',
    ));
  }

  const artificer = reference.classes.find(({ name }) => name === 'Artificer');
  if (artificer) {
    entries.push(base(
      'Classes|Artificer|Artificer',
      'Artificer',
      'Artificer Class',
      artificer.summary,
      canonicalClassText('Artificer', reference) ?? artificer.description,
      'DC20 Magazine 16 pp.3–5',
      'Class',
      'Artificer',
    ));
    for (const subclass of artificer.subclasses) {
      entries.push(base(
        `Classes|Artificer|${subclass}`,
        subclass,
        'Artificer Subclasses',
        artificer.subclassFeatures[subclass].map(({ name }) => name).join(' • '),
        artificer.subclassFeatures[subclass].map(({ level, name, description }) => `LEVEL ${level}\n${name}\n${description}`).join('\n\n'),
        subclass === 'Paragon' ? 'Beta 0.10.5 p.192' : subclass === 'Apothecary' ? 'DC20 Magazine 16 p.5' : 'DC20 Magazine 16 p.6',
        'Subclass',
        'Artificer',
      ));
    }
    for (const title of ['Artifice Engine', 'Infusion Conduits']) {
      const talent = artificer.talents.find(({ name }) => name === title);
      if (talent) entries.push(base(
        `Classes|Artificer|Talent|${title}`,
        title,
        'Artificer Class Talents',
        `Artificer Class Talent • Level ${talent.minimumLevel}+`,
        talent.description,
        'DC20 Magazine 16 p.6',
        'Talent',
        'Artificer',
      ));
    }
    for (const ritual of artificerRituals) entries.push(base(
      `Classes|Artificer|Ritual|${ritual.name}`,
      `${ritual.name} (Artificer Ritual)`,
      'Artificer Rituals',
      ritual.description.split('\n')[0],
      ritual.description,
      'DC20 Magazine 16 p.7',
      'Rule',
      'Artificer',
    ));
    for (const property of artificerInfusions) entries.push(base(
      `Classes|Artificer|Infusion|${property.name}`,
      `${property.name} (Artificer Infusion)`,
      'Artificer Infusions & Magic Properties',
      property.description.split('\n').slice(0, 3).join(' • '),
      property.description,
      property.name === 'Spell Bomb' ? 'DC20 Magazine 16 p.9' : 'DC20 Magazine 16 p.8',
      'Rule',
      'Artificer',
    ));
  }
  return entries;
}

function equipmentText(title: string, equipment: EquipmentCatalogItem[]): string | undefined {
  if (title === 'Equipment Rules') return undefined;
  const records = equipment.filter(({ category }) => category === title);
  if (records.length === 0) return undefined;
  return records.map((item) => {
    const properties = item.properties.length ? `\nProperties: ${item.properties.join(', ')}` : '';
    return `${item.name}\n${item.summary}${properties}\n\n${item.mechanics}`;
  }).join('\n\n');
}

function canonicalMasteryEntry(entry: RuleReferenceEntry, reference: CharacterReferenceData): RuleReferenceEntry {
  const catalog = entry.kind === 'Skill' ? reference.skills : entry.kind === 'Trade' ? reference.trades : reference.languages;
  const record = catalog.find(({ name }) => name === entry.title);
  if (!record) return entry;
  const details = entry.kind === 'Skill'
    ? [{ label: 'Associated Attribute', value: record.attribute ?? record.group }, { label: 'Check', value: 'd20 + Attribute + Skill Mastery' }]
    : entry.kind === 'Trade'
      ? [{ label: 'Category', value: record.group }, { label: 'Associated Attribute', value: record.attribute ?? 'Varies' }, { label: 'Required Tool', value: record.tool ?? 'None listed' }]
      : [{ label: 'Category', value: record.group }, { label: 'Typical Speakers', value: record.typicalSpeakers ?? 'Varies' }, { label: 'Fluency', value: 'Limited or Fluent' }];
  const page = entry.kind === 'Skill' ? 'Beta 0.10.5 pp.12–14' : entry.kind === 'Trade' ? 'Beta 0.10.5 pp.15–18' : 'Beta 0.10.5 p.19';
  return {
    ...entry,
    summary: entry.kind === 'Skill' ? `${record.attribute ?? record.group} Skill` : entry.kind === 'Trade' ? `${record.group} Trade` : `${record.group} Language`,
    text: record.description,
    page,
    details,
  };
}

function auditEntry(
  original: RuleReferenceEntry,
  spells: Map<string, AuditedSpellRecord>,
  maneuvers: Map<string, AuditedManeuverRecord>,
  characterReference: CharacterReferenceData,
  equipment: EquipmentCatalogItem[],
): RuleReferenceEntry {
  let entry = auditedTalentRuleEntry(original);
  const spell = entry.kind === 'Spell' ? spells.get(entry.title) : undefined;
  const maneuver = entry.kind === 'Maneuver' ? maneuvers.get(entry.title) : undefined;

  if (spell) {
    entry = {
      ...entry,
      subsection: `Spells — ${spell.school}`,
      summary: `${spell.school} • ${spell.cost} • ${spell.range} • ${spell.duration}`,
      text: `DESCRIPTION\n${spell.description}\n\nENHANCEMENTS\n${spell.enhancements}`,
      page: `Beta 0.10.5 p.${spell.page}`,
      sourceNote: spell.sourceNote,
      details: [
        { label: 'Source', value: spell.source }, { label: 'School', value: spell.school },
        { label: 'Tags', value: spell.tags }, { label: 'Cost', value: spell.cost },
        { label: 'Range', value: spell.range }, { label: 'Duration', value: spell.duration },
        { label: 'Resolution', value: spell.resolution }, { label: 'Timing', value: spell.reaction ? 'Reaction' : 'Action or as described' },
      ],
    };
  } else if (maneuver) {
    entry = {
      ...entry,
      subsection: `Maneuvers — ${maneuver.category}`,
      summary: `${maneuver.category} • ${maneuver.cost} • ${maneuver.range}`,
      text: `DESCRIPTION\n${maneuver.description}\n\nENHANCEMENTS\n${maneuver.enhancements}`,
      page: `Beta 0.10.5 p.${maneuver.page}`,
      sourceNote: maneuver.sourceNote,
      details: [
        { label: 'Category', value: maneuver.category }, { label: 'Cost', value: maneuver.cost },
        { label: 'Range', value: maneuver.range }, { label: 'Requirements', value: maneuver.requirements || 'None' },
        { label: 'Resolution', value: maneuver.resolution }, { label: 'Timing', value: maneuver.reaction ? 'Reaction' : 'Action or as described' },
      ],
    };
  } else if (entry.kind === 'Skill' || entry.kind === 'Trade' || entry.kind === 'Language') {
    entry = canonicalMasteryEntry(entry, characterReference);
  } else if (entry.kind === 'Ancestry' && ANCESTRY_PAGE[entry.title]) {
    entry = {
      ...entry,
      page: ANCESTRY_PAGE[entry.title],
      text: canonicalAncestryText(entry.title, characterReference) ?? entry.text,
      details: [{ label: 'Published Traits', value: String([...characterReference.ancestryTraits, ...characterReference.generalAncestryTraits].filter(({ ancestry }) => ancestry === entry.title).length) }],
    };
  } else if (entry.kind === 'Subclass') {
    const canonical = canonicalSubclassText(entry, characterReference);
    entry = {
      ...entry,
      text: canonical ?? entry.text,
      details: [{ label: 'Class', value: entry.characterClass ?? 'Universal' }, { label: 'Progression', value: 'Levels 3, 7, and 10' }],
    };
  } else if (entry.kind === 'Class') {
    const classRecord = characterReference.classes.find(({ name }) => name === entry.title);
    if (classRecord) entry = {
      ...entry,
      details: [
        { label: 'Path', value: classRecord.path }, { label: 'Level 1 HP', value: String(classRecord.baseHP) },
        { label: 'Level 1 Resources', value: classRecord.levelOneResource },
        { label: 'Published Levels', value: String(classRecord.tableRows.length) },
      ],
    };
  } else if (entry.kind === 'Talent' && entry.title !== 'Talents & Requirements') {
    const talent = talentDefinitions(characterReference).find(({ name }) => name === entry.title);
    if (talent) entry = {
      ...entry,
      text: talent.description,
      details: [
        { label: 'Category', value: talent.category },
        { label: 'Minimum Level', value: String(talent.minimumLevel) },
        { label: 'Repeatable', value: talent.isRepeatable ? 'Yes' : 'No' },
        { label: 'Requirements', value: talent.requirements.join(', ') || 'None' },
      ],
    };
  } else if (entry.kind === 'Equipment') {
    const canonical = equipmentText(entry.title, equipment);
    entry = {
      ...entry,
      text: canonical ?? entry.text,
      details: canonical ? [{ label: 'Catalog Records', value: String(equipment.filter(({ category }) => category === entry.title).length) }] : entry.details,
    };
  }

  const fixedPage = PAGE_BY_TITLE[entry.title];
  if (fixedPage) entry = { ...entry, page: fixedPage };
  if (entry.kind === 'Condition' && entry.title !== 'Condition Rules') {
    const page = CONDITION_PAGE[entry.title];
    if (page) entry = { ...entry, page: `Beta 0.10.5 p.${page}` };
  }
  if (TEXT_OVERRIDES[entry.title]) entry = { ...entry, text: TEXT_OVERRIDES[entry.title] };
  entry = { ...entry, page: normalizeCitation(entry.page) };

  const source = sourceFor(entry);
  const pages = sourcePages(entry.page);
  const formulas = FORMULAS[entry.title];
  const searchableMetadata = [
    entry.keywords, entry.sourceNote, ...(entry.details ?? []).flatMap(({ label, value }) => [label, value]), ...(formulas ?? []),
  ].filter(Boolean).join(' ');
  return {
    ...entry,
    ...source,
    sourcePages: pages.length ? pages : undefined,
    formulas,
    keywords: unique(searchableMetadata.split(/\s+/).filter(Boolean)).join(' '),
  };
}

function addRelationships(entries: RuleReferenceEntry[]): RuleReferenceEntry[] {
  const byTitle = new Map<string, RuleReferenceEntry>();
  for (const entry of entries) if (!byTitle.has(entry.title)) byTitle.set(entry.title, entry);
  const conditions = entries.filter(({ kind }) => kind === 'Condition');

  return entries.map((entry) => {
    const targetTitles = [...(RELATED[entry.title] ?? [])];
    if (entry.kind === 'Spell') targetTitles.push('Spellcasting', 'Spell Sources, Schools, & Tags');
    if (entry.kind === 'Maneuver') targetTitles.push('Maneuvers', 'Stamina Points & Stamina Spend Limit');
    if (entry.kind === 'Skill') targetTitles.push('Skills', 'Skill Mastery', 'Check Formulas');
    if (entry.kind === 'Trade') targetTitles.push('Trades', 'Trade Mastery & Point Conversion', 'Trade Tools');
    if (entry.kind === 'Language') targetTitles.push('Languages', 'Language Mastery & Point Conversion');
    if (entry.kind === 'Condition') targetTitles.push('Condition Rules');
    if (entry.kind === 'Class') targetTitles.push('Character Paths', 'Talents & Requirements', 'Step 9: Class');
    if (entry.kind === 'Subclass') targetTitles.push(entry.characterClass ?? '', 'Paragon Subclass');
    if (entry.kind === 'Ancestry') targetTitles.push('Ancestry System', 'Step 8: Ancestry');
    if (entry.kind === 'Talent') targetTitles.push('Talents & Requirements', ...(entry.characterClass ? [entry.characterClass] : []));

    const haystack = `${entry.summary} ${entry.text}`.toLowerCase();
    for (const condition of conditions) {
      const term = condition.title.replace(/ X$/, '').toLowerCase();
      if (term.length >= 5 && haystack.includes(term)) targetTitles.push(condition.title);
    }
    const relatedIDs = unique(targetTitles)
      .filter((title) => title && title !== entry.title)
      .map((title) => byTitle.get(title)?.id)
      .filter((id): id is string => Boolean(id))
      .slice(0, 10);
    return { ...entry, relatedIDs };
  });
}

export function auditRulesReference(
  document: RulesReferenceData,
  spellCatalog: AuditedSpellRecord[],
  maneuverCatalog: AuditedManeuverRecord[],
  characterReference: CharacterReferenceData,
  equipment: EquipmentCatalogItem[],
): RulesReferenceData {
  const augmentedReference = augmentCharacterReference(characterReference);
  const spells = new Map(spellCatalog.map((entry) => [entry.name, entry]));
  const maneuvers = new Map(maneuverCatalog.map((entry) => [entry.name, entry]));
  const existingIDs = new Set(document.entries.map(({ id }) => id));
  const sourceEntries = [
    ...document.entries,
    ...supplementalRuleEntries(augmentedReference).filter(({ id }) => !existingIDs.has(id)),
  ];
  const entries = sourceEntries.map((entry) => auditEntry(entry, spells, maneuvers, augmentedReference, equipment));
  return {
    ...document,
    source: `${BETA_SOURCE}; ${PSION_SOURCE}; ${PSION_SUBCLASS_SOURCE}; ${SUMMONER_SOURCE}; ${ARTIFICER_SOURCE}`,
    sections: AUDITED_SECTION_RANGES,
    entries: addRelationships(entries),
  };
}
