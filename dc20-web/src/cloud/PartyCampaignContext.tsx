import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { firestore } from '../lib/firebase';
import type {
  CampaignAppearance,
  CampaignNote,
  CampaignPartyLink,
  Character,
  GmVaultEntry,
  PartyCampaignMember,
  PartyCampaignPermissions,
  PartyCampaignRole,
  PartyCampaignSnapshot,
  PartyInventoryItem,
  PartyInventoryLedgerEntry,
  PartyInventoryRequest,
} from '../types/models';
import { useCampaignStore } from '../store/campaignStore';
import { inventoryWithCustomItemSnapshots } from '../utils/equipmentRules';
import { generateUUID } from '../utils/gameUtils';
import { normalizeVaultEntry, prepareVaultEntry } from '../utils/vaultRules';
import {
  DEFAULT_PARTY_PERMISSIONS,
  describeInventoryChange,
  isPartyManager,
  normalizePartyPermissions,
  noteStorageScope,
  serializePartyPermissions,
} from '../utils/campaignRules';

/* oxlint-disable react/only-export-components */
/* oxlint-disable react/set-state-in-effect */

interface PendingPartyInvite {
  code: string;
  campaignId: string;
  campaignName: string;
  gmDisplayName: string;
}

export interface PartyCharacterEntry {
  partyId: string;
  partyName: string;
  memberId: string;
  memberName: string;
  character: Character;
}

interface PartyCampaignContextValue {
  isAvailable: boolean;
  parties: PartyCampaignSnapshot[];
  partyCharacters: PartyCharacterEntry[];
  pendingInvite: PendingPartyInvite | null;
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
  error: string;
  createPartyCampaign: (name: string) => Promise<CampaignPartyLink>;
  joinPartyCampaign: (inviteCode: string, character: Character) => Promise<{ link: CampaignPartyLink; campaignName: string }>;
  publishCharacter: (partyId: string, role: PartyCampaignRole, character?: Character) => Promise<void>;
  updatePartyMemberCharacter: (partyId: string, memberId: string, character: Character) => Promise<void>;
  renameParty: (partyId: string, name: string) => Promise<void>;
  updatePartyPermissions: (partyId: string, permissions: PartyCampaignPermissions) => Promise<void>;
  updatePartyAppearance: (partyId: string, appearance: CampaignAppearance) => Promise<void>;
  updatePartyMemberRole: (partyId: string, memberId: string, role: Extract<PartyCampaignRole, 'co-gm' | 'player'>) => Promise<void>;
  addSharedNote: (partyId: string, note: CampaignNote) => Promise<void>;
  updateSharedNote: (partyId: string, note: CampaignNote) => Promise<void>;
  removeSharedNote: (partyId: string, noteId: string) => Promise<void>;
  addSharedInventoryItem: (partyId: string, item: PartyInventoryItem) => Promise<void>;
  updateSharedInventoryItem: (partyId: string, item: PartyInventoryItem) => Promise<void>;
  removeSharedInventoryItem: (partyId: string, itemId: string) => Promise<void>;
  adjustSharedGold: (partyId: string, delta: number) => Promise<void>;
  requestSharedInventoryItem: (partyId: string, item: PartyInventoryItem, character?: Character) => Promise<void>;
  resolveSharedInventoryRequest: (partyId: string, request: PartyInventoryRequest, approved: boolean) => Promise<void>;
  shareVaultEntry: (partyId: string, entry: GmVaultEntry) => Promise<void>;
  removeSharedVaultEntry: (partyId: string, entryId: string) => Promise<void>;
  removePartyMember: (partyId: string, memberId: string) => Promise<void>;
  leaveParty: (partyId: string) => Promise<void>;
  deleteParty: (partyId: string, inviteCode: string) => Promise<void>;
  refreshParty: (partyId: string) => Promise<void>;
  inviteURL: (inviteCode: string) => string;
  clearPendingInvite: () => void;
}

interface PartyDocument {
  id: string;
  name: string;
  gm_user_id: string;
  gm_display_name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
  permissions?: Record<string, unknown>;
  appearance?: CampaignAppearance;
}

interface PartyInviteDocument {
  campaign_id: string;
  campaign_name: string;
  gm_user_id: string;
  gm_display_name: string;
  active: boolean;
  created_at: string;
}

const PartyCampaignContext = createContext<PartyCampaignContextValue | null>(null);
const SHARED_GOLD_DOCUMENT_ID = '__gold__';

function safeCharacter(character: Character, customEquipment: ReturnType<typeof useCampaignStore.getState>['campaignData']['customEquipment']): Character {
  const portableCharacter = {
    ...character,
    inventoryItems: inventoryWithCustomItemSnapshots(character.inventoryItems ?? [], customEquipment),
  };
  return JSON.parse(JSON.stringify(portableCharacter)) as Character;
}

function displayNameForUser(user: NonNullable<ReturnType<typeof useAuth>['user']>): string {
  return user.displayName?.trim() || user.email?.split('@')[0] || 'DC20 Player';
}

