/**
 * Source-faithful rule text transcribed from the printed pages cited by each
 * Rules Reference entry. Source-side wording is intentionally preserved.
 */
export const VERIFIED_RULE_TEXT_OVERRIDES: Readonly<Record<string, string>> = {
  'Condition Rules': `CONDITION RESISTANCE, IMMUNITY, & VULNERABILITY
Condition Resistance represents a creature’s ability to resist being subjected to Conditions, while Condition Vulnerability represents a creature’s weakness against them. Where as Immunity prevents a creature from being affected by it at all. The source of a creature’s Condition Resistance, Immunity or Vulnerability can be attained from a Class Feature, Ancestry Trait, Magic Item, Spell, etc.

CONDITION RESISTANCE
Condition Resistance: You have ADV on Checks and Saves against the Condition.

Example: If you had Charmed Resistance, you would have ADV on Checks or Saves against being Charmed.

CONDITION IMMUNITY
Condition Immunity: You can’t be subjected to the Condition.

Example: If you had Frightened Immunity, you can’t be Frightened.

CONDITION VULNERABILITY
Condition Vulnerability: You have DisADV on Checks and Saves against the Condition.

Example: If you had Taunted Vulnerability, you would have DisADV on Checks or Saves against being Taunted.

CONDITION STACKING & OVERLAPPING
Certain Conditions can stack multiple times, increasing the potency of the Condition’s effects on the target. Other Conditions overlap, keeping the same potency but becoming more restrictive.

STACKING CONDITIONS
A target can be affected by a Condition with an X value multiple times. If you gain multiple stacks of the same Condition, you add their X values together. If a stacking Condition doesn’t include an X value, the value equals 1.

Example: If you were Exposed and another effect imposed the Exposed Condition on you again, you would become Exposed 2, causing Attacks against you to have ADV 2 (roll 3 d20s and take the highest).

Durations: When a creature is subjected to the same Condition multiple times but with different durations, it’s important to keep track of the source of each Condition so you know when each Condition ends.

Example: You might be Exposed against the next Attack against you, Exposed until the end of your next turn, and Exposed for 1 minute, all at the same time. These effects stack, but you need to track them independently to make sure you know how “Exposed” you currently are.

OVERLAPPING CONDITIONS
A target can be effected by each of the following Condition multiple times, but the effects of the same Condition don’t stack on the target.

CHARMED
A creature can be Charmed by more than 1 creature at a time, each of them gaining ADV on Charisma Checks against the target. However, a creature that Charms a target more than once only gains the effects of the Charmed Condition once.

Example: A creature doesn’t have ADV 2 on Charisma Checks against a target they’ve Charmed twice. They only have ADV 1 on Charisma Checks against the target.

FRIGHTENED
A creature can be Frightened by more than 1 creature at a time, suffering DisADV on Checks while any source that Frightened it is within its sight and is unable to move toward them. However, a Frightened creature only suffers the effects of the Frightened Condition once.

Example: A creature doesn’t have DisADV 2 on Checks while 2 sources that are Frightening it are in sight. They only have DisADV 1 on Checks, regardless of the number of sources in sight.

RESTRAINED
A creature that is Restrained by more than 1 creature only suffers the effects of the Restrained Condition once. However, a creature Restrained by multiple sources will remain Restrained until they are free from being Restrained by all sources.

TAUNTED
A creature that is Taunted by multiple creatures does not have DisADV on their Attacks against creatures that Taunted them. They can only move away from any creature that Taunted them if they are moving towards another creature that Taunted them.

Example: If a Goblin is Taunted by a Hunter, then later becomes Taunted by a Champion, the Goblin can only move away from the Hunter if they are approaching the Champion and can Attack both normally.

TERRIFIED
A creature can be Terrified by more than 1 source at a time.

Example: If a creature is surrounded by multiple sources, they are unable to move and can only take the Dodge Action.

TETHERED
A creature that is Tethered by more than 1 effect, must remain within reach of all the specified Tethers.

Example: If a creature is Tethered 5 Spaces by one effect, and then Tethered 5 Spaces by another effect, it can’t move farther than 5 Spaces from either Tether.

EXCLUDED CONDITIONS
The following Conditions don’t stack or overlap in any way: Blinded, Deafened, Immobilized, Incapacitated, Invisible, Paralyzed, Petrified, Surprised, and Unconscious.`,

  Resting: `RESTING
This happens during Exploration but are specific moments when PCs stop to rest and recover their resources, spend Rest Points, and perform specific Rest Actions. This could be 10 minutes, 1 hour, or 8 hours depending on the type of Rest being taken. These moments can include roleplay and descriptions of what happens, but they’re primarily mechanical in nature.

REST TERMS
Rest Points: You have a number of Rest Points equal to your HP maximum.

No Activity: Sleeping, meditating, or contemplating while idle.

Light Activity: Non-strenuous activity that requires little effort, such as talking, reading, eating, bandaging wounds, light foraging, and standing watch.

Strenuous Activity: Any activity that requires physical exertion, such as traveling, hunting, exercising, training, or casting spells.

Dangerous Activity: Any activity that causes extreme injury or stress, such as engaging in combat with a hostile creature.

TYPES OF REST
QUICK REST
A period of No Activity or Light Activity that is at least 10 minutes long.

Quick Rest Benefits: You can spend 1 or more Rest Points, up to your maximum, at the end of a Quick Rest. When you do, you regain 1 HP per Rest Point spent.

SHORT REST
A period of No Activity or Light Activity that is at least 1 hour long. You can only gain the benefits of 2 Short Rests per 24 hour period.

Short Rest Benefits: At any point during a Short Rest, you can spend Rest Points to regain HP following the same rules as a Quick Rest. Some Features regain expended uses when you complete a Short Rest (as listed in the Feature’s description).

LONG REST
A period of 4 hours of Light Activity and 4 hours of No Activity, taken in either order, for a total of 8 hours of resting. If one of the 4 hour periods is interrupted by any amount of Strenuous Activity or Dangerous Activity, you must begin that 4 hour period again. You can only gain the benefits of 1 Long Rest per 24 hour period.

LONG REST BENEFITS
At any point during a Long Rest, you can spend Rest Points to regain HP following the same rules as a Quick Rest.

Half Long Rest: At the end of the first 4 hour period of the rest, you gain the benefits of a Short Rest and regain all spent Rest Points.

DC Tip: Make sure to spend any unused Rest Points at the beginning of a Long Rest, since you regain all spent Rest Points after the first 4 hours of a Long Rest.

Complete Long Rest: At the end of the second 4 hour period of the rest, you gain the full benefits of completing the Long Rest. Some Features regain expended uses when you complete a Long Rest (as listed in the Feature’s description), such as regaining all spent MP.

DC Tip: You might just want to take a Half Long Rest (4 hour rest) if you only need to regain HP.

DOOMED
When you complete a Long Rest, you lose all stacks of the Doomed Condition.

EXHAUSTION
For each 4 hour period doing No Activity, you lose 1 stack of Exhaustion.

If neither of the 4 hour periods are spent doing No Activity, you must make a DC 10 Might Save. Failure: You gain Exhaustion 1 and the DC of this Save now increases by 5 until you complete a Full Rest.

FULL REST
A 24 hour or longer period (determined by the GM) that is spent in an area of safety, such as a town, where you can eat well, rest, and recover. If the Full Rest is interrupted by any amount of Dangerous Activity you must begin it again.

Full Rest Benefits: At the end of a Full Rest, you gain the benefits of a Long Rest and lose all levels of Exhaustion. Your GM can determine if the Full Rest also grants additional benefits by choosing from the list below (or make up something that makes more sense in the given situation):
• Gain Temp HP equal to your Prime Modifier, your level, or twice your level.
• Gain ADV on a type of Check, Save, or both for a given period of time (1 day, 1 week, etc.).`,

  Weapons: `WEAPONS
Every Weapon has a Weapon Type (Melee or Ranged), a Weapon Style (Axe, Sword, Hammer, etc.), and Weapon Properties (Reach, Thrown, Two-Handed, etc.).

WEAPON TYPES
There are 2 types of Weapons: Melee Weapons and Ranged Weapons.

MELEE WEAPONS
Melee Weapons use your Melee Range (see “Melee Weapons” on page 164).

RANGED WEAPONS
Ranged Weapons have a Range of 15/45 (see “Ranged Weapons” on page 164).

DC Tip: A Weapon with the Long-Ranged Property has a Range of 30/90.

WIELDING A WEAPON
A Weapon requires 1 hand when you Attack with it, unless it has the Two-Handed Property (requires 2 hands to Attack).

Throwing Weapons: When you throw a Weapon that lacks the Toss or Thrown Properties, the Weapon is considered an Improvised Weapon for the purposes of the Attack. See “Throwing Melee Weapons” on page 161 for more information.

WEAPON STYLES
Each Weapon Style listed below possesses a Weapon Enhancement that defines their unique combat applications and flair. When a PC with Weapon Training makes an Attack with a Weapon, they can spend 1 AP or 1 SP to use its Weapon Enhancement.

AXE
Bleed: The target makes a Repeated Physical Save. Failure: The target begins Bleeding.

BOW
Slow: The target makes an Agility Save. Failure: The target is Slowed until the end of its next turn.

CROSSBOW
Accuracy: You add a d4 to your Attack Check.

FIST
Fist Weapons are considered to be a free hand for the purposes of Grappling.

Grapple: The target makes a Physical Save. Failure: The target becomes Grappled by you.

HAMMER
Knockback: The target makes a Might Save. Failure: The target is pushed 1 Space away. Each time you use this Enhancement, the target is pushed 1 additional Space.

PICK
Hinder: The target makes an Agility Save. Failure: The target becomes Hindered until the end of their next turn.

SLING
Hinder: The target makes an Agility Save. Failure: The target becomes Hindered until the end of their next turn.

SPEAR
Slow: The target makes an Agility Save. Failure: The target becomes Slowed until the end of their next turn.

STAFF
Trip: The target makes a Physical Save. Failure: The target falls Prone.

SWORD
Accuracy: You add a d4 to your Attack Check.

WHIP
Pull: The target makes a Might Save. Failure: The target is moved horizontally 1 Space toward you or to your left or right. Each time you use this Enhancement, the target is moved 1 additional Space.

LACKING WEAPON TRAINING
While wielding a Weapon you lack Training with, you can’t use its Weapon Enhancement.

WEAPON PROPERTIES
Weapons have certain properties that grant them different benefits or drawbacks.
• Ammo: This Weapon requires ammunition to make Attacks. You can load a Weapon as part of an Attack made with it.
• Concealable: Drawing the Weapon doesn’t provoke Opportunity Attacks. If you draw the Weapon as part of an Attack, you have ADV on the Attack. You can only gain this benefit once against each creature per Combat.
• Cumbersome: It takes 1 AP to draw, stow, or pick up this Weapon.
• Deft: Ranged Attacks with this Weapon don’t have DisADV as a result of you being Prone.
• Guard: You gain +1 PD while wielding the Weapon.
• Heavy: The Weapon’s damage increases by 1.
• Impact: The Weapon deals +1 damage on Heavy Hits.
• Long-Ranged: The Weapon’s Range increases to 30/90.
• Multi-Faceted: The Weapon gains a second Weapon Style. When you make an Attack with the Weapon, you can use both Weapon Enhancements and choose which of the Weapon Style damage types it deals.
• Reach: This Weapon adds 1 Space to your Melee Range when you Attack with it.
• Reload: The Weapon’s damage increases by 1, but you must spend 1 AP or 1 SP and use a free hand to reload the Weapon. If the Weapon stops being held, it must be loaded again.
• Silent: When you make a Ranged Attack with the Weapon while Hidden, you remain Unheard by creatures you’re Hidden from.
• Toss: You can throw the Weapon to make a Ranged Martial Attack (5/10). If you throw it further than this range (see “Throwing” on page 161) it’s considered an Improvised Weapon.
• Thrown: You can throw the Weapon to make a Ranged Martial Attack (10/20). If you throw it further than this range (see “Throwing” on page 161) it’s considered an Improvised Weapon.
• Two-Handed: The Weapon requires 2 hands when you Attack with it.
• Unwieldy: You have DisADV on Attacks made with the Weapon against targets within 1 Space of you.
• Versatile: This Weapon can be wielded with 1 or 2 hands. When you wield the Weapon with 2 hands, you gain a +2 bonus to Hit using it.
• Returning: (Requires: Toss or Thrown Property) When you Miss a Ranged Attack with the Weapon, it returns to your hand.`,

  'Spell Focuses': `SPELL FOCUSES
You must be holding a Spell Focus in a hand to benefit from its Properties. Holding a Spell Focus counts as performing Somatic Components but is still considered noticeably casting a Spell.

SPELL FOCUS PROPERTIES
Spell Focuses have certain properties that grant them different benefits or drawbacks.
• Channeling: You gain a +1 bonus to Spell Checks.
• Close Quarters: Your Ranged Spell Attacks don’t have DisADV if you’re within the Melee Range of enemies.
• Long-Ranged: Spells you cast with a Range greater than 1 have their range increase by 5 Spaces.
• Muffled: Your Verbal Components can only be heard within 5 Spaces of you.
• Powerful: Your Spell Attacks deal +1 damage to all targets.
• Protective: Your AD increases by 1.
• Reach: Spells you cast with a Range of 1 have their range increase by 1 Space.
• Reactive: When you are the Challenger or a Participant helping the Challenger in a Spell Duel, they gain ADV on their Check to stop the Spell.
• Two-Handed: The Spell Focus requires 2 hands to benefit from its properties.
• Vicious: You gain a +1 bonus to hit with Spell Attacks.
• Warded: You have MDR.

LACKING SPELL FOCUS TRAINING
While wielding a Spell Focus you lack Training with, you do not benefit from its properties.

CUSTOMIZED FOCUSES
When you pick a Spell Focus during Character Creation (or craft one later), you can grant it 1 point worth of Focus Properties. You can’t grant a Focus the same Property more than once.

PROPERTY REQUIREMENTS
If a Spell Focus Property has a requirement, the Focus must meet that requirement before you can add that Property to it.`,

  Armor: `ARMOR
Wearing Armor can improve your Defense and provide Damage Reduction. Creatures that aren’t wearing Armor are considered Unarmored.

ARMOR TYPE
There are 2 types of Armor: Light Armor and Heavy Armor.

LIGHT ARMOR
Light Armor is a type of protection worn by most creatures to protect them from injury. Leather coats, padded jackets, and heavy robes are types of Light Armor.

Non-Metal Armor: Light Armor can be described to be made of many things but is not made of enough metal to be considered Metal Armor for the purpose of game mechanics (Features, Spells, Weapon effects, etc.) unless otherwise stated.

HEAVY ARMOR
Heavy Armor is designed with greater attention in protecting the wearer in traditional warfare, requiring extensive combat training to use most effectively. Lamellar, laminar, and plate armor are types of Heavy Armor.

Metal Armor: All Heavy Armor is considered to be Metal Armor for the purpose of game mechanics (Features, Spells, Weapon effects, etc.) unless otherwise stated.

Impactful Unarmed Strikes: Your Unarmed Strikes deal +1 damage on a Heavy Hits while wearing Heavy Armor.

WEARING ARMOR
It takes 1 minute to don or doff Light Armor, or 10 minutes to do the same with Heavy Armor. You gain the benefits of Armor while wearing it.

LACKING ARMOR TRAINING
While wearing Armor that you lack Training in, you have DisADV on Attack Checks and Spell Checks.

DAMAGE REDUCTION
Some types of Armor grant Physical or Elemental Damage Reduction (see “Damage Reduction” on page 38 for more information).

CUSTOMIZED ARMOR
When you pick your Armor during Character Creation (or craft one later), you choose for it to be Light or Heavy Armor and can grant it 2 points worth of Armor Properties available to that Armor type. You can’t grant Armor the same Property more than once, unless otherwise stated.

LIGHT ARMOR PROPERTIES
These Armor Properties are available to Light Armor.
• (1) PD Increase: The Armor’s PD Bonus increases by 1. You can take this Property twice.
• (1) AD Increase: The Armor’s AD Bonus increases by 1. You can take this Property twice.
• (2) EDR: The Armor grants Elemental Damage Reduction.

HEAVY ARMOR PROPERTIES
These Armor Properties are available to Heavy Armor.
• (1) PD Increase: The Armor’s PD Bonus increases by 1. You can take this Property twice.
• (1) AD Increase: The Armor’s AD Bonus increases by 1. You can take this Property twice.
• (2) PDR: The Armor grants Physical Damage Reduction.
• (2) EDR: The Armor grants Elemental Damage Reduction.
• (-1) Bulky: Your Speed is reduced by 1.
• (-1) Rigid: You have DisADV on Agility Checks.`,

  Shields: `SHIELDS
SHIELD TYPE
There are 2 types of Shields: Light Shields and Heavy Shields.

LIGHT SHIELDS
Light Shields are simple and easy to wield. A Buckler is a type of Light Shield.

HEAVY SHIELDS
Heavy Shields are designed for warfare. A Tower Shield is a type of Heavy Shield.

WIELDING A SHIELD
You can spend 1 AP to equip or stow a Shield. A Shield occupies the hand that’s wielding it. You gain the benefits of a Shield while wielding it.

LACKING SHIELD TRAINING
While wielding a Shield that you lack Training in, you have DisADV on Attack Checks and Spell Checks.

ATTACKING WITH SHIELDS
You can make a Melee Martial Attack with a Shield you have Training in, dealing 1 Bludgeoning damage on a Hit.

Throwing Shields: When you throw a Shield that lacks the Toss Property, the Shield is considered an Improvised Weapon for the purposes of the Attack. See Throwing Weapons for more information.

WIELDING TWO SHIELDS
While wielding multiple Shields, you are subjected to the following:
• You only gain the bonuses of one Shield at a time (your choice). You can spend a Minor Action to change which wielded Shield to benefit from.
• You are immune to Flanking.

SHIELD PROPERTIES
Shields have certain properties that grant them different benefits.
• Grasp: The Shield is considered to be a free hand when Grappling, Reloading a Weapon, or Attacking with Versatile Weapon.
• Mounted: The Shield’s Bonus also applies to your Mount’s Defense.
• Toss: You can throw the Shield to make a Ranged Martial Attack (5/10). If you throw it further than this range (see “Throwing Melee Weapons” on page 161) it’s considered an Improvised Weapon.

CUSTOMIZED SHIELDS
When you pick your Shield during Character Creation (or craft one later), you choose for it to be a Light or Heavy Shield and can grant it 2 points worth of Shield Properties available to that Shield type. You can’t grant a Shield the same Property more than once, unless otherwise stated.

LIGHT SHIELD PROPERTIES
These Shield Properties are available to Light Shields.
• (1) PD Increase: The Shield’s PD Bonus increases by 1.
• (1) AD Increase: The Shield’s AD Bonus increases by 1.
• (1) Grasp: The Shield is considered to be a free hand when Grappling, Reloading a Weapon, or Attacking with Versatile Weapon.
• (1) Toss: You can throw the Shield to make a Ranged Martial Attack (5/10). If you throw it further than this range (see Throwing Rules) it’s considered an Improvised Weapon.

HEAVY SHIELD PROPERTIES
These Shield Properties are available to Heavy Shields.
• (1) PD Increase: The Shield’s PD Bonus increases by 1. You can take this Property twice.
• (1) AD Increase: The Shield’s AD Bonus increases by 1. You can take this Property twice.
• (1) Mounted: The Shield’s PD and AD Bonuses also apply to your Mount’s Defenses.
• (2) PDR: The Shields grants Physical Damage Reduction.
• (2) EDR: The Shield grants Elemental Damage Reduction.
• (-1) Bulky: Your Speed is reduced by 1.
• (-1) Rigid: You have DisADV on Agility Checks.`,

  'Adventuring Supplies': `ADVENTURING SUPPLIES
GAUNTLET
You can purchase Gauntlets from a Blacksmith (or they come automatically with Heavy Armor). Wearing a Gauntlet gives your Unarmed Strikes with that hand the Impact Weapon Property (+1 damage on Heavy Hits).

Beta Note: Prices are not set for things like Gauntlets, so a simple 5g should be a good price for now.

HEALING POTIONS
Healing Potions are crafted to magically heal wounds when consumed. These are small (usually red) vials of liquid that are small doses but potent in healing.

HEALING POTION LEVELS
Healing Potions have levels to them that increase in potency and cost.

HEALING POTION LEVEL TABLE
Level X: 2 x Level in HP
1st: 2 HP • 10
2nd: 4 HP • 25
3rd: 6 HP • 40
4th: 8 HP • 60
5th: 10 HP • 100

MEDICINE KIT
A Medicine Kit can take many forms based on your PC’s theme or expression and is full of supplies and tools such as ointments, tinctures, bandages, and other medicinal reagents.

Uses: A fully stocked kit contains 5 uses.

Using A Kit: You can take the Object Action and spend 1 use of this kit to treat the wounds of a creature within 1 Space, or cure a Poison affecting it.

TREATING A WOUND
You treat a creature’s wounds. Make a DC 10 Medicine Check. Success: Target regains 1 HP. Success (each 5): Target regains +1 HP.

Limited Healing: Healing from this kit can’t restore a creature’s HP above its Bloodied threshold.

TREATING A POISON OR DISEASE
You treat one Basic Poison or Disease afflicting the target. Make a Medicine Check against the DC of the effect. Success: Target is cured of that Poison or Disease and no longer suffers its effect. Success (each 5): The creature regains +1 HP.

Advanced Poisons: You can treat one Advanced Poison instead, provided you have its unique additive. One use of that additive is lost every time you attempt to do so.

Beta Note: Diseases are still a work in progress. If they’re included in adventures or monsters at a later date, these rules will suffice for treating them as if they were poisons, or those materials will detail how a PC could treat presented Diseases.

RESUPPLYING A MEDICINE KIT
Buying Supplies: The various supplies contained within this kit can be found in most towns and climates. Enough supplies for 1 use can be bought for 5 gold at a general store.

Gathering Supplies: You can scavenge from an appropriate climate (GM’s discretion) with a DC 15 Survival Check. Success: The kit regains 1 use. Success (each 5): +1 use.

NET
You can throw the Net. Make a Martial Check contested by the target’s Physical Save. The Net has no effect on creatures that are formless, smaller than Small, or larger than Large. Save Failure: The target is Immobilized by the Net until it’s freed. Save Failure (5): The target is also Restrained until it’s freed. Forced movement doesn’t free the target, but teleportation does. A creature can spend 1 AP to make a DC 10 Athletics or Acrobatics Check. Success: It can free itself or another creature within its reach.

DC Tip: A Medium sized creature can spend 1 AP to throw an Net up to a number of Spaces away equal to twice their Might (a Small sized creature can throw it half as far). For the purposes of throwing, your minimum Might is 1. The total distance thrown is halved if thrown vertically. See “Throwing” on page 161 for more information.`,
};

export const FULLY_VERIFIED_RULE_TEXT_TITLES = new Set(['Condition Rules', 'Resting']);
