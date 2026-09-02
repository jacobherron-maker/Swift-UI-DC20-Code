import { useEffect, useState } from 'react';
import type { EquipmentCatalogItem } from '../types/models';

let cache: EquipmentCatalogItem[] | null = null;
let pending: Promise<EquipmentCatalogItem[]> | null = null;

function fetchEquipment(): Promise<EquipmentCatalogItem[]> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch('/data/EquipmentCatalog.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Equipment catalog returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      if (!Array.isArray(value)) throw new Error('Equipment catalog is not an array.');
      const records = value.filter((entry): entry is EquipmentCatalogItem => (
        Boolean(entry)
        && typeof entry === 'object'
        && typeof (entry as EquipmentCatalogItem).id === 'string'
        && typeof (entry as EquipmentCatalogItem).name === 'string'
        && Array.isArray((entry as EquipmentCatalogItem).properties)
      ));
      if (records.length !== value.length) throw new Error('One or more equipment records are malformed.');
      cache = records;
      return records;
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
