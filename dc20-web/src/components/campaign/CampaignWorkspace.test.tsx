import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Character, PartyCampaignSnapshot } from '../../types/models';
import CampaignWorkspace, { type CampaignWorkspaceProps } from './CampaignWorkspace';

const character = {
  id: 'hero',
  name: 'Aria',
  level: 3,
  class: 'Champion',
  ancestry: 'Human',
  healthPoints: 9,
  maxHealthPoints: 12,
  stamina: 3,
  maxStamina: 5,
  manaPoints: 1,
  maxManaPoints: 2,
  currentAP: 3,
  maxAP: 4,
} as Character;

const party: PartyCampaignSnapshot = {
  id: 'party',
  name: 'Moonfall',
  gmUserId: 'gm',
  gmDisplayName: 'Game Master',
  inviteCode: 'invite',
  createdAt: '',
  updatedAt: '',
  role: 'gm',
  permissions: { playersCanCreateSharedNotes: true, playersCanEditSharedNotes: true, playersCanManageInventory: false },
  members: [{ userId: 'gm', displayName: 'Game Master', role: 'gm', characterId: character.id, character, joinedAt: '', updatedAt: '' }],
  notes: [{ id: 'note', title: 'Session Zero', body: '', visibility: 'Shared', storageScope: 'shared' }],
  inventory: [{ id: 'item', name: 'Healing Potion', description: '', quantity: 2, addedBy: 'gm', updatedAt: '', container: 'Party Stash' }],
  inventoryRequests: [],
  inventoryLedger: [],
  vaultEntries: [],
  gold: 75,
};

function props(): CampaignWorkspaceProps {
  const noop = vi.fn();
  return {
    campaign: { id: 'local', name: party.name, notes: [], party: { partyId: party.id, role: 'gm', characterId: character.id } },
    party,
    currentUserId: 'gm',
    characters: [character],
    combats: [],
    localNote: null,
    selectedNoteId: null,
    onSelectNote: noop,
    onUpdateCampaign: noop,
    onRenameParty: noop,
    onCreateLocalNote: noop,
    onUpdateLocalNote: noop,
    onDeleteLocalNote: noop,
    onCreateSharedNote: noop,
    onUpdateSharedNote: noop,
    onDeleteSharedNote: noop,
    onAddInventory: noop,
    onUpdateInventory: noop,
    onDeleteInventory: noop,
    onAdjustGold: noop,
    onRequestInventory: noop,
    onResolveInventoryRequest: noop,
    onUpdatePermissions: noop,
    onUpdateMemberRole: noop,
    onUpdateMemberCharacter: noop,
    onAddVaultEntry: noop,
    onLinkCharacter: noop,
    onViewMember: noop,
    onRemoveMember: noop,
    onAddMemberToCombat: noop,
    onDeleteCampaign: noop,
    inviteURL: 'https://example.test/invite',
  };
}

describe('CampaignWorkspace', () => {
  it('opens a connected campaign on its overview with live party and permissions', () => {
    const markup = renderToStaticMarkup(<CampaignWorkspace {...props()} />);
    expect(markup).toContain('Live Party Dashboard');
    expect(markup).toContain('Player permissions');
    expect(markup).toContain('Shared Gold');
    expect(markup).toContain('Vault Rewards');
    expect(markup).toContain('HP');
  });
});
