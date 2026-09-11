import type { RuleReferenceEntry, RulesReferenceData, SemanticRuleReference } from '../types/models';

export const CURRENT_RULES_VERSION = '0.10.5';

export interface RuleAlias {
  text: string;
  caseSensitive?: boolean;
  autoLink?: boolean;
}

export interface RuleRegistryEntry {
  id: string;
  canonicalName: string;
  category: string;
  shortDefinition: string;
  ruleEntryID: string;
  source: string;
  rulesVersion: string;
  sourcePage: string;
  aliases: RuleAlias[];
  relatedIDs: string[];
  ruleReference: RuleReferenceEntry;
  isConcept: boolean;
}

export interface RuleRegistry {
  version: string;
  entries: RuleRegistryEntry[];
  byID: ReadonlyMap<string, RuleRegistryEntry>;
  byRuleEntryID: ReadonlyMap<string, RuleRegistryEntry>;
  aliases: ReadonlyMap<string, Array<{ entry: RuleRegistryEntry; alias: RuleAlias }>>;
  autoAliasPattern: RegExp | null;
}

interface ConceptDefinition {
  id: string;
  name: string;
  targetTitle: string;
  category: string;
  aliases: RuleAlias[];
  related?: string[];
  definition?: string;
}

const exact = (text: string): RuleAlias => ({ text, caseSensitive: true });
const flexible = (text: string): RuleAlias => ({ text });
const explicit = (text: string): RuleAlias => ({ text, autoLink: false });

