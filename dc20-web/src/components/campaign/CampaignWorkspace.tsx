import { useEffect, useMemo, useState } from 'react';
import type {
  CampaignNote,
  CampaignRecord,
  Character,
  GmVaultEntry,
  PartyCampaignMember,
  PartyCampaignPermissions,
  PartyCampaignSnapshot,
  PartyInventoryItem,
  PartyInventoryRequest,
  SavedCombat,
} from '../../types/models';
import { canEditCampaignNote, isPartyManager } from '../../utils/campaignRules';
import { characterRestPoints, completeCharacterRest, resetCharacterTurn } from '../../utils/characterRules';
import { generateUUID } from '../../utils/gameUtils';
import { vaultEffectSummary, vaultEntryEligibility } from '../../utils/vaultRules';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GoldBalanceControl } from '../GoldBalanceControl';

/* Campaign drafts intentionally synchronize when their live Firestore records change. */
/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps */

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

type CampaignTab = 'overview' | 'party' | 'notes' | 'inventory' | 'vault';

export interface CampaignWorkspaceProps {
  campaign: CampaignRecord;
  party: PartyCampaignSnapshot | null;
  currentUserId: string;
  characters: Character[];
  combats: SavedCombat[];
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
  onRequestInventory: (item: PartyInventoryItem, character?: Character) => void;
  onResolveInventoryRequest: (request: PartyInventoryRequest, approved: boolean) => void;
  onUpdatePermissions: (permissions: PartyCampaignPermissions) => void;
  onUpdateMemberRole: (memberId: string, role: 'co-gm' | 'player') => void;
  onUpdateMemberCharacter: (member: PartyCampaignMember, character: Character, message: string) => void;
  onAddVaultEntry: (entry: GmVaultEntry) => void;
  onLinkCharacter: (id: string) => void;
  onViewMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onAddMemberToCombat: (member: PartyCampaignMember, combatId: string) => void;
  onDeleteCampaign: () => void;
  inviteURL: string;
}

