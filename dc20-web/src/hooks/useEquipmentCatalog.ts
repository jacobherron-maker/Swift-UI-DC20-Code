import { useEffect, useState } from 'react';
import type { EquipmentCatalogItem } from '../types/models';
import { sortByName } from '../utils/gameUtils';

let cache: EquipmentCatalogItem[] | null = null;
let pending: Promise<EquipmentCatalogItem[]> | null = null;

function fetchEquipment(): Promise<EquipmentCatalogItem[]> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = Promise.all([
    fetch('/data/EquipmentCatalog.json').then((response) => {
      if (!response.ok) throw new Error(`Equipment catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }),
    fetch('/data/MundaneObjects.json').then((response) => {
      if (!response.ok) throw new Error(`Mundane Objects catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }),
    fetch('/data/AdventureRewards.json').then((response) => {
      if (!response.ok) throw new Error(`Adventure Rewards catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }),
    fetch('/data/MagicalConsumables.json').then((response) => {
      if (!response.ok) throw new Error(`Magical Consumables catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }),
    fetch('/data/Poisons.json').then((response) => {
      if (!response.ok) throw new Error(`Poisons catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }),
  ])
    .then((documents) => {
      if (documents.some((document) => !Array.isArray(document))) throw new Error('An equipment catalog is not an array.');
      const value = documents.flatMap((document) => document as unknown[]);
      const records = value.filter((entry): entry is EquipmentCatalogItem => (
        Boolean(entry)
        && typeof entry === 'object'
        && typeof (entry as EquipmentCatalogItem).id === 'string'
        && typeof (entry as EquipmentCatalogItem).name === 'string'
        && Array.isArray((entry as EquipmentCatalogItem).properties)
      ));
      if (records.length !== value.length) throw new Error('One or more equipment records are malformed.');
      cache = sortByName(records);
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useEquipmentCatalog(): {
  equipment: EquipmentCatalogItem[];
  isLoading: boolean;
  error: string | null;
} {
  const [equipment, setEquipment] = useState<EquipmentCatalogItem[]>(cache ?? []);
  const [isLoading, setIsLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEquipment()
      .then((records) => {
        if (!cancelled) setEquipment(records);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load equipment.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { equipment, isLoading, error };
}
