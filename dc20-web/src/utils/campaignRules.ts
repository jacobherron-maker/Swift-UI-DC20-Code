import type {
  CampaignNote,
  PartyCampaignPermissions,
  PartyCampaignRole,
  PartyInventoryItem,
} from '../types/models';

export const DEFAULT_PARTY_PERMISSIONS: PartyCampaignPermissions = {
  playersCanCreateSharedNotes: true,
  playersCanEditSharedNotes: true,
  playersCanManageInventory: true,
};

export function normalizePartyPermissions(value: unknown): PartyCampaignPermissions {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    playersCanCreateSharedNotes: data.players_can_create_shared_notes !== false,
    playersCanEditSharedNotes: data.players_can_edit_shared_notes !== false,
    playersCanManageInventory: data.players_can_manage_inventory !== false,
  };
}

export function serializePartyPermissions(value: PartyCampaignPermissions) {
  return {
    players_can_create_shared_notes: value.playersCanCreateSharedNotes,
    players_can_edit_shared_notes: value.playersCanEditSharedNotes,
    players_can_manage_inventory: value.playersCanManageInventory,
  };
}

export function isPartyManager(role: PartyCampaignRole): boolean {
  return role === 'gm' || role === 'co-gm';
}

export function noteStorageScope(note: CampaignNote): NonNullable<CampaignNote['storageScope']> {
  if (note.visibility === 'GM Only') return 'gm';
  if (note.visibility === 'Selected Players') return 'selected';
  return 'shared';
}

export function canEditCampaignNote(
  note: CampaignNote,
  role: PartyCampaignRole,
  userId: string,
  permissions: PartyCampaignPermissions,
): boolean {
  if (isPartyManager(role)) return true;
  if (note.visibility === 'GM Only') return false;
  if (note.visibility === 'Selected Players' && !(note.visibleToUserIDs ?? []).includes(userId)) return false;
  return note.playerCanEdit !== false && permissions.playersCanEditSharedNotes;
}

export function describeInventoryChange(before: PartyInventoryItem | null, after: PartyInventoryItem): { action: string; details: string } {
  if (!before) return { action: 'Added', details: `${after.quantity} × ${after.name} added to ${after.container || 'Party Stash'}.` };
  if (before.ownerCharacterID !== after.ownerCharacterID) {
    return { action: after.ownerCharacterID ? 'Assigned' : 'Returned', details: after.ownerName ? `${after.name} assigned to ${after.ownerName}.` : `${after.name} returned to the party stash.` };
  }
  if (before.container !== after.container) return { action: 'Moved', details: `${after.name} moved to ${after.container || 'Party Stash'}.` };
  if (before.isEquipped !== after.isEquipped) return { action: after.isEquipped ? 'Equipped' : 'Unequipped', details: `${after.name} ${after.isEquipped ? 'equipped' : 'unequipped'}${after.ownerName ? ` by ${after.ownerName}` : ''}.` };
  if (before.quantity !== after.quantity) return { action: 'Quantity', details: `${after.name} quantity changed from ${before.quantity} to ${after.quantity}.` };
  return { action: 'Updated', details: `${after.name} details updated.` };
}
