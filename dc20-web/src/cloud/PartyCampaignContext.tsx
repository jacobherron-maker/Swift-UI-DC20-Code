import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { firestore } from '../lib/firebase';
import type {
  CampaignNote,
  CampaignPartyLink,
  Character,
  GmVaultEntry,
  PartyCampaignMember,
  PartyCampaignRole,
  PartyCampaignSnapshot,
  PartyInventoryItem,
} from '../types/models';
import { useCampaignStore } from '../store/campaignStore';
import { inventoryWithCustomItemSnapshots } from '../utils/equipmentRules';
import { generateUUID } from '../utils/gameUtils';
import { normalizeVaultEntry, prepareVaultEntry } from '../utils/vaultRules';

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
  renameParty: (partyId: string, name: string) => Promise<void>;
  addSharedNote: (partyId: string, note: CampaignNote) => Promise<void>;
  updateSharedNote: (partyId: string, note: CampaignNote) => Promise<void>;
  removeSharedNote: (partyId: string, noteId: string) => Promise<void>;
  addSharedInventoryItem: (partyId: string, item: PartyInventoryItem) => Promise<void>;
  updateSharedInventoryItem: (partyId: string, item: PartyInventoryItem) => Promise<void>;
  removeSharedInventoryItem: (partyId: string, itemId: string) => Promise<void>;
  adjustSharedGold: (partyId: string, delta: number) => Promise<void>;
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
    members: [],
    notes: [],
    inventory: [],
    vaultEntries: [],
    gold: 0,
  };
}

