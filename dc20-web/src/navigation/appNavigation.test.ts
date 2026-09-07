import { describe, expect, it } from 'vitest';
import { HubSectionValues } from '../types/models';
import {
  activeEncounterSection,
  activeLibrarySection,
  ENCOUNTER_SECTIONS,
  LIBRARY_SECTIONS,
  PRIMARY_DESTINATIONS,
  primaryDestinationForSection,
} from './appNavigation';

describe('DC20 Hub information architecture', () => {
  it('exposes exactly the five requested primary destinations in order', () => {
    expect(PRIMARY_DESTINATIONS.map(({ id }) => id)).toEqual([
      'Dashboard',
      'Characters',
      'Encounters',
      'Library',
      'Campaigns',
    ]);
  });

  it('routes every legacy workspace into one of the five destinations', () => {
    expect(primaryDestinationForSection(HubSectionValues.DASHBOARD)).toBe('Dashboard');
    expect(primaryDestinationForSection(HubSectionValues.DICE)).toBe('Dashboard');
    expect(primaryDestinationForSection(HubSectionValues.CHARACTERS)).toBe('Characters');
    expect(primaryDestinationForSection(HubSectionValues.ENCOUNTERS)).toBe('Encounters');
    expect(primaryDestinationForSection(HubSectionValues.COMBAT)).toBe('Encounters');
    expect(primaryDestinationForSection(HubSectionValues.CAMPAIGN)).toBe('Campaigns');

    for (const section of [
      HubSectionValues.LIBRARY,
      HubSectionValues.RULES,
      HubSectionValues.MONSTERS,
      HubSectionValues.POWERS,
      HubSectionValues.EQUIPMENT,
      HubSectionValues.CHARACTER_OPTIONS,
      HubSectionValues.HOMEBREW,
    ]) {
      expect(primaryDestinationForSection(section)).toBe('Library');
    }
  });

  it('keeps combat and every library collection reachable through contextual tabs', () => {
    expect(ENCOUNTER_SECTIONS.map(({ section }) => section)).toEqual([
      HubSectionValues.ENCOUNTERS,
      HubSectionValues.COMBAT,
    ]);
    expect(LIBRARY_SECTIONS.map(({ section }) => section)).toEqual([
      HubSectionValues.RULES,
      HubSectionValues.MONSTERS,
      HubSectionValues.POWERS,
      HubSectionValues.EQUIPMENT,
      HubSectionValues.CHARACTER_OPTIONS,
      HubSectionValues.HOMEBREW,
    ]);
    expect(activeEncounterSection(HubSectionValues.COMBAT)).toBe(HubSectionValues.COMBAT);
    expect(activeEncounterSection(HubSectionValues.DASHBOARD)).toBe(HubSectionValues.ENCOUNTERS);
    expect(activeLibrarySection(HubSectionValues.EQUIPMENT)).toBe(HubSectionValues.EQUIPMENT);
    expect(activeLibrarySection(HubSectionValues.DASHBOARD)).toBe(HubSectionValues.RULES);
  });
});
