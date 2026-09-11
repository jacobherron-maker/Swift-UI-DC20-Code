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
        manaPoints: 0, maxManaPoints: 0, defense: 12, gold: -25,
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
    expect(hero.gold).toBe(0);
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
        characters: [{ id: 'hero', name: 'Oak', avatarDataURL: 'data:image/webp;base64,UklGRg==', level: 2, class: 'Druid', gold: 125 }],
      },
    });

    expect(migrated.currentSection).toBe('Campaign');
    expect(migrated.selectedPaletteID).toBe('druid-verdant');
    expect(migrated.campaignData.title).toBe('The Green March');
    expect(migrated.characters[0].name).toBe('Oak');
    expect(migrated.characters[0].avatarDataURL).toBe('data:image/webp;base64,UklGRg==');
    expect(migrated.characters[0].gold).toBe(125);
  });

  it('falls back to the default palette when an imported id is unknown', () => {
    const migrated = parseCampaignBackup({ selectedPaletteID: 'not-a-real-palette' });
    expect(migrated.selectedPaletteID).toBe('amethyst-archive');
  });

  it('preserves private and character-accepted GM Vault entries across migration', () => {
    const vaultEntry = {
      id: 'vault-feature',
      kind: 'Feature',
      name: 'Moonlit Grace',
      summary: 'A private campaign reward.',
      description: 'Gain the listed benefits while this feature is on your sheet.',
      tags: ['Reward'],
      requirements: { minimumLevel: 2, classes: ['Druid'] },
      effects: { speedBonus: 1, skillBonuses: { Awareness: 2 } },
      createdAt: '2026-09-11T00:00:00.000Z',
      updatedAt: '2026-09-11T00:00:00.000Z',
    };
    const migrated = migratePersistedState({
      campaignData: { vaultEntries: [vaultEntry] },
      characters: [{ id: 'hero', name: 'Luna', level: 2, class: 'Druid', vaultEntries: [vaultEntry] }],
    });

    expect(migrated.campaignData.vaultEntries[0]).toMatchObject({
      id: 'vault-feature',
      name: 'Moonlit Grace',
      effects: { speedBonus: 1, skillBonuses: { Awareness: 2 } },
    });
    expect(migrated.characters[0].vaultEntries?.[0]).toMatchObject({
      id: 'vault-feature',
      kind: 'Feature',
    });
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

  it('persists custom equipment as carried standard items', () => {
    const migrated = migratePersistedState({
      campaignData: {
        customEquipment: [{
          id: 'custom-equipment-lucky-charm',
          name: 'Lucky Charm',
          summary: 'A keepsake from home.',
          mechanics: 'A keepsake from home.',
        }],
      },
    });

    expect(migrated.campaignData.customEquipment).toEqual([expect.objectContaining({
      id: 'custom-equipment-lucky-charm',
      name: 'Lucky Charm',
      category: 'Adventuring Supplies',
      subtype: 'Custom Item',
      slot: 'Carried',
      mechanics: 'A keepsake from home.',
    })]);
  });

  it('preserves connected party links and live party combatant sources', () => {
    const migrated = migratePersistedState({
      campaignData: {
        campaigns: [{
          id: 'local-party-link',
          name: 'The Verdant Company',
          notes: [],
          party: {
            partyId: 'shared-party-id',
            role: 'player',
            characterId: 'hero-id',
          },
        }],
        combats: [{
          id: 'party-combat',
          name: 'Bridge Battle',
          combatants: [{
            id: 'live-hero',
            name: 'Oak',
            team: 'Heroes',
            maxHP: 12,
            hp: 9,
            maxAP: 4,
            ap: 3,
            reactionPoints: 1,
            currentReactionPoints: 1,
            conditions: [],
            hasActed: false,
            sourcePartyCampaignID: 'shared-party-id',
            sourcePartyMemberID: 'player-user-id',
          }],
        }],
      },
    });

    expect(migrated.campaignData.campaigns[0].party).toEqual({
      partyId: 'shared-party-id',
      role: 'player',
      inviteCode: undefined,
      characterId: 'hero-id',
    });
    expect(migrated.campaignData.combats[0].combatants[0]).toMatchObject({
      sourcePartyCampaignID: 'shared-party-id',
      sourcePartyMemberID: 'player-user-id',
    });
  });
});
