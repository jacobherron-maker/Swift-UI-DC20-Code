import type { CharacterReferenceData, ClassChoiceOptionReference, ClassFeatureReference, ClassReference } from '../types/models';

export const PSION_SUBCLASS_SOURCE = 'DC20 Magazine 09 — Psion Subclasses v1.1';
export const ARTIFICER_SOURCE = 'DC20 Magazine 16 — Artificer';
export const SOURCEBOOK_FOLDER_URL = 'https://drive.google.com/drive/folders/167wGgq5lYTC3MZsEh9NsaA4nbA9__9Pu?usp=sharing';

const paragonFeatures: ClassFeatureReference[] = [
  { level: 3, name: 'Paragon Subclass', description: 'At Level 3, instead of choosing a Subclass from your Class, you can take the Paragon Subclass.' },
  { level: 3, name: 'Novice Paragon', description: 'You gain a Class Talent of your choice from your Class.' },
  { level: 3, name: 'Jack of one Trade (Flavor Feature)', description: 'You gain 1 Trade Point.' },
  { level: 7, name: 'Expert Paragon', description: 'You gain a Class Talent of your choice from your Class.' },
  { level: 10, name: 'Master Paragon', description: 'You gain a Class Talent of your choice from your Class.' },
];

export const psionSubclassFeatures: ClassReference['subclassFeatures'] = {
  Oracle: [
    {
      level: 3,
      name: 'Foresight',
      description: 'You gain an Omen, which is a 10. When a creature you can detect with Mind Sense makes a Check or Save, you can spend 1 AP and 1 SP as a Reaction to replace the number it rolled on its d20 with your Omen before anything is added to the roll. The number rolled on the d20 becomes your new Omen.\n\nWhen Mind Sense ends, your Omen resets to 10.',
    },
    {
      level: 3,
      name: 'Third Eye (Flavor Feature)',
      description: 'You have ADV on Checks to identify and determine the meanings of omens and prophecies.',
    },
  ],
  'Psi-Knight': [
    {
      level: 3,
      name: 'Psionic Combatant',
      description: 'You’ve adapted your mental energies to assist your body in physical combat, augmenting your speed, endurance, and martial lethality. You gain the following benefits:\n\nCombat Training: You gain Combat Training with all Weapons, Armor, and Shields. You learn all the Attack Maneuvers, and 1 Maneuver of your choice.\n\nPsychometabolism: You can spend 1 SP to gain +5 Speed and Jump distance until the start of your next turn.\n\nPsionic Strikes: You can use the Daze and Disruption Spell Enhancements from Psionic Mind on Martial Attacks.\n\nPsionic Barrier: When you use Mind Sense, you create a Psionic Barrier for the duration that grants you 2 Temp HP immediately and again at the start of each of your turns.',
    },
    {
      level: 3,
      name: 'Mind Over Matter (Flavor Feature)',
      description: 'You can use your Charisma or Intelligence (your choice), instead of the normal Attribute, to determine your Jump Distance and the weight you can push, drag, lift, or carry.',
    },
  ],
  Paragon: paragonFeatures,
};

export const artificerRituals = [
  {
    name: 'Identify',
    description: 'Cost: 1 Minute\nRange: Touch\nDuration: Instant\n\nChoose an object and make a Spell Check (DC equals 5 + twice the item’s Magic Power).\n\n• Failure: You learn the materials it’s made from and any requirements to attune to the item (if any).\n• Success: You learn the item’s Magic Properties that aren’t Hidden or Artifact Magic Properties. Additionally, you learn if the item has uses or Charges, how many uses or Charges are remaining, and how to activate the item.\n• Success (5): You learn the item’s Artifact Magic Property, if it has one. At the GM’s discretion, you could also gain special information related to the item or how to reveal any Hidden Magic Properties.\n• Success (10): You learn any Hidden Magic Properties and whether the item is Cursed.\n\nOnce the outcome of your Check is resolved, you can’t attempt to Identify the same item again until 24 hours have passed or you complete a Long Rest (whichever occurs first).\n\nDC Tip: The GM can adjust the DC based on unique characteristics of the Magic Item. An item might resonate with or resist the one attempting to identify it, depending on factors such as their Class (Cleric versus Warlock), their Ancestry (Elf versus Dwarf), or choices from their past (whether they have taken a life, fulfilled an oath, or something else). Some items may even require a specific place or a special object to be present during identification. If a Player falls short of the adjusted DC, the GM can also offer subtle clues that hint at these hidden factors.',
  },
  {
    name: 'Mending',
    description: 'Cost: 1 Minute\nRange: Touch\nDuration: Instant\n\nYou repair an object, fixing one break or tear that’s no larger than 12 inches (30 cm) in any dimension, provided you have materials needed for the repair. If the object is magical, this ritual doesn’t restore its magic.',
  },
  {
    name: 'Restore Magic Charges',
    description: 'Cost: 1 AP + 1 or more MP\nRange: Touch\nDuration: Instant\n\nYou can restore a number of spent Charges to the Magic Item equal to the MP spent.',
  },
  {
    name: 'Transpose Magic Property',
    description: 'Cost: 10 Minutes\nRange: Touch\nDuration: Instant\n\nWhile holding a Magic Item, you can spend 10 minutes to transfer all its Magic Properties to a mundane item you’re also holding.\n\nRestrictions: The Magic Item can’t possess an Artifact Property, it’s Magic Power value can’t exceed your Combat Mastery, and the mundane item must meet the requirements of the Magic Properties (such as being a Weapon for the Change Damage Type property).\n\nExample: If an Artificer possesses a Magic Sword bearing 1 Magic Property and a mundane Spear, they can transfer that property from the Sword to the Spear.\n\nDC Tip: Any item bearing a Magic Property is considered a Magic Item. If you transfer the last Magic Property from an item, it becomes mundane.',
  },
] as const;