export default function CampaignWorkspace(props: CampaignWorkspaceProps) {
  const { campaign, party } = props;
  const [tab, setTab] = useState<CampaignTab>('overview');
  const [campaignName, setCampaignName] = useState(party?.name || campaign.name);
  const role = party?.role ?? campaign.party?.role ?? 'player';
  const manager = Boolean(party && isPartyManager(role));
  const ownerGM = Boolean(party && party.gmUserId === props.currentUserId);

  useEffect(() => {
    if (party?.name) setCampaignName(party.name);
  }, [party?.name]);

  const tabs: Array<{ id: CampaignTab; label: string }> = campaign.party
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'party', label: 'Party' },
        { id: 'notes', label: 'Shared Notes' },
        { id: 'inventory', label: 'Shared Inventory' },
        { id: 'vault', label: 'GM Vault' },
      ]
    : [{ id: 'overview', label: 'Overview' }, { id: 'notes', label: 'Notes' }];

  const bannerStyle = campaign.appearance?.bannerDataURL ? {
    backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.92), rgba(2,6,23,.52)), url(${campaign.appearance.bannerDataURL})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  } : undefined;

  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header className={`flex flex-wrap items-start justify-between gap-4 ${bannerStyle ? 'min-h-48 rounded-3xl border border-white/10 p-5 shadow-2xl sm:p-7' : ''}`} style={bannerStyle}>
      <div className="min-w-0 grow basis-64">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{campaign.party ? 'Connected Party Hub' : 'Solo Campaign Workspace'}</p>
        <div className="flex items-center gap-3"><span className="text-3xl" aria-hidden="true">{campaign.appearance?.icon ?? (campaign.party ? '⚑' : '✦')}</span><input
          className="mt-1 w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none focus:text-violet-100 sm:text-4xl"
          value={campaignName}
          disabled={Boolean(campaign.party && !manager)}
          onChange={(event) => {
            setCampaignName(event.target.value);
            props.onUpdateCampaign({ name: event.target.value });
          }}
          onBlur={() => { if (campaign.party && manager) props.onRenameParty(campaignName); }}
          aria-label="Campaign name"
        /></div>
        {party && <p className="mt-2 text-sm text-slate-400">GM: <strong className="text-slate-200">{party.gmDisplayName}</strong> • {party.members.length} {party.members.length === 1 ? 'member' : 'members'} • <span className="capitalize text-violet-300">{role.replace('-', ' ')}</span></p>}
      </div>
      <button type="button" onClick={props.onDeleteCampaign} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">{campaign.party && !ownerGM ? 'Leave Campaign' : 'Delete Campaign'}</button>
    </header>

    <nav className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/55 p-2" aria-label="Campaign sections">
      <div className="flex min-w-max gap-2">
        {tabs.map((entry) => <button key={entry.id} type="button" onClick={() => setTab(entry.id)} className={`min-w-32 rounded-xl px-4 py-3 text-sm font-black ${tab === entry.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>{entry.label}</button>)}
      </div>
    </nav>

    {tab === 'overview' && <CampaignOverview {...props} manager={manager} onNavigate={setTab} />}
    {tab === 'party' && party && <PartyPanel {...props} manager={manager} ownerGM={ownerGM} />}
    {tab === 'party' && campaign.party && !party && <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-slate-400">Loading the connected party…</div>}
    {tab === 'notes' && (party
      ? <SharedNotesEditor party={party} currentUserId={props.currentUserId} manager={manager} onCreate={props.onCreateSharedNote} onUpdate={props.onUpdateSharedNote} onDelete={props.onDeleteSharedNote} />
      : <SoloNotesEditor campaign={campaign} note={props.localNote} selectedNoteId={props.selectedNoteId} onSelect={props.onSelectNote} onCreate={props.onCreateLocalNote} onUpdate={props.onUpdateLocalNote} onDelete={props.onDeleteLocalNote} />)}
    {tab === 'inventory' && party && <div className="space-y-5">
      <GoldBalanceControl currentGold={party.gold} onAdjust={props.onAdjustGold} disabled={!manager && !party.permissions.playersCanManageInventory} title="Shared Gold" description="This balance is synchronized for every campaign member. Every adjustment is recorded in the inventory activity ledger." />
      <SharedInventoryEditor {...props} party={party} manager={manager} />
    </div>}
    {tab === 'vault' && party && <CampaignVaultPanel party={party} character={props.characters.find(({ id }) => id === campaign.party?.characterId)} onAdd={props.onAddVaultEntry} />}
  </div>;
}

function CampaignOverview(props: CampaignWorkspaceProps & { manager: boolean; onNavigate: (tab: CampaignTab) => void }) {
  const { campaign, party, manager } = props;
  if (!party) {
    return <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 to-slate-900/70 p-5 sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Campaign Overview</p>
        <h2 className="mt-2 text-2xl font-black text-white">Your private campaign workspace</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Keep planning notes organized here, or create a Group campaign to unlock party characters, live resources, shared loot, and player permissions.</p>
        <button type="button" onClick={() => props.onNavigate('notes')} className="mt-5 rounded-xl bg-violet-700 px-5 py-3 text-sm font-black text-white">Open Notes</button>
      </section>
      <MetricCard label="Private Notes" value={campaign.notes.length} detail="Nested campaign documents" />
    </div>;
  }

  const characters = party.members.filter(({ character }) => Boolean(character));
  const pendingRequests = party.inventoryRequests.filter(({ status }) => status === 'Pending').length;
  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <MetricCard label="Party" value={party.members.length} detail={`${characters.length} characters shared`} />
      <MetricCard label="Shared Gold" value={party.gold} detail="Current treasury" />
      <MetricCard label="Inventory" value={party.inventory.reduce((sum, item) => sum + item.quantity, 0)} detail={`${party.inventory.length} unique items`} />
      <MetricCard label="Notes" value={party.notes.length} detail="Visible to you" />
      <MetricCard label="Vault Rewards" value={party.vaultEntries.length} detail="Shared campaign content" />
      <MetricCard label="Requests" value={pendingRequests} detail="Awaiting a GM" />
    </section>

    <LivePartyDashboard party={party} manager={manager} onUpdate={props.onUpdateMemberCharacter} />

    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">At a Glance</p><h2 className="mt-1 text-xl font-black text-white">Recent campaign activity</h2></div><div className="flex gap-2"><button type="button" onClick={() => props.onNavigate('notes')} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-slate-200">Notes</button><button type="button" onClick={() => props.onNavigate('inventory')} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white">Inventory</button></div></div>
        <div className="mt-4 space-y-2">
          {party.notes.filter(({ updatedAt }) => Boolean(updatedAt)).sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')).slice(0, 2).map((note) => <div key={`note-${note.id}`} className="rounded-xl border border-white/5 bg-slate-950/45 p-3"><div className="flex justify-between gap-3"><span className="text-xs font-black text-sky-200">Note updated</span><span className="text-[10px] text-slate-600">{formatTimestamp(note.updatedAt ?? '')}</span></div><p className="mt-1 truncate text-sm text-slate-400">{note.title}</p></div>)}
          {party.inventoryLedger.slice(0, 3).map((entry) => <div key={entry.id} className="rounded-xl border border-white/5 bg-slate-950/45 p-3"><div className="flex justify-between gap-3"><span className="text-xs font-black text-violet-200">{entry.action}</span><span className="text-[10px] text-slate-600">{formatTimestamp(entry.createdAt)}</span></div><p className="mt-1 text-sm text-slate-400">{entry.details}</p></div>)}
          {party.inventoryLedger.length === 0 && party.notes.every(({ updatedAt }) => !updatedAt) && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Campaign activity will appear here.</p>}
        </div>
      </section>
      {manager ? <PermissionPanel permissions={party.permissions} onUpdate={props.onUpdatePermissions} /> : <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Your Access</p><h2 className="mt-1 text-xl font-black text-white">Party permissions</h2><PermissionReadout permissions={party.permissions} /></section>}
    </div>
  </div>;
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

function PermissionPanel({ permissions, onUpdate }: { permissions: PartyCampaignPermissions; onUpdate: (permissions: PartyCampaignPermissions) => void }) {
  const options: Array<{ key: keyof PartyCampaignPermissions; title: string; detail: string }> = [
    { key: 'playersCanCreateSharedNotes', title: 'Create shared notes', detail: 'Players can start new party-visible notes.' },
    { key: 'playersCanEditSharedNotes', title: 'Edit allowed notes', detail: 'Players can edit notes unless a note is individually locked.' },
    { key: 'playersCanManageInventory', title: 'Manage shared inventory', detail: 'Players can add, move, equip, and remove shared items.' },
  ];
  return <section className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-950/15 p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Access Control</p><h2 className="mt-1 text-xl font-black text-white">Player permissions</h2><div className="mt-4 space-y-3">{options.map((option) => <label key={option.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/45 p-3"><span><span className="block text-sm font-black text-slate-200">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.detail}</span></span><input type="checkbox" checked={permissions[option.key]} onChange={(event) => onUpdate({ ...permissions, [option.key]: event.target.checked })} className="mt-1 h-5 w-5 accent-violet-500" /></label>)}</div></section>;
}

function PermissionReadout({ permissions }: { permissions: PartyCampaignPermissions }) {
  return <div className="mt-4 space-y-2 text-sm text-slate-400"><p>{permissions.playersCanCreateSharedNotes ? '✓' : '—'} Create shared notes</p><p>{permissions.playersCanEditSharedNotes ? '✓' : '—'} Edit unlocked notes</p><p>{permissions.playersCanManageInventory ? '✓' : '—'} Manage shared inventory</p></div>;
}

function LivePartyDashboard({ party, manager, onUpdate }: { party: PartyCampaignSnapshot; manager: boolean; onUpdate: CampaignWorkspaceProps['onUpdateMemberCharacter'] }) {
  const members = party.members.filter(({ character }) => Boolean(character));
  const partyRest = (type: 'Short' | 'Long') => {
    if (!window.confirm(`Give the entire party a ${type} Rest?`)) return;
    for (const member of members) {
      const character = member.character!;
      onUpdate(member, completeCharacterRest(character, type, 0), `${type} Rest completed for ${character.name}.`);
    }
  };
  return <section className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/75 p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Live Party Dashboard</p><h2 className="mt-1 text-xl font-black text-white">Current party status</h2><p className="mt-1 text-xs text-slate-500">Cloud-synchronized health, resources, conditions, and recovery controls.</p></div>{manager && <div className="flex gap-2"><button type="button" onClick={() => partyRest('Short')} className="rounded-lg bg-sky-800 px-3 py-2 text-xs font-black text-white">Party Short Rest</button><button type="button" onClick={() => partyRest('Long')} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">Party Long Rest</button></div>}</div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{members.map((member) => <LiveCharacterCard key={member.userId} member={member} manager={manager} onUpdate={onUpdate} />)}{members.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">Party members can link characters from the Party tab.</div>}</div>
  </section>;
}

function LiveCharacterCard({ member, manager, onUpdate }: { member: PartyCampaignMember; manager: boolean; onUpdate: CampaignWorkspaceProps['onUpdateMemberCharacter'] }) {
  const character = member.character!;
  const conditions = Object.entries(character.build?.sheetConditionLevels ?? {}).filter(([, level]) => level > 0);
  const restPoints = characterRestPoints(character);
  const updateHP = (delta: number) => onUpdate(member, { ...character, healthPoints: Math.max(0, Math.min(character.maxHealthPoints, character.healthPoints + delta)) }, `${character.name}'s HP updated.`);
  const updateResource = (resource: 'stamina' | 'manaPoints' | 'currentAP' | 'temporaryHP', delta: number) => {
    if (resource === 'temporaryHP') {
      if (!character.build) return;
      onUpdate(member, { ...character, build: { ...character.build, temporaryHP: Math.max(0, character.build.temporaryHP + delta) } }, `${character.name}'s temporary HP updated.`);
      return;
    }
    const limits = { stamina: character.maxStamina, manaPoints: character.maxManaPoints, currentAP: character.maxAP };
    onUpdate(member, { ...character, [resource]: Math.max(0, Math.min(limits[resource], character[resource] + delta)) }, `${character.name}'s resources updated.`);
  };
  const removeCondition = (name: string) => {
    if (!character.build) return;
    const sheetConditionLevels = { ...character.build.sheetConditionLevels };
    delete sheetConditionLevels[name];
    onUpdate(member, { ...character, build: { ...character.build, sheetConditionLevels } }, `${name} removed from ${character.name}.`);
  };
  return <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
    <div className="flex items-start gap-3"><CharacterAvatar image={character.avatarDataURL} name={character.name} className="w-14 shrink-0" /><div className="min-w-0"><h3 className="truncate font-black text-white">{character.name}</h3><p className="text-xs text-slate-500">Level {character.level} {character.class}</p><p className="text-[10px] font-bold uppercase text-violet-300">{member.role.replace('-', ' ')}</p></div></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center"><ResourcePill label="HP" current={character.healthPoints} max={character.maxHealthPoints} /><ResourcePill label="SP" current={character.stamina} max={character.maxStamina} /><ResourcePill label="MP" current={character.manaPoints} max={character.maxManaPoints} /><ResourcePill label="AP" current={character.currentAP} max={character.maxAP} /><ResourcePill label="Temp" current={character.build?.temporaryHP ?? 0} /><ResourcePill label="Rest" current={restPoints} max={character.maxHealthPoints} /></div>
    {conditions.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{conditions.map(([name, level]) => manager ? <button type="button" key={name} onClick={() => removeCondition(name)} title={`Remove ${name}`} className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-200">{name} {level > 1 ? level : ''} ×</button> : <span key={name} className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-200">{name} {level > 1 ? level : ''}</span>)}</div>}
    {manager && <div className="mt-3 space-y-3 border-t border-white/5 pt-3"><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5"><ResourceAdjust label="HP" onDecrease={() => updateHP(-1)} onIncrease={() => updateHP(1)} /><ResourceAdjust label="SP" onDecrease={() => updateResource('stamina', -1)} onIncrease={() => updateResource('stamina', 1)} /><ResourceAdjust label="MP" onDecrease={() => updateResource('manaPoints', -1)} onIncrease={() => updateResource('manaPoints', 1)} /><ResourceAdjust label="AP" onDecrease={() => updateResource('currentAP', -1)} onIncrease={() => updateResource('currentAP', 1)} /><ResourceAdjust label="Temp" onDecrease={() => updateResource('temporaryHP', -1)} onIncrease={() => updateResource('temporaryHP', 1)} /></div><div className="grid grid-cols-2 gap-1.5"><button type="button" onClick={() => onUpdate(member, completeCharacterRest(character, 'Quick', 1), `Quick Rest completed for ${character.name}.`)} className="rounded-lg bg-emerald-900/70 px-2 py-2 text-[10px] font-black text-emerald-100">Quick Rest +1 HP</button><button type="button" onClick={() => onUpdate(member, completeCharacterRest(character, 'Short', 0), `Short Rest completed for ${character.name}.`)} className="rounded-lg bg-sky-900/70 px-2 py-2 text-[10px] font-black text-sky-100">Short Rest</button><button type="button" onClick={() => onUpdate(member, completeCharacterRest(character, 'Long', 0), `Long Rest completed for ${character.name}.`)} className="rounded-lg bg-violet-900/70 px-2 py-2 text-[10px] font-black text-violet-100">Long Rest</button><button type="button" onClick={() => onUpdate(member, resetCharacterTurn(character), `Turn reset for ${character.name}.`)} className="rounded-lg bg-amber-900/70 px-2 py-2 text-[10px] font-black text-amber-100">Reset Turn</button></div></div>}
  </article>;
}

function ResourcePill({ label, current, max }: { label: string; current: number; max?: number }) {
  return <div className="rounded-lg bg-white/[0.035] px-2 py-2"><p className="text-[9px] font-black uppercase text-slate-600">{label}</p><p className="mt-0.5 text-xs font-black text-slate-200">{current}{max !== undefined ? `/${max}` : ''}</p></div>;
}

function ResourceAdjust({ label, onDecrease, onIncrease }: { label: string; onDecrease: () => void; onIncrease: () => void }) {
  return <div className="flex items-center justify-between rounded-lg bg-white/[0.035] p-1"><button type="button" onClick={onDecrease} className="h-7 w-7 rounded bg-rose-900/70 text-xs font-black text-white">−</button><span className="px-1 text-[9px] font-black uppercase text-slate-400">{label}</span><button type="button" onClick={onIncrease} className="h-7 w-7 rounded bg-emerald-800/70 text-xs font-black text-white">+</button></div>;
}

function PartyPanel(props: CampaignWorkspaceProps & { manager: boolean; ownerGM: boolean }) {
  const { campaign, party, currentUserId, characters, combats, manager, ownerGM } = props;
  const [copied, setCopied] = useState(false);
  const [combatId, setCombatId] = useState(combats[0]?.id ?? '');
  if (!party) return null;
  return <div className="space-y-5">
    {manager && <section className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Player Invitation</p><h2 className="mt-1 text-xl font-black text-white">Invite players to the party</h2><p className="mt-2 text-sm leading-6 text-slate-400">Players sign in, open this link, and choose one of their characters. The link can be reused for the whole group.</p><div className="mt-4 flex flex-wrap gap-2"><input readOnly value={props.inviteURL} className={`${inputClass} min-w-0 grow basis-72`} aria-label="Party invitation link" /><button type="button" disabled={!props.inviteURL} onClick={() => void navigator.clipboard.writeText(props.inviteURL).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => setCopied(false))} className="rounded-xl bg-fuchsia-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{copied ? 'Copied!' : 'Copy Link'}</button></div></section>}
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Your Party</p><h2 className="mt-1 text-xl font-black text-white">Characters and members</h2></div>{manager && combats.length > 0 && <label className="text-xs font-bold text-slate-400">Target combat<select value={combatId} onChange={(event) => setCombatId(event.target.value)} className={`${inputClass} ml-2 py-1.5`}>{combats.map((combat) => <option key={combat.id} value={combat.id}>{combat.name}</option>)}</select></label>}</div>
      <div className="mt-4 rounded-xl border border-violet-400/15 bg-violet-500/5 p-4"><label className="text-xs font-black uppercase tracking-wider text-violet-300">Your shared character</label><div className="mt-2 flex flex-wrap gap-2"><select value={campaign.party?.characterId ?? ''} onChange={(event) => props.onLinkCharacter(event.target.value)} className={`${inputClass} min-w-0 grow basis-64`}><option value="">Choose a character…</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name} — Level {character.level} {character.class}</option>)}</select></div><p className="mt-2 text-xs text-slate-500">Changes made on this character’s sheet are published to the party automatically.</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{party.members.map((member) => <article key={member.userId} className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-start gap-3">{member.character ? <CharacterAvatar image={member.character.avatarDataURL} name={member.character.name} className="w-16 shrink-0" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-800 text-xl">{member.role === 'gm' ? 'GM' : 'PC'}</div>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-black text-slate-100">{member.character?.name || member.displayName}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${member.role === 'gm' ? 'bg-fuchsia-500/15 text-fuchsia-200' : member.role === 'co-gm' ? 'bg-violet-500/15 text-violet-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{member.role.replace('-', ' ')}</span></div><p className="mt-1 text-xs text-slate-500">{member.character ? `Level ${member.character.level} ${member.character.ancestry} ${member.character.class}` : 'No character shared'}</p>{member.character && <p className={`mt-2 text-sm font-black ${member.character.healthPoints <= member.character.maxHealthPoints / 2 ? 'text-amber-300' : 'text-emerald-300'}`}>HP {member.character.healthPoints} / {member.character.maxHealthPoints}</p>}</div></div>{manager && member.character && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => props.onViewMember(member.userId)} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">View Sheet</button><button type="button" disabled={!combatId} onClick={() => props.onAddMemberToCombat(member, combatId)} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Add to Combat</button></div>}{ownerGM && member.role !== 'gm' && member.userId !== currentUserId && <div className="mt-2 flex gap-2"><select value={member.role} onChange={(event) => props.onUpdateMemberRole(member.userId, event.target.value as 'co-gm' | 'player')} className={`${inputClass} min-w-0 flex-1 py-1.5 text-xs`} aria-label={`${member.displayName} role`}><option value="player">Player</option><option value="co-gm">Co-GM</option></select><button type="button" onClick={() => { if (window.confirm(`Remove ${member.displayName} from the party?`)) props.onRemoveMember(member.userId); }} className="rounded-lg px-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Remove</button></div>}</article>)}</div>
      {manager && combats.length === 0 && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Create a combat in the Combat tab before adding party members.</p>}
    </section>
  </div>;
}

function SharedNotesEditor({ party, currentUserId, manager, onCreate, onUpdate, onDelete }: { party: PartyCampaignSnapshot; currentUserId: string; manager: boolean; onCreate: (note: CampaignNote) => void; onUpdate: (note: CampaignNote) => void; onDelete: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(party.notes[0]?.id ?? '');
  const note = party.notes.find(({ id }) => id === selectedId) ?? party.notes[0] ?? null;
  const [draft, setDraft] = useState<CampaignNote | null>(note);
  useEffect(() => { setDraft(note); }, [note?.body, note?.id, note?.title, note?.visibility, note?.playerCanEdit, note?.visibleToUserIDs?.join('|')]);
  const editable = Boolean(note && canEditCampaignNote(note, party.role, currentUserId, party.permissions));
  const canCreate = manager || party.permissions.playersCanCreateSharedNotes;
  const create = () => {
    const created: CampaignNote = { id: generateUUID(), title: `Note ${party.notes.length + 1}`, body: '', visibility: 'Shared', playerCanEdit: true, storageScope: 'shared' };
    onCreate(created);
    setSelectedId(created.id);
  };
  const save = () => { if (draft && editable) onUpdate(draft); };
  return <div className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 md:grid-cols-[18rem_1fr]">
    <aside className="max-h-[24rem] overflow-y-auto border-b border-white/5 bg-slate-950/35 p-4 md:max-h-none md:border-r md:border-b-0"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black uppercase tracking-[0.15em] text-violet-300">Campaign Notes</h2><button type="button" disabled={!canCreate} onClick={create} className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-xs font-bold text-violet-300 disabled:cursor-not-allowed disabled:opacity-35">+ Note</button></div><div className="mt-4 space-y-2">{party.notes.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedId(entry.id)} className={`w-full rounded-xl border p-3 text-left ${entry.id === note?.id ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/5 bg-white/[0.025]'}`}><div className="flex items-center gap-2"><div className="min-w-0 flex-1 truncate font-bold text-slate-200">{entry.title || 'Untitled Note'}</div><VisibilityBadge visibility={entry.visibility ?? 'Shared'} /></div><div className="mt-1 truncate text-xs text-slate-600">{entry.body || 'Empty note'}</div></button>)}</div></aside>
    <section className="min-w-0 p-4 sm:p-6">{draft ? <div className="flex h-full flex-col"><div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4"><input value={draft.title} disabled={!editable} onChange={(event) => setDraft({ ...draft, title: event.target.value })} onBlur={save} className="min-w-0 grow bg-transparent text-2xl font-black text-white outline-none disabled:text-slate-400" aria-label="Campaign note title" />{editable && <button type="button" onClick={() => { if (window.confirm(`Delete “${draft.title}”?`)) { onDelete(draft.id); setSelectedId(''); } }} className="text-xs font-bold text-red-300">Delete Note</button>}</div>{manager && <div className="mt-4 grid gap-3 rounded-xl border border-fuchsia-400/15 bg-fuchsia-950/15 p-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Visibility<select value={draft.visibility ?? 'Shared'} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as CampaignNote['visibility'] })} onBlur={save} className={`${inputClass} mt-1 w-full`}><option>Shared</option><option>GM Only</option><option>Selected Players</option></select></label><label className="flex items-center gap-2 self-end rounded-lg bg-slate-950/40 px-3 py-2 text-xs font-bold text-slate-300"><input type="checkbox" checked={draft.playerCanEdit !== false} onChange={(event) => setDraft({ ...draft, playerCanEdit: event.target.checked })} onBlur={save} className="h-4 w-4 accent-violet-500" />Players can edit</label>{draft.visibility === 'Selected Players' && <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase text-fuchsia-300">Visible to</p><div className="mt-2 flex flex-wrap gap-2">{party.members.filter(({ role }) => role === 'player').map((member) => { const checked = (draft.visibleToUserIDs ?? []).includes(member.userId); return <label key={member.userId} className="flex items-center gap-2 rounded-lg bg-slate-950/50 px-3 py-2 text-xs text-slate-300"><input type="checkbox" checked={checked} onChange={(event) => setDraft({ ...draft, visibleToUserIDs: event.target.checked ? [...(draft.visibleToUserIDs ?? []), member.userId] : (draft.visibleToUserIDs ?? []).filter((id) => id !== member.userId) })} onBlur={save} className="accent-violet-500" />{member.character?.name || member.displayName}</label>; })}</div></div>}</div>}<textarea value={draft.body} disabled={!editable} onChange={(event) => setDraft({ ...draft, body: event.target.value })} onBlur={save} className="mt-4 min-h-80 grow resize-y bg-transparent leading-7 text-slate-300 outline-none disabled:text-slate-500" placeholder="Write campaign notes…" aria-label="Campaign note body" /><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600"><span>{editable ? 'Saves when you leave the field' : 'Read only'}</span>{draft.updatedByName && <span>Last updated by {draft.updatedByName}</span>}</div></div> : <div className="grid h-full place-items-center text-slate-500">{canCreate ? 'Create a campaign note.' : 'The GM has not shared any notes with you.'}</div>}</section>
  </div>;
}

