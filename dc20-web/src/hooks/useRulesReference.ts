import { useEffect, useState } from 'react';
import type { CharacterReferenceData, EquipmentCatalogItem, RulesReferenceData } from '../types/models';
import {
  auditRulesReference,
  type AuditedManeuverRecord,
  type AuditedSpellRecord,
} from '../utils/ruleRules';

let cache: RulesReferenceData | null = null;
let pending: Promise<RulesReferenceData> | null = null;

function loadRules(): Promise<RulesReferenceData> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = Promise.all([
    fetch('/data/RulesReference.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Rules reference returned ${response.status}.`))),
    fetch('/data/BetaSpells.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Spell catalog returned ${response.status}.`))),
    fetch('/data/BetaManeuvers.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Maneuver catalog returned ${response.status}.`))),
    fetch('/data/CharacterReference.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Character reference returned ${response.status}.`))),
    fetch('/data/EquipmentCatalog.json').then((response) => response.ok ? response.json() : Promise.reject(new Error(`Equipment catalog returned ${response.status}.`))),
  ])
    .then(([rulesValue, spellValue, maneuverValue, characterValue, equipmentValue]: unknown[]) => {
      const document = rulesValue as RulesReferenceData;
      if (!document || document.sections?.length !== 5 || !Array.isArray(document.entries) || document.entries.length < 400) {
        throw new Error('Rules reference is incomplete.');
      }
      const spells = (spellValue as { spells?: AuditedSpellRecord[] }).spells ?? [];
      const maneuvers = (maneuverValue as { maneuvers?: AuditedManeuverRecord[] }).maneuvers ?? [];
      const characterReference = characterValue as CharacterReferenceData;
      const equipment = equipmentValue as EquipmentCatalogItem[];
      if (spells.length !== 160 || maneuvers.length !== 30 || characterReference.classes?.length !== 15 || !Array.isArray(equipment)) {
        throw new Error('One or more audited rules catalogs are incomplete.');
      }
      const audited = auditRulesReference(document, spells, maneuvers, characterReference, equipment);
      cache = audited;
      return audited;
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
