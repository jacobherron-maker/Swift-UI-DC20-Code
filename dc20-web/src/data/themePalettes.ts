export interface ThemePalette {
  id: string;
  name: string;
  associatedClass: string;
  symbol: string;
  accent: string;
  highlight: string;
  background: string;
  backgroundSecondary: string;
}

export const DEFAULT_PALETTE_ID = 'amethyst-archive';

export const themePalettes: ThemePalette[] = [
  { id: 'amethyst-archive', name: 'Amethyst Archive', associatedClass: 'DC20 Hub', symbol: '✦', accent: '#8C4CF2', highlight: '#C8A5FF', background: '#0E0917', backgroundSecondary: '#241036' },
  { id: 'barbarian-ember', name: 'Ember Rage', associatedClass: 'Barbarian', symbol: '🔥', accent: '#E05A38', highlight: '#F2A65A', background: '#160A08', backgroundSecondary: '#35100C' },
  { id: 'bard-velvet', name: 'Velvet Encore', associatedClass: 'Bard', symbol: '♫', accent: '#D552B6', highlight: '#F4B7E7', background: '#150817', backgroundSecondary: '#33102E' },
  { id: 'champion-aegis', name: 'Gilded Aegis', associatedClass: 'Champion', symbol: '◈', accent: '#E6B84D', highlight: '#F9E7A6', background: '#11131A', backgroundSecondary: '#302713' },
  { id: 'cleric-dawn', name: 'Dawn Sanctuary', associatedClass: 'Cleric', symbol: '☀', accent: '#F2D06B', highlight: '#D9F3FF', background: '#0E1320', backgroundSecondary: '#2B2818' },
  { id: 'commander-war-table', name: 'War Table', associatedClass: 'Commander', symbol: '⚑', accent: '#C64C4C', highlight: '#F0C27B', background: '#121018', backgroundSecondary: '#2B1518' },
  { id: 'druid-verdant', name: 'Verdant Circle', associatedClass: 'Druid', symbol: '☘', accent: '#55B76A', highlight: '#A8D98C', background: '#08130D', backgroundSecondary: '#0F2A18' },
  { id: 'hunter-wildwood', name: 'Wildwood', associatedClass: 'Hunter', symbol: '⌖', accent: '#7FB34D', highlight: '#D2A85A', background: '#0C1209', backgroundSecondary: '#1A2A10' },
  { id: 'monk-still-flame', name: 'Still Flame', associatedClass: 'Monk', symbol: '◉', accent: '#E58A46', highlight: '#F1D59B', background: '#140D08', backgroundSecondary: '#2B1A0F' },
  { id: 'psion-mindscape', name: 'Mindscape', associatedClass: 'Psion', symbol: '◇', accent: '#5ED0D8', highlight: '#A88BFF', background: '#07131A', backgroundSecondary: '#0C2833' },
  { id: 'rogue-midnight', name: 'Midnight Coin', associatedClass: 'Rogue', symbol: '☾', accent: '#7986A8', highlight: '#C9A35B', background: '#080A10', backgroundSecondary: '#141A28' },
  { id: 'sorcerer-prismatic', name: 'Prismatic Blood', associatedClass: 'Sorcerer', symbol: '✧', accent: '#EF5C8D', highlight: '#8E69FF', background: '#170812', backgroundSecondary: '#381126' },
  { id: 'spellblade-runic', name: 'Runic Steel', associatedClass: 'Spellblade', symbol: '⚔', accent: '#4DB3E6', highlight: '#B58AFF', background: '#080F18', backgroundSecondary: '#102640' },
  { id: 'summoner-eidolon', name: 'Eidolon Bond', associatedClass: 'Summoner', symbol: '◆', accent: '#62C7A5', highlight: '#C684E8', background: '#081412', backgroundSecondary: '#132A25' },
  { id: 'warlock-pact', name: 'Forbidden Pact', associatedClass: 'Warlock', symbol: '◉', accent: '#9B63D9', highlight: '#D35576', background: '#100814', backgroundSecondary: '#2A1031' },
  { id: 'wizard-azure', name: 'Arcane Azure', associatedClass: 'Wizard', symbol: '▣', accent: '#4D7FE8', highlight: '#8FD7FF', background: '#080D1A', backgroundSecondary: '#111F3D' },
];

export function themePalette(id: string): ThemePalette {
  return themePalettes.find((palette) => palette.id === id) ?? themePalettes[0];
}
