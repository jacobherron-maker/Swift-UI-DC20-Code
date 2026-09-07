import { useMemo, type ReactNode } from 'react';
import type { SemanticRuleReference } from '../../types/models';
import { parseRuleText } from '../../rules/ruleRegistry';
import { useRulesCrossLink } from '../../rules/useRulesCrossLink';

const EMPTY_REFERENCES: SemanticRuleReference[] = [];

export function RuleAwareText({ text, references = EMPTY_REFERENCES, rulesVersion }: { text: string; references?: SemanticRuleReference[]; rulesVersion?: string }) {
  const { registry, openRule } = useRulesCrossLink();
  const segments = useMemo(() => registry ? parseRuleText(text, registry, references) : [{ kind: 'text' as const, text }], [references, registry, text]);
  return <>{segments.map((segment, index): ReactNode => {
    if (segment.kind === 'text') return segment.text;
    const entry = registry?.byID.get(segment.ruleID);
    if (!entry) return segment.text;
    const referenceVersion = references.find(({ ruleId, disabled }) => !disabled && ruleId === entry.id)?.rulesVersion ?? rulesVersion;
    return <button
      type="button"
      key={`${index}-${segment.ruleID}`}
      onClick={(event) => { event.stopPropagation(); openRule(segment.ruleID, { sourceVersion: referenceVersion }); }}
      className="rule-term inline cursor-help rounded-sm border-0 bg-transparent p-0 font-[inherit] text-[inherit] underline decoration-violet-400/70 decoration-dotted underline-offset-[3px] transition hover:text-violet-200 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      aria-label={`Open quick rule for ${entry.canonicalName}`}
      title={`${entry.canonicalName} — ${entry.shortDefinition}`}
      data-rule-id={entry.id}
    >{segment.text}</button>;
  })}</>;
}

export function ExplicitRuleLink({ ruleID, children, rulesVersion }: { ruleID: string; children: ReactNode; rulesVersion?: string }) {
  const { registry, openRule } = useRulesCrossLink();
  const entry = registry?.byID.get(ruleID);
  if (!entry) return <>{children}</>;
  return <button type="button" onClick={(event) => { event.stopPropagation(); openRule(ruleID, { sourceVersion: rulesVersion }); }} aria-label={`Open quick rule for ${entry.canonicalName}`} title={`${entry.canonicalName} — ${entry.shortDefinition}`} className="rule-term inline rounded-sm bg-transparent p-0 font-[inherit] text-[inherit] underline decoration-violet-400/70 decoration-dotted underline-offset-[3px] hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400" data-rule-id={ruleID}>{children}</button>;
}
