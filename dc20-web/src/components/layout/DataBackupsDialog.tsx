import { useRef, useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { downloadHubBackup } from '../../utils/dataBackup';

export default function DataBackupsDialog({ onClose }: { onClose: () => void }) {
  const { exportData, importData } = useCampaignStore();
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      importData(JSON.parse(await file.text()) as unknown);
      setMessage(`Restored ${file.name}. Your DC20 Hub data is ready.`);
    } catch {
      setMessage('That file is not a valid DC20 Hub backup. No data was changed.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="backup-heading" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="theme-accent-text text-[10px] font-black uppercase tracking-[0.22em]">Data & Backups</p><h1 id="backup-heading" className="mt-1 text-2xl font-black text-white">Protect your whole hub</h1><p className="mt-2 text-sm leading-6 text-slate-400">Cloud saving keeps signed-in data current. A downloaded backup gives you a separate copy you control.</p></div><button type="button" onClick={onClose} aria-label="Close data and backups" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300">✕</button></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => downloadHubBackup(exportData())} className="btn-primary min-h-12 font-black">⬇ Download Backup</button><button type="button" onClick={() => inputRef.current?.click()} className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 font-black text-slate-200 hover:bg-white/10">⬆ Restore Backup</button></div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event.target.files?.[0])} />
      {message && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300">{message}</p>}
      <p className="mt-5 text-xs leading-5 text-slate-500">Restoring replaces the data currently open in this browser. Download a fresh backup first if you may want to return to it.</p>
    </section>
  </div>;
}