function noteFromDocument(id: string, raw: Record<string, unknown>, scope: 'gm' | 'selected'): CampaignNote {
  return {
    id,
    title: String(raw.title ?? 'Untitled Note'),
    body: String(raw.body ?? ''),
    visibility: scope === 'gm' ? 'GM Only' : 'Selected Players',
    visibleToUserIDs: Array.isArray(raw.visible_to_user_ids) ? raw.visible_to_user_ids.filter((value): value is string => typeof value === 'string') : [],
    playerCanEdit: raw.player_can_edit !== false,
    storageScope: scope,
    updatedAt: String(raw.updated_at ?? ''),
    updatedByName: typeof raw.updated_by_name === 'string' ? raw.updated_by_name : undefined,
  };
}

function inventoryItemFromDocument(id: string, data: Record<string, unknown>): PartyInventoryItem {
  return {
    id,
    name: String(data.name ?? 'Unnamed Item'),
    description: String(data.description ?? ''),
    quantity: Math.max(0, Number(data.quantity ?? 1)),
    addedBy: String(data.added_by ?? ''),
    updatedAt: String(data.updated_at ?? ''),
    ...(typeof data.equipment_id === 'string' && data.equipment_id ? { equipmentID: data.equipment_id } : {}),
    ...(data.item_snapshot && typeof data.item_snapshot === 'object' ? { itemSnapshot: data.item_snapshot as PartyInventoryItem['itemSnapshot'] } : {}),
    ...(typeof data.owner_character_id === 'string' && data.owner_character_id ? { ownerCharacterID: data.owner_character_id } : {}),
    ...(typeof data.owner_name === 'string' && data.owner_name ? { ownerName: data.owner_name } : {}),
    ...(Number.isFinite(Number(data.gold_cost)) ? { goldCost: Math.max(0, Number(data.gold_cost)) } : {}),
    ...(Number.isFinite(Number(data.remaining_uses)) ? { remainingUses: Math.max(0, Number(data.remaining_uses)) } : {}),
    ...(data.distributed_by_gm === true ? { distributedByGM: true } : {}),
    ...(typeof data.container === 'string' && data.container ? { container: data.container } : {}),
    ...(data.is_equipped === true ? { isEquipped: true } : {}),
    requestable: data.requestable !== false,
  };
}

function emptyParty(id: string, role: PartyCampaignRole): PartyCampaignSnapshot {
  return {
    id,
    name: 'Loading campaign…',
    gmUserId: '',
    gmDisplayName: '',
    inviteCode: '',
    createdAt: '',
    updatedAt: '',
    role,
    permissions: DEFAULT_PARTY_PERMISSIONS,
    members: [],
    notes: [],
    inventory: [],
    inventoryRequests: [],
    inventoryLedger: [],
    vaultEntries: [],
    gold: 0,
  };
}