function VisibilityBadge({ visibility }: { visibility: NonNullable<CampaignNote['visibility']> }) {
  return <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${visibility === 'GM Only' ? 'bg-fuchsia-500/15 text-fuchsia-200' : visibility === 'Selected Players' ? 'bg-sky-500/15 text-sky-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{visibility}</span>;
}

function SoloNotesEditor({ campaign, note, selectedNoteId, onSelect, onCreate, onUpdate, onDelete }: { campaign: CampaignRecord; note: CampaignNote | null; selectedNoteId: string | null; onSelect: (id: string) => void; onCreate: () => void; onUpdate: (changes: Partial<CampaignNote>) => void; onDelete: () => void }) {
  return <div className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 md:grid-cols-[17rem_1fr]"><aside className="max-h-[24rem] overflow-y-auto border-b border-white/5 bg-slate-950/35 p-4 md:max-h-none md:border-r md:border-b-0"><div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[0.15em] text-violet-300">Private Notes</h2><button type="button" onClick={onCreate} className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-xs font-bold text-violet-300">+ Note</button></div><div className="mt-4 space-y-2">{campaign.notes.map((entry) => <button type="button" key={entry.id} onClick={() => onSelect(entry.id)} className={`w-full rounded-xl border p-3 text-left ${entry.id === selectedNoteId ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/5 bg-white/[0.025]'}`}><div className="truncate font-bold text-slate-200">{entry.title || 'Untitled Note'}</div><div className="mt-1 truncate text-xs text-slate-600">{entry.body || 'Empty note'}</div></button>)}</div></aside><section className="min-w-0 p-4 sm:p-6">{note ? <div className="flex h-full flex-col"><div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4"><input value={note.title} onChange={(event) => onUpdate({ title: event.target.value })} className="min-w-0 grow bg-transparent text-2xl font-black text-white outline-none" aria-label="Note title" /><button type="button" onClick={onDelete} className="text-xs font-bold text-red-300">Delete Note</button></div><textarea value={note.body} onChange={(event) => onUpdate({ body: event.target.value })} className="mt-4 min-h-96 grow resize-y bg-transparent leading-7 text-slate-300 outline-none" placeholder="Write private GM notes…" aria-label="Note body" /></div> : <div className="grid h-full place-items-center text-slate-500">Create a private note.</div>}</section></div>;
}

