import { useEffect, useState } from 'react';
import type { Monster } from '../types/models';

let cachedMonsters: Monster[] | null = null;
let pendingRequest: Promise<Monster[]> | null = null;

function loadSourceMonsters(): Promise<Monster[]> {
  if (cachedMonsters) return Promise.resolve(cachedMonsters);
  if (pendingRequest) return pendingRequest;
  pendingRequest = fetch('/data/MonsterSourceLibrary.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Monster library returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      if (!Array.isArray(value)) throw new Error('Monster library is not an array.');
      const monsters = value.filter((entry): entry is Monster => (
        Boolean(entry)
        && typeof entry === 'object'
        && typeof (entry as Monster).id === 'string'
        && typeof (entry as Monster).name === 'string'
        && Array.isArray((entry as Monster).abilities)
      ));
      if (monsters.length !== value.length) {
        throw new Error('One or more sourcebook monster records are malformed.');
      }
      cachedMonsters = monsters;
      return monsters;
    })
    .finally(() => {
      pendingRequest = null;
    });
  return pendingRequest;
}

export function useSourceMonsters(): {
  monsters: Monster[];
  isLoading: boolean;
  error: string | null;
} {
  const [monsters, setMonsters] = useState<Monster[]>(cachedMonsters ?? []);
  const [isLoading, setIsLoading] = useState(cachedMonsters === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSourceMonsters()
      .then((loaded) => {
        if (!cancelled) setMonsters(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load monsters.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { monsters, isLoading, error };
}
