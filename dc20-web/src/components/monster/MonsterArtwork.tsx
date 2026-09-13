import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_DATA_LENGTH = 76_000;

function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    image.src = url;
  });
}

async function prepareImage(file: File, shape: 'token' | 'artwork'): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 12 MB.');
  const { image, url } = await loadImage(file);
  try {
    const targetRatio = shape === 'token' ? 1 : 16 / 9;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    if (sourceRatio > targetRatio) sourceWidth = sourceHeight * targetRatio;
    else sourceHeight = sourceWidth / targetRatio;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    const attempts = shape === 'token'
      ? [{ width: 256, height: 256, quality: 0.78 }, { width: 192, height: 192, quality: 0.58 }, { width: 128, height: 128, quality: 0.48 }]
      : [{ width: 720, height: 405, quality: 0.7 }, { width: 560, height: 315, quality: 0.55 }, { width: 400, height: 225, quality: 0.46 }];
    for (const attempt of attempts) {
      const canvas = document.createElement('canvas');
      canvas.width = attempt.width;
      canvas.height = attempt.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser cannot prepare images.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, attempt.width, attempt.height);
      const result = canvas.toDataURL('image/webp', attempt.quality);
      if (result.length <= MAX_DATA_LENGTH) return result;
    }
    throw new Error('The image could not be compressed enough. Try a simpler image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'M';
}

export function MonsterToken({ image, name, className = '' }: { image?: string; name: string; className?: string }) {
  return <div className={`grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full border-2 border-violet-400/30 bg-gradient-to-br from-violet-900 to-slate-950 font-black text-violet-100 shadow-lg ${className}`}>
    {image ? <img src={image} alt={`${name} token`} className="h-full w-full object-cover" /> : <span>{initials(name)}</span>}
  </div>;
}

export function MonsterImageEditor({ shape, image, name, onChange }: { shape: 'token' | 'artwork'; image?: string; name: string; onChange: (image?: string) => void }) {
  const inputID = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try { onChange(await prepareImage(file, shape)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The image could not be prepared.'); }
    finally { setBusy(false); }
  };
  return <div>
    <div className={shape === 'token' ? 'mx-auto w-32' : ''}>
      {shape === 'token'
        ? <MonsterToken image={image} name={name} className="w-full text-3xl" />
        : <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950">{image ? <img src={image} alt={`${name} artwork`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-slate-600">No artwork</div>}</div>}
    </div>
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      <label htmlFor={inputID} className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-500">{busy ? 'Preparing…' : image ? 'Change' : 'Upload'}</label>
      {image && <button type="button" onClick={() => onChange(undefined)} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Remove</button>}
    </div>
    <input id={inputID} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => void upload(event)} className="sr-only" />
    {error && <p role="alert" className="mt-2 text-center text-xs text-red-300">{error}</p>}
  </div>;
}
