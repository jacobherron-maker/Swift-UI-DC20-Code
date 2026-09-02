import { useEffect, useState } from 'react';

export interface SpellReference {
  name: string;
  source: string;
  school: string;
  tags: string;
  cost: string;
  range: string;
  duration: string;
  description: string;
  enhancements: string;
}

export interface ManeuverReference {
  name: string;
  category: string;
  cost: string;
  range: string;
  requirements: string;
  description: string;
  enhancements: string;
}

let spellCache: SpellReference[] | null = null;
let maneuverCache: ManeuverReference[] | null = null;
let pending: Promise<[SpellReference[], ManeuverReference[]]> | null = null;

function loadPowers(): Promise<[SpellReference[], ManeuverReference[]]> {
  if (spellCache && maneuverCache) return Promise.resolve([spellCache, maneuverCache]);
  if (pending) return pending;
  pending = Promise.all([
    fetch('/data/BetaSpells.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Spell catalog returned ${response.status}.`))),
    fetch('/data/BetaManeuvers.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Maneuver catalog returned ${response.status}.`))),
  ]).then(([spellDocument, maneuverDocument]) => {
    const loadedSpells: SpellReference[] = Array.isArray(spellDocument.spells) ? spellDocument.spells : [];
    const loadedManeuvers: ManeuverReference[] = Array.isArray(maneuverDocument.maneuvers) ? maneuverDocument.maneuvers : [];
    spellCache = loadedSpells;
    maneuverCache = loadedManeuvers;
    return [loadedSpells, loadedManeuvers] as [SpellReference[], ManeuverReference[]];
  }).finally(() => {
    pending = null;
  });
  return pending!;
}

export function usePowerCatalog() {
  const [spells, setSpells] = useState<SpellReference[]>(spellCache ?? []);
  const [maneuvers, setManeuvers] = useState<ManeuverReference[]>(maneuverCache ?? []);
  const [isLoading, setIsLoading] = useState(!spellCache || !maneuverCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPowers().then(([loadedSpells, loadedManeuvers]) => {
      if (!cancelled) {
        setSpells(loadedSpells);
        setManeuvers(loadedManeuvers);
      }
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load powers.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { spells, maneuvers, isLoading, error };
}
