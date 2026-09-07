import React from 'react';
import { powerRuleBlocks } from '../../utils/powerRules';
import { RuleAwareText } from '../rules/RuleAwareText';

function RuleLabels({ text }: { text: string }) {
  const initialLabel = text.match(/^((?:\(\d+\)\s*)?[A-Z][^:]{0,60}:)(.*)$/s);
  if (initialLabel) return <><strong className="font-black text-slate-200"><RuleAwareText text={initialLabel[1]} /></strong><RuleLabels text={initialLabel[2]} /></>;
  const parts = text.split(/((?:^|\s)(?:Beta Note|DC Tip|Spell Cast|Spell End|Spell Passive|Recasting the Spell|Trigger|Reaction|Hit|Failure|Success(?: \(each 5\))?|Check Success|Contest Failure|Contest Success|Save Failure(?: \(each 5\))?|Being Identified|Retaliation|Relocate|Examine|Stamina Action|MP Reduction|Shared MCP|Pocket Dimension|Shared Senses|Combat):)/gi);
  return <>{parts.map((part, index) => /:\s*$/.test(part) ? <strong key={index} className="font-black text-slate-200"><RuleAwareText text={part} /></strong> : <React.Fragment key={index}><RuleAwareText text={part} /></React.Fragment>)}</>;
}

export function PowerRulesText({ text, enhancements = false }: { text: string; enhancements?: boolean }) {
  const blocks = powerRuleBlocks(text, enhancements);
  return <div className="space-y-3">
    {blocks.map((block, index) => {
      if (block.kind === 'heading') return <h4 key={index} className="border-b border-white/10 pb-1 pt-2 text-sm font-black uppercase tracking-[0.12em] text-violet-200">{block.text}</h4>;
      if (block.kind === 'bullet') return <div key={index} className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-slate-950/35 px-3 py-2 text-sm leading-6 text-slate-300"><span className="theme-accent-text font-black">•</span><span><RuleLabels text={block.text} /></span></div>;
      if (block.kind === 'tip') return <aside key={index} className="rounded-lg border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-sm leading-6 text-sky-100"><RuleLabels text={block.text} /></aside>;
      if (block.kind === 'enhancement') return <div key={index} className="rounded-lg border-l-2 border-fuchsia-400/50 bg-fuchsia-500/5 px-3 py-2 text-sm leading-6 text-slate-300"><RuleLabels text={block.text} /></div>;
      return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-slate-300"><RuleLabels text={block.text} /></p>;
    })}
  </div>;
}