export function PartyCampaignProvider({ children, links }: { children: ReactNode; links: CampaignPartyLink[] }) {
  const { isConfigured, user } = useAuth();
  const characters = useCampaignStore((state) => state.characters);
  const updateLocalCharacter = useCampaignStore((state) => state.updateCharacter);
  const customEquipment = useCampaignStore((state) => state.campaignData.customEquipment);
  const [partiesByID, setPartiesByID] = useState<Record<string, PartyCampaignSnapshot>>({});
  const [pendingInvite, setPendingInvite] = useState<PendingPartyInvite | null>(null);
  const [status, setStatus] = useState<PartyCampaignContextValue['status']>('idle');
  const [error, setError] = useState('');
  const noteSourcesRef = useRef<Record<string, Record<'shared' | 'gm' | 'selected', CampaignNote[]>>>({});
  const appliedGMUpdatesRef = useRef(new Set<string>());
  const linkSignature = links.map(({ partyId, role }) => `${partyId}:${role}`).sort().join('|');

  const reportError = useCallback((caught: unknown, fallback: string) => {
    setStatus('error');
    setError(caught instanceof Error ? caught.message : fallback);
  }, []);

  const patchParty = useCallback((partyId: string, role: PartyCampaignRole, changes: Partial<PartyCampaignSnapshot>) => {
    setPartiesByID((current) => ({
      ...current,
      [partyId]: { ...(current[partyId] ?? emptyParty(partyId, role)), ...changes, role: changes.role ?? current[partyId]?.role ?? role },
    }));
  }, []);

  const patchNoteSource = useCallback((partyId: string, role: PartyCampaignRole, scope: 'shared' | 'gm' | 'selected', notes: CampaignNote[]) => {
    const sources = noteSourcesRef.current[partyId] ?? { shared: [], gm: [], selected: [] };
    noteSourcesRef.current[partyId] = { ...sources, [scope]: notes };
    const combined = Array.from(new Map(Object.values(noteSourcesRef.current[partyId])
      .flat()
      .map((note) => [note.id, note])).values())
      .sort((left, right) => left.title.localeCompare(right.title));
    patchParty(partyId, role, { notes: combined });
  }, [patchParty]);

  useEffect(() => {
    if (!firestore || !user || links.length === 0) {
      setPartiesByID({});
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError('');
    const unsubscribers: Array<() => void> = [];
    const activeIDs = new Set(links.map(({ partyId }) => partyId));
    setPartiesByID((current) => Object.fromEntries(Object.entries(current).filter(([id]) => activeIDs.has(id))));

    for (const link of links) {
      const partyReference = doc(firestore, 'party_campaigns', link.partyId);
      unsubscribers.push(onSnapshot(partyReference, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as PartyDocument;
        patchParty(link.partyId, link.role, {
          name: data.name,
          gmUserId: data.gm_user_id,
          gmDisplayName: data.gm_display_name,
          inviteCode: data.invite_code,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          permissions: normalizePartyPermissions(data.permissions),
          appearance: data.appearance,
        });
        setStatus('ready');
        setError('');
      }, (caught) => reportError(caught, 'The shared campaign could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'members'), (snapshot) => {
        const members = snapshot.docs.map((memberDocument) => {
          const data = memberDocument.data() as Record<string, unknown>;
          return {
            userId: String(data.user_id ?? memberDocument.id),
            displayName: String(data.display_name ?? 'DC20 Player'),
            role: data.role === 'gm' || data.role === 'co-gm' ? data.role : 'player',
            characterId: typeof data.character_id === 'string' ? data.character_id : undefined,
            character: data.character && typeof data.character === 'object' ? data.character as Character : undefined,
            joinedAt: String(data.joined_at ?? ''),
            updatedAt: String(data.updated_at ?? ''),
          } satisfies PartyCampaignMember;
        }).sort((left, right) => Number(left.role !== 'gm') - Number(right.role !== 'gm') || left.displayName.localeCompare(right.displayName));
        const currentMember = members.find(({ userId }) => userId === user.uid);
        patchParty(link.partyId, link.role, { members, ...(currentMember ? { role: currentMember.role } : {}) });

        if (currentMember?.character) {
          const source = snapshot.docs.find(({ id }) => id === currentMember.userId)?.data() as Record<string, unknown> | undefined;
          const updateID = typeof source?.gm_update_id === 'string' ? source.gm_update_id : '';
          const appliedID = typeof source?.gm_applied_update_id === 'string' ? source.gm_applied_update_id : '';
          const applicationKey = `${link.partyId}:${updateID}`;
          if (updateID && updateID !== appliedID && !appliedGMUpdatesRef.current.has(applicationKey)) {
            appliedGMUpdatesRef.current.add(applicationKey);
            updateLocalCharacter(currentMember.character);
            void setDoc(doc(firestore!, 'party_campaigns', link.partyId, 'members', user.uid), {
              gm_applied_update_id: updateID,
              updated_at: new Date().toISOString(),
            }, { merge: true }).catch((caught) => reportError(caught, 'A GM character update could not be acknowledged.'));
          }
        }
      }, (caught) => reportError(caught, 'Party members could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'notes'), (snapshot) => {
        const notes = snapshot.docs.map((noteDocument) => {
          const data = noteDocument.data() as Record<string, unknown>;
          return {
            id: noteDocument.id,
            title: String(data.title ?? 'Untitled Note'),
            body: String(data.body ?? ''),
            visibility: 'Shared' as const,
            playerCanEdit: data.player_can_edit !== false,
            storageScope: 'shared' as const,
            updatedAt: String(data.updated_at ?? ''),
            updatedByName: typeof data.updated_by_name === 'string' ? data.updated_by_name : undefined,
          };
        }).sort((left, right) => left.title.localeCompare(right.title));
        patchNoteSource(link.partyId, link.role, 'shared', notes);
      }, (caught) => reportError(caught, 'Shared notes could not be loaded.')));

      const restrictedRole = link.role === 'gm' || link.role === 'co-gm';
      if (restrictedRole) {
        unsubscribers.push(onSnapshot(collection(partyReference, 'gm_notes'), (snapshot) => {
          const notes = snapshot.docs.map((noteDocument) => noteFromDocument(noteDocument.id, noteDocument.data(), 'gm'));
          patchNoteSource(link.partyId, link.role, 'gm', notes);
        }, (caught) => reportError(caught, 'GM notes could not be loaded.')));
        unsubscribers.push(onSnapshot(collection(partyReference, 'member_notes'), (snapshot) => {
          const notes = snapshot.docs.map((noteDocument) => noteFromDocument(noteDocument.id, noteDocument.data(), 'selected'));
          patchNoteSource(link.partyId, link.role, 'selected', notes);
        }, (caught) => reportError(caught, 'Selected-player notes could not be loaded.')));
      } else {
        patchNoteSource(link.partyId, link.role, 'gm', []);
        unsubscribers.push(onSnapshot(query(collection(partyReference, 'member_notes'), where('visible_to_user_ids', 'array-contains', user.uid)), (snapshot) => {
          const notes = snapshot.docs.map((noteDocument) => noteFromDocument(noteDocument.id, noteDocument.data(), 'selected'));
          patchNoteSource(link.partyId, link.role, 'selected', notes);
        }, (caught) => reportError(caught, 'Notes shared with you could not be loaded.')));
      }

      unsubscribers.push(onSnapshot(collection(partyReference, 'inventory'), (snapshot) => {
        const goldDocument = snapshot.docs.find(({ id }) => id === SHARED_GOLD_DOCUMENT_ID);
        const goldData = goldDocument?.data() as Record<string, unknown> | undefined;
        const gold = Math.max(0, Math.trunc(Number(goldData?.amount) || 0));
        const inventory = snapshot.docs
          .filter(({ id }) => id !== SHARED_GOLD_DOCUMENT_ID)
          .map((itemDocument) => inventoryItemFromDocument(itemDocument.id, itemDocument.data()))
          .sort((left, right) => left.name.localeCompare(right.name));
        patchParty(link.partyId, link.role, { inventory, gold });
      }, (caught) => reportError(caught, 'Shared inventory could not be loaded.')));

      const inventoryRequestsQuery = restrictedRole
        ? collection(partyReference, 'inventory_requests')
        : query(collection(partyReference, 'inventory_requests'), where('requester_user_id', '==', user.uid));
      unsubscribers.push(onSnapshot(inventoryRequestsQuery, (snapshot) => {
        const requests = snapshot.docs.map((requestDocument) => {
          const data = requestDocument.data() as Record<string, unknown>;
          return {
            id: requestDocument.id,
            itemId: String(data.item_id ?? ''),
            itemName: String(data.item_name ?? 'Item'),
            requesterUserId: String(data.requester_user_id ?? ''),
            requesterName: String(data.requester_name ?? 'Player'),
            characterId: typeof data.character_id === 'string' ? data.character_id : undefined,
            characterName: typeof data.character_name === 'string' ? data.character_name : undefined,
            status: data.status === 'Approved' || data.status === 'Denied' ? data.status : 'Pending',
            createdAt: String(data.created_at ?? ''),
            updatedAt: String(data.updated_at ?? ''),
            resolvedBy: typeof data.resolved_by === 'string' ? data.resolved_by : undefined,
          } satisfies PartyInventoryRequest;
        }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        patchParty(link.partyId, link.role, { inventoryRequests: requests });
      }, (caught) => reportError(caught, 'Inventory requests could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'inventory_activity'), (snapshot) => {
        const inventoryLedger = snapshot.docs.map((activityDocument) => {
          const data = activityDocument.data() as Record<string, unknown>;
          return {
            id: activityDocument.id,
            action: String(data.action ?? 'Updated'),
            itemId: typeof data.item_id === 'string' ? data.item_id : undefined,
            itemName: typeof data.item_name === 'string' ? data.item_name : undefined,
            actorUserId: String(data.actor_user_id ?? ''),
            actorName: String(data.actor_name ?? 'Party member'),
            details: String(data.details ?? ''),
            createdAt: String(data.created_at ?? ''),
          } satisfies PartyInventoryLedgerEntry;
        }).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 100);
        patchParty(link.partyId, link.role, { inventoryLedger });
      }, (caught) => reportError(caught, 'Inventory activity could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'vault'), (snapshot) => {
        const vaultEntries = snapshot.docs
          .map((entryDocument) => normalizeVaultEntry(entryDocument.data()))
          .filter((entry): entry is GmVaultEntry => entry !== null)
          .sort((left, right) => left.name.localeCompare(right.name));
        patchParty(link.partyId, link.role, { vaultEntries });
      }, (caught) => reportError(caught, 'Shared GM Vault content could not be loaded.')));
    }
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [linkSignature, links, patchNoteSource, patchParty, reportError, updateLocalCharacter, user]);

  useEffect(() => {
    if (!firestore || !user) return;
    const inviteCode = new URL(window.location.href).searchParams.get('partyInvite')?.trim();
    if (!inviteCode) return;
    setStatus('loading');
    void getDoc(doc(firestore, 'party_invites', inviteCode)).then((snapshot) => {
      if (!snapshot.exists()) throw new Error('This party invitation is no longer available.');
      const data = snapshot.data() as PartyInviteDocument;
      if (!data.active) throw new Error('This party invitation has been disabled.');
      setPendingInvite({
        code: inviteCode,
        campaignId: data.campaign_id,
        campaignName: data.campaign_name,
        gmDisplayName: data.gm_display_name,
      });
      setStatus('ready');
    }).catch((caught) => reportError(caught, 'The party invitation could not be opened.'));
  }, [reportError, user]);

  const requireCloud = useCallback(() => {
    if (!firestore || !user) throw new Error('Sign in to a configured DC20 Hub account to use group campaigns.');
    return { database: firestore, currentUser: user };
  }, [user]);

  const createPartyCampaign = useCallback(async (name: string): Promise<CampaignPartyLink> => {
    const { database, currentUser } = requireCloud();
    setStatus('saving');
    setError('');
    const partyId = generateUUID();
    const inviteCode = generateUUID().replaceAll('-', '').slice(0, 20);
    const now = new Date().toISOString();
    const creatorName = displayNameForUser(currentUser);
    try {
      await setDoc(doc(database, 'party_campaigns', partyId), {
        id: partyId,
        name,
        gm_user_id: currentUser.uid,
        gm_display_name: creatorName,
        invite_code: inviteCode,
        created_at: now,
        updated_at: now,
        permissions: serializePartyPermissions(DEFAULT_PARTY_PERMISSIONS),
      } satisfies PartyDocument);
      await setDoc(doc(database, 'party_campaigns', partyId, 'members', currentUser.uid), {
        user_id: currentUser.uid,
        display_name: creatorName,
        role: 'gm',
        invite_code: inviteCode,
        joined_at: now,
        updated_at: now,
      });
      await setDoc(doc(database, 'party_invites', inviteCode), {
        campaign_id: partyId,
        campaign_name: name,
        gm_user_id: currentUser.uid,
        gm_display_name: creatorName,
        active: true,
        created_at: now,
      } satisfies PartyInviteDocument);
      const firstNote: CampaignNote = { id: generateUUID(), title: 'Party Notes', body: '', visibility: 'Shared', playerCanEdit: true };
      await setDoc(doc(database, 'party_campaigns', partyId, 'notes', firstNote.id), {
        ...firstNote,
        updated_by: currentUser.uid,
        updated_by_name: creatorName,
        player_can_edit: true,
        updated_at: now,
      });
      setStatus('ready');
      return { partyId, role: 'gm', inviteCode };
    } catch (caught) {
      reportError(caught, 'The group campaign could not be created.');
      throw caught;
    }
  }, [reportError, requireCloud]);

  const joinPartyCampaign = useCallback(async (inviteCode: string, character: Character) => {
    const { database, currentUser } = requireCloud();
    setStatus('saving');
    setError('');
    try {
      const inviteSnapshot = await getDoc(doc(database, 'party_invites', inviteCode));
      if (!inviteSnapshot.exists()) throw new Error('This party invitation is no longer available.');
      const invite = inviteSnapshot.data() as PartyInviteDocument;
      if (!invite.active) throw new Error('This party invitation has been disabled.');
      const now = new Date().toISOString();
      const memberReference = doc(database, 'party_campaigns', invite.campaign_id, 'members', currentUser.uid);
      const memberSnapshot = await getDoc(memberReference);
      if (memberSnapshot.exists()) {
        await setDoc(memberReference, {
          display_name: displayNameForUser(currentUser),
          character_id: character.id,
          character: safeCharacter(character, customEquipment),
          updated_at: now,
        }, { merge: true });
      } else {
        await setDoc(memberReference, {
          user_id: currentUser.uid,
          display_name: displayNameForUser(currentUser),
          role: 'player',
          invite_code: inviteCode,
          character_id: character.id,
          character: safeCharacter(character, customEquipment),
          joined_at: now,
          updated_at: now,
        });
      }
      setStatus('ready');
      return {
        link: { partyId: invite.campaign_id, role: 'player' as const, characterId: character.id },
        campaignName: invite.campaign_name,
      };
    } catch (caught) {
      reportError(caught, 'The character could not join this campaign.');
      throw caught;
    }
  }, [customEquipment, reportError, requireCloud]);

  const publishCharacter = useCallback(async (partyId: string, role: PartyCampaignRole, character?: Character) => {
    const { database, currentUser } = requireCloud();
    const memberReference = doc(database, 'party_campaigns', partyId, 'members', currentUser.uid);
    const currentSnapshot = await getDoc(memberReference);
    const now = new Date().toISOString();
    const existing = currentSnapshot.exists() ? currentSnapshot.data() as Record<string, unknown> : {};
    await setDoc(memberReference, {
      ...existing,
      user_id: currentUser.uid,
      display_name: displayNameForUser(currentUser),
      role: existing.role ?? role,
      joined_at: existing.joined_at ?? now,
      updated_at: now,
      ...(character ? { character_id: character.id, character: safeCharacter(character, customEquipment) } : {}),
    });
  }, [customEquipment, requireCloud]);

  const updatePartyMemberCharacter = useCallback(async (partyId: string, memberId: string, character: Character) => {
    const { database, currentUser } = requireCloud();
    const managerSnapshot = await getDoc(doc(database, 'party_campaigns', partyId, 'members', currentUser.uid));
    const managerRole = managerSnapshot.exists() ? managerSnapshot.data().role as PartyCampaignRole : 'player';
    if (!isPartyManager(managerRole)) throw new Error('Only a campaign GM or co-GM can update a connected character.');
    await setDoc(doc(database, 'party_campaigns', partyId, 'members', memberId), {
      character: safeCharacter(character, customEquipment),
      gm_update_id: generateUUID(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }, [customEquipment, requireCloud]);

  // Keep every linked player character current even when its owner is working outside the
  // Characters page. This also repairs older Firebase copies whose custom inventory entries
  // were published before portable item snapshots were introduced.
  useEffect(() => {
    if (!firestore || !user) return;
    const linkedCharacters = links.flatMap((link) => {
      if (link.role === 'gm' || !link.characterId) return [];
      const character = characters.find(({ id }) => id === link.characterId);
      return character ? [{ link, character }] : [];
    });
    if (linkedCharacters.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const { link, character } of linkedCharacters) {
        void publishCharacter(link.partyId, link.role, character).catch((caught) => {
          reportError(caught, 'The shared character could not be updated.');
        });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [characters, customEquipment, linkSignature, links, publishCharacter, reportError, user]);

  const renameParty = useCallback(async (partyId: string, name: string) => {
    const { database, currentUser } = requireCloud();
    const partyReference = doc(database, 'party_campaigns', partyId);
    const snapshot = await getDoc(partyReference);
    if (!snapshot.exists()) throw new Error('The shared campaign no longer exists.');
    const data = snapshot.data() as PartyDocument;
    await setDoc(partyReference, { ...data, name, updated_at: new Date().toISOString() });
    if (data.gm_user_id === currentUser.uid) {
      await setDoc(doc(database, 'party_invites', data.invite_code), {
        campaign_id: partyId,
        campaign_name: name,
        gm_user_id: data.gm_user_id,
        gm_display_name: data.gm_display_name,
        active: true,
        created_at: data.created_at,
      } satisfies PartyInviteDocument);
    }
  }, [requireCloud]);

  const updatePartyPermissions = useCallback(async (partyId: string, permissions: PartyCampaignPermissions) => {
    const { database } = requireCloud();
    await setDoc(doc(database, 'party_campaigns', partyId), {
      permissions: serializePartyPermissions(permissions),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }, [requireCloud]);

  const updatePartyAppearance = useCallback(async (partyId: string, appearance: CampaignAppearance) => {
    const { database } = requireCloud();
    await setDoc(doc(database, 'party_campaigns', partyId), {
      appearance: JSON.parse(JSON.stringify(appearance)) as CampaignAppearance,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }, [requireCloud]);

  const updatePartyMemberRole = useCallback(async (partyId: string, memberId: string, role: Extract<PartyCampaignRole, 'co-gm' | 'player'>) => {
    const { database } = requireCloud();
    await setDoc(doc(database, 'party_campaigns', partyId, 'members', memberId), {
      role,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }, [requireCloud]);

  const saveSharedNote = useCallback(async (partyId: string, note: CampaignNote) => {
    const { database, currentUser } = requireCloud();
    const targetScope = noteStorageScope(note);
    const collectionName = targetScope === 'shared' ? 'notes' : targetScope === 'gm' ? 'gm_notes' : 'member_notes';
    const previousCollection = note.storageScope === 'shared' ? 'notes' : note.storageScope === 'gm' ? 'gm_notes' : note.storageScope === 'selected' ? 'member_notes' : collectionName;
    const now = new Date().toISOString();
    const noteData = {
      id: note.id,
      title: note.title,
      body: note.body,
      visibility: note.visibility ?? 'Shared',
      visible_to_user_ids: targetScope === 'selected' ? note.visibleToUserIDs ?? [] : [],
      player_can_edit: note.playerCanEdit !== false,
      updated_by: currentUser.uid,
      updated_by_name: displayNameForUser(currentUser),
      updated_at: now,
    };
    if (previousCollection !== collectionName) {
      const batch = writeBatch(database);
      batch.delete(doc(database, 'party_campaigns', partyId, previousCollection, note.id));
      batch.set(doc(database, 'party_campaigns', partyId, collectionName, note.id), noteData);
      await batch.commit();
    } else {
      await setDoc(doc(database, 'party_campaigns', partyId, collectionName, note.id), noteData);
    }
  }, [requireCloud]);

  const removeSharedNote = useCallback(async (partyId: string, noteId: string) => {
    const { database } = requireCloud();
    const party = partiesByID[partyId];
    const note = party?.notes.find(({ id }) => id === noteId);
    const scope = note?.storageScope ?? noteStorageScope(note ?? { id: noteId, title: '', body: '' });
    const collectionName = scope === 'shared' ? 'notes' : scope === 'gm' ? 'gm_notes' : 'member_notes';
    await deleteDoc(doc(database, 'party_campaigns', partyId, collectionName, noteId));
  }, [partiesByID, requireCloud]);

  const recordInventoryActivity = useCallback(async (partyId: string, entry: Omit<PartyInventoryLedgerEntry, 'id' | 'actorUserId' | 'actorName' | 'createdAt'>) => {
    const { database, currentUser } = requireCloud();
    const id = generateUUID();
    await setDoc(doc(database, 'party_campaigns', partyId, 'inventory_activity', id), {
      id,
      action: entry.action,
      ...(entry.itemId ? { item_id: entry.itemId } : {}),
      ...(entry.itemName ? { item_name: entry.itemName } : {}),
      actor_user_id: currentUser.uid,
      actor_name: displayNameForUser(currentUser),
      details: entry.details,
      created_at: new Date().toISOString(),
    });
  }, [requireCloud]);

  const saveSharedInventoryItem = useCallback(async (partyId: string, item: PartyInventoryItem) => {
    const { database, currentUser } = requireCloud();
    const itemReference = doc(database, 'party_campaigns', partyId, 'inventory', item.id);
    const beforeSnapshot = await getDoc(itemReference);
    const beforeData = beforeSnapshot.exists() ? beforeSnapshot.data() as Record<string, unknown> : null;
    const before = beforeData ? inventoryItemFromDocument(item.id, beforeData) : null;
    const now = new Date().toISOString();
    const normalized: PartyInventoryItem = { ...item, quantity: Math.max(0, Math.trunc(item.quantity)), updatedAt: now };
    await setDoc(itemReference, {
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: normalized.quantity,
      added_by: item.addedBy || currentUser.uid,
      updated_at: now,
      ...(item.equipmentID ? { equipment_id: item.equipmentID } : {}),
      ...(item.itemSnapshot ? { item_snapshot: JSON.parse(JSON.stringify(item.itemSnapshot)) as PartyInventoryItem['itemSnapshot'] } : {}),
      ...(item.ownerCharacterID ? { owner_character_id: item.ownerCharacterID } : {}),
      ...(item.ownerName ? { owner_name: item.ownerName } : {}),
      ...(item.goldCost !== undefined ? { gold_cost: Math.max(0, Number(item.goldCost) || 0) } : {}),
      ...(item.remainingUses !== undefined ? { remaining_uses: Math.max(0, Number(item.remainingUses) || 0) } : {}),
      ...(item.distributedByGM ? { distributed_by_gm: true } : {}),
      container: item.container?.trim() || 'Party Stash',
      is_equipped: item.isEquipped === true,
      requestable: item.requestable !== false,
    });
    const change = describeInventoryChange(before, normalized);
    await recordInventoryActivity(partyId, { ...change, itemId: item.id, itemName: item.name });
  }, [recordInventoryActivity, requireCloud]);

  const removeSharedInventoryItem = useCallback(async (partyId: string, itemId: string) => {
    const { database } = requireCloud();
    const existing = await getDoc(doc(database, 'party_campaigns', partyId, 'inventory', itemId));
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'inventory', itemId));
    const name = existing.exists() ? String(existing.data().name ?? 'Item') : 'Item';
    await recordInventoryActivity(partyId, { action: 'Removed', itemId, itemName: name, details: `${name} removed from shared inventory.` });
  }, [recordInventoryActivity, requireCloud]);

  const adjustSharedGold = useCallback(async (partyId: string, delta: number) => {
    const { database, currentUser } = requireCloud();
    const adjustment = Math.trunc(Number(delta) || 0);
    if (adjustment === 0) return;
    const goldReference = doc(database, 'party_campaigns', partyId, 'inventory', SHARED_GOLD_DOCUMENT_ID);
    await runTransaction(database, async (transaction) => {
      const snapshot = await transaction.get(goldReference);
      const current = snapshot.exists() ? Math.max(0, Math.trunc(Number(snapshot.data().amount) || 0)) : 0;
      transaction.set(goldReference, {
        id: SHARED_GOLD_DOCUMENT_ID,
        type: 'currency',
        amount: Math.max(0, current + adjustment),
        updated_by: currentUser.uid,
        updated_at: new Date().toISOString(),
      });
    });
    await recordInventoryActivity(partyId, { action: 'Gold', details: `${adjustment > 0 ? '+' : ''}${adjustment} gold applied to the shared balance.` });
  }, [recordInventoryActivity, requireCloud]);

  const requestSharedInventoryItem = useCallback(async (partyId: string, item: PartyInventoryItem, character?: Character) => {
    const { database, currentUser } = requireCloud();
    const id = generateUUID();
    const now = new Date().toISOString();
    await setDoc(doc(database, 'party_campaigns', partyId, 'inventory_requests', id), {
      id,
      item_id: item.id,
      item_name: item.name,
      requester_user_id: currentUser.uid,
      requester_name: displayNameForUser(currentUser),
      ...(character ? { character_id: character.id, character_name: character.name } : {}),
      status: 'Pending',
      created_at: now,
      updated_at: now,
    });
  }, [requireCloud]);

  const resolveSharedInventoryRequest = useCallback(async (partyId: string, request: PartyInventoryRequest, approved: boolean) => {
    const { database, currentUser } = requireCloud();
    const now = new Date().toISOString();
    if (approved) {
      const itemReference = doc(database, 'party_campaigns', partyId, 'inventory', request.itemId);
      const itemSnapshot = await getDoc(itemReference);
      if (!itemSnapshot.exists()) throw new Error('That shared item is no longer available.');
      const item = inventoryItemFromDocument(request.itemId, itemSnapshot.data());
      await setDoc(itemReference, {
        owner_character_id: request.characterId ?? '',
        owner_name: request.characterName || request.requesterName,
        is_equipped: false,
        updated_at: now,
      }, { merge: true });
      await recordInventoryActivity(partyId, {
        action: 'Request Approved',
        itemId: item.id,
        itemName: item.name,
        details: `${request.requesterName}'s request for ${item.name} was approved${request.characterName ? ` for ${request.characterName}` : ''}.`,
      });
    }
    await setDoc(doc(database, 'party_campaigns', partyId, 'inventory_requests', request.id), {
      status: approved ? 'Approved' : 'Denied',
      resolved_by: currentUser.uid,
      updated_at: now,
    }, { merge: true });
    if (!approved) await recordInventoryActivity(partyId, { action: 'Request Denied', itemId: request.itemId, itemName: request.itemName, details: `${request.requesterName}'s request for ${request.itemName} was denied.` });
  }, [recordInventoryActivity, requireCloud]);

  const shareVaultEntry = useCallback(async (partyId: string, entry: GmVaultEntry) => {
    const { database, currentUser } = requireCloud();
    const prepared = prepareVaultEntry(entry);
    await setDoc(doc(database, 'party_campaigns', partyId, 'vault', prepared.id), {
      ...JSON.parse(JSON.stringify(prepared)) as GmVaultEntry,
      sharedBy: currentUser.uid,
      sharedAt: new Date().toISOString(),
    });
  }, [requireCloud]);

  const removeSharedVaultEntry = useCallback(async (partyId: string, entryId: string) => {
    const { database } = requireCloud();
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'vault', entryId));
  }, [requireCloud]);

  const removePartyMember = useCallback(async (partyId: string, memberId: string) => {
    const { database } = requireCloud();
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'members', memberId));
  }, [requireCloud]);

  const leaveParty = useCallback(async (partyId: string) => {
    const { database, currentUser } = requireCloud();
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'members', currentUser.uid));
  }, [requireCloud]);

  const deleteParty = useCallback(async (partyId: string, inviteCode: string) => {
    const { database } = requireCloud();
    const batch = writeBatch(database);
    for (const subcollection of ['members', 'notes', 'gm_notes', 'member_notes', 'inventory', 'inventory_requests', 'inventory_activity', 'vault']) {
      const snapshot = await getDocs(collection(database, 'party_campaigns', partyId, subcollection));
      snapshot.docs.forEach((entry) => batch.delete(entry.ref));
    }
    if (inviteCode) batch.delete(doc(database, 'party_invites', inviteCode));
    batch.delete(doc(database, 'party_campaigns', partyId));
    await batch.commit();
  }, [requireCloud]);

  const refreshParty = useCallback(async (partyId: string) => {
    const { database } = requireCloud();
    const snapshot = await getDoc(doc(database, 'party_campaigns', partyId));
    if (!snapshot.exists()) throw new Error('The shared campaign no longer exists.');
    const data = snapshot.data() as PartyDocument;
    const role = links.find((link) => link.partyId === partyId)?.role ?? 'player';
    patchParty(partyId, role, {
      name: data.name,
      gmUserId: data.gm_user_id,
      gmDisplayName: data.gm_display_name,
      inviteCode: data.invite_code,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      permissions: normalizePartyPermissions(data.permissions),
    });
  }, [links, patchParty, requireCloud]);

  const clearPendingInvite = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('partyInvite');
    window.history.replaceState({}, '', url);
    setPendingInvite(null);
  }, []);

  const parties = useMemo(() => Object.values(partiesByID).sort((left, right) => left.name.localeCompare(right.name)), [partiesByID]);
  const partyCharacters = useMemo(() => parties.flatMap((party) => party.members.flatMap((member) => member.character ? [{
    partyId: party.id,
    partyName: party.name,
    memberId: member.userId,
    memberName: member.displayName,
    character: member.character,
  }] : [])), [parties]);

  const value = useMemo<PartyCampaignContextValue>(() => ({
    isAvailable: Boolean(isConfigured && firestore && user),
    parties,
    partyCharacters,
    pendingInvite,
    status,
    error,
    createPartyCampaign,
    joinPartyCampaign,
    publishCharacter,
    updatePartyMemberCharacter,
    renameParty,
    updatePartyPermissions,
    updatePartyAppearance,
    updatePartyMemberRole,
    addSharedNote: saveSharedNote,
    updateSharedNote: saveSharedNote,
    removeSharedNote,
    addSharedInventoryItem: saveSharedInventoryItem,
    updateSharedInventoryItem: saveSharedInventoryItem,
    removeSharedInventoryItem,
    adjustSharedGold,
    requestSharedInventoryItem,
    resolveSharedInventoryRequest,
    shareVaultEntry,
    removeSharedVaultEntry,
    removePartyMember,
    leaveParty,
    deleteParty,
    refreshParty,
    inviteURL: (inviteCode) => {
      const url = new URL(window.location.origin);
      url.searchParams.set('partyInvite', inviteCode);
      return url.toString();
    },
    clearPendingInvite,
  }), [adjustSharedGold, clearPendingInvite, createPartyCampaign, deleteParty, error, isConfigured, joinPartyCampaign, leaveParty, parties, partyCharacters, pendingInvite, publishCharacter, refreshParty, removePartyMember, removeSharedInventoryItem, removeSharedNote, removeSharedVaultEntry, renameParty, requestSharedInventoryItem, resolveSharedInventoryRequest, saveSharedInventoryItem, saveSharedNote, shareVaultEntry, status, updatePartyAppearance, updatePartyMemberCharacter, updatePartyMemberRole, updatePartyPermissions, user]);

  return <PartyCampaignContext.Provider value={value}>{children}</PartyCampaignContext.Provider>;
}

export function usePartyCampaigns(): PartyCampaignContextValue {
  const context = useContext(PartyCampaignContext);
  if (!context) throw new Error('usePartyCampaigns must be used inside PartyCampaignProvider.');
  return context;
}
