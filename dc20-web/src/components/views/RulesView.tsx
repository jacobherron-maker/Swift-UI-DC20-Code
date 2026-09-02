import React, { useEffect, useMemo, useState } from 'react';

type ClassFeature = {
  id: string;
  name: string;
  description: string;
  className: string;
  level?: string;
  kind: 'feature' | 'subclass';
};

const RulesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFeatures, setClassFeatures] = useState<ClassFeature[]>([]);
  const [selected, setSelected] = useState<ClassFeature | null>(null);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/BetaClassFeatures.json')
      .then((r) => {
        if (!r.ok) throw new Error('Class reference data could not be loaded.');
        return r.json();
      })
      .then((data) => {
        const mapped = Object.entries(data.classes ?? {}).flatMap(([className, rawDocument]) => {
          const document = rawDocument as {
            levels?: Record<string, Array<{ name?: string; description?: string }>>;
            subclasses?: Record<string, string>;
          };
          const features = Object.entries(document.levels ?? {}).flatMap(([level, entries]) =>
            entries.map((entry, index) => ({
              id: `${className}-level-${level}-${entry.name ?? index}`,
              name: entry.name || `Level ${level} Feature`,
              description: entry.description || '',
              className,
              level,
              kind: 'feature' as const,
            }))
          );
          const subclasses = Object.entries(document.subclasses ?? {}).map(([name, description]) => ({
            id: `${className}-subclass-${name}`,
            name,
            description,
            className,
            kind: 'subclass' as const,
          }));
          return [...features, ...subclasses];
        });
        setClassFeatures(mapped);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setClassFeatures([]);
        setLoadError(error instanceof Error ? error.message : 'Class reference data could not be loaded.');
      });
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return classFeatures.filter((feature) =>
      (selectedClass === 'All Classes' || feature.className === selectedClass) &&
      (!q || [feature.name, feature.description, feature.className, feature.level ?? '', feature.kind]
        .some((value) => value.toLowerCase().includes(q)))
    );
  }, [classFeatures, searchTerm, selectedClass]);

  const classNames = useMemo(
    () => Array.from(new Set(classFeatures.map((feature) => feature.className))).sort(),
    [classFeatures]
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">DC20 Rules</h1>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 flex flex-wrap items-center gap-4">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search class features or rules..."
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 w-full"
        />
        <select
          value={selectedClass}
          onChange={(event) => { setSelectedClass(event.target.value); setSelected(null); }}
          aria-label="Filter class references"
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
        >
          <option>All Classes</option>
          {classNames.map((className) => <option key={className}>{className}</option>)}
        </select>
      </div>

      {loadError && <div role="alert" className="mb-4 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-200">{loadError}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-[60vh] overflow-auto">
          <h2 className="text-lg font-semibold text-purple-300 mb-3">Class Reference</h2>
          {filtered.length === 0 ? (
            <p className="text-gray-400">No features found.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700 text-gray-200 mb-1"
              >
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-xs text-gray-400 mt-1">
                  {c.className} • {c.kind === 'subclass' ? 'Subclass' : `Level ${c.level}`}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700 h-[60vh] overflow-auto">
          {selected ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-400 mb-2">
                {selected.className} • {selected.kind === 'subclass' ? 'Subclass' : `Level ${selected.level}`}
              </p>
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
