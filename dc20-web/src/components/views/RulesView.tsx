import React, { useEffect, useMemo, useState } from 'react';
import type { CampaignRecord } from '../../types/models';

type ClassFeature = {
  id?: string;
  name: string;
  description?: string;
};

const RulesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFeatures, setClassFeatures] = useState<ClassFeature[]>([]);
  const [selected, setSelected] = useState<ClassFeature | null>(null);

  useEffect(() => {
    fetch('/data/BetaClassFeatures.json')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((c: any, i: number) => ({ id: c.name || `cf-${i}`, name: c.name || `Feature ${i + 1}`, description: c.description || '' }));
          setClassFeatures(mapped);
        }
      })
      .catch(() => setClassFeatures([]));
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return classFeatures;
    const q = searchTerm.toLowerCase();
    return classFeatures.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [classFeatures, searchTerm]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">DC20 Rules</h1>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 flex items-center gap-4">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search class features or rules..."
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-gray-800 rounded-lg p-4 border border-gray-700 h-[60vh] overflow-auto">
          <h2 className="text-lg font-semibold text-purple-300 mb-3">Quick Reference</h2>
          {filtered.length === 0 ? (
            <p className="text-gray-400">No features found.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700 text-gray-200 mb-1"
              >
                {c.name}
              </button>
            ))
          )}
        </div>

        <div className="col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700 h-[60vh] overflow-auto">
          {selected ? (
            <div>
              <h2 className="text-2xl font-bold text-purple-300 mb-2">{selected.name}</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{selected.description}</p>
            </div>
          ) : (
            <div className="text-gray-400">Select a class feature or search to view its quick reference text here.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RulesView;