function SharedInventoryEditor(props: CampaignWorkspaceProps & { party: PartyCampaignSnapshot; manager: boolean }) {
  const { party, currentUserId, manager } = props;
  const canManage = manager || party.permissions.playersCanManageInventory;
  const currentMember = party.members.find(({ userId }) => userId === currentUserId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [container, setContainer] = useState('Party Stash');
  const [ownerCharacterID, setOwnerCharacterID] = useState('');
  const [requestable, setRequestable] = useState(true);
  const containers = useMemo(() => Array.from(new Set(['Party Stash', 'Bag of Holding', 'Wagon', ...party.inventory.map((item) => item.container).filter((value): value is string => Boolean(value))])).sort(), [party.inventory]);
  const create = () => {
    if (!name.trim() || !canManage) return;
    const owner = party.members.find(({ character }) => character?.id === ownerCharacterID);
    props.onAddInventory({ id: generateUUID(), name: name.trim(), description: description.trim(), quantity: 1, addedBy: currentUserId, updatedAt: new Date().toISOString(), container, ownerCharacterID: owner?.character?.id, ownerName: owner?.character?.name, requestable });
    setName(''); setDescription(''); setOwnerCharacterID(''); setContainer('Party Stash'); setRequestable(true);
  };
  const pending = party.inventoryRequests.filter(({ status }) => status === 'Pending');
  return <div className="space-y-5">
    {canManage && <section className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Party Stash</p><h2 className="mt-1 text-xl font-black text-white">Add a shared item</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Item name" aria-label="Shared item name" /><input value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} xl:col-span-2`} placeholder="Description" aria-label="Shared item description" /><input value={container} list="party-containers" onChange={(event) => setContainer(event.target.value)} className={inputClass} placeholder="Container" aria-label="Container" /><select value={ownerCharacterID} onChange={(event) => setOwnerCharacterID(event.target.value)} className={inputClass} aria-label="Initial owner"><option value="">Unassigned</option>{party.members.filter(({ character }) => Boolean(character)).map((member) => <option key={member.userId} value={member.character!.id}>{member.character!.name}</option>)}</select></div><datalist id="party-containers">{containers.map((value) => <option key={value} value={value} />)}</datalist><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-400"><input type="checkbox" checked={requestable} onChange={(event) => setRequestable(event.target.checked)} className="accent-violet-500" />Players can request this item</label><button type="button" disabled={!name.trim()} onClick={create} className="rounded-xl bg-amber-700 px-5 py-2 font-black text-white disabled:opacity-40">Add Item</button></div></section>}

    {manager && pending.length > 0 && <section className="rounded-2xl border border-sky-400/20 bg-sky-950/20 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Approval Queue</p><h2 className="mt-1 text-xl font-black text-white">Inventory requests</h2><div className="mt-4 space-y-2">{pending.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/50 p-3"><div><p className="text-sm font-black text-slate-200">{request.itemName}</p><p className="text-xs text-slate-500">Requested by {request.requesterName}{request.characterName ? ` for ${request.characterName}` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={() => props.onResolveInventoryRequest(request, false)} className="rounded-lg bg-rose-900/60 px-3 py-2 text-xs font-black text-rose-100">Deny</button><button type="button" onClick={() => props.onResolveInventoryRequest(request, true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Approve</button></div></div>)}</div></section>}

    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Organized Loot</p><h2 className="mt-1 text-xl font-black text-white">Shared Inventory</h2></div><span className="text-xs font-bold text-slate-500">{party.inventory.reduce((sum, item) => sum + item.quantity, 0)} total</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{party.inventory.map((item) => {
      const owner = party.members.find(({ character }) => character?.id === item.ownerCharacterID);
      const alreadyRequested = party.inventoryRequests.some((request) => request.itemId === item.id && request.requesterUserId === currentUserId && request.status === 'Pending');
      const metadata = [item.itemSnapshot?.category, item.itemSnapshot?.subtype, item.container || 'Party Stash', item.ownerName && `Owner: ${item.ownerName}`, item.goldCost !== undefined && `${item.goldCost} gold each`].filter(Boolean);
      return <article key={`${item.id}-${item.updatedAt}`} className={`rounded-xl border p-4 ${item.isEquipped ? 'border-emerald-400/25 bg-emerald-950/15' : item.distributedByGM ? 'border-sky-400/15 bg-sky-950/20' : 'border-white/10 bg-slate-950/55'}`}><div className="mb-2 flex flex-wrap gap-2">{item.isEquipped && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-200">Equipped</span>}{item.distributedByGM && <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[9px] font-black uppercase text-sky-200">GM Distributed</span>}{item.itemSnapshot && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-black uppercase text-violet-200">Catalog Linked</span>}</div><input defaultValue={item.name} disabled={!canManage} onBlur={(event) => props.onUpdateInventory({ ...item, name: event.target.value })} className="w-full bg-transparent font-black text-slate-100 outline-none disabled:cursor-default" aria-label={`${item.name} name`} /><textarea defaultValue={item.description} disabled={!canManage} onBlur={(event) => props.onUpdateInventory({ ...item, description: event.target.value })} rows={3} className="mt-2 w-full resize-none bg-transparent text-sm leading-5 text-slate-400 outline-none disabled:cursor-default" aria-label={`${item.name} description`} />{metadata.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{metadata.map((value) => <span key={String(value)} className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-400">{value}</span>)}</div>}{canManage && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input defaultValue={item.container || 'Party Stash'} list="party-containers" onBlur={(event) => props.onUpdateInventory({ ...item, container: event.target.value || 'Party Stash' })} className={`${inputClass} min-w-0 py-1.5 text-xs`} aria-label={`${item.name} container`} /><select value={item.ownerCharacterID ?? ''} onChange={(event) => { const nextOwner = party.members.find(({ character }) => character?.id === event.target.value); props.onUpdateInventory({ ...item, ownerCharacterID: nextOwner?.character?.id, ownerName: nextOwner?.character?.name, isEquipped: nextOwner ? item.isEquipped : false }); }} className={`${inputClass} min-w-0 py-1.5 text-xs`} aria-label={`${item.name} owner`}><option value="">Unassigned</option>{party.members.filter(({ character }) => Boolean(character)).map((member) => <option key={member.userId} value={member.character!.id}>{member.character!.name}</option>)}</select></div>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><button type="button" disabled={!canManage} onClick={() => props.onUpdateInventory({ ...item, quantity: Math.max(0, item.quantity - 1) })} className="h-8 w-8 rounded-lg bg-slate-800 font-black disabled:opacity-30">−</button><span className="min-w-8 text-center font-black text-amber-200">{item.quantity}</span><button type="button" disabled={!canManage} onClick={() => props.onUpdateInventory({ ...item, quantity: item.quantity + 1 })} className="h-8 w-8 rounded-lg bg-amber-700 font-black text-white disabled:opacity-30">+</button></div>{canManage && <div className="flex gap-2">{owner && <button type="button" onClick={() => props.onUpdateInventory({ ...item, isEquipped: !item.isEquipped })} className="rounded-lg bg-emerald-900/60 px-3 py-1.5 text-xs font-black text-emerald-100">{item.isEquipped ? 'Unequip' : 'Equip'}</button>}<button type="button" onClick={() => { if (window.confirm(`Remove ${item.name} from the party inventory?`)) props.onDeleteInventory(item.id); }} className="text-xs font-bold text-red-300">Remove</button></div>}{!canManage && item.requestable !== false && !item.ownerCharacterID && <button type="button" disabled={alreadyRequested || !currentMember?.character} onClick={() => props.onRequestInventory(item, currentMember?.character)} className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-35">{alreadyRequested ? 'Requested' : 'Request Item'}</button>}</div></article>;
    })}{party.inventory.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">The shared inventory is empty.</div>}</div></section>

    <details className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5"><summary className="cursor-pointer text-sm font-black text-violet-200">Inventory activity ledger ({party.inventoryLedger.length})</summary><div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">{party.inventoryLedger.map((entry) => <div key={entry.id} className="rounded-xl border border-white/5 bg-slate-950/45 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-black text-slate-200">{entry.action} • {entry.actorName}</p><p className="text-[10px] text-slate-600">{formatTimestamp(entry.createdAt)}</p></div><p className="mt-1 text-xs text-slate-400">{entry.details}</p></div>)}{party.inventoryLedger.length === 0 && <p className="text-sm text-slate-500">No inventory activity yet.</p>}</div></details>
  </div>;
}

function CampaignVaultPanel({ party, character, onAdd }: { party: PartyCampaignSnapshot; character?: Character; onAdd: (entry: GmVaultEntry) => void }) {
  return <section className="rounded-2xl border border-fuchsia-400/20 bg-slate-900/70 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Campaign Rewards</p><h2 className="mt-1 text-xl font-black text-white">Shared GM Vault</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Review content shared by your GM, then add eligible entries to your linked character.</p></div>{character ? <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">Adding to {character.name}</span> : <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">Choose a shared character first</span>}</div><div className="mt-5 grid gap-4 md:grid-cols-2">{party.vaultEntries.map((entry) => { const eligibility = character ? vaultEntryEligibility(character, entry) : { eligible: false, reason: 'Choose your shared character on the Party tab.' }; const added = Boolean(character?.vaultEntries?.some(({ id }) => id === entry.id)); const effects = vaultEffectSummary(entry.effects); return <article key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/55 p-4"><p className="text-[10px] font-black uppercase text-fuchsia-300">{entry.kind} • v{entry.version ?? 1}</p><h3 className="mt-1 text-lg font-black text-white">{entry.name}</h3>{entry.summary && <p className="mt-2 text-sm text-slate-400">{entry.summary}</p>}<details className="group mt-3 rounded-lg border border-white/5 bg-white/[0.025] p-3"><summary className="cursor-pointer text-xs font-black text-violet-200"><span className="group-open:hidden">More details</span><span className="hidden group-open:inline">Less details</span></summary><p className="mt-3 whitespace-pre-wrap border-t border-white/5 pt-3 text-sm leading-6 text-slate-300">{entry.description || 'No additional description.'}</p>{effects.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{effects.map((effect) => <span key={effect} className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-200">{effect}</span>)}</div>}</details><button type="button" disabled={!eligibility.eligible || added} onClick={() => onAdd(entry)} className="mt-4 w-full rounded-lg bg-fuchsia-700 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">{added ? 'Already Added' : eligibility.eligible ? `Add to ${character?.name}` : eligibility.reason}</button></article>; })}{party.vaultEntries.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-slate-500 md:col-span-2">The GM has not shared any Vault content yet.</div>}</div></section>;
}

function formatTimestamp(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
