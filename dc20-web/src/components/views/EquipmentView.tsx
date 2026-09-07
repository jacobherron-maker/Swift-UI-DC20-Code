import { useMemo, useState } from 'react';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { useCampaignStore } from '../../store/campaignStore';
import type { EquipmentCatalogItem, EquipmentCategory, EquipmentSlot } from '../../types/models';
import { EquipmentCategoryValues, EquipmentSlotValues } from '../../types/models';
import { addInventoryItem, defensiveEquipmentProfile, healingPotionAmount, isEquipmentEquippable, weaponMechanicalProfile, ROUTED_SHEET_EFFECTS } from '../../utils/equipmentRules';
import { generateUUID, sortByName } from '../../utils/gameUtils';

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';
const ROUTED_EFFECT_NAMES = Object.keys(ROUTED_SHEET_EFFECTS);

interface CustomItemDraft {
  name: string;
  highlight: string;
  description: string;
  category: EquipmentCategory;
  slot: EquipmentSlot;
  properties: string[];
  routedEffects: string[];
}

function draftFromItem(item: EquipmentCatalogItem): CustomItemDraft {
  return {
    name: item.name,
    highlight: item.summary,
    description: item.mechanics,
    category: item.category,
    slot: item.slot,
    properties: item.properties.filter((tag) => !(tag in ROUTED_SHEET_EFFECTS)),
    routedEffects: item.properties.filter((tag) => tag in ROUTED_SHEET_EFFECTS),
  };
}

function emptyDraft(): CustomItemDraft {
  return {
    name: '',
    highlight: '',
    description: '',
    category: EquipmentCategoryValues.ADVENTURING_SUPPLIES,
    slot: EquipmentSlotValues.CARRIED,
    properties: [],
    routedEffects: [],
  };
}