const infusion = (name: string, description: string, isRepeatable = false, maximumCount = 10): ClassChoiceOptionReference => ({
  name,
  description,
  isRepeatable,
  maximumCount,
  pointCost: 1,
});

export const artificerInfusions: ClassChoiceOptionReference[] = [
  infusion('Darkvision', 'Requires: Attunement\nMagic Power: 1\n\nYou gain 10 Space Darkvision. If you already have Darkvision, it increases by 5 Spaces.'),
  infusion('Change Damage Type', 'Requires: Weapon\nMagic Power: 1\n\nThe Weapon can deal [Damage Type except True Damage] damage instead of its normal type. Choose each time you make an Attack with the Weapon.', true),
  infusion('Condition Resilience (Minor)', 'Requires: Attunement\nMagic Power: 1\n\nYou gain ADV on Saves against the [X] Condition.\n\n[X] is 1 of the following Conditions: Bleeding, Burning, Dazed, Exposed, Hindered, Prone, Impaired, Slowed, or Surprised.', true),
  infusion('Jumping', 'Requires: Attunement\nMagic Power: 1\n\nYour Jump Distance is tripled, though you can’t jump farther than your remaining movement would allow.'),
  infusion('Recall', 'Requires: Tiny Item, Attunement\nMagic Power: 1\n\nYou can take the Object Action to summon the item to your hand, provided you have a free hand and the item is within 100 Spaces of you.\n\nDC Tip: A Tiny item is any item the size of a Tiny creature, such as a sword, staff, orb, necklace, etc.'),
  infusion('Sentience (Minor)', 'Magic Power: 1\n\nThe item has sentience with the following statistics:\n• It has a Charisma of [-2 to 3] and an Intelligence of [-2 to 3] (total Attribute value of 1).\n• It has 10 Spaces of hearing, sight, and Telepathy.\n• It can read and speak Common and 1 additional language the creator knows.', true),
  infusion('Spell Storing', 'Magic Power: Variable\n\nWhen you cast a Spell, you can store its magic within this item. When you do, the Spell’s magic is stored within the item and has no immediate effect. The amount of MP spent on a stored Spell can’t exceed the Magic Power value. You can store a maximum number of Spells within the item equal to the Magic Power value.\n\nActivating the Spell: While holding the item, a creature can spend the Spell’s AP cost to activate its stored magic. The Spell takes effect as if the activating creature had cast the Spell and they make any associated Checks as part of the Spell’s casting.\n\nDuration: The magic of a stored Spell lasts until it’s activated, the caster chooses to harmlessly release it for free, the caster completes a Long Rest, or the caster dies.'),
  infusion('Spellcasting', 'Magic Power: Variable\nCharges: equal to the Magic Power\n\nThe item is imbued with the following Spells: [list of chosen Spells known by the creator].\n\nYou can take the Spell Action to cast an imbued Spell. When you do, you can spend Charges in place of MP, including for Spell Enhancements. The total amount of Charges and MP you spend can’t exceed your Mana Spend Limit.\n\nRestrictions: An item’s Magic Power value sets the limit for both the total number of Spells it can hold and the base MP cost of each Spell.\n\nArtificer Infusion: You don’t learn the Spells associated with the Spellcasting Magic Property when learning its Infusion. When you infuse an item with the Spellcasting Magic Property, you can choose from multiple Spells you know or whose Spellcasting Infusions you know.', true),
  infusion('Spell Potion', 'Tags: Spellcasting, Consumable\nRequires: a Micro sized ingestible item or a container filled with liquid (such as water, wine, or rum)\nMagic Power: equal to the Spell’s total MP cost\n\nAn item with this Magic Property is considered a Spell Potion. The Spell Potion is imbued with 1 Spell the creator knows that targets only 1 creature and that doesn’t require Sustain. The Spell can include any chosen Spell Enhancements (up to a total MP cost equal the creator’s Mana Spend Limit).\n\nAdministering: You can use the Object Action to fully drink the Spell Potion or administer it to a willing creature within 1 Space. The drinker becomes the target of the imbued Spell and is subjected to its effects.\n\nChecks & DCs: The creator’s Save DC is used in place of any Checks to determine the potency of the imbued Spell (such as a Spell Check or Attack Check). Any Saves the imbued Spell forces a target to make are made against the Save DC of the Spell Potion’s creator.', true),
  infusion('Spell Bomb', 'Tags: Spellcasting, Consumable\nRequires: a Micro sized container filled with liquid or a Micro sized object\nMagic Power: equal to the Spell’s total MP cost\n\nAn item with this Magic Property is considered a Spell Bomb. The Spell Bomb is imbued with 1 Spell the creator knows that targets an area (such as a Line, Cone, or Sphere) and doesn’t require Sustain. The Spell can include any chosen Spell Enhancements (up to a total MP cost equal the creator’s Mana Spend Limit).\n\nPriming: The Spell Bomb is inert and stable unless it’s primed. You can take the Object Action to prime the Spell Bomb until the end of your next turn, after which it returns to being inert.\n\nDetonating: A primed Spell Bomb detonates upon impact (such as a collision from being thrown or Attacked while not held), releasing the magic of the imbued Spell with the Space it detonated in as its Point of Origin. The creature that caused the detonation chooses the direction of the Spell’s area. Once a Spell Bomb detonates, it loses this Magic Property.\n\nChecks & DCs: When a primed Spell Bomb detonates, the user makes any Checks required by the imbued Spell (such as Attack or Spell Checks). Any Saves the imbued Spell forces a target to make is made against the Save DC of the Spell Bomb’s creator.\n\nExample: A Spell Bomb is imbued with the Burning Flames Spell. If thrown, the thrower makes an Attack Check to determine if any targets in the area are Hit by the Spell Attack. If the Spell was enhanced with the Burning Enhancement, the target makes a Physical Save against the Spell Bomb creator’s Save DC.\n\nDC Tip: A Spell Bomb is also a Micro sized object, so a Medium sized creature can spend 1 AP to throw a Spell Bomb up to a number of Spaces away equal to twice their Might (minimum Might of 1 for the throw). See Throwing for more information.', true),
  infusion('Water Breathing', 'Requires: Attunement\nMagic Power: 1\n\nYou can breathe normally underwater.'),
  infusion('Wound Closure', 'Requires: Attunement\nMagic Power: 3\n\nWhile on Death’s Door, you automatically regain 1 HP at the start of your turn.'),
];

