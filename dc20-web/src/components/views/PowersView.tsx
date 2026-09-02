import React, { useEffect, useMemo, useState } from 'react';

type ReferenceItem = {
  id: string;
  name: string;
  description: string;
  enhancements?: string;
  eyebrow?: string;
  metadata?: Array<[string, string]>;
};

type ClassFeatureDocument = {
  classes?: Record<string, {
    levels?: Record<string, Array<{ name?: string; description?: string }>>;
    subclasses?: Record<string, string>;
  }>;
};

const normalizeClassFeatures = (document: ClassFeatureDocument): ReferenceItem[] =>
  Object.entries(document.classes ?? {}).flatMap(([className, classDocument]) => {
    const features = Object.entries(classDocument.levels ?? {}).flatMap(([level, levelFeatures]) =>
      levelFeatures.map((feature, index) => ({
        id: `${className}-level-${level}-${feature.name ?? index}`,
        name: feature.name || `Level ${level} Feature`,
        description: feature.description || '',
        eyebrow: `${className} • Level ${level}`,
        metadata: [['Class', className], ['Level', level]] as Array<[string, string]>,
      }))
    );

    const subclasses = Object.entries(classDocument.subclasses ?? {}).map(([name, description]) => ({
      id: `${className}-subclass-${name}`,
      name,
      description,
      eyebrow: `${className} • Subclass`,
      metadata: [['Class', className], ['Type', 'Subclass']] as Array<[string, string]>,
    }));

    return [...features, ...subclasses];
  });

const metadataEntries = (values: Array<[string, unknown]>): Array<[string, string]> =>
  values.filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0);

const PowersView: React.FC = () => {
  const [filterType, setFilterType] = useState<'spells' | 'maneuvers' | 'class-features'>('spells');
  const [spells, setSpells] = useState<ReferenceItem[]>([]);
  const [maneuvers, setManeuvers] = useState<ReferenceItem[]>([]);
  const [classFeatures, setClassFeatures] = useState<ReferenceItem[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReferenceItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReferences = async () => {
      try {
        const [spellResponse, maneuverResponse, featureResponse] = await Promise.all([
          fetch('/data/BetaSpells.json'),
          fetch('/data/BetaManeuvers.json'),
          fetch('/data/BetaClassFeatures.json'),
        ]);

        if (!spellResponse.ok || !maneuverResponse.ok || !featureResponse.ok) {
          throw new Error('One or more reference files could not be loaded.');
        }

        const [spellDocument, maneuverDocument, featureDocument] = await Promise.all([
          spellResponse.json(),
          maneuverResponse.json(),
          featureResponse.json(),
        ]);

        if (cancelled) return;

        setSpells(
          (Array.isArray(spellDocument.spells) ? spellDocument.spells : []).map((spell: Record<string, unknown>, index: number) => ({
            id: `spell-${String(spell.name ?? index)}`,
            name: String(spell.name ?? `Spell ${index + 1}`),
            description: String(spell.description ?? ''),
            enhancements: String(spell.enhancements ?? ''),
            eyebrow: [spell.source, spell.school].filter(Boolean).map(String).join(' • '),
            metadata: metadataEntries([
              ['Cost', spell.cost],
              ['Range', spell.range],
              ['Duration', spell.duration],
              ['Tags', spell.tags],
            ]),
          }))
        );

        setManeuvers(
          (Array.isArray(maneuverDocument.maneuvers) ? maneuverDocument.maneuvers : []).map((maneuver: Record<string, unknown>, index: number) => ({
            id: `maneuver-${String(maneuver.name ?? index)}`,
            name: String(maneuver.name ?? `Maneuver ${index + 1}`),
            description: String(maneuver.description ?? ''),
            enhancements: String(maneuver.enhancements ?? ''),
            eyebrow: String(maneuver.category ?? 'Maneuver'),
            metadata: metadataEntries([
              ['Cost', maneuver.cost],
              ['Range', maneuver.range],
              ['Requirements', maneuver.requirements],
            ]),
          }))
        );

        setClassFeatures(normalizeClassFeatures(featureDocument));
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Reference data could not be loaded.');
        }
      }
    };

    void loadReferences();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => {
    const list = filterType === 'spells' ? spells : filterType === 'maneuvers' ? maneuvers : classFeatures;
    if (!search) return list;
    const query = search.toLowerCase();
    return list.filter((item) =>
      [item.name, item.description, item.eyebrow, ...(item.metadata?.flat() ?? [])]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [filterType, spells, maneuvers, classFeatures, search]);

  const selectCategory = (category: typeof filterType) => {
    setFilterType(category);
    setSelected(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">Spells & Maneuvers</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        {([
          ['spells', `✨ Spells (${spells.length})`],
          ['maneuvers', `⚔️ Maneuvers (${maneuvers.length})`],
          ['class-features', `🧭 Class Features (${classFeatures.length})`],
        ] as const).map(([category, label]) => (
          <button
            key={category}
            onClick={() => selectCategory(category)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterType === category ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="flex-1" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search references..."
          aria-label="Search spells, maneuvers, and class features"
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 w-full sm:w-72"
        />
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-200">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-[60vh] overflow-auto">
          {items.length === 0 ? (
            <p className="text-gray-400">No references found.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 ${selected?.id === item.id ? 'bg-purple-700 text-white' : 'hover:bg-gray-700 text-gray-200'}`}
              >
                <span className="block font-semibold">{item.name}</span>
                {item.eyebrow && <span className="block text-xs text-gray-400 mt-1">{item.eyebrow}</span>}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700 h-[60vh] overflow-auto">
          {selected ? (
            <article>
              {selected.eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-purple-400 mb-2">{selected.eyebrow}</p>}
              <h2 className="text-2xl font-bold text-purple-300 mb-4">{selected.name}</h2>
              {selected.metadata && selected.metadata.length > 0 && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {selected.metadata.map(([label, value]) => (
                    <div key={label} className="rounded bg-gray-900/70 p-3">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
                      <dd className="text-gray-200 mt-1">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-gray-300 mb-5 whitespace-pre-wrap leading-relaxed">{selected.description}</p>
              {selected.enhancements && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">Enhancements</h3>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.enhancements}</p>
                </section>
              )}
            </article>
          ) : (
            <div className="text-gray-400">Select a reference to view its complete details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PowersView;
