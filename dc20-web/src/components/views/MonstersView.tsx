import React, { useEffect, useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { Monster } from '../../types/models';

const PAGE_SIZE = 6;

const MonstersView: React.FC = () => {
  const { campaignData, addCustomMonster, removeCustomMonster } = useCampaignStore();
  const [builtIn, setBuiltIn] = useState<Monster[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Monster | null>(null);

  useEffect(() => {
    fetch('/data/Monsters.json')
      .then((r) => r.json())
      .then((data) => setBuiltIn(Array.isArray(data) ? data : []))
      .catch(() => setBuiltIn([]));
  }, []);

  const combined = useMemo(() => [...builtIn, ...(campaignData.customMonsters || [])], [builtIn, campaignData.customMonsters]);

  const filtered = useMemo(() => {
    if (!search) return combined;
    const q = search.toLowerCase();
    return combined.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.type || '').toLowerCase().includes(q) || (m.traits || []).some(t => (t.name || '').toLowerCase().includes(q)));
  }, [combined, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data)) {
          data.forEach((m: any, i: number) => {
            const monster: Monster = {
              id: m.id || `import-${Date.now()}-${i}`,
              name: m.name || 'Unnamed',
              type: m.type || 'Unknown',
              alignment: m.alignment || '',
              ac: m.ac || 10,
              stamina: m.stamina || 1,
              speed: m.speed || {},
              abilities: m.abilities || [],
              skills: m.skills || {},
              languages: m.languages || [],
              traits: m.traits || [],
              actions: m.actions || [],
            };
            addCustomMonster(monster);
          });
          alert('Imported ' + data.length + ' monsters into custom monsters.');
        } else {
          alert('Uploaded file is not an array of monsters');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(f);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">👹 Monsters</h1>

      <div className="flex gap-4 mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search monsters by name, type, or trait..."
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 w-96"
        />

        <label className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 cursor-pointer">
          Upload JSON
          <input type="file" accept="application/json" onChange={handleFile} className="hidden" />
        </label>

        <div className="flex-1" />
        <div className="text-gray-400">Built-in: {builtIn.length} • Custom: {campaignData.customMonsters.length}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-gray-800 rounded-lg p-4 border border-gray-700 h-[60vh] overflow-auto">
          {pageItems.length === 0 ? (
            <p className="text-gray-400">No monsters found.</p>
          ) : (
            pageItems.map((m) => (
              <div key={m.id} className="mb-2 flex items-center justify-between">
                <button onClick={() => setSelected(m)} className="text-left text-gray-200 hover:text-white">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-gray-400">{m.type} • AC {m.ac} • HP {m.stamina}</div>
                </button>
                {campaignData.customMonsters.some(cm => cm.id === m.id) && (
                  <button onClick={() => { if (confirm('Remove this custom monster?')) { removeCustomMonster(m.id); if (selected?.id===m.id) setSelected(null); } }} className="text-sm text-red-400">Remove</button>
                )}
              </div>
            ))
          )}

          <div className="mt-4 flex items-center justify-between">
            <button disabled={page===0} onClick={() => setPage(Math.max(0, page-1))} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Prev</button>
            <div className="text-sm text-gray-300">Page {page+1} / {pageCount}</div>
            <button disabled={page+1>=pageCount} onClick={() => setPage(Math.min(pageCount-1, page+1))} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Next</button>
          </div>
        </div>

        <div className="col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700 h-[60vh] overflow-auto">
          {selected ? (
            <div>
              <h2 className="text-2xl font-bold text-purple-300 mb-2">{selected.name}</h2>
              <div className="text-gray-300 mb-4">{selected.type} • {selected.alignment} • AC {selected.ac} • HP {selected.stamina}</div>

              <h3 className="text-lg font-semibold text-gray-200 mt-4">Abilities</h3>
              <div className="grid grid-cols-3 gap-2 text-gray-300 mt-2">
                {selected.abilities.map((a) => (
                  <div key={a.name} className="bg-gray-900 p-2 rounded">{a.name}: {a.score} ({a.modifier>=0?'+':''}{a.modifier})</div>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-200 mt-4">Traits</h3>
              <div className="text-gray-300 mt-2 space-y-2">
                {selected.traits.map((t) => (
                  <div key={t.name}><strong className="text-gray-100">{t.name}</strong>: <span>{t.description}</span></div>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-200 mt-4">Actions</h3>
              <div className="text-gray-300 mt-2 space-y-2">
                {selected.actions.map((a) => (
                  <div key={a.name}><strong className="text-gray-100">{a.name}</strong>: <span>{a.description}</span></div>
                ))}
              </div>

            </div>
          ) : (
            <div className="text-gray-400">Select a monster to view details. Use Upload JSON to add custom monsters.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonstersView;
