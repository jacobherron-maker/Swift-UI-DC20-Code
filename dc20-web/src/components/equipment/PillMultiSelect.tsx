/* oxlint-disable react/only-export-components */

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function PillMultiSelect({ label, hint, options, selected, onToggle, tone = 'violet' }: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  tone?: 'violet' | 'emerald';
}) {
  const activeClass = tone === 'emerald'
    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
    : 'border-violet-400 bg-violet-500/15 text-violet-200';
  return (
    <div className="mt-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
      <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${isSelected ? activeClass : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
