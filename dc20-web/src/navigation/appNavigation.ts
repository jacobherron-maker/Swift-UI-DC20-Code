import type { HubSection } from '../types/models';
import { HubSectionValues } from '../types/models';

export const PrimaryDestinationValues = {
  DASHBOARD: 'Dashboard',
  CHARACTERS: 'Characters',
  ENCOUNTERS: 'Encounters',
  LIBRARY: 'Library',
  CAMPAIGNS: 'Campaigns',
} as const;

export type PrimaryDestination = (typeof PrimaryDestinationValues)[keyof typeof PrimaryDestinationValues];

export type CreateTarget = 'Character' | 'Monster' | 'Encounter' | 'NPC' | 'Campaign' | 'Homebrew';

export interface ContentFocusRequest {
  key: number;
  kind: 'character' | 'monster' | 'encounter' | 'campaign' | 'npc' | 'rule' | 'power' | 'equipment';
  id?: string;
  name?: string;
  noteId?: string;
  powerKind?: 'Spell' | 'Maneuver';
}

export interface PrimaryDestinationDefinition {
  id: PrimaryDestination;
  icon: string;
  description: string;
  defaultSection: HubSection;
}

export const PRIMARY_DESTINATIONS: PrimaryDestinationDefinition[] = [
  { id: 'Dashboard', icon: '✦', description: 'Overview and recent work', defaultSection: HubSectionValues.DASHBOARD },
  { id: 'Characters', icon: '🧙', description: 'Characters and sheets', defaultSection: HubSectionValues.CHARACTERS },
  { id: 'Encounters', icon: '⚔', description: 'Monsters, encounters, and combat', defaultSection: HubSectionValues.ENCOUNTERS },
  { id: 'Library', icon: '📚', description: 'Rules and game content', defaultSection: HubSectionValues.LIBRARY },
  { id: 'Campaigns', icon: '🗺', description: 'Parties, notes, and sessions', defaultSection: HubSectionValues.CAMPAIGN },
];

export const LIBRARY_SECTIONS: Array<{ section: HubSection; label: string; shortLabel: string }> = [
  { section: HubSectionValues.RULES, label: 'Rules Reference', shortLabel: 'Rules' },
  { section: HubSectionValues.POWERS, label: 'Spells & Maneuvers', shortLabel: 'Powers' },
  { section: HubSectionValues.EQUIPMENT, label: 'Items & Equipment', shortLabel: 'Equipment' },
  { section: HubSectionValues.CHARACTER_OPTIONS, label: 'Character Options', shortLabel: 'Options' },
  { section: HubSectionValues.HOMEBREW, label: 'GM Vault', shortLabel: 'Vault' },
];

export const ENCOUNTER_SECTIONS: Array<{ section: HubSection; label: string; shortLabel: string }> = [
  { section: HubSectionValues.ENCOUNTERS, label: 'Encounter Builder', shortLabel: 'Builder' },
  { section: HubSectionValues.MONSTERS, label: 'Monsters & Bestiary', shortLabel: 'Monsters' },
  { section: HubSectionValues.COMBAT, label: 'Live Combat & Initiative', shortLabel: 'Combat' },
];

export function primaryDestinationForSection(section: HubSection): PrimaryDestination {
  if (section === HubSectionValues.CHARACTERS) return PrimaryDestinationValues.CHARACTERS;
  if (section === HubSectionValues.ENCOUNTERS || section === HubSectionValues.MONSTERS || section === HubSectionValues.COMBAT) return PrimaryDestinationValues.ENCOUNTERS;
  const librarySections = new Set<HubSection>([
    HubSectionValues.LIBRARY,
    HubSectionValues.RULES,
    HubSectionValues.POWERS,
    HubSectionValues.EQUIPMENT,
    HubSectionValues.CHARACTER_OPTIONS,
    HubSectionValues.HOMEBREW,
  ]);
  if (librarySections.has(section)) return PrimaryDestinationValues.LIBRARY;
  if (section === HubSectionValues.CAMPAIGN) return PrimaryDestinationValues.CAMPAIGNS;
  return PrimaryDestinationValues.DASHBOARD;
}

export function activeLibrarySection(section: HubSection): HubSection {
  return LIBRARY_SECTIONS.some((entry) => entry.section === section) ? section : HubSectionValues.RULES;
}

export function activeEncounterSection(section: HubSection): HubSection {
  return ENCOUNTER_SECTIONS.some((entry) => entry.section === section) ? section : HubSectionValues.ENCOUNTERS;
}