export default function EquipmentView() {
  const { equipment, isLoading, error } = useEquipmentCatalog();
  const {
    campaignData,
    characters,
    selectedCharacterId,
    updateCharacter,
    addCustomEquipment,
    updateCustomEquipment,
    removeCustomEquipment,
  } = useCampaignStore();
  const [library, setLibrary] = useState<'standard' | 'magic'>('standard');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'All' | 'Custom Items'>('All');
  const [selectedEquipmentID, setSelectedEquipmentID] = useState<string | null>(null);
  const [targetCharacterID, setTargetCharacterID] = useState(selectedCharacterId ?? '');
  const [notice, setNotice] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const categories = Object.values(EquipmentCategoryValues);
  const customEquipment = campaignData.customEquipment;
  const customIDs = useMemo(() => new Set(customEquipment.map(({ id }) => id)), [customEquipment]);
  const standardEquipment = useMemo(() => sortByName([...equipment, ...customEquipment]), [customEquipment, equipment]);
  const propertyOptions = useMemo(() => Array.from(new Set(equipment.flatMap((item) => item.properties))).sort((a, b) => a.localeCompare(b)), [equipment]);
  const effectiveTargetCharacterID = targetCharacterID || selectedCharacterId || characters[0]?.id || '';

  const filtered = useMemo(() => {
    if (library === 'magic') return [];
    const query = search.trim().toLowerCase();
    return standardEquipment.filter((item) => (
      (category === 'All' || (category === 'Custom Items' ? customIDs.has(item.id) : item.category === category))
      && (!query || [item.name, item.subtype, item.summary, item.mechanics, ...item.properties]
        .some((value) => value.toLowerCase().includes(query)))
    ));
  }, [category, customIDs, library, search, standardEquipment]);
  const requestedSelection = standardEquipment.find(({ id }) => id === selectedEquipmentID) ?? null;
  const selected = requestedSelection && filtered.some(({ id }) => id === requestedSelection.id)
    ? requestedSelection
    : filtered[0] ?? null;
  const effectiveSelectedEquipmentID = selected?.id ?? null;
  const selectedIsCustom = selected ? customIDs.has(selected.id) : false;

  const addToCharacter = () => {
    if (!selected || !effectiveTargetCharacterID) return;
    const character = characters.find(({ id }) => id === effectiveTargetCharacterID);
    if (!character) return;
    updateCharacter({
      ...character,
      inventoryItems: addInventoryItem(character.inventoryItems ?? [], selected),
    });
    setNotice(`${selected.name} added to ${character.name || 'the selected character'}.`);
  };

  const createCustomItem = (draft: CustomItemDraft) => {
    const name = draft.name.trim();
    if (!name) return;
    const item: EquipmentCatalogItem = {
      id: `custom-equipment-${generateUUID()}`,
      name,
      category: draft.category,
      subtype: 'Custom Item',
      summary: draft.highlight.trim(),
      mechanics: draft.description.trim(),
      properties: [...draft.properties, ...draft.routedEffects],
      slot: draft.slot,
      sourcePage: 'Custom Item',
    };
    addCustomEquipment(item);
    setLibrary('standard');
    setCategory('Custom Items');
    setSelectedEquipmentID(item.id);
    setShowCustomModal(false);
    setNotice(`${item.name} was added to the custom equipment library.`);
  };

  const saveCustomItem = (item: EquipmentCatalogItem, draft: CustomItemDraft) => {
    const name = draft.name.trim();
    if (!name) return;
    updateCustomEquipment({
      ...item,
      name,
      category: draft.category,
      summary: draft.highlight.trim(),
      mechanics: draft.description.trim(),
      properties: [...draft.properties, ...draft.routedEffects],
      slot: draft.slot,
    });
  };

  const deleteCustomItem = (item: EquipmentCatalogItem) => {
    if (!window.confirm(`Delete ${item.name}? It will also be removed from character inventories.`)) return;
    removeCustomEquipment(item.id);
    setSelectedEquipmentID(null);
    setNotice(`${item.name} was deleted.`);
  };

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:overflow-hidden">
      <div className="shrink-0 border-b border-white/5 bg-slate-950/45 p-4">
        <div>
          <h1 className="text-2xl font-black text-white">Equipment</h1>
          <p className="text-xs text-slate-500">Rules equipment and player-created inventory items</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_14rem_auto]">
          <button type="button" onClick={() => setLibrary('standard')} className={`rounded-lg px-4 py-2.5 text-sm font-black ${library === 'standard' ? 'theme-primary-button text-white' : 'bg-white/[0.03] text-slate-400 hover:bg-white/5'}`}>Standard Equipment</button>
          <button type="button" onClick={() => setLibrary('magic')} className={`rounded-lg px-4 py-2.5 text-sm font-black ${library === 'magic' ? 'theme-primary-button text-white' : 'bg-white/[0.03] text-slate-400 hover:bg-white/5'}`}>Magic Items <span className="text-[9px] uppercase tracking-wider opacity-65">Coming Soon</span></button>
          {library === 'standard' && <>
            <input className={`${inputClass} min-w-0`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search equipment…" aria-label="Search equipment" />
            <select className={`${inputClass} min-w-0`} value={category} onChange={(event) => setCategory(event.target.value as EquipmentCategory | 'All' | 'Custom Items')} aria-label="Filter by category">
              <option value="All">All categories ({standardEquipment.length})</option>
              {categories.map((entry) => <option key={entry} value={entry}>{entry} ({standardEquipment.filter(({ category: itemCategory }) => itemCategory === entry).length})</option>)}
              <option value="Custom Items">Custom Items ({customEquipment.length})</option>
            </select>
            <button type="button" onClick={() => setShowCustomModal(true)} className="btn-primary px-4 text-sm font-black">+ Custom</button>
          </>}
        </div>
        {notice && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200" role="status">{notice}</p>}
      </div>

      {library === 'standard' && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
          <aside className="w-full shrink-0 overflow-y-auto overscroll-contain border-b border-white/5 p-4 lg:w-[23rem] lg:border-b-0 lg:border-r">
            {isLoading && <div className="rounded-xl border border-white/5 p-4 text-sm text-slate-500">Loading the native catalog…</div>}
            {error && <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}
            {!isLoading && filtered.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">No equipment matches this search.</div>}
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedEquipmentID(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${item.id === effectiveSelectedEquipmentID ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
                >
                  <div className="flex items-start justify-between gap-3"><span className="font-bold text-slate-100">{item.name}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-violet-300">{customIDs.has(item.id) ? 'Custom' : item.category}</span></div>
                  <div className="mt-1 text-xs text-slate-500">{item.subtype}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-400">{item.summary}</div>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 flex-1 overscroll-contain lg:overflow-y-auto">
            {!selected && <div className="grid min-h-full place-items-center p-8 text-slate-500">Select an equipment record.</div>}
            {selected && <EquipmentDetail
              item={selected}
              characters={characters}
              targetCharacterID={effectiveTargetCharacterID}
              setTargetCharacterID={setTargetCharacterID}
              onAdd={addToCharacter}
              notice={notice}
              isCustom={selectedIsCustom}
              propertyOptions={propertyOptions}
              onCustomSave={(draft) => saveCustomItem(selected, draft)}
              onCustomDelete={() => deleteCustomItem(selected)}
            />}
          </main>
        </div>
      )}

      {library === 'magic' && <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center"><div><div className="text-5xl" aria-hidden="true">✨</div><h2 className="mt-4 text-3xl font-black text-white">Magic Items</h2><p className="mt-2 text-slate-400">Coming Soon</p></div></div>}

      {showCustomModal && <CustomItemModal
        propertyOptions={propertyOptions}
        onCancel={() => setShowCustomModal(false)}
        onCreate={createCustomItem}
      />}
    </div>
  );
}

function EquipmentDetail({ item, characters, targetCharacterID, setTargetCharacterID, onAdd, notice, isCustom, propertyOptions, onCustomSave, onCustomDelete }: {
  item: EquipmentCatalogItem;
  characters: ReturnType<typeof useCampaignStore.getState>['characters'];
  targetCharacterID: string;
  setTargetCharacterID: (id: string) => void;
  onAdd: () => void;
  notice: string;
  isCustom: boolean;
  propertyOptions: string[];
  onCustomSave: (draft: CustomItemDraft) => void;
  onCustomDelete: () => void;
}) {
  const weapon = weaponMechanicalProfile(item);
  const defense = defensiveEquipmentProfile(item);
  const potionHealing = healingPotionAmount(item);
  const showDefenseEffects = item.category === 'Armor' || item.category === 'Shields';
  const displayProperties = item.properties.filter((tag) => !(tag in ROUTED_SHEET_EFFECTS));
  const routedEffects = [
    weapon && `${weapon.baseDamage} ${weapon.damageTypes.join('/')} damage`,
    weapon && `Range ${weapon.range}`,
    weapon?.heavyHitDamageBonus ? '+1 damage on Heavy Hits' : '',
    showDefenseEffects && defense.physicalDefense ? `+${defense.physicalDefense} PD` : '',
    showDefenseEffects && defense.areaDefense ? `+${defense.areaDefense} AD` : '',
    showDefenseEffects && defense.physicalDamageReduction ? 'PDR' : '',
    showDefenseEffects && defense.elementalDamageReduction ? 'EDR' : '',
    showDefenseEffects && defense.speedPenalty ? `Speed −${defense.speedPenalty}` : '',
    showDefenseEffects && defense.agilityCheckDisadvantage ? 'DisADV on Agility Checks' : '',
    item.category === 'Spell Focuses' ? item.properties.filter((property) => property !== 'Two-Handed').join(' • ') : '',
    potionHealing ? `Restores ${potionHealing} HP when consumed` : '',
    item.name === 'Medicine Kit' ? '5 tracked uses per kit' : '',
    item.category === 'Trade Tools' ? `Enables ${item.properties[0]} activities` : '',
  ].filter(Boolean) as string[];
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{isCustom ? 'Custom Item' : item.category}</div>
            <h2 className="mt-1 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{item.name}</h2>
            <p className="mt-2 text-slate-400">{item.subtype} • {item.slot}</p>
            <p className="mt-1 text-xs text-slate-600">{item.sourcePage}</p>
          </div>
          <div className="min-w-0 grow basis-64 rounded-xl border border-white/8 bg-slate-950/55 p-3 sm:min-w-72 sm:grow-0">
            {characters.length > 0 ? (
              <>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Add to Character Inventory</label>
                <div className="mt-2 flex gap-2">
                  <select className={`${inputClass} min-w-0 grow`} value={targetCharacterID} onChange={(event) => setTargetCharacterID(event.target.value)}>
                    {characters.map((character) => <option key={character.id} value={character.id}>{character.name || 'Unnamed Character'}</option>)}
                  </select>
                  <button type="button" onClick={onAdd} className="btn-primary shrink-0 text-sm font-bold">Add</button>
                </div>
                {notice && <div className="mt-2 text-xs font-semibold text-emerald-300">{notice}</div>}
              </>
            ) : <p className="text-sm text-slate-500">Create a character to add this item to an inventory.</p>}
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-violet-100">{item.summary}</p>
      </div>

      {isCustom && <CustomItemEditor key={item.id} item={item} propertyOptions={propertyOptions} onSave={onCustomSave} onDelete={onCustomDelete} />}

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Mechanical Rules</h3>
        <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{item.mechanics}</div>
      </section>

      {routedEffects.length > 0 && <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/15 p-6"><h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">Routed Character-Sheet Effects</h3><p className="mt-2 text-xs leading-5 text-slate-500">These effects become active when the item is equipped and any required Training is met, or when its use action is taken for carried supplies.</p><div className="mt-4 flex flex-wrap gap-2">{routedEffects.map((effect) => <span key={effect} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-100">{effect}</span>)}</div></section>}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Properties</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayProperties.length > 0
              ? displayProperties.map((property) => <span key={property} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">{property}</span>)
              : <span className="text-sm text-slate-600">No additional properties.</span>}
          </div>
        </section>
        <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Inventory Behavior</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniFact label="Slot" value={item.slot} />
            <MiniFact label="Equippable" value={isEquipmentEquippable(item) ? 'Yes' : 'No — carried'} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PillMultiSelect({ label, hint, options, selected, onToggle, tone = 'violet' }: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  tone?: 'violet' | 'emerald';
}) {
  const activeClass = tone === 'emerald'
    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
    : 'border-violet-400 bg-violet-500/15 text-violet-200';
  return (
    <div className="mt-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
      <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${isSelected ? activeClass : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function CustomItemModal({ propertyOptions, onCancel, onCreate }: {
  propertyOptions: string[];
  onCancel: () => void;
  onCreate: (draft: CustomItemDraft) => void;
}) {
  const [draft, setDraft] = useState<CustomItemDraft>(emptyDraft());
  const update = (values: Partial<CustomItemDraft>) => setDraft((current) => ({ ...current, ...values }));
  const toggleProperty = (value: string) => setDraft((current) => ({ ...current, properties: toggleValue(current.properties, value) }));
  const toggleRoutedEffect = (value: string) => setDraft((current) => ({ ...current, routedEffects: toggleValue(current.routedEffects, value) }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Create Custom Item">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-400/20 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-black text-violet-200">Create Custom Item</h2>
        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Item name" /></label>
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Highlight (Optional)<input className={`${inputClass} mt-1 w-full`} value={draft.highlight} onChange={(event) => update({ highlight: event.target.value })} placeholder="A short standout detail…" /></label>
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea className={`${inputClass} mt-1 min-h-24 w-full resize-y`} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="What the item is or does…" /></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category<select className={`${inputClass} mt-1 w-full`} value={draft.category} onChange={(event) => update({ category: event.target.value as EquipmentCategory })}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Slot<select className={`${inputClass} mt-1 w-full`} value={draft.slot} onChange={(event) => update({ slot: event.target.value as EquipmentSlot })}>{Object.values(EquipmentSlotValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <PillMultiSelect
          label="Properties"
          hint="Some Properties apply automatic effects — e.g. Weapons: Guard; Spell Focuses: Channeling, Vicious, Powerful, Protective, Warded."
          options={propertyOptions}
          selected={draft.properties}
          onToggle={toggleProperty}
        />
        <PillMultiSelect
          label="Routed-Character Sheet Effects"
          hint="Only takes effect while the item is equipped and its Category is Armor or Shields."
          options={ROUTED_EFFECT_NAMES}
          selected={draft.routedEffects}
          onToggle={toggleRoutedEffect}
          tone="emerald"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">Cancel</button>
          <button type="button" disabled={!draft.name.trim()} onClick={() => onCreate(draft)} className="btn-primary px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35">Create Item</button>
        </div>
      </div>
    </div>
  );
}

function CustomItemEditor({ item, propertyOptions, onSave, onDelete }: {
  item: EquipmentCatalogItem;
  propertyOptions: string[];
  onSave: (draft: CustomItemDraft) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<CustomItemDraft>(() => draftFromItem(item));
  const [saved, setSaved] = useState(false);
  const update = (values: Partial<CustomItemDraft>) => { setDraft((current) => ({ ...current, ...values })); setSaved(false); };
  const toggleProperty = (value: string) => { setDraft((current) => ({ ...current, properties: toggleValue(current.properties, value) })); setSaved(false); };
  const toggleRoutedEffect = (value: string) => { setDraft((current) => ({ ...current, routedEffects: toggleValue(current.routedEffects, value) })); setSaved(false); };

  const save = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
    setSaved(true);
  };

  return <section className="rounded-2xl border border-violet-400/20 bg-violet-950/20 p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Edit Custom Item</h3><p className="mt-1 text-xs text-slate-500">Choose Category, Slot, Properties, and Routed-Character Sheet Effects to have this item behave like Standard Equipment.</p></div><button type="button" onClick={onDelete} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">Delete Item</button></div>
    <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} value={draft.name} onChange={(event) => update({ name: event.target.value })} /></label>
    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Highlight (Optional)<input className={`${inputClass} mt-1 w-full`} value={draft.highlight} onChange={(event) => update({ highlight: event.target.value })} placeholder="A short standout detail…" /></label>
    <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description<textarea className={`${inputClass} mt-1 min-h-28 w-full resize-y`} value={draft.description} onChange={(event) => update({ description: event.target.value })} /></label>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category<select className={`${inputClass} mt-1 w-full`} value={draft.category} onChange={(event) => update({ category: event.target.value as EquipmentCategory })}>{Object.values(EquipmentCategoryValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Slot<select className={`${inputClass} mt-1 w-full`} value={draft.slot} onChange={(event) => update({ slot: event.target.value as EquipmentSlot })}>{Object.values(EquipmentSlotValues).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <PillMultiSelect
      label="Properties"
      hint="Some Properties apply automatic effects — e.g. Weapons: Guard; Spell Focuses: Channeling, Vicious, Powerful, Protective, Warded."
      options={propertyOptions}
      selected={draft.properties}
      onToggle={toggleProperty}
    />
    <PillMultiSelect
      label="Routed-Character Sheet Effects"
      hint="Only takes effect while the item is equipped and its Category is Armor or Shields."
      options={ROUTED_EFFECT_NAMES}
      selected={draft.routedEffects}
      onToggle={toggleRoutedEffect}
      tone="emerald"
    />
    <div className="mt-4 flex items-center justify-end gap-3">{saved && <span className="text-xs font-bold text-emerald-300">Saved</span>}<button type="button" disabled={!draft.name.trim()} onClick={save} className="btn-primary px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35">Save Changes</button></div>
  </section>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-200">{value}</div></div>;
}
