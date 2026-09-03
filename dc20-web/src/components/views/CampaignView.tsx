import { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { CampaignNote, CampaignRecord } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

export default function CampaignView() {
  const {
    campaignData,
    selectedCampaignId,
    selectCampaign,
    updateCampaignData,
    addCampaign,
    updateCampaign,
    removeCampaign,
  } = useCampaignStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const effectiveCampaignId = selectedCampaignId ?? campaignData.campaigns[0]?.id ?? null;
  const campaign = campaignData.campaigns.find(({ id }) => id === effectiveCampaignId) ?? null;
  const note = campaign?.notes.find(({ id }) => id === selectedNoteId)
    ?? campaign?.notes[0]
    ?? null;

  const createCampaign = () => {
    const firstNote: CampaignNote = { id: generateUUID(), title: 'Session Notes', body: '' };
    addCampaign({
      id: generateUUID(),
      name: `Campaign ${campaignData.campaigns.length + 1}`,
      notes: [firstNote],
    });
    setSelectedNoteId(firstNote.id);
  };

  const createNote = () => {
    if (!campaign) return;
    const newNote: CampaignNote = { id: generateUUID(), title: `Note ${campaign.notes.length + 1}`, body: '' };
    updateCampaign({ ...campaign, notes: [...campaign.notes, newNote] });
    setSelectedNoteId(newNote.id);
  };

  const updateNote = (changes: Partial<CampaignNote>) => {
    if (!campaign || !note) return;
    updateCampaign({
      ...campaign,
      notes: campaign.notes.map((entry) => entry.id === note.id ? { ...entry, ...changes } : entry),
    });
  };

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Campaigns</h1>
            <p className="text-xs text-slate-500">Worlds, adventures, and notes</p>
          </div>
          <button type="button" onClick={createCampaign} className="btn-primary text-sm font-bold">+ New</button>
        </div>
        <div className="mt-5 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
          {campaignData.campaigns.length === 0 && <button type="button" onClick={createCampaign} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first campaign</button>}
          {campaignData.campaigns.map((entry) => (
            <button
              type="button"
              key={entry.id}
              onClick={() => {
                selectCampaign(entry.id);
                setSelectedNoteId(entry.notes[0]?.id ?? null);
              }}
              className={`w-full rounded-xl border p-3 text-left transition ${entry.id === effectiveCampaignId ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
            >
              <div className="font-bold text-slate-100">{entry.name}</div>
              <div className="mt-1 text-xs text-slate-500">{entry.notes.length} {entry.notes.length === 1 ? 'note' : 'notes'}</div>
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-white/5 pt-5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Hub Name</label>
          <input className={`${inputClass} mt-2 w-full`} value={campaignData.title} onChange={(event) => updateCampaignData({ title: event.target.value })} />
          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Hub Overview</label>
          <textarea className={`${inputClass} mt-2 min-h-28 w-full resize-y`} value={campaignData.notes} onChange={(event) => updateCampaignData({ notes: event.target.value })} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {!campaign && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select a campaign or create a new one.</div>}
        {campaign && (
          <CampaignEditor
            campaign={campaign}
            note={note}
            selectedNoteId={note?.id ?? null}
            onSelectNote={setSelectedNoteId}
            onCreateNote={createNote}
            onUpdateCampaign={(changes) => updateCampaign({ ...campaign, ...changes })}
            onUpdateNote={updateNote}
            onDeleteNote={() => {
              if (!note) return;
              if (window.confirm(`Delete the note “${note.title}”?`)) {
                updateCampaign({ ...campaign, notes: campaign.notes.filter(({ id }) => id !== note.id) });
                setSelectedNoteId(null);
              }
            }}
            onDeleteCampaign={() => {
              if (window.confirm(`Delete ${campaign.name} and all ${campaign.notes.length} nested notes?`)) {
                removeCampaign(campaign.id);
                setSelectedNoteId(null);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

function CampaignEditor({ campaign, note, selectedNoteId, onSelectNote, onCreateNote, onUpdateCampaign, onUpdateNote, onDeleteNote, onDeleteCampaign }: {
  campaign: CampaignRecord;
  note: CampaignNote | null;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onUpdateCampaign: (changes: Partial<CampaignRecord>) => void;
  onUpdateNote: (changes: Partial<CampaignNote>) => void;
  onDeleteNote: () => void;
  onDeleteCampaign: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 grow basis-64">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Campaign Workspace</div>
          <input className="mt-1 w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none focus:text-violet-100 sm:text-4xl" value={campaign.name} onChange={(event) => onUpdateCampaign({ name: event.target.value })} aria-label="Campaign name" />
        </div>
        <button type="button" onClick={onDeleteCampaign} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete Campaign</button>
      </div>

      <div className="grid min-h-[36rem] overflow-hidden rounded-2xl border border-white/8 bg-slate-900/70 md:grid-cols-[17rem_1fr]">
        <aside className="border-b border-white/5 bg-slate-950/35 p-4 md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-violet-300">Notes</h2>
            <button type="button" onClick={onCreateNote} className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-500/10">+ Note</button>
          </div>
          <div className="mt-4 space-y-2">
            {campaign.notes.length === 0 && <button type="button" onClick={onCreateNote} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:text-violet-300">Create a note</button>}
            {campaign.notes.map((entry) => (
              <button
                type="button"
                key={entry.id}
                onClick={() => onSelectNote(entry.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${entry.id === selectedNoteId ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
              >
                <div className="truncate font-bold text-slate-200">{entry.title || 'Untitled Note'}</div>
                <div className="mt-1 truncate text-xs text-slate-600">{entry.body || 'Empty note'}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-5 lg:p-7">
          {!note && <div className="grid h-full place-items-center text-center text-slate-500">Select a note or create a new one.</div>}
          {note && (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4">
                <input className="min-w-0 grow bg-transparent text-2xl font-black text-white outline-none focus:text-violet-100" value={note.title} onChange={(event) => onUpdateNote({ title: event.target.value })} placeholder="Note title" aria-label="Note title" />
                <button type="button" onClick={onDeleteNote} className="rounded-lg px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Delete Note</button>
              </div>
              <textarea className="mt-4 min-h-96 grow resize-none bg-transparent leading-7 text-slate-300 outline-none placeholder:text-slate-700" value={note.body} onChange={(event) => onUpdateNote({ body: event.target.value })} placeholder="Write locations, NPCs, session notes, secrets, treasure, and plans…" aria-label="Note body" />
              <div className="mt-4 text-right text-xs text-slate-600">{note.body.length} characters • saves automatically</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
