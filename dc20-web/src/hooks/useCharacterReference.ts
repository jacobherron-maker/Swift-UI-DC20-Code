import { useEffect, useState } from 'react';
import type { CharacterReferenceData } from '../types/models';

let cache: CharacterReferenceData | null = null;
let pending: Promise<CharacterReferenceData> | null = null;

function fetchReference(): Promise<CharacterReferenceData> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch('/data/CharacterReference.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Character reference returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      if (!value || typeof value !== 'object') throw new Error('Character reference is malformed.');
      const reference = value as CharacterReferenceData;
      if (
        reference.classes?.length !== 15
        || !Array.isArray(reference.ancestryTraits)
        || !Array.isArray(reference.skills)
        || !Array.isArray(reference.trades)
      ) {
        throw new Error('Character reference is incomplete.');
      }
      cache = reference;
      return reference;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useCharacterReference(): {
  reference: CharacterReferenceData | null;
  isLoading: boolean;
  error: string | null;
} {
  const [reference, setReference] = useState<CharacterReferenceData | null>(cache);
  const [isLoading, setIsLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReference()
      .then((loaded) => {
        if (!cancelled) setReference(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load character rules.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { reference, isLoading, error };
}
