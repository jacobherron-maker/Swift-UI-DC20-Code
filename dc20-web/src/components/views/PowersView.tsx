import React, { useEffect, useMemo, useState } from 'react';

type Spell = {
  id?: string;
  name: string;
  description?: string;
  enhancements?: string;
};

const PowersView: React.FC = () => {
  const [filterType, setFilterType] = useState<'spells' | 'maneuvers' | 'class-features'>('spells');
  const [spells, setSpells] = useState<Spell[]>([]);
  const [maneuvers, setManeuvers] = useState<Spell[]>([]);
  const [classFeatures, setClassFeatures] = useState<Spell[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Spell | null>(null);

  useEffect(() => {
    // load spells
    fetch('/data/BetaSpells.json')
      .then((r) => r.json())
      .then((data) => {
        setSpells(
          Array.isArray(data)
            ? data.map((s: any, i: number) => ({ id: s.name || String(i), name: s.name || s.title || `Spell ${i + 1}`, description: s.description, enhancements: s.enhancements }))
            : []
        );
      })
      .catch(() => setSpells([]));

    fetch('/data/BetaManeuvers.json')
      .then((r) => r.json())
      .then((data) => {
        setManeuvers(
          Array.isArray(data)
            ? data.map((m: any, i: number) => ({ id: m.name || String(i), name: m.name || `Maneuver ${i + 1}`, description: m.description, enhancements: m.enhancements }))
            : []
        );
      })
      .catch(() => setManeuvers([]));

    fetch('/data/BetaClassFeatures.json')
      .then((r) => r.json())
      .then((data) => {
        setClassFeatures(
          Array.isArray(data)
            ? data.map((c: any, i: number) => ({ id: c.name || String(i), name: c.name || `Feature ${i + 1}`, description: c.description }))
            : []
        );
      })
      .catch(() => setClassFeatures([]));

    // load parsed entries from PDFs (if present) and merge, avoiding duplicates by name
    fetch('/data/parsed_from_pdfs/parsed_spells.json')
      .then((r) => {
        if (!r.ok) throw new Error('no parsed spells');
        return r.json();
      })
      .then((parsed) => {
        setSpells((prev) => {
          const names = new Set(prev.map((p) => p.name));
          const merged = prev.concat(parsed.filter((p: any) => !names.has(p.name)));
          return merged;
        });
      })
      .catch(() => {});

    fetch('/data/parsed_from_pdfs/parsed_maneuvers.json')
      .then((r) => {
        if (!r.ok) throw new Error('no parsed maneuvers');
        return r.json();
      })
      .then((parsed) => {
        setManeuvers((prev) => {
          const names = new Set(prev.map((p) => p.name));
          const merged = prev.concat(parsed.filter((p: any) => !names.has(p.name)));
          return merged;
        });
      })
      .catch(() => {});

    fetch('/data/parsed_from_pdfs/parsed_class_features.json')
      .then((r) => {
        if (!r.ok) throw new Error('no parsed features');
        return r.json();
      })
      .then((parsed) => {
        setClassFeatures((prev) => {
          const names = new Set(prev.map((p) => p.name));
          const merged = prev.concat(parsed.filter((p: any) => !names.has(p.name)));
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  const items = useMemo(() => {
    const list = filterType === 'spells' ? spells : filterType === 'maneuvers' ? maneuvers : classFeatures;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((it) => (it.name || '').toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q));
  }, [filterType, spells, maneuvers, classFeatures, search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">Spells & Maneuvers</h1>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilterType('spells')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'spells' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ✨ Spells ({spells.length})
        </button>
        <button
          onClick={() => setFilterType('maneuvers')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'maneuvers' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ⚔️ Maneuvers ({maneuvers.length})
        </button>
        <button
          onClick={() => setFilterType('class-features')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'class-features' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          🧭 Class Features ({classFeatures.length})
        </button>

        <div className="flex-1" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or description..."
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 w-64"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-gray-800 rounded-lg p-4 border border-gray-700 h-[60vh] overflow-auto">
          {items.length === 0 ? (
            <p className="text-gray-400">No items to show.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="mb-2">
                <button
                  onClick={() => setSelected(it)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700 text-gray-200"
                >
                  {it.name}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700 h-[60vh] overflow-auto">
          {selected ? (
            <div>
              <h2 className="text-2xl font-bold text-purple-300 mb-2">{selected.name}</h2>
              {selected.description && <p className="text-gray-300 mb-4 whitespace-pre-wrap">{selected.description}</p>}
              {selected.enhancements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-2">Enhancements</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selected.enhancements}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">Select an item to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PowersView;