const CORE_CONCEPTS: ConceptDefinition[] = [
  { id: 'combat.advantage', name: 'Advantage', targetTitle: 'Advantage & Disadvantage', category: 'Check Modifier', aliases: [flexible('Advantage'), exact('ADV')], related: ['combat.disadvantage'], definition: 'For each ADV on a Check or Save, roll 1 additional d20 and use the highest result. ADV and DisADV cancel one-for-one.' },
  { id: 'combat.disadvantage', name: 'Disadvantage', targetTitle: 'Advantage & Disadvantage', category: 'Check Modifier', aliases: [flexible('Disadvantage'), exact('DisADV')], related: ['combat.advantage'], definition: 'For each DisADV on a Check or Save, roll 1 additional d20 and use the lowest result. ADV and DisADV cancel one-for-one.' },
  { id: 'combat.heavyHit', name: 'Heavy Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Heavy Hit'), flexible('Heavy Hits')], related: ['combat.brutalHit', 'combat.criticalHit', 'damage.reduction'], definition: 'An Attack Check that is 5 or more above the target’s Defense is a Heavy Hit and deals +1 damage.' },
  { id: 'combat.brutalHit', name: 'Brutal Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Brutal Hit'), flexible('Brutal Hits')], related: ['combat.heavyHit', 'combat.criticalHit'], definition: 'An Attack Check that is 10 or more above the target’s Defense is a Brutal Hit and deals +2 damage. A Brutal Hit also counts as a Heavy Hit.' },
  { id: 'combat.criticalHit', name: 'Critical Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Critical Hit'), flexible('Critical Hits')], related: ['combat.heavyHit', 'combat.brutalHit', 'check.criticalOutcome'], definition: 'A natural 20 on an Attack is a Critical Hit: it automatically Hits, bypasses Damage Reduction, and deals +2 damage.' },
  { id: 'check.criticalOutcome', name: 'Critical Success & Failure', targetTitle: 'Critical Outcomes & Degrees of Success', category: 'Check Outcome', aliases: [flexible('Critical Success'), flexible('Critical Failure'), flexible('Critical Successes'), flexible('Critical Failures')], related: ['combat.criticalHit'], definition: 'A natural 20 gives a Check or Save a Critical Success, while a natural 1 gives it a Critical Failure. The exact outcome depends on the type of Check or Save.' },
  { id: 'health.deathsDoor', name: 'Death’s Door', targetTitle: 'Death’s Door & Death Saves', category: 'Health', aliases: [flexible('Death’s Door'), flexible("Death's Door")], related: ['health.bloodied', 'health.wellBloodied'], definition: 'When reduced to 0 HP or lower, a PC gains Exhaustion 1. Until restored to at least 1 HP, its current and maximum AP are reduced by 3 and it makes a DC 10 Death Save at the start of each turn.' },
  { id: 'health.bloodied', name: 'Bloodied', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [exact('Bloodied')], related: ['health.wellBloodied', 'health.deathsDoor'], definition: 'A creature is Bloodied while its current HP is equal to or lower than half its maximum HP.' },
  { id: 'health.wellBloodied', name: 'Well-Bloodied', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [flexible('Well-Bloodied'), flexible('Well Bloodied')], related: ['health.bloodied', 'health.deathsDoor'], definition: 'A creature is Well-Bloodied while its current HP is equal to or lower than one-quarter of its maximum HP.' },
  { id: 'health.temporaryHP', name: 'Temporary HP', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [flexible('Temporary HP'), exact('Temp HP')], definition: 'Damage reduces Temporary HP before normal HP. Temporary HP does not stack and normally lasts until it is reduced to 0 or the creature completes a Long Rest.' },

  { id: 'resource.actionPoints', name: 'Action Points', targetTitle: 'Action Points', category: 'Combat Resource', aliases: [flexible('Action Points'), exact('AP')], definition: 'A creature normally has a maximum of 4 AP and spends them on Actions, Reactions, and Enhancements. Spent AP returns at the end of the creature’s turn.' },
  { id: 'resource.staminaPoints', name: 'Stamina Points', targetTitle: 'Stamina Points & Stamina Spend Limit', category: 'Combat Resource', aliases: [flexible('Stamina Points'), exact('SP')], related: ['maneuver.rules'], definition: 'SP fuels martial effects. The Stamina Spend Limit equals Combat Mastery; spent SP returns when Combat ends or after a Short Rest, with additional in-Combat recovery determined by Stamina Regen.' },
  { id: 'resource.manaPoints', name: 'Mana Points', targetTitle: 'Mana Points & Mana Spend Limit', category: 'Combat Resource', aliases: [flexible('Mana Points'), exact('MP')], related: ['spell.spellcasting'], definition: 'MP fuels magical effects. The Mana Spend Limit equals Combat Mastery, and all spent MP returns after a Long Rest.' },
  { id: 'resource.grit', name: 'Grit', targetTitle: 'Grit Points', category: 'Combat Resource', aliases: [exact('Grit'), flexible('Grit Points')], definition: 'Maximum Grit equals 2 + Charisma, to a minimum of 0. Spend Grit to reduce damage from a Hit or gain ADV on a Save before rolling; all spent Grit returns after a Long Rest.' },

  { id: 'action.actions', name: 'Actions', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [exact('Actions')], definition: 'Anything a creature spends Action Points on is an Action. The AP cost and any requirements appear in that Action’s description.' },
  { id: 'action.minor', name: 'Minor Actions', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [flexible('Minor Action'), flexible('Minor Actions')], definition: 'Once per turn, perform up to 2 listed Minor Action tasks without spending AP, with no Action between them. Spend 1 AP to perform another Minor Action that turn.' },
  { id: 'action.move', name: 'Move Action', targetTitle: 'Utility Actions', category: 'Action', aliases: [flexible('Move Action')], definition: 'Spend 1 AP to move up to your Speed in Spaces. You can divide that movement before and after another Action, but can’t end your turn in another creature’s Space.' },
  { id: 'action.help', name: 'Help Action', targetTitle: 'Utility Actions', category: 'Action', aliases: [flexible('Help Action'), flexible('Help Die')], definition: 'Spend 1 AP to grant another creature a d8 Help Die for a declared Attack, Skill Check, or Trade Check. The die lasts until the start of your next turn or until used.' },
  { id: 'action.spell', name: 'Spell Action', targetTitle: 'Utility Actions', category: 'Action', aliases: [flexible('Spell Action')], definition: 'Spend 1 or more AP to cast a Spell you know, and pay any Mana Point requirement listed by that Spell.' },
  { id: 'action.reaction', name: 'Reaction', targetTitle: 'Reactions', category: 'Reaction', aliases: [exact('Reaction'), exact('Reactions')], definition: 'A Reaction is an Action taken during another creature’s turn when its prerequisite and trigger are met. Only 1 Reaction can be taken per Trigger, and it spends the same AP pool.' },
  { id: 'action.opportunityAttack', name: 'Opportunity Attack', targetTitle: 'Opportunity Attacks', category: 'Reaction', aliases: [flexible('Opportunity Attack'), flexible('Opportunity Attacks')], definition: 'A Martial Path creature can spend 1 AP as a Reaction to make a Melee Martial Attack when a visible creature in its Melee Range performs one of the listed provoking actions.' },
  { id: 'action.sustain', name: 'Sustain', targetTitle: 'Utility Actions', category: 'Spell Mechanic', aliases: [exact('Sustain'), exact('Sustained'), exact('Sustaining')], related: ['spell.spellcasting', 'condition.dazed'], definition: 'Spend 1 AP at the start of each turn to Sustain an effect until the start of your next turn. A Sustained effect ends if you become Dazed.' },
  { id: 'spell.concentration', name: 'Concentration', targetTitle: 'Psion', category: 'Supplemental Spell Mechanic', aliases: [explicit('Concentration')], definition: 'Psion v2 refers to maintaining and losing Concentration, but that Beta 0.9 supplement does not provide a complete Concentration rule for DC20 Beta 0.10.5.' },
  { id: 'spell.spellcasting', name: 'Spellcasting', targetTitle: 'Spellcasting', category: 'Spell Mechanic', aliases: [exact('Spellcasting')], definition: 'To cast a known Spell, satisfy its Components and spend its listed AP and MP. Resolve any listed Attack Check or Spell Check against the target’s Defense, the Spell’s DC, or a Contested Check.' },
  { id: 'combat.spellAttack', name: 'Spell Attack', targetTitle: 'Attacks & Attack Ranges', category: 'Attack', aliases: [flexible('Spell Attack'), flexible('Spell Attacks')], related: ['spell.spellcasting'], definition: 'A Spell Attack is an Attack Check made with a Spell or similar ability against a target’s Defense.' },
  { id: 'combat.martialAttack', name: 'Martial Attack', targetTitle: 'Attacks & Attack Ranges', category: 'Attack', aliases: [flexible('Martial Attack'), flexible('Martial Attacks')], related: ['maneuver.rules'], definition: 'A Martial Attack is an Attack Check made with a Weapon or Unarmed Strike against a target’s Defense.' },
  { id: 'combat.meleeAttack', name: 'Melee Attack', targetTitle: 'Attacks & Attack Ranges', category: 'Attack Range', aliases: [flexible('Melee Attack'), flexible('Melee Attacks')], definition: 'A Melee Attack is an Attack with a range of Melee. A creature’s Melee Range is 1 Space unless otherwise stated.' },
  { id: 'combat.rangedAttack', name: 'Ranged Attack', targetTitle: 'Attacks & Attack Ranges', category: 'Attack Range', aliases: [flexible('Ranged Attack'), flexible('Ranged Attacks')], related: ['combat.closeQuarters'], definition: 'A Ranged Attack has a range given in Spaces. Weapon Ranges list normal and long range; Attacks within long range have DisADV, and targets beyond long range cannot be attacked.' },
  { id: 'combat.areaAttack', name: 'Area Attack', targetTitle: 'Attacks & Attack Ranges', category: 'Attack Range', aliases: [flexible('Area Attack'), flexible('Area Attacks')], related: ['combat.areaOfEffect'], definition: 'An Area Attack targets creatures in its specified area, such as a Cone, Line, or Sphere. The Close Quarters penalty does not apply to Area Attacks.' },
  { id: 'combat.closeQuarters', name: 'Close Quarters', targetTitle: 'Attacks & Attack Ranges', category: 'Attack Modifier', aliases: [exact('Close Quarters')], related: ['combat.rangedAttack'], definition: 'You have DisADV on Ranged Attacks while within the Melee Range of at least 1 enemy, unless that enemy is Incapacitated.' },
  { id: 'spell.tags', name: 'Spell Sources, Schools, & Tags', targetTitle: 'Spell Sources, Schools, & Tags', category: 'Spell Mechanic', aliases: [explicit('Spell Tag'), explicit('Spell Tags'), explicit('Spell School'), explicit('Spell Source')], definition: 'A Spell’s Source, School, and Tags classify its magic and determine whether a Class or Feature can learn or interact with it.' },
  { id: 'maneuver.rules', name: 'Maneuvers', targetTitle: 'Maneuvers', category: 'Maneuver', aliases: [exact('Maneuver'), exact('Maneuvers'), flexible('Maneuver Enhancement'), flexible('Maneuver Enhancements')], definition: 'Maneuvers list AP and SP costs, range, requirements, effects, and possible Enhancements. SP spent on one effect cannot exceed the creature’s Stamina Spend Limit.' },

  { id: 'check.formulas', name: 'Checks', targetTitle: 'Check Formulas', category: 'Check', aliases: [explicit('Checks')], definition: 'Flat Checks add an Attribute; Skill and Trade Checks add their associated Attribute and Mastery; Attack, Spell, and Martial Checks add Prime Modifier and Combat Mastery.' },
  { id: 'check.flat', name: 'Flat Attribute Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Flat Attribute Check'), flexible('Flat Attribute Checks'), flexible('Flat Check'), flexible('Flat Checks')], related: ['check.formulas'], definition: 'For a task that does not benefit from Mastery, roll a d20 and add the associated Attribute.' },
  { id: 'check.attack', name: 'Attack Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Attack Check'), flexible('Attack Checks')], related: ['check.formulas'], definition: 'When making an Attack, roll a d20 and add your Prime Modifier and Combat Mastery.' },
  { id: 'check.spell', name: 'Spell Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Spell Check'), flexible('Spell Checks')], related: ['check.formulas', 'spell.spellcasting'], definition: 'When casting a Spell that is not an Attack, or using a Feature that calls for a Spell Check, roll a d20 and add your Prime Modifier and Combat Mastery.' },
  { id: 'check.martial', name: 'Martial Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Martial Check'), flexible('Martial Checks')], related: ['check.formulas', 'maneuver.rules'], definition: 'When using a Maneuver that is not an Attack, or a Feature that calls for a Martial Check, roll a d20 and add your Prime Modifier and Combat Mastery.' },
  { id: 'check.skill', name: 'Skill Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Skill Check'), flexible('Skill Checks')], related: ['check.formulas'], definition: 'For a test of skill, roll a d20 and add the Skill’s associated Attribute and your Skill Mastery in that Skill.' },
  { id: 'check.trade', name: 'Trade Check', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Trade Check'), flexible('Trade Checks')], related: ['check.formulas'], definition: 'For a test of professional expertise, roll a d20 and add the Trade’s associated Attribute and your Trade Mastery in that Trade.' },
  { id: 'check.physical', name: 'Physical Check', targetTitle: 'Check Formulas', category: 'Check Category', aliases: [flexible('Physical Check'), flexible('Physical Checks')], related: ['check.formulas'], definition: 'A Physical Check requires physicality to perform, such as a Might Check, Agility Check, or Martial Check.' },
  { id: 'check.mental', name: 'Mental Check', targetTitle: 'Check Formulas', category: 'Check Category', aliases: [flexible('Mental Check'), flexible('Mental Checks')], related: ['check.formulas'], definition: 'A Mental Check requires focus to perform, such as a Charisma Check, Intelligence Check, or Spell Check.' },
  { id: 'save.rules', name: 'Saves', targetTitle: 'Saves, Save Categories, & Save DC', category: 'Save', aliases: [flexible('Physical Save'), flexible('Physical Saves'), flexible('Mental Save'), flexible('Mental Saves'), flexible('Might Save'), flexible('Agility Save'), flexible('Charisma Save'), flexible('Intelligence Save'), flexible('Save DC')], related: ['combat.dynamicAttackSave'], definition: 'An Attribute Save is d20 + Attribute + Combat Mastery. Physical Saves use the better Might or Agility bonus; Mental Saves use the better Charisma or Intelligence bonus. Save DC equals 10 + Prime Modifier + Combat Mastery.' },
  { id: 'combat.dynamicAttackSave', name: 'Dynamic Attack Save', targetTitle: 'Dynamic Attack Saves', category: 'Save', aliases: [flexible('Dynamic Attack Save'), flexible('Dynamic Attack Saves')], related: ['save.rules'], definition: 'When a feature both deals damage and imposes an effect, the provoking creature makes its Attack or Spell Check while the target makes its Save. Compare the Check to Defense for damage and the Save to Save DC for the effect.' },
  { id: 'combat.multipleCheckPenalty', name: 'Multiple Check Penalty', targetTitle: 'Multiple Check Penalty', category: 'Check', aliases: [flexible('Multiple Check Penalty'), exact('MCP')], definition: 'During your turn in Combat, each repeated Check of the same type gains stacking DisADV: the second attempt has DisADV 1, the third DisADV 2, and so on.' },

  { id: 'defense.precisionDefense', name: 'Precision Defense', targetTitle: 'Precision Defense & Area Defense', category: 'Defense', aliases: [flexible('Precision Defense'), exact('PD')], related: ['defense.areaDefense'], definition: 'PD measures the ability to avoid precise attacks. PD = 8 + Combat Mastery + Agility + Intelligence + bonuses.' },
  { id: 'defense.areaDefense', name: 'Area Defense', targetTitle: 'Precision Defense & Area Defense', category: 'Defense', aliases: [flexible('Area Defense'), exact('AD')], related: ['defense.precisionDefense'], definition: 'AD measures the ability to withstand attacks that cover an area. AD = 8 + Combat Mastery + Might + Charisma + bonuses.' },
  { id: 'condition.resistance', name: 'Condition Resistance', targetTitle: 'Condition Rules', category: 'Condition Defense', aliases: [flexible('Condition Resistance')], related: ['condition.immunity', 'condition.vulnerability'], definition: 'Condition Resistance grants ADV on Checks and Saves against the specified Condition.' },
  { id: 'condition.immunity', name: 'Condition Immunity', targetTitle: 'Condition Rules', category: 'Condition Defense', aliases: [flexible('Condition Immunity')], related: ['condition.resistance', 'condition.vulnerability'], definition: 'Condition Immunity prevents the creature from being subjected to the specified Condition.' },
  { id: 'condition.vulnerability', name: 'Condition Vulnerability', targetTitle: 'Condition Rules', category: 'Condition Defense', aliases: [flexible('Condition Vulnerability')], related: ['condition.resistance', 'condition.immunity'], definition: 'Condition Vulnerability imposes DisADV on Checks and Saves against the specified Condition.' },
  { id: 'damage.resistance', name: 'Damage Resistance', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Resistance'), flexible('Damage Resistance'), flexible('Resistance Half'), flexible('Resistance (Half)')], related: ['damage.vulnerability', 'damage.immunity', 'damage.reduction'], definition: 'Damage Resistance (X) reduces damage of the specified type by X. Damage Resistance (Half) halves that damage, rounded up, with a minimum of 1 damage reduced.' },
  { id: 'damage.vulnerability', name: 'Damage Vulnerability', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Vulnerability'), flexible('Damage Vulnerability'), flexible('Vulnerability Double'), flexible('Vulnerability (Double)')], related: ['damage.resistance', 'damage.immunity'], definition: 'Damage Vulnerability (X) increases damage of the specified type by X. Damage Vulnerability (Double) doubles that damage, to a minimum of 1 damage taken.' },
  { id: 'damage.immunity', name: 'Damage Immunity', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Immunity'), explicit('Immune'), flexible('Damage Immunity')], related: ['damage.resistance', 'damage.vulnerability'], definition: 'Damage Immunity reduces damage of the specified type to 0.' },
  { id: 'damage.reduction', name: 'Damage Reduction', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [flexible('Damage Reduction'), exact('DR'), exact('PDR'), exact('EDR'), exact('MDR')], related: ['damage.resistance', 'combat.heavyHit', 'combat.criticalHit'], definition: 'Damage Reduction grants Damage Resistance (Half) against Attacks, except Heavy Hits, Brutal Hits, and Critical Hits. PDR, EDR, and MDR protect against their corresponding damage categories.' },
  { id: 'damage.types', name: 'Damage Types', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Bludgeoning'), explicit('Piercing'), explicit('Slashing'), explicit('Cold'), explicit('Corrosion'), explicit('Fire'), explicit('Lightning'), explicit('Poison'), explicit('Psychic'), explicit('Radiant'), explicit('Umbral'), explicit('True Damage')], definition: 'DC20 uses Bludgeoning, Piercing, Slashing, Cold, Corrosion, Fire, Lightning, Poison, Psychic, Radiant, Umbral, and True damage. True damage cannot be reduced.' },

  { id: 'condition.grappled', name: 'Grappled', targetTitle: 'Offensive Actions', category: 'Condition', aliases: [exact('Grappled')], related: ['action.grapple', 'condition.restrained', 'creature.size'], definition: 'A grappler can move its target with it by spending its own movement, but the grappler is considered Slowed. The target can spend 1 AP to escape with Acrobatics or Athletics contested by the grappler’s Athletics.' },
  { id: 'action.grapple', name: 'Grapple Action', targetTitle: 'Offensive Actions', category: 'Action', aliases: [exact('Grapple'), flexible('Grapple Action')], related: ['condition.grappled', 'condition.restrained', 'creature.size'], definition: 'Using a free hand, spend 1 AP to make an Athletics Check contested by the target’s Acrobatics or Athletics. On a Success, the target is Grappled by you.' },
  { id: 'condition.prone', name: 'Prone', targetTitle: 'Prone, Hidden Creatures, & Underwater Combat', category: 'Condition', aliases: [exact('Prone')], definition: 'While Prone, your Attacks have DisADV; Melee Attacks against you have ADV; and Ranged Attacks against you have DisADV. Standing costs 2 Spaces of movement.' },
  { id: 'damage.poison', name: 'Poison Damage', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Poisoned'), explicit('Poison')], definition: 'Poison damage is Elemental damage caused by toxins. “Poisoned” is not a standalone Condition in DC20 Beta 0.10.5.' },
  { id: 'creature.size', name: 'Creature Sizes', targetTitle: 'Creature Sizes & Grappling', category: 'Creature Rule', aliases: [flexible('Creature Size'), flexible('Creature Sizes'), flexible('Size Category'), flexible('Size Categories')], definition: 'Creature Size determines occupied Spaces and adjusts mundane Grapple, move, throw, push, and Prone attempts based on the creatures’ relative Sizes.' },
  { id: 'creature.movement', name: 'Moving Through Creatures', targetTitle: 'Moving Through Creatures, Collision, & Throwing', category: 'Movement', aliases: [flexible('Moving Through Creatures')], definition: 'Friendly Spaces can be crossed freely. Moving through a hostile creature within 1 Size requires the Pass Through Action; creatures 2 or more Sizes apart can cross while Slowed.' },
  { id: 'movement.collision', name: 'Collision', targetTitle: 'Moving Through Creatures, Collision, & Throwing', category: 'Movement', aliases: [exact('Collision')], definition: 'When forced movement ends early against a creature or object, the remaining movement becomes Collision damage and is shared with a creature that was struck.' },
  { id: 'movement.throwing', name: 'Throwing', targetTitle: 'Moving Through Creatures, Collision, & Throwing', category: 'Movement', aliases: [exact('Throwing')], definition: 'Throw distance is determined by the thrower’s Might and the relative Size of the thrown object or creature.' },
  { id: 'movement.difficultTerrain', name: 'Difficult Terrain', targetTitle: 'Spaces, Distance, & Difficult Terrain', category: 'Movement', aliases: [flexible('Difficult Terrain')], definition: 'While moving through Difficult Terrain, a creature is Slowed: every 1 Space moved costs 1 additional Space of movement.' },
  { id: 'movement.jump', name: 'Jumping', targetTitle: 'Jumping', category: 'Movement', aliases: [flexible('Jump Distance'), exact('Jumping')], definition: 'Jump Distance equals Agility, to a minimum of 1, and each Space jumped uses 1 Space of movement.' },
  { id: 'movement.falling', name: 'Falling', targetTitle: 'Falling', category: 'Movement', aliases: [exact('Falling'), flexible('Falling Damage')], definition: 'A creature takes 1 Bludgeoning damage per Space fallen, to a maximum of 100, and falls Prone when it falls farther than its Agility in Spaces (minimum 1). Uncontrolled falls deal damage from any height.' },
  { id: 'combat.cover', name: 'Cover & Concealment', targetTitle: 'Line of Sight, Cover, & Concealment', category: 'Vision', aliases: [exact('Cover'), exact('Concealment'), flexible('Line of Sight')], definition: 'Half Cover gives -2 and three-quarters Cover gives -5 on Attack and Spell Checks against PD or AD; Full Cover prevents those Checks. Concealment limits sight rather than blocking the effect.' },
  { id: 'combat.areaOfEffect', name: 'Areas of Effect', targetTitle: 'Areas of Effect', category: 'Area', aliases: [flexible('Area of Effect'), flexible('Areas of Effect'), exact('Sphere'), exact('Cylinder'), exact('Cone'), exact('Aura'), exact('Arc'), explicit('Line'), explicit('Ring'), explicit('Zone'), explicit('Wall'), explicit('Dome'), exact('Ringwall')], definition: 'DC20 Areas of Effect use Arc, Aura, Cone, Line, Ring, Sphere, and Zone shapes, with Wall, Ringwall, Cylinder, and Dome variants.' },
  { id: 'rest.rules', name: 'Resting', targetTitle: 'Resting', category: 'Rest', aliases: [exact('Resting')], definition: 'Rests are periods of recovery during Exploration. Quick, Short, Long, and Full Rests have different durations, activity limits, and benefits.' },
  { id: 'rest.points', name: 'Rest Points', targetTitle: 'Resting', category: 'Rest Resource', aliases: [flexible('Rest Point'), flexible('Rest Points'), exact('RP')], definition: 'Maximum Rest Points equal maximum HP. Spend Rest Points during a Quick, Short, or Long Rest to regain 1 HP per point spent; they return after the first 4 hours of a Long Rest.' },
  { id: 'rest.quick', name: 'Quick Rest', targetTitle: 'Resting', category: 'Rest', aliases: [flexible('Quick Rest')], related: ['rest.points'], definition: 'A Quick Rest is at least 10 minutes of No Activity or Light Activity. At its end, spend Rest Points to regain 1 HP per point.' },
  { id: 'rest.short', name: 'Short Rest', targetTitle: 'Resting', category: 'Rest', aliases: [flexible('Short Rest')], related: ['rest.points'], definition: 'A Short Rest is at least 1 hour of No Activity or Light Activity. A creature can gain its benefits twice per 24 hours, spend Rest Points, and restore Features that specify a Short Rest.' },
  { id: 'rest.long', name: 'Long Rest', targetTitle: 'Resting', category: 'Rest', aliases: [flexible('Long Rest')], related: ['rest.points'], definition: 'A Long Rest totals 8 hours: 4 hours of Light Activity and 4 hours of No Activity, in either order. Interrupted 4-hour periods must restart, and only 1 Long Rest can grant benefits per 24 hours. Its first half grants Short Rest benefits and restores Rest Points; completion restores Features such as spent MP.' },
  { id: 'rest.full', name: 'Full Rest', targetTitle: 'Resting', category: 'Rest', aliases: [flexible('Full Rest')], related: ['rest.points'], definition: 'A Full Rest is at least 24 hours in safety and must restart if interrupted by any Dangerous Activity. It grants Long Rest benefits and removes all Exhaustion.' },
  { id: 'equipment.weapons', name: 'Weapons', targetTitle: 'Weapons', category: 'Equipment', aliases: [explicit('Weapons'), explicit('Weapon')], definition: 'Weapons define a Type, Style, damage, range, and Properties. Weapon Training is required to use a Weapon’s Enhancement.' },
  { id: 'equipment.spellFocuses', name: 'Spell Focuses', targetTitle: 'Spell Focuses', category: 'Equipment', aliases: [explicit('Spell Focus'), explicit('Spell Focuses')], definition: 'Hold a Spell Focus to benefit from its Properties and satisfy Somatic Components. Without Spell Focus Training, its Properties provide no benefit.' },
  { id: 'equipment.armor', name: 'Armor', targetTitle: 'Armor', category: 'Equipment', aliases: [explicit('Armor')], definition: 'Armor can improve Defense and grant Damage Reduction. Wearing Armor without the required Training gives DisADV on Attack Checks and Spell Checks.' },
  { id: 'equipment.shields', name: 'Shields', targetTitle: 'Shields', category: 'Equipment', aliases: [explicit('Shield'), explicit('Shields')], definition: 'Spend 1 AP to equip or stow a Shield and gain its benefits while wielding it. Without the required Training, it gives DisADV on Attack Checks and Spell Checks.' },
];

interface EquipmentPropertyDefinition {
  name: string;
  targetTitle: 'Weapons' | 'Spell Focuses' | 'Armor' | 'Shields';
  definition: string;
  autoLink?: boolean;
  source?: string;
  sourcePage?: string;
}

function equipmentPropertyCategory(targetTitle: EquipmentPropertyDefinition['targetTitle']): string {
  if (targetTitle === 'Spell Focuses') return 'Spell Focus Property';
  if (targetTitle === 'Shields') return 'Shield Property';
  if (targetTitle === 'Armor') return 'Armor Property';
  return 'Weapon Property';
}

/**
 * Property text is kept here because the Rules documents also contain the item
 * catalogs. Pulling a fallback from a catalog summary produced unrelated quick
 * rules such as “45 published catalog entries.”
 */
const EQUIPMENT_PROPERTIES: EquipmentPropertyDefinition[] = [
  { name: 'Ammo', targetTitle: 'Weapons', definition: 'This Weapon requires ammunition to make Attacks. You can load it as part of an Attack made with it.', autoLink: false },
  { name: 'Concealable', targetTitle: 'Weapons', definition: 'Drawing the Weapon does not provoke Opportunity Attacks. If you draw it as part of an Attack, you have ADV on that Attack once against each creature per Combat.' },
  { name: 'Cumbersome', targetTitle: 'Weapons', definition: 'It takes 1 AP to draw, stow, or pick up this Weapon.' },
  { name: 'Deft', targetTitle: 'Weapons', definition: 'Ranged Attacks with this Weapon do not have DisADV as a result of you being Prone.' },
  { name: 'Guard', targetTitle: 'Weapons', definition: 'You gain +1 PD while wielding this Weapon.', autoLink: false },
  { name: 'Heavy', targetTitle: 'Weapons', definition: 'The Weapon’s damage increases by 1.', autoLink: false },
  { name: 'Impact', targetTitle: 'Weapons', definition: 'The Weapon deals +1 damage on Heavy Hits.', autoLink: false },
  { name: 'Long-Ranged', targetTitle: 'Weapons', definition: 'For a Weapon, this Property increases its Range to 30/90. Spell Focuses use a different Long-Ranged Property.', autoLink: false },
  { name: 'Multi-Faceted', targetTitle: 'Weapons', definition: 'The Weapon gains a second Weapon Style. When you Attack with it, you can use both Weapon Enhancements and choose which Style’s damage type it deals.' },
  { name: 'Reach', targetTitle: 'Weapons', definition: 'For a Weapon, this Property adds 1 Space to your Melee Range when you Attack with it. Spell Focuses use a different Reach Property.', autoLink: false },
  { name: 'Reload', targetTitle: 'Weapons', definition: 'The Weapon’s damage increases by 1, but you must spend 1 AP or 1 SP and use a free hand to reload it. If it stops being held, it must be loaded again.', autoLink: false },
  { name: 'Returning', targetTitle: 'Weapons', definition: 'Requires Toss or Thrown. When you Miss a Ranged Attack with the Weapon, it returns to your hand.', autoLink: false },
  { name: 'Silent', targetTitle: 'Weapons', definition: 'When you make a Ranged Attack with the Weapon while Hidden, you remain Unheard by creatures you are Hidden from.', autoLink: false },
  { name: 'Thrown', targetTitle: 'Weapons', definition: 'You can throw the Weapon to make a Ranged Martial Attack at 10/20. Beyond that range it is considered an Improvised Weapon.', autoLink: false },
  { name: 'Toss', targetTitle: 'Weapons', definition: 'You can throw the Weapon to make a Ranged Martial Attack at 5/10. Beyond that range it is considered an Improvised Weapon.', autoLink: false },
  { name: 'Two-Handed', targetTitle: 'Weapons', definition: 'For a Weapon, this Property requires 2 hands when you Attack with it. Spell Focuses use a different Two-Handed Property.', autoLink: false },
  { name: 'Unwieldy', targetTitle: 'Weapons', definition: 'You have DisADV on Attacks made with this Weapon against targets within 1 Space of you.' },
  { name: 'Versatile', targetTitle: 'Weapons', definition: 'This Weapon can be wielded with 1 or 2 hands. When you wield it with 2 hands, you gain a +2 bonus to Hit with it.', autoLink: false },

  { name: 'Channeling', targetTitle: 'Spell Focuses', definition: 'While benefiting from this Spell Focus, you gain a +1 bonus to Spell Checks.' },
  { name: 'Close Quarters', targetTitle: 'Spell Focuses', definition: 'Your Ranged Spell Attacks do not have DisADV when you are within the Melee Range of enemies.', autoLink: false },
  { name: 'Muffled', targetTitle: 'Spell Focuses', definition: 'Your Verbal Components can only be heard within 5 Spaces of you.', autoLink: false },
  { name: 'Powerful', targetTitle: 'Spell Focuses', definition: 'Your Spell Attacks deal +1 damage to all targets.', autoLink: false },
  { name: 'Protective', targetTitle: 'Spell Focuses', definition: 'Your AD increases by 1.', autoLink: false },
  { name: 'Reactive', targetTitle: 'Spell Focuses', definition: 'When you are the Challenger or a Participant helping the Challenger in a Spell Duel, the Challenger gains ADV on their Check to stop the Spell.', autoLink: false },
  { name: 'Vicious', targetTitle: 'Spell Focuses', definition: 'You gain a +1 bonus to Hit with Spell Attacks.', autoLink: false },
  { name: 'Warded', targetTitle: 'Spell Focuses', definition: 'You have Magical Damage Reduction (MDR).', autoLink: false },
  { name: 'Long-Ranged', targetTitle: 'Spell Focuses', definition: 'Spells you cast with a Range greater than 1 have their Range increased by 5 Spaces.', autoLink: false },
  { name: 'Reach', targetTitle: 'Spell Focuses', definition: 'Spells you cast with a Range of 1 have their Range increased by 1 Space.', autoLink: false },
  { name: 'Two-Handed', targetTitle: 'Spell Focuses', definition: 'The Spell Focus requires 2 hands to benefit from its Properties.', autoLink: false },

  { name: 'Grasp', targetTitle: 'Shields', definition: 'The Shield is considered a free hand when Grappling, Reloading a Weapon, or Attacking with a Versatile Weapon.', autoLink: false },
  { name: 'Mounted', targetTitle: 'Shields', definition: 'The Shield’s PD and AD bonuses also apply to your Mount’s Defenses.', autoLink: false },
  { name: 'Rigid', targetTitle: 'Armor', definition: 'This Armor or Shield gives you DisADV on Agility Checks.', autoLink: false },
  { name: 'Rigid', targetTitle: 'Shields', definition: 'This Shield gives you DisADV on Agility Checks.', autoLink: false },
  { name: 'Toss', targetTitle: 'Shields', definition: 'You can throw the Shield to make a Ranged Martial Attack at 5/10. Beyond that range it is considered an Improvised Weapon.', autoLink: false },
  { name: 'PD Increase', targetTitle: 'Armor', definition: 'The Armor’s PD bonus increases by 1.', autoLink: false },
  { name: 'AD Increase', targetTitle: 'Armor', definition: 'The Armor’s AD bonus increases by 1.', autoLink: false },
  { name: 'PDR', targetTitle: 'Armor', definition: 'The Armor grants Physical Damage Reduction.', autoLink: false },
  { name: 'EDR', targetTitle: 'Armor', definition: 'The Armor grants Elemental Damage Reduction.', autoLink: false },
  { name: 'Bulky', targetTitle: 'Armor', definition: 'This Armor reduces your Speed by 1.', autoLink: false },
  { name: 'PD Increase', targetTitle: 'Shields', definition: 'The Shield’s PD bonus increases by 1.', autoLink: false },
  { name: 'AD Increase', targetTitle: 'Shields', definition: 'The Shield’s AD bonus increases by 1.', autoLink: false },
  { name: 'PDR', targetTitle: 'Shields', definition: 'The Shield grants Physical Damage Reduction.', autoLink: false },
  { name: 'EDR', targetTitle: 'Shields', definition: 'The Shield grants Elemental Damage Reduction.', autoLink: false },
  { name: 'Bulky', targetTitle: 'Shields', definition: 'This Shield reduces your Speed by 1.', autoLink: false },

  { name: 'Double Sided', targetTitle: 'Weapons', definition: 'While wielding this Weapon with two hands, you are considered to be Dual Wielding. Your second Attack with it on each turn ignores and does not advance the Multiple Check Penalty.', source: 'DC20 Magazine 27 — Mundane Objects', sourcePage: 'DC20 Magazine 27 p.3' },
  { name: 'Pinpoint', targetTitle: 'Weapons', definition: 'Attacks with this Weapon gain +2 to Attack Checks against targets that are Flanked.', source: 'DC20 Magazine 27 — Mundane Objects', sourcePage: 'DC20 Magazine 27 p.3' },
];

const CATEGORY_SCOPED_PROPERTIES = new Set(
  EQUIPMENT_PROPERTIES
    .filter((property, index, properties) => properties.findIndex(({ name }) => name === property.name) !== index)
    .map(({ name }) => name),
);

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[’']/g, '').replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string | undefined) => next ? next.toUpperCase() : '').replace(/^./, (letter) => letter.toLowerCase());
}

export function weaponPropertyRuleID(name: string, targetTitle?: string): string {
  const scope = targetTitle && CATEGORY_SCOPED_PROPERTIES.has(name) ? `.${slug(targetTitle)}` : '';
  return `equipment.property${scope}.${slug(name)}`;
}

function rulesVersion(entry: RuleReferenceEntry): string {
  return entry.page.match(/\b\d+\.\d+\.\d+\b/)?.[0]
    ?? entry.sourceDocument?.match(/\b\d+\.\d+\.\d+\b/)?.[0]
    ?? CURRENT_RULES_VERSION;
}

function buildAliasPattern(aliases: RuleAlias[]): RegExp | null {
  const values = Array.from(new Set(aliases.filter(({ autoLink }) => autoLink !== false).map(({ text }) => text).filter(Boolean)))
    .sort((left, right) => right.length - left.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return values.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${values.join('|')})(?![\\p{L}\\p{N}])`, 'giu') : null;
}

export function buildRuleRegistry(reference: RulesReferenceData): RuleRegistry {
  const titleLookup = new Map<string, RuleReferenceEntry>();
  for (const entry of reference.entries) if (!titleLookup.has(entry.title)) titleLookup.set(entry.title, entry);
  const entries: RuleRegistryEntry[] = [];
  const coveredRuleEntries = new Set<string>();

  for (const concept of CORE_CONCEPTS) {
    const ruleReference = titleLookup.get(concept.targetTitle);
    if (!ruleReference) continue;
    coveredRuleEntries.add(ruleReference.id);
    entries.push({
      id: concept.id,
      canonicalName: concept.name,
      category: concept.category,
      shortDefinition: concept.definition ?? ruleReference.summary,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: concept.aliases,
      relatedIDs: concept.related ?? [],
      ruleReference,
      isConcept: true,
    });
  }

  for (const property of EQUIPMENT_PROPERTIES) {
    const ruleReference = titleLookup.get(property.targetTitle);
    if (ruleReference) {
      const propertyType = equipmentPropertyCategory(property.targetTitle).replace(/ Property$/, '');
      const isCategoryScoped = CATEGORY_SCOPED_PROPERTIES.has(property.name);
      entries.push({
        id: weaponPropertyRuleID(property.name, property.targetTitle),
        canonicalName: property.name,
        category: equipmentPropertyCategory(property.targetTitle),
        shortDefinition: property.definition,
        ruleEntryID: ruleReference.id,
        source: property.source ?? ruleReference.sourceDocument ?? reference.source,
        rulesVersion: rulesVersion(ruleReference),
        sourcePage: property.sourcePage ?? ruleReference.page,
        aliases: [
          flexible(`${property.name} ${propertyType} Property`),
          ...(isCategoryScoped ? [] : [flexible(`${property.name} Property`)]),
          // Bare property names can also be ordinary feature names or prose
          // (for example, “Deft Footwork”). Equipment cards provide an
          // explicit link, while prose only auto-links the unambiguous
          // “X Property” form.
          explicit(property.name),
        ],
        relatedIDs: [
          property.targetTitle === 'Weapons' ? 'equipment.weapons'
            : property.targetTitle === 'Spell Focuses' ? 'equipment.spellFocuses'
              : property.targetTitle === 'Armor' ? 'equipment.armor'
                : 'equipment.shields',
        ],
        ruleReference,
        isConcept: true,
      });
    }
  }

  for (const ruleReference of reference.entries.filter(({ kind, title }) => kind === 'Condition' && !/Condition Rules/i.test(title))) {
    const name = ruleReference.title.replace(/ X$/, '');
    const id = `condition.${slug(name)}`;
    if (entries.some((entry) => entry.id === id)) continue;
    coveredRuleEntries.add(ruleReference.id);
    entries.push({
      id,
      canonicalName: name,
      category: 'Condition',
      shortDefinition: ruleReference.text,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: [exact(name), ...(ruleReference.title !== name ? [exact(ruleReference.title)] : [])],
      relatedIDs: [],
      ruleReference,
      isConcept: true,
    });
  }

  for (const ruleReference of reference.entries) {
    if (coveredRuleEntries.has(ruleReference.id)) continue;
    const prefix = ruleReference.kind.toLowerCase();
    entries.push({
      id: `${prefix}.${slug(ruleReference.section)}.${slug(ruleReference.subsection)}.${slug(ruleReference.title)}`,
      canonicalName: ruleReference.title,
      category: ruleReference.kind,
      shortDefinition: ruleReference.summary,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: [explicit(ruleReference.title)],
      relatedIDs: [],
      ruleReference,
      isConcept: false,
    });
  }

  const byID = new Map(entries.map((entry) => [entry.id, entry]));
  const byRuleEntryID = new Map<string, RuleRegistryEntry>();
  for (const entry of entries) if (!byRuleEntryID.has(entry.ruleEntryID)) byRuleEntryID.set(entry.ruleEntryID, entry);
  for (const entry of entries) {
    const documentRelated = entry.ruleReference.relatedIDs ?? [];
    entry.relatedIDs = Array.from(new Set([
      ...entry.relatedIDs,
      ...documentRelated.map((id) => byRuleEntryID.get(id)?.id).filter((id): id is string => Boolean(id)),
    ])).filter((id) => id !== entry.id);
  }
  const aliases = new Map<string, Array<{ entry: RuleRegistryEntry; alias: RuleAlias }>>();
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      const normalized = alias.text.toLocaleLowerCase();
      aliases.set(normalized, [...(aliases.get(normalized) ?? []), { entry, alias }]);
    }
  }
  return {
    version: CURRENT_RULES_VERSION,
    entries,
    byID,
    byRuleEntryID,
    aliases,
    autoAliasPattern: buildAliasPattern(entries.flatMap(({ aliases: entryAliases }) => entryAliases)),
  };
}

export function resolveRuleAlias(registry: RuleRegistry, visibleText: string, autoOnly = false): RuleRegistryEntry | null {
  const matches = (registry.aliases.get(visibleText.toLocaleLowerCase()) ?? [])
    .filter(({ alias }) => (!autoOnly || alias.autoLink !== false) && (!alias.caseSensitive || alias.text === visibleText));
  const unique = Array.from(new Map(matches.map(({ entry }) => [entry.id, entry])).values());
  return unique.length === 1 ? unique[0] : null;
}

export type ParsedRuleSegment =
  | { kind: 'text'; text: string }
  | { kind: 'rule'; text: string; ruleID: string; explicit: boolean };

const parserCache = new Map<string, ParsedRuleSegment[]>();
const missingRuleIDsLogged = new Set<string>();
const MAX_CACHE_ENTRIES = 500;

function cacheResult(key: string, value: ParsedRuleSegment[]): ParsedRuleSegment[] {
  if (parserCache.size >= MAX_CACHE_ENTRIES) parserCache.delete(parserCache.keys().next().value ?? '');
  parserCache.set(key, value);
  return value;
}

export function parseRuleText(text: string, registry: RuleRegistry, references: SemanticRuleReference[] = []): ParsedRuleSegment[] {
  if (!text) return [{ kind: 'text', text }];
  const referenceKey = references.map(({ ruleId, text: label, start, end, disabled }) => `${ruleId}:${label ?? ''}:${start ?? ''}:${end ?? ''}:${disabled ? 'off' : 'on'}`).join('|');
  const cacheKey = `${registry.version}\u0000${referenceKey}\u0000${text}`;
  const cached = parserCache.get(cacheKey);
  if (cached) return cached;

  const candidates: Array<{ start: number; end: number; ruleID: string; explicit: boolean }> = [];
  for (const reference of references.filter(({ disabled }) => !disabled)) {
    if (!registry.byID.has(reference.ruleId)) {
      const missingKey = `${registry.version}:${reference.ruleId}`;
      if (!missingRuleIDsLogged.has(missingKey)) {
        missingRuleIDsLogged.add(missingKey);
        console.warn(`[rules-cross-link] Missing rule reference: ${reference.ruleId}`);
      }
      continue;
    }
    if (reference.start !== undefined && reference.end !== undefined && reference.start >= 0 && reference.end > reference.start && reference.end <= text.length) {
      candidates.push({ start: reference.start, end: reference.end, ruleID: reference.ruleId, explicit: true });
      continue;
    }
    const label = reference.text;
    if (!label) continue;
    let from = 0;
    while (from < text.length) {
      const start = text.indexOf(label, from);
      if (start < 0) break;
      candidates.push({ start, end: start + label.length, ruleID: reference.ruleId, explicit: true });
      from = start + label.length;
    }
  }

  if (registry.autoAliasPattern) {
    registry.autoAliasPattern.lastIndex = 0;
    const counts = new Map<string, number>();
    let match: RegExpExecArray | null;
    while ((match = registry.autoAliasPattern.exec(text)) && candidates.length < 80) {
      const visible = match[1];
      const entry = resolveRuleAlias(registry, visible, true);
      if (!entry || (counts.get(entry.id) ?? 0) >= 3) continue;
      // “Reaction Points” appeared in legacy app copy, but RP means Rest Points
      // in Beta 0.10.5. Do not turn its “Reaction” substring into a false rule.
      if (entry.id === 'action.reaction' && /^Reaction\s+Points?\b/i.test(text.slice(match.index))) continue;
      const end = match.index + visible.length;
      const suppressed = references.some((reference) => reference.disabled && reference.ruleId === entry.id && (
        reference.start !== undefined && reference.end !== undefined
          ? match!.index < reference.end && end > reference.start
          : reference.text?.toLocaleLowerCase() === visible.toLocaleLowerCase()
      ));
      if (suppressed) continue;
      candidates.push({ start: match.index, end, ruleID: entry.id, explicit: false });
      counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
    }
  }

  const accepted: typeof candidates = [];
  for (const candidate of candidates.sort((left, right) => left.start - right.start || Number(right.explicit) - Number(left.explicit) || (right.end - right.start) - (left.end - left.start))) {
    const overlap = accepted.find((entry) => candidate.start < entry.end && candidate.end > entry.start);
    if (!overlap) accepted.push(candidate);
    else if (candidate.explicit && !overlap.explicit) accepted.splice(accepted.indexOf(overlap), 1, candidate);
  }
  accepted.sort((left, right) => left.start - right.start);
  const segments: ParsedRuleSegment[] = [];
  let cursor = 0;
  for (const candidate of accepted) {
    if (candidate.start < cursor) continue;
    if (candidate.start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, candidate.start) });
    segments.push({ kind: 'rule', text: text.slice(candidate.start, candidate.end), ruleID: candidate.ruleID, explicit: candidate.explicit });
    cursor = candidate.end;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return cacheResult(cacheKey, segments.length ? segments : [{ kind: 'text', text }]);
}

export function detectedRuleReferences(text: string, registry: RuleRegistry): SemanticRuleReference[] {
  return Array.from(new Map(parseRuleText(text, registry).filter((segment): segment is Extract<ParsedRuleSegment, { kind: 'rule' }> => segment.kind === 'rule')
    .map((segment) => [segment.ruleID, { ruleId: segment.ruleID, text: segment.text }])).values());
}
