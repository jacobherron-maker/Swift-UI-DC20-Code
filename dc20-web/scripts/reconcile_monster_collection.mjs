import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [pdfPath, libraryPath, mode = '--check'] = process.argv.slice(2);
if (!pdfPath || !libraryPath) {
  throw new Error('Usage: node scripts/reconcile_monster_collection.mjs <source.pdf> <MonsterSourceLibrary.json> [--write]');
}

const crops = {
  'Angelic Herald': [16, 'single'],
  'Animated Armor': [17, 'single'],
  'Animated Doll': [18, 'left'],
  Bandit: [18, 'right'],
  'Bandit Captain': [19, 'left'],
  'Brown Bear': [19, 'right'],
  Cherub: [20, 'left'],
  'Earth Tortoise': [20, 'right'],
  'Fairy Dragon': [21, 'single'],
  'Fiendish Harbinger': [22, 'single'],
  'Fire Lizard': [23, 'single'],
  Ghost: [24, 'single'],
  'Honey Ooze': [25, 'single'],
  'Ice Raven': [26, 'left'],
  Imp: [26, 'right'],
  'Juvenile Purple Drake': [27, 'left'],
  Mandrake: [27, 'right'],
  Manticore: [28, 'single'],
  'Mantrap Bloom': [29, 'single'],
  'Molten Glass Ooze': [30, 'single'],
  'Ogre Warrior': [31, 'single'],
  Pixie: [32, 'single'],
  'Skeleton Warrior': [33, 'left'],
  'Small Mimic': [33, 'right'],
  Sprite: [34, 'single'],
  'Storm Elemental': [35, 'single'],
  'Swarm of Bats': [36, 'left'],
  Wolf: [36, 'right'],
  Wyvern: [37, 'left'],
  Zombie: [37, 'right'],
};

const manualAbilityText = {
  'Animated Armor|Pathcarver': `Area Martial Attack vs AD, 4 Space Line, 1 Bludgeoning + 1 extra damage on a Heavy Hit. After Attacking, you can move to any Space within 1 Space of the area without provoking Opportunity Attacks from the targets and without spending your movement.`,
  'Ghost|Ghost Variants': `Modify the stat block in the following ways to make different variants:\n\nPossessor\nLoses Haunting Scream and gains new Possession Action.\n\nPoltergeist\nNew Feature:\nClose Quarters: Your Ranged Attacks don’t have DisADV if you’re within Melee Range of enemies.\n\nLoses Chilling Grasp and Haunting Scream, but gains new Invisibility and Throw Object Actions.`,
  'Ghost|Possession (Variant)': `Move to the Space of a creature within 10 Spaces and attempt to possess them. Contest, Spell Check vs Repeated Charisma Save. Failure: Target is possessed by you (considered a Curse) for 1 minute. While Possessed:\n\n• The target is Incapacitated and loses control of its body.\n\n• You control the target, using its statistics.\n\n• You’re within the target (Hidden and in Full Cover) and don’t take damage from Ethereal.\n\n• The possession ends early if the target drops to 0 HP, you end it for free, or the Curse is removed.`,
  'Ghost|Invisibility (Variant)': `You become Invisible for 1 Round or until you take any Action besides the Move, Dodge, or Hide Actions.`,
  'Ghost|Throw Object (Variant)': `Ranged Martial Attack vs AD, 10 Spaces, 2 Bludgeoning.\n\n• (+1) Extra Target: Target an additional creature within range.`,
};

function extractCrop(page, x, width) {
  return execFileSync('pdftotext', [
    '-f', String(page), '-l', String(page), '-layout',
    '-x', String(x), '-y', '0', '-W', String(width), '-H', '792',
    pdfPath, '-',
  ], { encoding: 'utf8' });
}

function sourceBlock(page, side) {
  if (side === 'left') return extractCrop(page, 0, 306);
  if (side === 'right') return extractCrop(page, 306, 306);
  return `${extractCrop(page, 0, 306)}\n${extractCrop(page, 306, 306)}`;
}

function cleanLines(text) {
  return text
    .replaceAll('\f', '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line
      && !/^\d+$/.test(line)
      && !/^(?:\d+\s+)?MONSTER C.*$/.test(line)
      && !/^C?OLLECTION(?:\s+\d+)?$/.test(line));
}

function paragraph(lines) {
  return lines.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
}

function findLabel(lines, label, start = 0) {
  return lines.findIndex((line, index) => index >= start && line.startsWith(label));
}

