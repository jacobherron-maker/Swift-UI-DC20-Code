import { useMemo, useState } from 'react';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { useCampaignStore } from '../../store/campaignStore';
import type { EquipmentCatalogItem, EquipmentCategory } from '../../types/models';
import { EquipmentCategoryValues } from '../../types/models';
import { addInventoryItem, isEquipmentEquippable } from '../../utils/equipmentRules';

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

export default function EquipmentView() {
  const { equipment, isLoading, error } = useEquipmentCatalog();
  const { characters, selectedCharacterId, updateCharacter } = useCampaignStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EquipmentCategory | 'All'>('All');
  const [selectedEquipmentID, setSelectedEquipmentID] = useState<string | null>(null);
  const [targetCharacterID, setTargetCharacterID] = useState(selectedCharacterId ?? '');
  const [notice, setNotice] = useState('');
  const categories = Object.values(EquipmentCategoryValues);
  const effectiveTargetCharacterID = targetCharacterID || selectedCharacterId || characters[0]?.id || '';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return equipment.filter((item) => (
      (category === 'All' || item.category === category)
      && (!query || [item.name, item.subtype, item.summary, item.mechanics, ...item.properties]
        .some((value) => value.toLowerCase().includes(query)))
    ));
  }, [category, equipment, search]);
  const requestedSelection = equipment.find(({ id }) => id === selectedEquipmentID) ?? null;
  const selected = requestedSelection && filtered.some(({ id }) => id === requestedSelection.id)
    ? requestedSelection
    : filtered[0] ?? null;
  const effectiveSelectedEquipmentID = selected?.id ?? null;

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

  return (
    <div className="flex min-h-full bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)]">
      <aside className="w-[23rem] shrink-0 border-r border-white/5 bg-slate-950/45 p-4">
        <div>
          <h1 className="text-2xl font-black text-white">Equipment</h1>
          <p className="text-xs text-slate-500">Beta 0.10.5 mechanical catalog</p>
        </div>
        <input className={`${inputClass} mt-4 w-full`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, properties, mechanics…" aria-label="Search equipment" />
        <div className="mt-3 flex flex-wrap gap-2">
          {(['All', ...categories] as const).map((entry) => (
            <button
              type="button"
              key={entry}
              onClick={() => setCategory(entry)}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${category === entry ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/8 bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}
            >
              {entry} <span className="opacity-60">{entry === 'All' ? equipment.length : equipment.filter(({ category: itemCategory }) => itemCategory === entry).length}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto pr-1">
          {isLoading && <div className="rounded-xl border border-white/5 p-4 text-sm text-slate-500">Loading the native catalog…</div>}
          {error && <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}
          {!isLoading && filtered.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">No equipment matches this search.</div>}
          {filtered.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedEquipmentID(item.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${item.id === effectiveSelectedEquipmentID ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
            >
              <div className="flex items-start justify-between gap-3"><span className="font-bold text-slate-100">{item.name}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-violet-300">{item.category}</span></div>
              <div className="mt-1 text-xs text-slate-500">{item.subtype}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-400">{item.summary}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-slate-500">Select an equipment record.</div>}
        {selected && <EquipmentDetail
          item={selected}
          characters={characters}
          targetCharacterID={effectiveTargetCharacterID}
          setTargetCharacterID={setTargetCharacterID}
          onAdd={addToCharacter}
          notice={notice}
        />}
      </main>
    </div>
  );
}

function EquipmentDetail({ item, characters, targetCharacterID, setTargetCharacterID, onAdd, notice }: {
  item: EquipmentCatalogItem;
  characters: ReturnType<typeof useCampaignStore.getState>['characters'];
  targetCharacterID: string;
  setTargetCharacterID: (id: string) => void;
  onAdd: () => void;
  notice: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{item.category}</div>
            <h2 className="mt-1 text-4xl font-black tracking-tight text-white">{item.name}</h2>
            <p className="mt-2 text-slate-400">{item.subtype} • {item.slot}</p>
            <p className="mt-1 text-xs text-slate-600">{item.sourcePage}</p>
          </div>
          <div className="min-w-72 rounded-xl border border-white/8 bg-slate-950/55 p-3">
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

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Mechanical Rules</h3>
        <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{item.mechanics}</div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Properties</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.properties.length > 0
              ? item.properties.map((property) => <span key={property} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">{property}</span>)
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

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-200">{value}</div></div>;
}