const magicalCraftsman = 'You deeply understand the inner workings of Magic Items, granting you the following benefits:\n\n• Rituals: You learn the following Rituals: Identify, Mending, Restore Magic Charges, and Transpose Magic Property.\n• Trade Expertise: Your Trade Mastery Limit increases by 1, up to Grandmaster (+10). A Trade can only benefit from one increase to its Mastery limit. Additionally, you gain 2 Trade Points.\n• Artisan’s Resistance: You gain Resistance (Half) to an Elemental damage type of your choice.';
const infusionMagic = 'Infusions are Magic Properties you are able to apply onto objects to grant them the power of Magic Items. An Infusion is identical to the Magic Property of the same name. While an item bears an Infusion, it is considered a Magic Item.\n\nInfusions Known\nYou learn 3 Infusions of your choice. When you learn an Infusion, you can choose any Infusion for a Magic Property that is not an Artifact Magic Property. Whenever you would learn a Spell, you can learn an Infusion instead, including when you gain this Feature.\n\nMultiple Choice: If you learn an Infusion that has multiple options, you can choose any option for the Infusion. Each time you learn that Infusion, you can select a different option.\n\nExample: If you learn the Skill Increase Infusion and choose the Stealth Skill, you can only infuse an item with a bonus to Stealth Skill Checks until you learn that Infusion again and select a different Skill. Similarly, if you learn the Spellcasting Infusion and choose the Banish Spell, you can only infuse an item with the ability to cast the Banish Spell.\n\nInfusion Spell List: When you learn an Infusion that imbues a Spell onto an Item (such as the Spellcasting, Spell Potion, or Spell Scroll Infusions), choose any Spell to become one of your Infusion Spells. When you apply such an Infusion, you can imbue any of your Infusion Spells or your Spells known. You aren’t considered to know an Infusion Spell for the purposes of normal Spellcasting.\n\nExample: An Artificer learns the Spellcasting Infusion and the Spell Scroll Infusion. When they learn the Spellcasting Infusion, they must pick a Spell that they can infuse with that Infusion (such as the Fireball Spell). Similarly, when they learn the Spell Scroll Infusion, they must pick a Spell that they can infuse with that Infusion (such as the Heal Spell). When they apply either of those Infusions, they can choose to infuse the Fireball Spell, Heal Spell, or any Spell they know.\n\nApplying an Infusion\nYou can apply one Infusion you know onto a mundane item you’re touching (such as a Weapon, a set of Armor, or a Shield) by spending 1 AP and an amount of MP equal to the Infusion’s Magic Power (minimum of 1 MP). If the Infusion has a range of Magic Power (such as Variable), you choose the value of the Magic Power.\n\nCharges: Infusions that grant Charges to an item grant a number of Charges equal to the Magic Power of the Infusion.\n\nDuration: An Infusion lasts until you spend 1 AP to end it, the item it’s applied to is destroyed or you’re dead for more than 8 hours.\n\nMP Reduction: When you apply an Infusion onto an item, your maximum MP is reduced by an amount equal to the MP spent on the Infusion. This MP reduction only ends when the Infusion ends. You don’t regain any lost MP when your maximum MP is restored.';
const tinkerer = 'You can spend 10 minutes to create one of the small clockwork devices from the list below. You can have a number of clockwork devices at a time equal to your Prime Modifier. If you create an additional clockwork device beyond this limit, 1 device of your choice ceases to exist. A creature must be holding one of these items to use it.\n\n• Igniter: A creature can take an Object Action to ignite a flammable object (such as a candle or torch) within 1 Space.\n• Illuminator: A creature can take an Object Action to start or stop producing Bright Light in a 1 Space Radius.\n• Recorder: A creature can take an Object Action to record up to 5 minutes of audio. A creature can spend a Minor Action to play, stop, or rewind the recording. The sound of the recording can be heard up to 5 Spaces away.\n• Hologram: A creature can take an Object Action to record a stationary image to the device, which can store up to 10 images. A creature can spend a Minor Action to view a stored image as a miniature hologram.';
const manaCore = 'You can spend 1 minute to attach a Mana Core to a set of Trade Tools or a Tiny object you’re touching (such as a Weapon, Spell Focus, or Shield). When you attach a Mana Core, the item gains 1 benefit of your choice from the list below. You can’t gain the benefit of your Mana Core unless you’re wielding or wearing the attached item. If you use this Feature again, the previous Mana Core becomes inert.\n\nOverdrive: You can Overdrive your Mana Core to gain the Overdrive benefit of your chosen Mana Core option. You can use Overdrive once per Long Rest, and regain the ability to use it again when you roll for Initiative.\n\nDamage\nOnce per Round, an Attack you make deals +1 damage to all targets.\nOverdrive: When you make an Attack, it deals +1 damage to all targets (this stacks with the normal benefit).\n\nDamage Reduction\nYou gain PDR, EDR, or MDR.\nOverdrive: When you take damage, you can reduce the damage taken by an amount equal to your Prime Modifier.\n\nSpeed\nYour Speed increases by 2.\nOverdrive: Any time on your turn, you can Teleport up to 5 Spaces to an unoccupied Space you can see.\n\nFocused\nThe item gains 1 Spell Focus Property.\nOverdrive: When you make a Spell Check, you gain a +5 bonus to the Check.';

