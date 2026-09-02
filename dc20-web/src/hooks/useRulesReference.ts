import { useEffect, useState } from 'react';
import type { RulesReferenceData } from '../types/models';

let cache: RulesReferenceData | null = null;
let pending: Promise<RulesReferenceData> | null = null;

function loadRules(): Promise<RulesReferenceData> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = fetch('/data/RulesReference.json')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Rules reference returned ${response.status}.`)))
    .then((value: unknown) => {
      const document = value as RulesReferenceData;
      if (!document || document.sections?.length !== 5 || !Array.isArray(document.entries) || document.entries.length < 400) {
        throw new Error('Rules reference is incomplete.');
      }
      cache = document;
      return document;
    })
    .finally(() => { pending = null; });
  return pending;
}

export function useRulesReference() {
  const [reference, setReference] = useState<RulesReferenceData | null>(cache);
  const [isLoading, setIsLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadRules().then((loaded) => { if (!cancelled) setReference(loaded); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load rules.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { reference, isLoading, error };
}
