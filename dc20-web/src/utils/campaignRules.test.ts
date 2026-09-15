import { describe, expect, it } from 'vitest';
import type { CampaignNote, PartyInventoryItem } from '../types/models';
import {
  DEFAULT_PARTY_PERMISSIONS,
  canEditCampaignNote,
  describeInventoryChange,
  normalizePartyPermissions,
  noteStorageScope,
} from './campaignRules';

describe('campaign permissions', () => {
  it('keeps existing campaigns permissive when settings are absent', () => {
    expect(normalizePartyPermissions(undefined)).toEqual(DEFAULT_PARTY_PERMISSIONS);
  });

  it('routes note visibility to secure storage scopes', () => {
    expect(noteStorageScope({ id: '1', title: '', body: '', visibility: 'GM Only' })).toBe('gm');
    expect(noteStorageScope({ id: '2', title: '', body: '', visibility: 'Selected Players' })).toBe('selected');
    expect(noteStorageScope({ id: '3', title: '', body: '' })).toBe('shared');
  });

  it('honors note-level and campaign-level edit controls', () => {
    const selected: CampaignNote = { id: '1', title: '', body: '', visibility: 'Selected Players', visibleToUserIDs: ['alice'] };
    expect(canEditCampaignNote(selected, 'player', 'alice', DEFAULT_PARTY_PERMISSIONS)).toBe(true);
    expect(canEditCampaignNote(selected, 'player', 'bob', DEFAULT_PARTY_PERMISSIONS)).toBe(false);
    expect(canEditCampaignNote({ ...selected, playerCanEdit: false }, 'player', 'alice', DEFAULT_PARTY_PERMISSIONS)).toBe(false);
    expect(canEditCampaignNote(selected, 'co-gm', 'bob', DEFAULT_PARTY_PERMISSIONS)).toBe(true);
  });
});

describe('inventory ledger descriptions', () => {
  const item: PartyInventoryItem = { id: 'item', name: 'Moonblade', description: '', quantity: 1, addedBy: 'gm', updatedAt: '' };

  it('describes ownership and equipment changes', () => {
    expect(describeInventoryChange(item, { ...item, ownerCharacterID: 'hero', ownerName: 'Aria' }).action).toBe('Assigned');
    expect(describeInventoryChange({ ...item, ownerCharacterID: 'hero', ownerName: 'Aria' }, { ...item, ownerCharacterID: 'hero', ownerName: 'Aria', isEquipped: true }).action).toBe('Equipped');
  });
});
