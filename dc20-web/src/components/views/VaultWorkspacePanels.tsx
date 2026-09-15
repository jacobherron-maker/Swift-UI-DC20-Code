import { useState } from 'react';
import type {
  EquipmentCatalogItem,
  GmVaultEntry,
  Maneuver,
  Monster,
  PartyCampaignSnapshot,
  Spell,
  VaultContentKind,
  VaultDistribution,
  VaultEffectActivation,
  VaultEntryStatus,
  VaultMechanicalEffects,
} from '../../types/models';
import { VaultContentKindValues } from '../../types/models';

const field = 'w-full rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70';
const label = 'block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500';
const panel = 'rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5';
const csv = (values: string[]) => values.join(', ');
const fromCSV = (value: string) => Array.from(new Set(value.split(/[\n,]/).map((part) => part.trim()).filter(Boolean)));

const KIND_LABELS: Record<VaultContentKind, string> = {
  [VaultContentKindValues.ITEM]: 'Magic Items',
  [VaultContentKindValues.TALENT]: 'Talents',
  [VaultContentKindValues.FEATURE]: 'Features',
  [VaultContentKindValues.SPELL]: 'Spells',
  [VaultContentKindValues.MANEUVER]: 'Maneuvers',
  [VaultContentKindValues.COMPANION]: 'Companions',
  [VaultContentKindValues.OTHER]: 'Other',
};

function SelectTemplate<T extends { id?: string; name: string }>({ title, values, onCreate }: { title: string; values: T[]; onCreate: (value: T) => void }) {
  return <label className={label}>{title}<select value="" onChange={(event) => {
    const value = values.find((entry) => (entry.id ?? entry.name) === event.target.value);
    if (value) onCreate(value);
  }} className={`${field} mt-1`}><option value="">Choose a source…</option>{values.map((value) => <option key={value.id ?? value.name} value={value.id ?? value.name}>{value.name}</option>)}</select></label>;
}