const artificer: ClassReference = {
  name: 'Artificer',
  path: 'Spellcasting',
  summary: 'A magical craftsperson who creates Infusions, rituals, clockwork devices, and a customizable Mana Core.',
  description: 'DC20 Magazine Volume 16 presents the Artificer class. Its complete published rules currently cover class Features at levels 1–2, subclass Features at level 3, the level 1–10 Class Table, two subclasses, the Paragon option, four Rituals, and twelve Magic Properties. Later feature milestones remain explicitly marked as unpublished.',
  baseHP: 8,
  levelOneResource: '6 MP',
  schoolChoiceCount: 0,
  spellsKnownAtLevel1: 3,
  maneuversKnownAtLevel1: 0,
  pathTitle: 'Artificer Spellcasting Path',
  pathDetails: 'Combat Training: Light Armor, Light Shields\n\nSpell List: When you learn a new Spell, you can choose any Spell with the Strike Spell Tag or from the following Schools of Magic: Conjuration, Elemental, and Transmutation.\n\nBeta Note: 0.10 will introduce Spells with assigned Spell Tags and Spell Schools. Use the Fire & Flame or Lightning & Teleportation Spell Lists until 0.10 is released.\n\nCompatibility Note: This source predates Beta 0.10.5. The app uses the source’s published Strike, Conjuration, Elemental, and Transmutation access against the current spell catalog.\n\nCantrips Known: The number of Cantrips you know increases as shown in the Cantrips Known column of the Artificer Class Table. Cantrips are Spells with the Cantrip Spell Tag.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Artificer Class Table. These can be Spells with or without the Cantrip Spell Tag.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Artificer Class Table.',
  startingEquipment: {
    arsenal: ['Weapon', 'Shield'],
    arsenalCount: 1,
    armor: ['Defensive Light Armor', 'Deflecting Light Armor', 'Fortified Light Armor'],
    tradeTools: [],
    tradeToolCount: 0,
    description: '• Weapons or Shields\n• 1 set of Light Armor\n• X or Y “Packs” (Adventuring Packs Coming Soon)\n\nSource note: the magazine does not state the number of Weapons or Shields or provide pack quantities. The builder permits one arsenal choice so the otherwise complete equipment step remains usable without presenting that quantity as source text.',
  },
  tableSource: 'DC20 MAGAZINE VOLUME 16 • PAGE 3',
  tableColumns: ['level', 'health', 'attribute', 'skill', 'trade', 'mana', 'cantrips', 'spells', 'features'],
  tableRows: [
    { level: 1, health: 8, mana: 6, cantrips: 2, spells: 3, features: 'Class Features' },
    { level: 2, health: 1, features: 'Class Feature, Talent, Path Progression' },
    { level: 3, health: 2, attribute: 1, skill: 1, trade: 1, mana: 2, spells: 1, features: 'Subclass Feature' },
    { level: 4, health: 1, features: 'Talent, Path Progression, 2 Ancestry Points' },
    { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, mana: 3, cantrips: 1, features: 'Class Feature' },
    { level: 6, health: 1, skill: 1, spells: 1, features: 'Subclass Feature, Path Progression' },
    { level: 7, health: 2, mana: 2, features: 'Talent, 2 Ancestry Points' },
    { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, cantrips: 1, features: 'Class Capstone Feature, Path Progression' },
    { level: 9, health: 2, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 2, features: 'Epic Boon, Talent' },
  ],
  features: [
    { level: 1, features: [
      { name: 'Magical Craftsman', description: magicalCraftsman },
      { name: 'Infusion Magic', description: infusionMagic },
      { name: 'Tinkerer (Flavor Feature)', description: tinkerer },
    ] },
    { level: 2, features: [
      { name: 'Mana Core', description: manaCore },
      { name: 'Talent', description: 'You gain 1 Talent of your choice. If the Talent has any prerequisites, you must meet those prerequisites to choose that Talent.' },
      { name: 'Path Progression', description: 'You gain the benefits of the Martial Path or Spellcaster Path.' },
    ] },
    { level: 3, features: [{ name: 'Subclass', description: 'Choose Apothecary, Armorer, or Paragon and gain its Level 3 Features.' }] },
    { level: 4, features: [
      { name: 'Talent', description: 'You gain 1 Talent of your choice. If the Talent has any prerequisites, you must meet those prerequisites to choose that Talent.' },
      { name: 'Path Progression', description: 'You gain the benefits of the Martial Path or Spellcaster Path.' },
      { name: 'Ancestry Points', description: 'You gain 2 Ancestry Points.' },
    ] },
    { level: 5, features: [{ name: 'Class Feature — Not Yet Developed', description: 'The Artificer Class Table reserves a Class Feature at this level, but DC20 Magazine Volume 16 does not publish its rules.' }] },
    { level: 6, features: [
      { name: 'Subclass Feature — Not Yet Developed', description: 'The Artificer Class Table reserves a Subclass Feature at this level, but DC20 Magazine Volume 16 does not publish its rules.' },
      { name: 'Path Progression', description: 'You gain the benefits of the Martial Path or Spellcaster Path.' },
    ] },
    { level: 7, features: [
      { name: 'Talent', description: 'You gain 1 Talent of your choice. If the Talent has any prerequisites, you must meet those prerequisites to choose that Talent.' },
      { name: 'Ancestry Points', description: 'You gain 2 Ancestry Points.' },
    ] },
    { level: 8, features: [
      { name: 'Class Capstone Feature — Not Yet Developed', description: 'The Artificer Class Table reserves a Class Capstone Feature at this level, but DC20 Magazine Volume 16 does not publish its rules.' },
      { name: 'Path Progression', description: 'You gain the benefits of the Martial Path or Spellcaster Path.' },
    ] },
    { level: 9, features: [{ name: 'Subclass Capstone Feature — Not Yet Developed', description: 'The Artificer Class Table reserves a Subclass Capstone Feature at this level, but DC20 Magazine Volume 16 does not publish its rules.' }] },
    { level: 10, features: [
      { name: 'Epic Boon', description: 'You gain an Epic Boon, as listed in the Artificer Class Table.' },
      { name: 'Talent', description: 'You gain 1 Talent of your choice. If the Talent has any prerequisites, you must meet those prerequisites to choose that Talent.' },
    ] },
  ],
  subclasses: ['Apothecary', 'Armorer', 'Paragon'],
  subclassFeatures: {
    Apothecary: [
      { level: 3, name: 'Potions & Poisons', description: 'You gain 2 Trade Points to use on Alchemy or Herbalism.\n\nYou learn the following Infusions: Spell Potion and Spell Bomb.\n\nWhen you create a potion, Spell Bomb, or poison, it gains 1 of the following additional benefits:\n\n• Bless: The target adds a d4 on the next Check they make within 1 minute.\n• Bane: The target subtracts a d4 on the next Check they make within 1 minute.' },
      { level: 3, name: 'Elixir Expert (Flavor Feature)', description: 'You have ADV on Checks you make to identify herbs, potions, poisons, or similar substances.' },
    ],
    Armorer: [
      { level: 3, name: 'Arcane Armor', description: 'You gain Combat Training in all Armor and all Shields.\n\nWhen you complete a Long Rest, you can imbue a set of Armor you’re touching with arcane power. The chosen Armor becomes your Arcane Armor with the following benefits:\n\n• Once per Long Rest, an Infusion you apply to your Arcane Armor costs 1 less MP than normal (minimum of 0 MP).\n• While your Arcane Armor is within 10 Spaces, you can spend 1 AP to call it back to you, provided it isn’t being held, it isn’t secured, and it has an unimpeded path to you. When you do, your Arcane Armor unequips itself from any creature wearing it, and then immediately flies to you, equips itself onto you, and attunes to you if it can (ending Attunement to any other creature). If you’re already wearing Armor, or choose not to equip it, your Arcane Armor instead falls in your Space at your feet.\n\nYou can have only 1 Arcane Armor at a time. The Armor ceases to be your Arcane Armor if you spend 1 AP to end it at anytime or if you use this Feature on another set of Armor.\n\nOverdrive\nWhen you use Overdrive from your Mana Core feature, you gain an additional benefit based on the Armor Type of your Arcane Armor:\n• Light Armor: For 1 Round, the Armor’s wearer becomes Invisible and its movement doesn’t provoke Opportunity Attacks.\n• Heavy Armor: The Armor gains a 1 Space Aura that lasts for 1 Round. Attacks are made with DisADV against creatures of your choice within this Aura.' },
      { level: 3, name: 'Armored Artisan (Flavor Feature)', description: 'You are an expert of the design, creation, and origin of armors. You have ADV on Checks made to identify the origin of and properties of armor and shields.' },
    ],
    Paragon: paragonFeatures,
  },
  talents: [
    { name: 'Ancestry Increase', description: 'You gain 4 Ancestry Points.', minimumLevel: 1, isRepeatable: true },
    { name: 'Attribute Increase', description: 'You gain 2 Attribute Points to put into any Attribute of your choice.\n\nDC Tip: You can only increase an Attribute up to your Attribute Limit.', minimumLevel: 1, isRepeatable: true },
    { name: 'Skill Increase', description: 'You gain 4 Skill Points.\n\nDC Tip: You can convert Skill Points into Trade Points or Language Points. See Mastery & Training for more information.', minimumLevel: 1, isRepeatable: true },
    { name: 'Martial Expansion', description: 'You can only gain this Talent once.\n\nYou gain the following benefits:\n• Combat Training: You gain Combat Training with Weapons, Heavy Armors, and all Shields.\n• Stamina Regen: You gain the Stamina Regen of the Class of your choice or the Spellcaster Path Stamina Regen. You can only benefit from 1 Stamina Regen per Round.\n• Maneuvers Known: You learn 2 Maneuvers.', minimumLevel: 1, isRepeatable: false },
    { name: 'Spellcasting Expansion', description: 'You can only gain this Talent once.\n\nYou gain the following benefits:\n• Combat Training: You gain Combat Training with Spell Focuses.\n• Spell List: You add 1 Spell Source or 3 Spell Schools of your choice to your Spell List.\n• Spells Known: You learn 3 Spells from your Spell List.', minimumLevel: 1, isRepeatable: false },
    { name: 'Artifice Engine', description: 'Requirements: 3rd Level, Infusion Magic\n\nWhen you cast a Spell, you can fuel its magic with the power of a Magic Item you’re holding or wearing. When you do, the MP cost of the Spell is reduced by an amount equal to the Magic Power value of the Magic Item (minimum of 0 MP cost) and you gain ADV on the Check made to cast the Spell. You can use this Talent once per Long Rest, and regain the ability to use it again when you roll for Initiative.\n\nInert Item: Once you use this Talent on a Magic Item, the item becomes Mundane for 12 hours or until you complete a Long Rest (whichever occurs first). If the Magic Item bore an Infusion, the Infusion ends on the item and is not restored unless you choose to add it again.\n\nRestrictions: If the Magic Item requires Attunement, you must be Attuned to it to use this Feature on it. You can’t use this Feature on an item with Charges or the Spell Storing Magic Property or Infusion.\n\nExample: An Artificer has a Mana Spend Limit of 4 and a Magic Item with a Magic Power value of 5. That Artificer can spend up to 4 MP to cast a Spell (up to its MSL), chooses to fuel the Spell with the item to reduce the cost by 5 MP (in this case reduce by 4 MP since the minimum cost is 0 MP), and cause the Magic Item to become Mundane (any Infusions on it disappear). The Magic Item regains its magic after 12 hours have passed or the Artificer completes a Long Rest.', minimumLevel: 3, isRepeatable: false },
    { name: 'Infusion Conduits', description: 'Requirements: 3rd Level, Infusion Magic\n\nWhile an item bearing one of your Infusions is within 10 Spaces of you:\n• You know the item’s exact location.\n• When you cast a Spell, you can do so as if you were standing in the Space that item is in.\n• You can communicate telepathically with a creature carrying or wearing the item.', minimumLevel: 3, isRepeatable: false },
  ],
  choiceGroups: [
    { id: 'artificer.tradeExpertise', level: 1, feature: 'Magical Craftsman', title: 'Trade Expertise', prompt: 'Choose the Trade whose Mastery Limit increases by 1.', limit: 1, options: [] },
    { id: 'artificer.artisanResistance', level: 1, feature: 'Magical Craftsman', title: 'Artisan’s Resistance', prompt: 'Choose the Elemental damage type to which you gain Resistance (Half).', limit: 1, options: ['Cold', 'Corrosion', 'Fire', 'Lightning', 'Poison'].map((name) => ({ name, description: `${name} Resistance (Half).`, isRepeatable: false, pointCost: 1 })) },
    { id: 'artificer.infusions', level: 1, feature: 'Infusion Magic', title: 'Infusions Known', prompt: 'Learn 3 Infusions. You can trade each Spell Known for one additional Infusion.', limit: 9, minimumSelections: 3, options: artificerInfusions },
    { id: 'artificer.manaCore', level: 2, feature: 'Mana Core', title: 'Mana Core Benefit', prompt: 'Choose the benefit granted while you wield or wear the item bearing your Mana Core.', limit: 1, options: [
      { name: 'Damage', description: 'Once per Round, an Attack you make deals +1 damage to all targets.\n\nOverdrive: When you make an Attack, it deals +1 damage to all targets (this stacks with the normal benefit).', isRepeatable: false, pointCost: 1 },
      { name: 'Damage Reduction — PDR', description: 'You gain PDR.\n\nOverdrive: When you take damage, you can reduce the damage taken by an amount equal to your Prime Modifier.', isRepeatable: false, pointCost: 1 },
      { name: 'Damage Reduction — EDR', description: 'You gain EDR.\n\nOverdrive: When you take damage, you can reduce the damage taken by an amount equal to your Prime Modifier.', isRepeatable: false, pointCost: 1 },
      { name: 'Damage Reduction — MDR', description: 'You gain MDR.\n\nOverdrive: When you take damage, you can reduce the damage taken by an amount equal to your Prime Modifier.', isRepeatable: false, pointCost: 1 },
      { name: 'Speed', description: 'Your Speed increases by 2.\n\nOverdrive: Any time on your turn, you can Teleport up to 5 Spaces to an unoccupied Space you can see.', isRepeatable: false, pointCost: 1 },
      { name: 'Focused', description: 'The item gains 1 Spell Focus Property.\n\nOverdrive: When you make a Spell Check, you gain a +5 bonus to the Check.', isRepeatable: false, pointCost: 1 },
    ] },
    { id: 'artificer.focusProperty', level: 2, feature: 'Mana Core', title: 'Focused Mana Core Property', prompt: 'If you chose Focused, choose the Spell Focus Property granted by the item bearing your Mana Core.', limit: 1, minimumSelections: 0, options: [
      { name: 'Channeling', description: 'You gain a +1 bonus to Spell Checks.', isRepeatable: false, pointCost: 1 },
      { name: 'Close Quarters', description: 'Your Ranged Spell Attacks don’t have DisADV if you’re within the Melee Range of enemies.', isRepeatable: false, pointCost: 1 },
      { name: 'Vicious', description: 'You gain a +1 bonus to hit with Spell Attacks.', isRepeatable: false, pointCost: 1 },
      { name: 'Protective', description: 'Your AD increases by 1.', isRepeatable: false, pointCost: 1 },
      { name: 'Warded', description: 'You have MDR.', isRepeatable: false, pointCost: 1 },
      { name: 'Long-Ranged', description: 'Spells you cast with a Range greater than 1 have their range increase by 5 Spaces.', isRepeatable: false, pointCost: 1 },
      { name: 'Reach', description: 'Spells you cast with a Range of 1 have their range increase by 1 Space.', isRepeatable: false, pointCost: 1 },
      { name: 'Muffled', description: 'Your Verbal Components can only be heard within 5 Spaces of you.', isRepeatable: false, pointCost: 1 },
      { name: 'Reactive', description: 'When you are the Challenger or a Participant helping the Challenger in a Spell Duel, they gain ADV on their Check to stop the Spell.', isRepeatable: false, pointCost: 1 },
      { name: 'Powerful', description: 'Your Spell Attacks deal +1 damage to all targets.', isRepeatable: false, pointCost: 1 },
    ] },
  ],
};

