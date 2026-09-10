export const RulesVersionValues = {
  BETA_0_10_5: '0.10.5',
  BETA_0_11: '0.11',
} as const;

export type RulesVersion = (typeof RulesVersionValues)[keyof typeof RulesVersionValues];

export const DEFAULT_RULES_VERSION: RulesVersion = RulesVersionValues.BETA_0_10_5;

export const RULES_VERSION_OPTIONS: Array<{ value: RulesVersion; label: string; shortLabel: string }> = [
  { value: RulesVersionValues.BETA_0_10_5, label: '0.10.5 Beta', shortLabel: '10.5' },
  { value: RulesVersionValues.BETA_0_11, label: '0.11 Beta', shortLabel: '0.11' },
];