export function VaultDashboard({
  entries,
  monsters,
  sourceMonsters,
  customEquipment,
  publishedEquipment,
  spells,
  maneuvers,
  onCreate,
  onSelect,
  onEquipmentTemplate,
  onSpellTemplate,
  onManeuverTemplate,
  onMonsterTemplate,
  onOpenMonster,
  onOpenItem,
  onDuplicateMonster,
}: {
  entries: GmVaultEntry[];
  monsters: Monster[];
  sourceMonsters: Monster[];
  customEquipment: EquipmentCatalogItem[];
  publishedEquipment: EquipmentCatalogItem[];
  spells: Spell[];
  maneuvers: Maneuver[];
  onCreate: (kind: VaultContentKind) => void;
  onSelect: (entry: GmVaultEntry) => void;
  onEquipmentTemplate: (item: EquipmentCatalogItem) => void;
  onSpellTemplate: (spell: Spell) => void;
  onManeuverTemplate: (maneuver: Maneuver) => void;
  onMonsterTemplate: (monster: Monster) => void;
  onOpenMonster: (id: string) => void;
  onOpenItem: (id: string) => void;
  onDuplicateMonster: (monster: Monster) => void;
}) {
  const ready = entries.filter(({ status }) => status === 'Ready').length;
  const shared = entries.filter((entry) => entry.status !== 'Archived').length;
  return <div className="mx-auto max-w-6xl space-y-5">
    <section className="overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-gradient-to-br from-violet-950/80 via-slate-900/85 to-slate-950 p-6 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">Private homebrew workspace</p>
      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Build, organize, and distribute your creations.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Draft privately, start from a source template, bundle related content, and publish controlled copies to your campaigns.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Vault entries', entries.length], ['Ready', ready], ['Custom monsters', monsters.length], ['Custom items', customEquipment.length]].map(([title, count]) => <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4"><span className="block text-2xl font-black text-white">{count}</span><span className="text-xs font-bold text-slate-500">{title}</span></div>)}
      </div>
    </section>

    <section className={panel}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Quick Create</p><h3 className="mt-1 text-xl font-black text-white">Blank homebrew</h3></div><span className="text-xs text-slate-500">{shared} active workspace entries</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.values(VaultContentKindValues).map((kind) => <button type="button" key={kind} onClick={() => onCreate(kind)} className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-left text-xs font-black text-slate-200 hover:border-violet-400/40 hover:bg-violet-500/10">+ {kind === VaultContentKindValues.COMPANION ? 'Companion' : kind}</button>)}</div></section>

    <section className={`${panel} border-cyan-400/15`}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Template Gallery</p><h3 className="mt-1 text-xl font-black text-white">Start from published content</h3><p className="mt-2 text-sm text-slate-500">Templates are editable private copies. The original catalog entry is never changed.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SelectTemplate title="Equipment template" values={publishedEquipment} onCreate={onEquipmentTemplate} /><SelectTemplate title="Spell template" values={spells} onCreate={onSpellTemplate} /><SelectTemplate title="Maneuver template" values={maneuvers} onCreate={onManeuverTemplate} /><SelectTemplate title="Monster template" values={sourceMonsters} onCreate={onMonsterTemplate} /></div></section>

    <section className={panel}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Unified Homebrew</p><h3 className="mt-1 text-xl font-black text-white">Monsters and legacy custom items</h3><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h4 className="text-sm font-black text-emerald-100">Custom Monsters</h4><div className="mt-2 space-y-2">{monsters.slice(0, 8).map((monster) => <div key={monster.id} className="flex items-center gap-2 rounded-xl bg-slate-950/45 p-3"><button type="button" onClick={() => onOpenMonster(monster.id)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-200">🐾 {monster.name} <span className="text-xs text-slate-600">L{monster.level}</span></button><button type="button" onClick={() => onDuplicateMonster(monster)} className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-200">Duplicate</button></div>)}{monsters.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">No custom monsters yet.</p>}</div></div><div><h4 className="text-sm font-black text-amber-100">Custom Equipment</h4><div className="mt-2 space-y-2">{customEquipment.slice(0, 8).map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-950/45 p-3"><button type="button" onClick={() => onOpenItem(item.id)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-200">🎒 {item.name}</button><button type="button" onClick={() => onEquipmentTemplate(item)} className="rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-200">Move to Vault</button></div>)}{customEquipment.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">No legacy custom items.</p>}</div></div></div></section>

    {entries.length > 0 && <section className={panel}><h3 className="text-xl font-black text-white">Recently updated</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6).map((entry) => <button type="button" key={entry.id} onClick={() => onSelect(entry)} className="rounded-xl border border-white/10 bg-slate-950/45 p-4 text-left hover:border-violet-400/35"><span className="text-[10px] font-black uppercase tracking-wider text-violet-300">{KIND_LABELS[entry.kind]} • v{entry.version ?? 1}</span><span className="mt-1 block truncate font-black text-slate-100">{entry.favorite ? '★ ' : ''}{entry.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{entry.folder || 'Unfiled'} • {entry.status ?? 'Draft'}</span></button>)}</div></section>}
  </div>;
}

function RecordEditor({ title, values, onChange, placeholder }: { title: string; values: Record<string, number>; onChange: (next: Record<string, number>) => void; placeholder: string }) {
  const replace = (oldName: string, name: string, amount: number) => {
    const next = Object.fromEntries(Object.entries(values).flatMap(([currentName, currentAmount]) => {
      if (currentName !== oldName) return [[currentName, currentAmount]];
      return name.trim() && amount ? [[name.trim(), amount]] : [];
    }));
    onChange(next);
  };
  return <div><div className="flex items-center justify-between"><span className={label}>{title}</span><button type="button" onClick={() => onChange({ ...values, [`New ${title}`]: 1 })} className="rounded bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-300">+ Add</button></div><div className="mt-2 space-y-2">{Object.entries(values).map(([name, amount], index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2"><input value={name} onChange={(event) => replace(name, event.target.value, amount)} className={field} placeholder={placeholder} /><input type="number" value={amount} onChange={(event) => replace(name, name, Number(event.target.value) || 0)} className={field} aria-label={`${name} amount`} /><button type="button" onClick={() => replace(name, '', 0)} className="px-2 text-red-300">×</button></div>)}</div></div>;
}

export function VaultAdvancedEffects({ entry, onChange, onEffect }: { entry: GmVaultEntry; onChange: (values: Partial<GmVaultEntry>) => void; onEffect: (key: keyof VaultMechanicalEffects, value: unknown) => void }) {
  const arrays: Array<[keyof VaultMechanicalEffects, string, string]> = [
    ['advantageRules', 'Advantage applies to', 'Might Saves, Stealth…'],
    ['disadvantageRules', 'Disadvantage applies to', 'Spell Attacks, Awareness…'],
    ['movementModes', 'Movement modes', 'Fly 5, Swim equal to Speed…'],
    ['resistances', 'Resistances', 'Fire, Physical…'],
    ['immunities', 'Immunities', 'Poisoned, Psychic…'],
    ['vulnerabilities', 'Vulnerabilities', 'Cold, Silvered weapons…'],
    ['damageReductions', 'Damage reduction', 'Physical DR 1…'],
    ['conditionSaveAdvantages', 'Condition save advantage', 'Charmed, Frightened…'],
    ['conditionsGranted', 'Conditions applied', 'Burning 1 on hit…'],
    ['senses', 'Granted senses', 'Darkvision 10 spaces…'],
    ['conditionalRules', 'Other conditional rules', 'While below half HP…'],
  ];
  return <section className={`${panel} border-violet-400/15`}><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Advanced Effect Builder</p><h3 className="mt-1 text-lg font-black text-violet-100">Activation, mastery, and conditional mechanics</h3><p className="mt-1 text-xs leading-5 text-slate-500">Passive effects route immediately. Item effects route through equipment and attunement. Conditional fields remain visible as precise sheet reminders until their stated trigger is active.</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Activation<select value={entry.activation ?? 'Passive'} onChange={(event) => onChange({ activation: event.target.value as VaultEffectActivation })} className={`${field} mt-1`}>{['Passive', 'Equipped', 'Attuned', 'Manual Toggle', 'Conditional'].map((value) => <option key={value}>{value}</option>)}</select></label><label className={label}>Duration<input value={entry.duration ?? ''} onChange={(event) => onChange({ duration: event.target.value })} className={`${field} mt-1`} placeholder="1 minute, until next rest…" /></label><label className={label}>Stacking<input value={entry.stacking ?? ''} onChange={(event) => onChange({ stacking: event.target.value })} className={`${field} mt-1`} placeholder="Does not stack" /></label></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><RecordEditor title="Skill Mastery Increases" values={entry.effects.skillMasteryIncreases ?? {}} onChange={(value) => onEffect('skillMasteryIncreases', value)} placeholder="Awareness" /><RecordEditor title="Bonus when at Mastery Cap" values={entry.effects.skillBonusesAtCap ?? {}} onChange={(value) => onEffect('skillBonusesAtCap', value)} placeholder="Awareness" /><RecordEditor title="Weapon-Specific Bonuses" values={entry.effects.weaponSpecificBonuses ?? {}} onChange={(value) => onEffect('weaponSpecificBonuses', value)} placeholder="Longsword attacks" /><RecordEditor title="Spell-Specific Bonuses" values={entry.effects.spellSpecificBonuses ?? {}} onChange={(value) => onEffect('spellSpecificBonuses', value)} placeholder="Fire spells" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{arrays.map(([key, title, placeholder]) => <label key={key} className={label}>{title}<input value={csv(entry.effects[key] as string[] | undefined ?? [])} onChange={(event) => onEffect(key, fromCSV(event.target.value))} className={`${field} mt-1`} placeholder={placeholder} /></label>)}</div></section>;
}

export function VaultLinks({ entry, options, onChange }: { entry: GmVaultEntry; options: GmVaultEntry[]; onChange: (ids: string[]) => void }) {
  const selected = new Set(entry.linkedEntryIDs ?? []);
  return <section className={`${panel} border-sky-400/15`}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Linked Content & Bundles</p><h3 className="mt-1 text-lg font-black text-sky-100">Package related homebrew together</h3><p className="mt-1 text-xs text-slate-500">Linked entries travel inside the campaign copy and are added to a character together. Circular links are ignored.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{options.filter(({ id }) => id !== entry.id).map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected.has(option.id) ? 'border-sky-400/40 bg-sky-500/10' : 'border-white/10 bg-slate-950/40'}`}><input type="checkbox" checked={selected.has(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : [...selected].filter((id) => id !== option.id))} /><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-200">{option.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{option.kind}</span></span></label>)}{options.length <= 1 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600 sm:col-span-2">Create another Vault entry to build a bundle.</p>}</div></section>;
}

export function VaultHistory({ entry, onRestore }: { entry: GmVaultEntry; onRestore: (snapshot: string) => void }) {
  return <details className={`${panel} border-amber-400/15`}><summary className="cursor-pointer text-lg font-black text-amber-100">Version History <span className="ml-2 text-xs font-bold text-slate-500">Current v{entry.version ?? 1} • {entry.revisions?.length ?? 0} saved revision(s)</span></summary><div className="mt-4 space-y-2 border-t border-white/5 pt-4">{[...(entry.revisions ?? [])].reverse().map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/45 p-3"><span><span className="block text-sm font-black text-slate-200">Version {revision.version}</span><span className="text-xs text-slate-500">{new Date(revision.savedAt).toLocaleString()}</span></span><button type="button" onClick={() => onRestore(revision.snapshot)} className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200">Restore as new version</button></div>)}{(entry.revisions?.length ?? 0) === 0 && <p className="text-sm text-slate-500">Earlier versions will appear after the next saved edit.</p>}</div></details>;
}

function DistributionCard({ entry, party, sharingPartyID, disabled, onPublish, onUnshare }: {
  entry: GmVaultEntry;
  party: PartyCampaignSnapshot;
  sharingPartyID: string;
  disabled: boolean;
  onPublish: (partyId: string, distribution: VaultDistribution) => void;
  onUnshare: (partyId: string) => void;
}) {
  const shared = party.vaultEntries.find(({ id }) => id === entry.id);
  const [current, setCurrent] = useState<VaultDistribution>(shared?.distribution ?? entry.distribution ?? { mode: 'Player Choice', characterIDs: [] });
  const members = party.members.filter(({ character }) => Boolean(character));
  const assigned = new Set(current.characterIDs);
  const owners = members.filter(({ character }) => character?.vaultEntries?.some(({ id }) => id === entry.id));
  return <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer list-none"><span className="flex items-center justify-between gap-3"><span><span className="block font-black text-slate-200">{party.name}</span><span className="text-xs text-slate-500">{shared ? `Published v${shared.version ?? 1}` : 'Private'} • {owners.length} character{owners.length === 1 ? '' : 's'} currently possess it</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${shared ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>{shared ? 'Shared' : 'Configure'}</span></span></summary><div className="mt-4 space-y-3 border-t border-white/5 pt-4"><label className={label}>Distribution<select value={current.mode} onChange={(event) => setCurrent({ ...current, mode: event.target.value as VaultDistribution['mode'], characterIDs: event.target.value === 'Player Choice' ? [] : current.characterIDs })} disabled={disabled || sharingPartyID === party.id} className={`${field} mt-1`}><option>Player Choice</option><option>Assigned Characters</option></select></label>{current.mode === 'Assigned Characters' && <div className="grid gap-2">{members.map((member) => <label key={member.userId} className="flex items-center gap-3 rounded-lg bg-white/[0.025] p-2 text-xs font-bold text-slate-300"><input type="checkbox" checked={assigned.has(member.character!.id)} onChange={(event) => setCurrent({ ...current, characterIDs: event.target.checked ? [...assigned, member.character!.id] : [...assigned].filter((id) => id !== member.character!.id) })} />{member.character!.name} <span className="text-slate-600">({member.displayName})</span></label>)}{members.length === 0 && <p className="text-xs text-slate-600">No campaign characters are available yet.</p>}</div>}<label className={label}>Maximum claims<input type="number" min={1} value={current.quantityLimit ?? ''} onChange={(event) => setCurrent({ ...current, quantityLimit: Number(event.target.value) > 0 ? Math.trunc(Number(event.target.value)) : undefined })} className={`${field} mt-1`} placeholder="Unlimited" /></label><label className={label}>Distribution notes<input value={current.notes ?? ''} onChange={(event) => setCurrent({ ...current, notes: event.target.value })} className={`${field} mt-1`} placeholder="Visible context for the campaign" /></label>{owners.length > 0 && <p className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-200">On sheet: {owners.map(({ character }) => character!.name).join(', ')}</p>}<div className="flex gap-2"><button type="button" disabled={disabled || sharingPartyID === party.id || (current.mode === 'Assigned Characters' && current.characterIDs.length === 0)} onClick={() => onPublish(party.id, current)} className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-35">{sharingPartyID === party.id ? 'Publishing…' : shared ? 'Publish Update' : 'Publish'}</button>{shared && <button type="button" disabled={sharingPartyID === party.id} onClick={() => onUnshare(party.id)} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 disabled:opacity-35">Unshare</button>}</div><p className="text-[10px] leading-4 text-slate-600">Unsharing removes future access. Copies already accepted by characters remain on those sheets.</p></div></details>;
}

export function VaultCampaignDistribution({ entry, parties, sharingPartyID, disabled, onPublish, onUnshare }: {
  entry: GmVaultEntry;
  parties: PartyCampaignSnapshot[];
  sharingPartyID: string;
  disabled: boolean;
  onPublish: (partyId: string, distribution: VaultDistribution) => void;
  onUnshare: (partyId: string) => void;
}) {
  return <section className={`${panel} border-emerald-400/15`}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-black text-emerald-100">Campaign Distribution</h3><p className="mt-1 text-xs text-slate-500">Publish to everyone or assign the entry to specific character IDs. Re-publishing sends the newest version and bundle.</p></div>{disabled && <span className="text-xs font-bold text-amber-200">Save first</span>}</div><div className="mt-4 grid gap-4 lg:grid-cols-2">{parties.map((party) => <DistributionCard key={`${party.id}-${entry.id}`} entry={entry} party={party} sharingPartyID={sharingPartyID} disabled={disabled} onPublish={onPublish} onUnshare={onUnshare} />)}{parties.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500 lg:col-span-2">Create a signed-in group campaign to distribute Vault content.</p>}</div></section>;
}

export function VaultOrganizationFields({ entry, folders, onChange }: { entry: GmVaultEntry; folders: string[]; onChange: (values: Partial<GmVaultEntry>) => void }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className={label}>Status<select value={entry.status ?? 'Draft'} onChange={(event) => onChange({ status: event.target.value as VaultEntryStatus })} className={`${field} mt-1`}><option>Draft</option><option>Ready</option><option>Archived</option></select></label><label className={label}>Folder<input list="vault-folders" value={entry.folder ?? ''} onChange={(event) => onChange({ folder: event.target.value })} className={`${field} mt-1`} placeholder="Boss rewards, Campaign 1…" /><datalist id="vault-folders">{folders.map((folder) => <option key={folder}>{folder}</option>)}</datalist></label><label className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-sm font-bold text-slate-200"><input type="checkbox" checked={Boolean(entry.favorite)} onChange={(event) => onChange({ favorite: event.target.checked })} />★ Favorite</label></div>;
}
