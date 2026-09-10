import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import { useCampaignStore } from '../../store/campaignStore';
import type {
  CampaignNote,
  CampaignRecord,
  Character,
  PartyCampaignMember,
  PartyCampaignSnapshot,
  PartyInventoryItem,
} from '../../types/models';
import { CombatantTeamValues } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { combatantFromCharacter } from '../../utils/monsterRules';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GoldBalanceControl } from '../GoldBalanceControl';
import CharacterSheet from './CharacterSheet';
import type { ContentFocusRequest } from '../../navigation/appNavigation';

/* Navigation requests and live party records intentionally synchronize local campaign state. */
/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps */

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

export default function CampaignView({ focusRequest, onFocusHandled }: { focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void }) {
  const {
    campaignData,
    characters,
    selectedCampaignId,
    selectCampaign,
    updateCampaignData,
    addCampaign,
    updateCampaign,
    removeCampaign,
    updateCombat,
  } = useCampaignStore();
  const { user } = useAuth();
  const partyHub = usePartyCampaigns();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [joinCharacterId, setJoinCharacterId] = useState('');
  const [viewedMember, setViewedMember] = useState<{ partyId: string; memberId: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const effectiveCampaignId = selectedCampaignId ?? campaignData.campaigns[0]?.id ?? null;
  const campaign = campaignData.campaigns.find(({ id }) => id === effectiveCampaignId) ?? null;
  const party = campaign?.party ? partyHub.parties.find(({ id }) => id === campaign.party?.partyId) ?? null : null;
  const viewedCharacter = viewedMember
    ? partyHub.parties.find(({ id }) => id === viewedMember.partyId)?.members.find(({ userId }) => userId === viewedMember.memberId)?.character
    : undefined;

  const effectiveJoinCharacterId = joinCharacterId || characters[0]?.id || '';

  useEffect(() => {
    if (campaign?.party?.role === 'player' && party?.name && campaign.name !== party.name) {
      updateCampaign({ ...campaign, name: party.name });
    }
  }, [campaign, party?.name, updateCampaign]);

  const performPartyAction = (action: Promise<unknown>) => {
    void action.catch((caught) => setNotice(caught instanceof Error ? caught.message : 'The shared campaign could not be updated.'));
  };

  const createSoloCampaign = (firstNoteTitle = 'Session Notes', firstNoteBody = '') => {
    const firstNote: CampaignNote = { id: generateUUID(), title: firstNoteTitle, body: firstNoteBody };
    const next: CampaignRecord = {
      id: generateUUID(),
      name: `Campaign ${campaignData.campaigns.length + 1}`,
      notes: [firstNote],
    };
    addCampaign(next);
    setSelectedNoteId(firstNote.id);
  };

  const createGroupCampaign = async () => {
    if (!partyHub.isAvailable) {
      setNotice('Sign in with a configured cloud account to create a group campaign.');
      return;
    }
    setWorking(true);
    setNotice('');
    try {
      const name = `Group Campaign ${campaignData.campaigns.filter(({ party: link }) => Boolean(link)).length + 1}`;
      const partyLink = await partyHub.createPartyCampaign(name);
      addCampaign({ id: generateUUID(), name, notes: [], party: partyLink });
      setSelectedNoteId(null);
      setNotice('Group campaign created. Share its invitation link from the Party tab.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The group campaign could not be created.');
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (focusRequest?.kind === 'campaign') {
      if (focusRequest.id) selectCampaign(focusRequest.id);
      else createSoloCampaign();
      if (focusRequest.noteId) setSelectedNoteId(focusRequest.noteId);
      onFocusHandled?.();
      return;
    }
    if (focusRequest?.kind !== 'npc') return;
    const title = `NPC — New NPC`;
    const body = `Role:\nAncestry:\nLocation:\nDisposition:\n\nAppearance:\n\nGoals & Secrets:\n\nVoice & Mannerisms:\n\nNotes:`;
    if (!campaign) createSoloCampaign(title, body);
    else if (campaign.party) {
      performPartyAction(partyHub.addSharedNote(campaign.party.partyId, { id: generateUUID(), title, body }));
      setNotice('A new NPC record was added to the shared campaign notes.');
    } else {
      const note = { id: generateUUID(), title, body };
      updateCampaign({ ...campaign, notes: [...campaign.notes, note] });
      setSelectedNoteId(note.id);
      setNotice('A new NPC record is ready in campaign notes.');
    }
    onFocusHandled?.();
  }, [focusRequest]);

  const joinPendingParty = async () => {
    const character = characters.find(({ id }) => id === effectiveJoinCharacterId);
    if (!partyHub.pendingInvite || !character) return;
    setWorking(true);
    setNotice('');
    try {
      const joined = await partyHub.joinPartyCampaign(partyHub.pendingInvite.code, character);
      const existing = campaignData.campaigns.find(({ party: link }) => link?.partyId === joined.link.partyId);
      if (existing) {
        updateCampaign({ ...existing, name: joined.campaignName, party: joined.link });
        selectCampaign(existing.id);
      } else {
        const localCampaign: CampaignRecord = { id: generateUUID(), name: joined.campaignName, notes: [], party: joined.link };
        addCampaign(localCampaign);
      }
      partyHub.clearPendingInvite();
      setNotice(`${character.name} joined ${joined.campaignName}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The party could not be joined.');
    } finally {
      setWorking(false);
    }
  };

  const linkCharacter = async (characterId: string) => {
    if (!campaign?.party) return;
    const character = characters.find(({ id }) => id === characterId);
    if (!character) return;
    const nextCampaign = { ...campaign, party: { ...campaign.party, characterId } };
    updateCampaign(nextCampaign);
    try {
      await partyHub.publishCharacter(campaign.party.partyId, campaign.party.role, character);
      setNotice(`${character.name} is now shared with the party.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The character could not be shared.');
    }
  };

  const addMemberToCombat = (member: PartyCampaignMember, combatId: string) => {
    if (!campaign?.party || !member.character) return;
    const combat = campaignData.combats.find(({ id }) => id === combatId);
    if (!combat) return;
    const combatant = {
      ...combatantFromCharacter(member.character),
      id: generateUUID(),
      team: CombatantTeamValues.HEROES,
      sourceCharacterID: undefined,
      sourcePartyCampaignID: campaign.party.partyId,
      sourcePartyMemberID: member.userId,
    };
    updateCombat({ ...combat, combatants: [...combat.combatants, combatant] });
    setNotice(`${member.character.name} was added to ${combat.name}. Their HP will display from the party sheet.`);
  };

  const deleteCurrentCampaign = async () => {
    if (!campaign) return;
    const groupCopy = campaign.party;
    const wording = groupCopy?.role === 'gm'
      ? `Delete ${campaign.name} for the entire party? Shared notes and inventory will also be deleted.`
      : groupCopy ? `Leave ${campaign.name}? Your character will be removed from the party.`
        : `Delete ${campaign.name} and all ${campaign.notes.length} nested notes?`;
    if (!window.confirm(wording)) return;
    try {
      if (groupCopy?.role === 'gm') await partyHub.deleteParty(groupCopy.partyId, groupCopy.inviteCode ?? party?.inviteCode ?? '');
      else if (groupCopy) await partyHub.leaveParty(groupCopy.partyId);
      removeCampaign(campaign.id);
      setSelectedNoteId(null);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'The campaign could not be removed.');
    }
  };

  if (viewedCharacter) {
    return <div className="h-full min-h-0 overflow-y-auto overscroll-contain"><CharacterSheet character={viewedCharacter} readOnly onClose={() => setViewedMember(null)} /></div>;
  }

  const localNote = campaign?.notes.find(({ id }) => id === selectedNoteId) ?? campaign?.notes[0] ?? null;

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div>
          <h1 className="text-2xl font-black text-white">Campaigns</h1>
          <p className="text-xs text-slate-500">Solo workspaces and connected parties</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => createSoloCampaign()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/10">+ Solo</button>
          <button type="button" disabled={working || !partyHub.isAvailable} onClick={() => void createGroupCampaign()} className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">+ Group</button>
        </div>
        {!partyHub.isAvailable && <p className="mt-2 text-[10px] leading-4 text-amber-300">Group campaigns require Firebase and a signed-in account.</p>}
        <div className="mt-5 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
          {campaignData.campaigns.length === 0 && <button type="button" onClick={() => createSoloCampaign()} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first campaign</button>}
          {campaignData.campaigns.map((entry) => (
            <button
              type="button"
              key={entry.id}
              onClick={() => {
                selectCampaign(entry.id);
                setSelectedNoteId(entry.notes[0]?.id ?? null);
              }}
              className={`w-full rounded-xl border p-3 text-left transition ${entry.id === effectiveCampaignId ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
            >
              <div className="font-bold text-slate-100">{entry.name}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
                {entry.party ? <><span className="text-emerald-300">Group</span><span className="text-violet-300">{entry.party.role === 'gm' ? 'GM' : 'Player'}</span></> : <span className="text-slate-500">Solo</span>}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-white/5 pt-5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Hub Name</label>
          <input className={`${inputClass} mt-2 w-full`} value={campaignData.title} onChange={(event) => updateCampaignData({ title: event.target.value })} />
          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Private Hub Overview</label>
          <textarea className={`${inputClass} mt-2 min-h-24 w-full resize-y`} value={campaignData.notes} onChange={(event) => updateCampaignData({ notes: event.target.value })} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {partyHub.pendingInvite && <PartyInvitation
          campaignName={partyHub.pendingInvite.campaignName}
          gmDisplayName={partyHub.pendingInvite.gmDisplayName}
          characters={characters}
          selectedCharacterId={effectiveJoinCharacterId}
          working={working}
          onSelectCharacter={setJoinCharacterId}
          onJoin={() => void joinPendingParty()}
          onDismiss={partyHub.clearPendingInvite}
        />}
        {(notice || partyHub.error) && <p role="status" className="m-4 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 sm:m-6 lg:mx-8">{notice || partyHub.error}</p>}
        {!campaign && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select a campaign, create a solo workspace, or start a connected group campaign.</div>}
        {campaign && (
          <CampaignEditor
            key={campaign.id}
            campaign={campaign}
            party={party}
            currentUserId={user?.uid ?? ''}
            characters={characters}
            combats={campaignData.combats}
            localNote={localNote}
            selectedNoteId={localNote?.id ?? null}
            onSelectNote={setSelectedNoteId}
            onUpdateCampaign={(changes) => updateCampaign({ ...campaign, ...changes })}
            onRenameParty={(name) => campaign.party && performPartyAction(partyHub.renameParty(campaign.party.partyId, name))}
            onCreateLocalNote={() => {
              const note = { id: generateUUID(), title: `Note ${campaign.notes.length + 1}`, body: '' };
              updateCampaign({ ...campaign, notes: [...campaign.notes, note] });
              setSelectedNoteId(note.id);
            }}
            onUpdateLocalNote={(changes) => localNote && updateCampaign({ ...campaign, notes: campaign.notes.map((entry) => entry.id === localNote.id ? { ...entry, ...changes } : entry) })}
            onDeleteLocalNote={() => {
              if (!localNote || !window.confirm(`Delete the note “${localNote.title}”?`)) return;
              updateCampaign({ ...campaign, notes: campaign.notes.filter(({ id }) => id !== localNote.id) });
              setSelectedNoteId(null);
            }}
            onCreateSharedNote={(note) => campaign.party && performPartyAction(partyHub.addSharedNote(campaign.party.partyId, note))}
            onUpdateSharedNote={(note) => campaign.party && performPartyAction(partyHub.updateSharedNote(campaign.party.partyId, note))}
            onDeleteSharedNote={(id) => campaign.party && performPartyAction(partyHub.removeSharedNote(campaign.party.partyId, id))}
            onAddInventory={(item) => campaign.party && performPartyAction(partyHub.addSharedInventoryItem(campaign.party.partyId, item))}
            onUpdateInventory={(item) => campaign.party && performPartyAction(partyHub.updateSharedInventoryItem(campaign.party.partyId, item))}
            onDeleteInventory={(id) => campaign.party && performPartyAction(partyHub.removeSharedInventoryItem(campaign.party.partyId, id))}
            onAdjustGold={(delta) => campaign.party && performPartyAction(partyHub.adjustSharedGold(campaign.party.partyId, delta))}
            onLinkCharacter={(id) => void linkCharacter(id)}
            onViewMember={(memberId) => campaign.party && setViewedMember({ partyId: campaign.party.partyId, memberId })}
            onRemoveMember={(memberId) => campaign.party && performPartyAction(partyHub.removePartyMember(campaign.party.partyId, memberId))}
            onAddMemberToCombat={addMemberToCombat}
            onDeleteCampaign={() => void deleteCurrentCampaign()}
            inviteURL={campaign.party ? partyHub.inviteURL(campaign.party.inviteCode ?? party?.inviteCode ?? '') : ''}
          />
        )}
      </main>
    </div>
  );
}

function PartyInvitation({ campaignName, gmDisplayName, characters, selectedCharacterId, working, onSelectCharacter, onJoin, onDismiss }: {
  campaignName: string;
  gmDisplayName: string;
  characters: Character[];
  selectedCharacterId: string;
  working: boolean;
  onSelectCharacter: (id: string) => void;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  return <section className="m-4 rounded-2xl border border-emerald-400/30 bg-emerald-950/30 p-4 shadow-xl sm:m-6 sm:p-5 lg:mx-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Party Invitation</p><h2 className="mt-1 text-2xl font-black text-white">Join {campaignName}</h2><p className="mt-1 text-sm text-slate-400">{gmDisplayName} is the GM. Choose one of your completed characters to share with the party.</p></div><button type="button" onClick={onDismiss} className="text-sm font-bold text-slate-400">Dismiss</button></div>
    {characters.length > 0 ? <div className="mt-4 flex flex-wrap gap-3"><select value={selectedCharacterId} onChange={(event) => onSelectCharacter(event.target.value)} className={`${inputClass} min-w-0 grow basis-64`}>{characters.map((character) => <option key={character.id} value={character.id}>{character.name} — Level {character.level} {character.class}</option>)}</select><button type="button" disabled={!selectedCharacterId || working} onClick={onJoin} className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-40">{working ? 'Joining…' : 'Join with Character'}</button></div> : <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm font-bold text-amber-200">Create a character in the Characters tab, then reopen this invitation link.</p>}
  </section>;
}

type CampaignTab = 'party' | 'notes' | 'inventory';

function CampaignEditor({ campaign, party, currentUserId, characters, combats, localNote, selectedNoteId, onSelectNote, onUpdateCampaign, onRenameParty, onCreateLocalNote, onUpdateLocalNote, onDeleteLocalNote, onCreateSharedNote, onUpdateSharedNote, onDeleteSharedNote, onAddInventory, onUpdateInventory, onDeleteInventory, onAdjustGold, onLinkCharacter, onViewMember, onRemoveMember, onAddMemberToCombat, onDeleteCampaign, inviteURL }: {
  campaign: CampaignRecord;
  party: PartyCampaignSnapshot | null;
  currentUserId: string;
  characters: Character[];
  combats: ReturnType<typeof useCampaignStore.getState>['campaignData']['combats'];
  localNote: CampaignNote | null;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onUpdateCampaign: (changes: Partial<CampaignRecord>) => void;
  onRenameParty: (name: string) => void;
  onCreateLocalNote: () => void;
  onUpdateLocalNote: (changes: Partial<CampaignNote>) => void;
  onDeleteLocalNote: () => void;
  onCreateSharedNote: (note: CampaignNote) => void;
  onUpdateSharedNote: (note: CampaignNote) => void;
  onDeleteSharedNote: (id: string) => void;
  onAddInventory: (item: PartyInventoryItem) => void;
  onUpdateInventory: (item: PartyInventoryItem) => void;
  onDeleteInventory: (id: string) => void;
  onAdjustGold: (delta: number) => void;
  onLinkCharacter: (id: string) => void;
  onViewMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAddMemberToCombat: (member: PartyCampaignMember, combatId: string) => void;
  onDeleteCampaign: () => void;
  inviteURL: string;
}) {
  const [tab, setTab] = useState<CampaignTab>(campaign.party ? 'party' : 'notes');
  const [combatId, setCombatId] = useState(combats[0]?.id ?? '');
  const [campaignName, setCampaignName] = useState(party?.name || campaign.name);
  const isGM = campaign.party?.role === 'gm';

  useEffect(() => { if (party?.name) setCampaignName(party.name); }, [party?.name]);

  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 grow basis-64">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{campaign.party ? 'Connected Party Hub' : 'Solo Campaign Workspace'}</div>
        <input className="mt-1 w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none focus:text-violet-100 sm:text-4xl" value={campaignName} disabled={Boolean(campaign.party && !isGM)} onChange={(event) => { setCampaignName(event.target.value); onUpdateCampaign({ name: event.target.value }); }} onBlur={() => { if (campaign.party && isGM) onRenameParty(campaignName); }} aria-label="Campaign name" />
        {party && <p className="mt-2 text-sm text-slate-400">GM: <strong className="text-slate-200">{party.gmDisplayName}</strong> • {party.members.length} {party.members.length === 1 ? 'member' : 'members'}</p>}
      </div>
      <button type="button" onClick={onDeleteCampaign} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">{campaign.party && !isGM ? 'Leave Campaign' : 'Delete Campaign'}</button>
    </div>

    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/55 p-2 sm:grid-cols-3">
      {campaign.party && <button type="button" onClick={() => setTab('party')} className={`rounded-xl px-4 py-3 text-sm font-black ${tab === 'party' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>Party</button>}
      <button type="button" onClick={() => setTab('notes')} className={`rounded-xl px-4 py-3 text-sm font-black ${tab === 'notes' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>{campaign.party ? 'Shared Notes' : 'Notes'}</button>
      {campaign.party && <button type="button" onClick={() => setTab('inventory')} className={`rounded-xl px-4 py-3 text-sm font-black ${tab === 'inventory' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>Shared Inventory</button>}
    </nav>

    {tab === 'party' && party && <PartyPanel
      campaign={campaign}
      party={party}
      currentUserId={currentUserId}
      characters={characters}
      combats={combats}
      combatId={combatId}
      inviteURL={inviteURL}
      onSelectCombat={setCombatId}
      onLinkCharacter={onLinkCharacter}
      onViewMember={onViewMember}
      onRemoveMember={onRemoveMember}
      onAddMemberToCombat={onAddMemberToCombat}
    />}
    {tab === 'party' && campaign.party && !party && <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-400">Loading the connected party…</div>}
    {tab === 'notes' && (party ? <SharedNotesEditor party={party} onCreate={onCreateSharedNote} onUpdate={onUpdateSharedNote} onDelete={onDeleteSharedNote} /> : <SoloNotesEditor campaign={campaign} note={localNote} selectedNoteId={selectedNoteId} onSelect={onSelectNote} onCreate={onCreateLocalNote} onUpdate={onUpdateLocalNote} onDelete={onDeleteLocalNote} />)}
    {tab === 'inventory' && party && <><GoldBalanceControl currentGold={party.gold} onAdjust={onAdjustGold} title="Shared Gold" description="This balance is synchronized for every campaign member. Enter a transaction amount, then add or subtract it." /><SharedInventoryEditor party={party} currentUserId={currentUserId} onCreate={onAddInventory} onUpdate={onUpdateInventory} onDelete={onDeleteInventory} /></>}
  </div>;
}

function PartyPanel({ campaign, party, currentUserId, characters, combats, combatId, inviteURL, onSelectCombat, onLinkCharacter, onViewMember, onRemoveMember, onAddMemberToCombat }: {
  campaign: CampaignRecord;
  party: PartyCampaignSnapshot;
  currentUserId: string;
  characters: Character[];
  combats: ReturnType<typeof useCampaignStore.getState>['campaignData']['combats'];
  combatId: string;
  inviteURL: string;
  onSelectCombat: (id: string) => void;
  onLinkCharacter: (id: string) => void;
  onViewMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAddMemberToCombat: (member: PartyCampaignMember, combatId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isGM = campaign.party?.role === 'gm';
  return <div className="space-y-5">
    {isGM && <section className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Player Invitation</p><h2 className="mt-1 text-xl font-black text-white">Invite players to the party</h2><p className="mt-2 text-sm leading-6 text-slate-400">Players sign in, open this link, and choose one of their characters. The link can be reused for the whole group.</p><div className="mt-4 flex flex-wrap gap-2"><input readOnly value={inviteURL} className={`${inputClass} min-w-0 grow basis-72`} aria-label="Party invitation link" /><button type="button" disabled={!inviteURL} onClick={() => void navigator.clipboard.writeText(inviteURL).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => setCopied(false))} className="rounded-xl bg-fuchsia-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{copied ? 'Copied!' : 'Copy Link'}</button></div></section>}

    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Your Party</p><h2 className="mt-1 text-xl font-black text-white">Characters and members</h2></div>{isGM && combats.length > 0 && <label className="text-xs font-bold text-slate-400">Target combat<select value={combatId} onChange={(event) => onSelectCombat(event.target.value)} className={`${inputClass} ml-2 py-1.5`}>{combats.map((combat) => <option key={combat.id} value={combat.id}>{combat.name}</option>)}</select></label>}</div>
      <div className="mt-4 rounded-xl border border-violet-400/15 bg-violet-500/5 p-4"><label className="text-xs font-black uppercase tracking-wider text-violet-300">Your shared character</label><div className="mt-2 flex flex-wrap gap-2"><select value={campaign.party?.characterId ?? ''} onChange={(event) => onLinkCharacter(event.target.value)} className={`${inputClass} min-w-0 grow basis-64`}><option value="">Choose a character…</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name} — Level {character.level} {character.class}</option>)}</select></div><p className="mt-2 text-xs text-slate-500">Changes made on this character’s sheet are published to the party automatically.</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{party.members.map((member) => <article key={member.userId} className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-start gap-3">{member.character ? <CharacterAvatar image={member.character.avatarDataURL} name={member.character.name} className="w-16 shrink-0" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-800 text-xl">{member.role === 'gm' ? 'GM' : 'PC'}</div>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-black text-slate-100">{member.character?.name || member.displayName}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${member.role === 'gm' ? 'bg-fuchsia-500/15 text-fuchsia-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{member.role}</span></div><p className="mt-1 text-xs text-slate-500">{member.character ? `Level ${member.character.level} ${member.character.ancestry} ${member.character.class}` : 'No character shared'}</p>{member.character && <p className={`mt-2 text-sm font-black ${member.character.healthPoints <= member.character.maxHealthPoints / 2 ? 'text-amber-300' : 'text-emerald-300'}`}>HP {member.character.healthPoints} / {member.character.maxHealthPoints}</p>}</div></div>{isGM && member.character && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => onViewMember(member.userId)} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">View Sheet</button><button type="button" disabled={!combatId} onClick={() => onAddMemberToCombat(member, combatId)} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Add to Combat</button></div>}{isGM && member.role !== 'gm' && member.userId !== currentUserId && <button type="button" onClick={() => { if (window.confirm(`Remove ${member.displayName} from the party?`)) onRemoveMember(member.userId); }} className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10">Remove Member</button>}</article>)}</div>
      {isGM && combats.length === 0 && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Create a combat in the Combat tab before adding party members.</p>}
    </section>
  </div>;
}

function SharedNotesEditor({ party, onCreate, onUpdate, onDelete }: { party: PartyCampaignSnapshot; onCreate: (note: CampaignNote) => void; onUpdate: (note: CampaignNote) => void; onDelete: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(party.notes[0]?.id ?? '');
  const note = party.notes.find(({ id }) => id === selectedId) ?? party.notes[0] ?? null;
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  useEffect(() => { setTitle(note?.title ?? ''); setBody(note?.body ?? ''); }, [note?.body, note?.id, note?.title]);
  const save = () => note && onUpdate({ ...note, title, body });
  return <div className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 md:grid-cols-[17rem_1fr]"><aside className="border-b border-white/5 bg-slate-950/35 p-4 md:border-r md:border-b-0"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black uppercase tracking-[0.15em] text-violet-300">Shared Notes</h2><button type="button" onClick={() => { const created = { id: generateUUID(), title: `Note ${party.notes.length + 1}`, body: '' }; onCreate(created); setSelectedId(created.id); }} className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-xs font-bold text-violet-300">+ Note</button></div><div className="mt-4 space-y-2">{party.notes.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedId(entry.id)} className={`w-full rounded-xl border p-3 text-left ${entry.id === note?.id ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/5 bg-white/[0.025]'}`}><div className="truncate font-bold text-slate-200">{entry.title || 'Untitled Note'}</div><div className="mt-1 truncate text-xs text-slate-600">{entry.body || 'Empty note'}</div></button>)}</div></aside><section className="min-w-0 p-4 sm:p-6">{note ? <div className="flex h-full flex-col"><div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4"><input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} className="min-w-0 grow bg-transparent text-2xl font-black text-white outline-none" aria-label="Shared note title" /><button type="button" onClick={() => { if (window.confirm(`Delete “${note.title}”?`)) { onDelete(note.id); setSelectedId(''); } }} className="text-xs font-bold text-red-300">Delete Note</button></div><textarea value={body} onChange={(event) => setBody(event.target.value)} onBlur={save} className="mt-4 min-h-96 grow resize-none bg-transparent leading-7 text-slate-300 outline-none" placeholder="Write notes the whole party can see…" aria-label="Shared note body" /><div className="mt-3 text-right text-xs text-slate-600">Saves when you leave the field</div></div> : <div className="grid h-full place-items-center text-slate-500">Create a shared note for the party.</div>}</section></div>;
}

function SoloNotesEditor({ campaign, note, selectedNoteId, onSelect, onCreate, onUpdate, onDelete }: { campaign: CampaignRecord; note: CampaignNote | null; selectedNoteId: string | null; onSelect: (id: string) => void; onCreate: () => void; onUpdate: (changes: Partial<CampaignNote>) => void; onDelete: () => void }) {
  return <div className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 md:grid-cols-[17rem_1fr]"><aside className="border-b border-white/5 bg-slate-950/35 p-4 md:border-r md:border-b-0"><div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[0.15em] text-violet-300">Private Notes</h2><button type="button" onClick={onCreate} className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-xs font-bold text-violet-300">+ Note</button></div><div className="mt-4 space-y-2">{campaign.notes.map((entry) => <button type="button" key={entry.id} onClick={() => onSelect(entry.id)} className={`w-full rounded-xl border p-3 text-left ${entry.id === selectedNoteId ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/5 bg-white/[0.025]'}`}><div className="truncate font-bold text-slate-200">{entry.title || 'Untitled Note'}</div><div className="mt-1 truncate text-xs text-slate-600">{entry.body || 'Empty note'}</div></button>)}</div></aside><section className="min-w-0 p-4 sm:p-6">{note ? <div className="flex h-full flex-col"><div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4"><input value={note.title} onChange={(event) => onUpdate({ title: event.target.value })} className="min-w-0 grow bg-transparent text-2xl font-black text-white outline-none" aria-label="Note title" /><button type="button" onClick={onDelete} className="text-xs font-bold text-red-300">Delete Note</button></div><textarea value={note.body} onChange={(event) => onUpdate({ body: event.target.value })} className="mt-4 min-h-96 grow resize-none bg-transparent leading-7 text-slate-300 outline-none" placeholder="Write private GM notes…" aria-label="Note body" /></div> : <div className="grid h-full place-items-center text-slate-500">Create a private note.</div>}</section></div>;
}

function SharedInventoryEditor({ party, currentUserId, onCreate, onUpdate, onDelete }: { party: PartyCampaignSnapshot; currentUserId: string; onCreate: (item: PartyInventoryItem) => void; onUpdate: (item: PartyInventoryItem) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = () => {
    if (!name.trim()) return;
    onCreate({ id: generateUUID(), name: name.trim(), description: description.trim(), quantity: 1, addedBy: currentUserId, updatedAt: new Date().toISOString() });
    setName('');
    setDescription('');
  };
  return <div className="space-y-5"><section className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Party Stash</p><h2 className="mt-1 text-xl font-black text-white">Add a shared item</h2><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Item name" aria-label="Shared item name" /><input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Description, owner, location…" aria-label="Shared item description" /><button type="button" disabled={!name.trim()} onClick={create} className="rounded-xl bg-amber-700 px-5 py-2 font-black text-white disabled:opacity-40">Add Item</button></div></section><section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-white">Shared Inventory</h2><span className="text-xs font-bold text-slate-500">{party.inventory.reduce((sum, item) => sum + item.quantity, 0)} total</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{party.inventory.map((item) => <article key={`${item.id}-${item.updatedAt}`} className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><input defaultValue={item.name} onBlur={(event) => onUpdate({ ...item, name: event.target.value })} className="w-full bg-transparent font-black text-slate-100 outline-none" aria-label={`${item.name} name`} /><textarea defaultValue={item.description} onBlur={(event) => onUpdate({ ...item, description: event.target.value })} rows={3} className="mt-2 w-full resize-none bg-transparent text-sm leading-5 text-slate-400 outline-none" aria-label={`${item.name} description`} /><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => onUpdate({ ...item, quantity: Math.max(0, item.quantity - 1) })} className="h-8 w-8 rounded-lg bg-slate-800 font-black">−</button><span className="min-w-8 text-center font-black text-amber-200">{item.quantity}</span><button type="button" onClick={() => onUpdate({ ...item, quantity: item.quantity + 1 })} className="h-8 w-8 rounded-lg bg-amber-700 font-black text-white">+</button></div><button type="button" onClick={() => { if (window.confirm(`Remove ${item.name} from the party inventory?`)) onDelete(item.id); }} className="text-xs font-bold text-red-300">Remove</button></div></article>)}{party.inventory.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">The shared inventory is empty.</div>}</div></section></div>;
}
