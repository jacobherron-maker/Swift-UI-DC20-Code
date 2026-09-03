import { describe, expect, it } from 'vitest';
import { migratePersistedState, parseCampaignBackup } from './campaignStore';

describe('campaign persistence migration', () => {
  it('upgrades the previous D&D-shaped monster and combat records without losing names or rules text', () => {
    const migrated = migratePersistedState({
      currentSection: 'Monsters',
      campaignData: {
        title: 'Old Campaign',
        customMonsters: [{
          id: 'legacy-monster',
          name: 'Old Drake',
          type: 'Dragon',
          ac: 15,
          stamina: 22,
          speed: { walk: '30 ft.' },
          abilities: [{ name: 'Strength', score: 18, modifier: 4 }],
          traits: [{ name: 'Scales', description: 'Reduces incoming physical damage.' }],
          actions: [{ name: 'Bite', description: 'A dangerous bite.' }],
          languages: ['Common', 'Draconic'],
        }],
        combats: [{
          id: 'legacy-combat',
          name: 'Old Battle',
          round: 2,
          firstTeam: 'heroes',
          combatants: [{
            id: 'legacy-combatant',
            name: 'Old Drake',
            team: 'enemies',
            stamina: 12,
            maxStamina: 22,
            status: 'Burning 1',
          }],
        }],
      },
    });

    expect(migrated.campaignData.customMonsters[0]).toMatchObject({
      id: 'legacy-monster',
      name: 'Old Drake',
      creatureType: 'Dragon',
      type: 'Standard',
      hp: 22,
      physicalDefense: 15,
      arcaneDefense: 15,
      languages: 'Common, Draconic',
    });
    expect(migrated.campaignData.customMonsters[0].abilities.map(({ name }) => name)).toEqual(['Scales', 'Bite']);
    expect(migrated.campaignData.combats[0].combatants[0]).toMatchObject({
      team: 'Enemies',
      hp: 12,
      maxHP: 22,
      conditions: ['Burning 1'],
    });
  });

  it('converts character records created by the D&D-shaped prototype into DC20 values', () => {
    const migrated = migratePersistedState({
      characters: [{
        id: 'legacy-character', name: 'Old Hero', level: 1, ancestry: 'Human', class: 'Wizard',
        attributes: {
          Might: { score: 15, modifier: 2 }, Agility: { score: 14, modifier: 2 },
          Intelligence: { score: 13, modifier: 1 }, Charisma: { score: 12, modifier: 1 },
        },
        healthPoints: 20, maxHealthPoints: 20, stamina: 10, maxStamina: 10,
        manaPoints: 0, maxManaPoints: 0, defense: 12,
      }],
    });
    const hero = migrated.characters[0];
    expect(hero.attributes.Might.score).toBe(2);
    expect(hero.attributes.Agility.score).toBe(2);
    expect(hero.attributes.Intelligence.score).toBe(1);
    expect(hero.class).toBe('Wizard');
    expect(hero.build?.attributeMethod).toBe('Standard Array');
    expect(hero.physicalDefense).toBe(12);
    expect(hero.arcaneDefense).toBe(12);
  });

  it('restores a versioned backup and validates its selected palette', () => {
    const migrated = parseCampaignBackup({
      format: 'dc20hub-web-backup',
      version: 4,
      exportedAt: '2026-09-02T00:00:00.000Z',
      state: {
        currentSection: 'Campaign',
        selectedPaletteID: 'druid-verdant',
        campaignData: { title: 'The Green March' },
        characters: [{ id: 'hero', name: 'Oak', avatarDataURL: 'data:image/webp;base64,UklGRg==', level: 2, class: 'Druid' }],
      },
    });

    expect(migrated.currentSection).toBe('Campaign');
    expect(migrated.selectedPaletteID).toBe('druid-verdant');
    expect(migrated.campaignData.title).toBe('The Green March');
    expect(migrated.characters[0].name).toBe('Oak');
    expect(migrated.characters[0].avatarDataURL).toBe('data:image/webp;base64,UklGRg==');
  });

  it('falls back to the default palette when an imported id is unknown', () => {
    const migrated = parseCampaignBackup({ selectedPaletteID: 'not-a-real-palette' });
    expect(migrated.selectedPaletteID).toBe('amethyst-archive');
  });

  it('migrates the former default title and legacy language mastery to fluency', () => {
    const migrated = migratePersistedState({
      campaignData: { title: 'The Amethyst Chronicle' },
      characters: [{
        id: 'linguist', name: 'Linguist', level: 1, class: 'Bard',
        build: { languageMasteries: { Common: 'Novice', Elvish: 'Adept' } },
      }],
    });
    expect(migrated.campaignData.title).toBe('DC20 Hub');
    expect(migrated.characters[0].build?.languageFluencies).toEqual({ Common: 'Fluent', Elvish: 'Limited' });
  });
});