export function PartyCampaignProvider({ children, links }: { children: ReactNode; links: CampaignPartyLink[] }) {
  const { isConfigured, user } = useAuth();
  const characters = useCampaignStore((state) => state.characters);
  const customEquipment = useCampaignStore((state) => state.campaignData.customEquipment);
  const [partiesByID, setPartiesByID] = useState<Record<string, PartyCampaignSnapshot>>({});
  const [pendingInvite, setPendingInvite] = useState<PendingPartyInvite | null>(null);
  const [status, setStatus] = useState<PartyCampaignContextValue['status']>('idle');
  const [error, setError] = useState('');
  const linkSignature = links.map(({ partyId, role }) => `${partyId}:${role}`).sort().join('|');

  const reportError = useCallback((caught: unknown, fallback: string) => {
    setStatus('error');
    setError(caught instanceof Error ? caught.message : fallback);
  }, []);

  const patchParty = useCallback((partyId: string, role: PartyCampaignRole, changes: Partial<PartyCampaignSnapshot>) => {
    setPartiesByID((current) => ({
      ...current,
      [partyId]: { ...(current[partyId] ?? emptyParty(partyId, role)), ...changes, role },
    }));
  }, []);

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
        });
        setStatus('ready');
      }, (caught) => reportError(caught, 'The shared campaign could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'members'), (snapshot) => {
        const members = snapshot.docs.map((memberDocument) => {
          const data = memberDocument.data() as Record<string, unknown>;
          return {
            userId: String(data.user_id ?? memberDocument.id),
            displayName: String(data.display_name ?? 'DC20 Player'),
            role: data.role === 'gm' ? 'gm' : 'player',
            characterId: typeof data.character_id === 'string' ? data.character_id : undefined,
            character: data.character && typeof data.character === 'object' ? data.character as Character : undefined,
            joinedAt: String(data.joined_at ?? ''),
            updatedAt: String(data.updated_at ?? ''),
          } satisfies PartyCampaignMember;
        }).sort((left, right) => Number(left.role !== 'gm') - Number(right.role !== 'gm') || left.displayName.localeCompare(right.displayName));
        patchParty(link.partyId, link.role, { members });
      }, (caught) => reportError(caught, 'Party members could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'notes'), (snapshot) => {
        const notes = snapshot.docs.map((noteDocument) => {
          const data = noteDocument.data() as Record<string, unknown>;
          return { id: noteDocument.id, title: String(data.title ?? 'Untitled Note'), body: String(data.body ?? '') };
        }).sort((left, right) => left.title.localeCompare(right.title));
        patchParty(link.partyId, link.role, { notes });
      }, (caught) => reportError(caught, 'Shared notes could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'inventory'), (snapshot) => {
        const goldDocument = snapshot.docs.find(({ id }) => id === SHARED_GOLD_DOCUMENT_ID);
        const goldData = goldDocument?.data() as Record<string, unknown> | undefined;
        const gold = Math.max(0, Math.trunc(Number(goldData?.amount) || 0));
        const inventory = snapshot.docs.filter(({ id }) => id !== SHARED_GOLD_DOCUMENT_ID).map((itemDocument) => {
          const data = itemDocument.data() as Record<string, unknown>;
          return {
            id: itemDocument.id,
            name: String(data.name ?? 'Unnamed Item'),
            description: String(data.description ?? ''),
            quantity: Math.max(0, Number(data.quantity ?? 1)),
            addedBy: String(data.added_by ?? ''),
            updatedAt: String(data.updated_at ?? ''),
          } satisfies PartyInventoryItem;
        }).sort((left, right) => left.name.localeCompare(right.name));
        patchParty(link.partyId, link.role, { inventory, gold });
      }, (caught) => reportError(caught, 'Shared inventory could not be loaded.')));

      unsubscribers.push(onSnapshot(collection(partyReference, 'vault'), (snapshot) => {
        const vaultEntries = snapshot.docs
          .map((entryDocument) => normalizeVaultEntry(entryDocument.data()))
          .filter((entry): entry is GmVaultEntry => entry !== null)
          .sort((left, right) => left.name.localeCompare(right.name));
        patchParty(link.partyId, link.role, { vaultEntries });
      }, (caught) => reportError(caught, 'Shared GM Vault content could not be loaded.')));
    }
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [linkSignature, links, patchParty, reportError, user]);

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
      const firstNote: CampaignNote = { id: generateUUID(), title: 'Party Notes', body: '' };
      await setDoc(doc(database, 'party_campaigns', partyId, 'notes', firstNote.id), {
        ...firstNote,
        updated_by: currentUser.uid,
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
      role,
      joined_at: existing.joined_at ?? now,
      updated_at: now,
      ...(character ? { character_id: character.id, character: safeCharacter(character, customEquipment) } : {}),
    });
  }, [customEquipment, requireCloud]);

  // Keep every linked player character current even when its owner is working outside the
  // Characters page. This also repairs older Firebase copies whose custom inventory entries
  // were published before portable item snapshots were introduced.
  useEffect(() => {
    if (!firestore || !user) return;
    const linkedCharacters = links.flatMap((link) => {
      if (link.role !== 'player' || !link.characterId) return [];
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
    const { database } = requireCloud();
    const partyReference = doc(database, 'party_campaigns', partyId);
    const snapshot = await getDoc(partyReference);
    if (!snapshot.exists()) throw new Error('The shared campaign no longer exists.');
    const data = snapshot.data() as PartyDocument;
    await setDoc(partyReference, { ...data, name, updated_at: new Date().toISOString() });
    await setDoc(doc(database, 'party_invites', data.invite_code), {
      campaign_id: partyId,
      campaign_name: name,
      gm_user_id: data.gm_user_id,
      gm_display_name: data.gm_display_name,
      active: true,
      created_at: data.created_at,
    } satisfies PartyInviteDocument);
  }, [requireCloud]);

  const saveSharedNote = useCallback(async (partyId: string, note: CampaignNote) => {
    const { database, currentUser } = requireCloud();
    await setDoc(doc(database, 'party_campaigns', partyId, 'notes', note.id), {
      ...note,
      updated_by: currentUser.uid,
      updated_at: new Date().toISOString(),
    });
  }, [requireCloud]);

  const removeSharedNote = useCallback(async (partyId: string, noteId: string) => {
    const { database } = requireCloud();
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'notes', noteId));
  }, [requireCloud]);

  const saveSharedInventoryItem = useCallback(async (partyId: string, item: PartyInventoryItem) => {
    const { database, currentUser } = requireCloud();
    await setDoc(doc(database, 'party_campaigns', partyId, 'inventory', item.id), {
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: Math.max(0, Math.trunc(item.quantity)),
      added_by: item.addedBy || currentUser.uid,
      updated_at: new Date().toISOString(),
    });
  }, [requireCloud]);

  const removeSharedInventoryItem = useCallback(async (partyId: string, itemId: string) => {
    const { database } = requireCloud();
    await deleteDoc(doc(database, 'party_campaigns', partyId, 'inventory', itemId));
  }, [requireCloud]);

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
  }, [requireCloud]);

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
    for (const subcollection of ['members', 'notes', 'inventory', 'vault']) {
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
    renameParty,
    addSharedNote: saveSharedNote,
    updateSharedNote: saveSharedNote,
    removeSharedNote,
    addSharedInventoryItem: saveSharedInventoryItem,
    updateSharedInventoryItem: saveSharedInventoryItem,
    removeSharedInventoryItem,
    adjustSharedGold,
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
  }), [adjustSharedGold, clearPendingInvite, createPartyCampaign, deleteParty, error, isConfigured, joinPartyCampaign, leaveParty, parties, partyCharacters, pendingInvite, publishCharacter, refreshParty, removePartyMember, removeSharedInventoryItem, removeSharedNote, removeSharedVaultEntry, renameParty, saveSharedInventoryItem, saveSharedNote, shareVaultEntry, status, user]);

  return <PartyCampaignContext.Provider value={value}>{children}</PartyCampaignContext.Provider>;
}

export function usePartyCampaigns(): PartyCampaignContextValue {
  const context = useContext(PartyCampaignContext);
  if (!context) throw new Error('usePartyCampaigns must be used inside PartyCampaignProvider.');
  return context;
}