function parseProse(lines, name) {
  const descriptionIndex = findLabel(lines, 'Description:');
  const tacticsIndex = findLabel(lines, 'Tactics:', descriptionIndex + 1);
  const loreIndex = findLabel(lines, 'Lore:', tacticsIndex + 1);
  const sizeIndex = lines.findIndex((line, index) => index > loreIndex && /^(?:Micro|Tiny|Small|Medium|Large|Huge|Gargantuan)\s+.+\|\s+(?:Novice|Level)/.test(line));
  if ([descriptionIndex, tacticsIndex, loreIndex, sizeIndex].some((index) => index < 0)) {
    throw new Error(`${name}: failed to find prose or stat-block boundaries.`);
  }
  const statTitleIndex = sizeIndex - 1;
  const loreEndIndex = name === 'Ghost' ? findLabel(lines, 'Ghost Variants', loreIndex + 1) : statTitleIndex;
  return {
    descriptionText: paragraph([lines[descriptionIndex].slice('Description:'.length), ...lines.slice(descriptionIndex + 1, tacticsIndex)]),
    tactics: paragraph([lines[tacticsIndex].slice('Tactics:'.length), ...lines.slice(tacticsIndex + 1, loreIndex)]),
    lore: paragraph([lines[loreIndex].slice('Lore:'.length), ...lines.slice(loreIndex + 1, loreEndIndex)]),
    statLines: lines.slice(statTitleIndex),
  };
}

function escapedName(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
}

function abilityStart(line, name) {
  const pattern = new RegExp(`^(?:\\((?:\\d+|\\d+\\/R|\\d+\\/Round|Auto)\\)\\s+)?${escapedName(name)}(\\s+\\([^:]+\\))?:\\s*(.*)$`, 'i');
  return line.match(pattern);
}

function isSectionLine(line) {
  return /^(?:Features|Actions(?:\s*\(\d+\))?|Reactions|Round Actions|Legendary Actions|Legendary Reactions)$/.test(line)
    || /^Attack:\s*[+-]?\d+\s+Save DC:\s*\d+\s+Speed:/.test(line);
}

function parseAbilityText(statLines, abilities, monsterName) {
  const result = new Map();
  let active = null;
  for (const line of statLines) {
    let matched = null;
    for (const ability of abilities) {
      if (result.has(ability.id)) continue;
      const sourceName = ability.name;
      const match = abilityStart(line, sourceName);
      if (match) {
        matched = { ability, match, sourceName };
        break;
      }
    }
    if (matched) {
      active = matched.ability;
      const suffix = matched.match[1]?.trim();
      const opening = [suffix, matched.match[2]].filter(Boolean).join(' ');
      result.set(active.id, opening ? [opening] : []);
      continue;
    }
    if (monsterName === 'Animated Armor' && /^\(2\)\s+\S+carver:/.test(line)) {
      active = null;
      continue;
    }
    if (!active || isSectionLine(line)) continue;
    result.get(active.id).push(line);
  }

  const missing = abilities.filter(({ id, name }) => !result.has(id) && !manualAbilityText[`${monsterName}|${name}`]);
  if (missing.length) throw new Error(`${monsterName}: missing source labels for ${missing.map(({ name }) => name).join(', ')}`);
  return abilities.map((ability) => {
    const manual = manualAbilityText[`${monsterName}|${ability.name}`];
    const details = manual ?? paragraph(result.get(ability.id))
      .replace(/\s+•\s+/g, '\n\n• ')
      .replace(/\s+\|\s+/g, ' | ');
    return { ...ability, details };
  });
}

const originalLibrary = JSON.parse(readFileSync(libraryPath, 'utf8'));
const library = structuredClone(originalLibrary);
let updated = 0;
for (const monster of library) {
  if (monster.sourceBook !== 'DC20 Monster Collection v0.1') continue;
  const crop = crops[monster.name];
  if (!crop) throw new Error(`No source crop configured for ${monster.name}.`);
  const [page, side] = crop;
  const parsed = parseProse(cleanLines(sourceBlock(page, side)), monster.name);
  monster.descriptionText = parsed.descriptionText;
  monster.tactics = parsed.tactics;
  monster.lore = parsed.lore;
  monster.abilities = parseAbilityText(parsed.statLines, monster.abilities, monster.name);
  updated += 1;
}

if (updated !== Object.keys(crops).length) throw new Error(`Expected ${Object.keys(crops).length} monsters, updated ${updated}.`);
if (mode === '--write') writeFileSync(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
else if (JSON.stringify(library) !== JSON.stringify(originalLibrary)) throw new Error('MonsterSourceLibrary.json does not match the supplied source PDF. Run with --write to reconcile it.');
console.log(`${mode === '--write' ? 'Updated' : 'Validated'} ${updated} Monster Collection records.`);
