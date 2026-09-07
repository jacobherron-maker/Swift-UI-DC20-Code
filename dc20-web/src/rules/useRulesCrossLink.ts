import { createContext, useContext } from 'react';
import type { RuleRegistry } from './ruleRegistry';

export interface OpenRuleOptions {
  sourceVersion?: string;
}

export interface RulesCrossLinkValue {
  registry: RuleRegistry | null;
  isLoading: boolean;
  error: string | null;
  openRule: (ruleID: string, options?: OpenRuleOptions) => void;
  closeRule: () => void;
  pinnedRuleIDs: string[];
  recentRuleIDs: string[];
  togglePinnedRule: (ruleID: string) => void;
}

export const RulesCrossLinkContext = createContext<RulesCrossLinkValue | null>(null);

export function useRulesCrossLink(): RulesCrossLinkValue {
  const value = useContext(RulesCrossLinkContext);
  if (!value) throw new Error('useRulesCrossLink must be used within RulesCrossLinkProvider.');
  return value;
}