function tradeOptions(reference: CharacterReferenceData): ClassChoiceOptionReference[] {
  return reference.trades.map(({ name, description, attribute, group }) => ({
    name,
    description: `${group} • ${attribute ?? 'Varies'}\n\n${description}`,
    isRepeatable: false,
    pointCost: 1,
  }));
}

/** Adds newer magazine material without mutating the synced Beta JSON snapshot. */
export function augmentCharacterReference(reference: CharacterReferenceData): CharacterReferenceData {
  const psion = reference.classes.find(({ name }) => name === 'Psion');
  const patchedPsion = psion ? {
    ...psion,
    description: psion.description.replace(
      /Compatibility Note:[\s\S]*$/,
      'Compatibility Note: Psion v2 was written for DC20 Beta 0.9 and publishes Class Feature rules through level 2. DC20 Magazine 09 v1.1 adds the Oracle, Psi-Knight, and Paragon options at level 3, plus two level-3 Psion Class Talents. Later Psion Class and Subclass milestones remain unpublished. Because the Psion v2 Bonus HP column is blank, this app retains the Beta 0.10.5 spellcaster HP progression as a compatibility baseline.',
    ),
    features: psion.features.map((entry) => entry.level === 3 ? {
      ...entry,
      features: [{ name: 'Subclass', description: 'Choose Oracle, Psi-Knight, or Paragon and gain its Level 3 Features.' }],
    } : entry),
    subclasses: ['Oracle', 'Psi-Knight', 'Paragon'],
    subclassFeatures: psionSubclassFeatures,
    talents: [...psion.talents,
      { name: 'Greater Telekinesis', description: 'Requires: Telekinesis, Level 3\n\nYour Telekinesis becomes more powerful, granting you the following benefits:\n\n• The range of your Telekinesis increases to 10 Spaces.\n• Your Size is considered Large for the purposes of Telekinesis, and the amount of weight you can lift with it increases to 200lbs.\n• You can now interact with up to 2 objects or creatures using Telekinesis at a time. Once on each of your turns, you can freely move each object held by your Telekinesis to any Space within range, choosing where each object moves.', minimumLevel: 3, isRepeatable: false },
      { name: 'Psionic Fortress', description: 'Requires: Mind Sense, Level 3\n\nFor the duration of Mind Sense, you gain the following benefits:\n\n• Your thoughts can’t be read against your will.\n• You gain Psychic Resistance (Half) and ADV on Intelligence Saves.\n• When a creature you can detect makes a Mental Check or Save, you can spend 1 AP to grant the target ADV on its Check or Save. You can wait until after the creature rolls the d20 before deciding to use this Feature.', minimumLevel: 3, isRepeatable: false },
    ],
  } satisfies ClassReference : undefined;
  const classes = reference.classes.filter(({ name }) => name !== 'Psion' && name !== 'Artificer');
  if (patchedPsion) classes.push(patchedPsion);
  classes.push({
    ...artificer,
    choiceGroups: artificer.choiceGroups.map((group) => group.id === 'artificer.tradeExpertise'
      ? { ...group, options: tradeOptions(reference) }
      : group),
  });
  return {
    ...reference,
    source: `${reference.source}; ${PSION_SUBCLASS_SOURCE}; ${ARTIFICER_SOURCE}; shared sourcebook folder ${SOURCEBOOK_FOLDER_URL}`,
    classes: classes.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
