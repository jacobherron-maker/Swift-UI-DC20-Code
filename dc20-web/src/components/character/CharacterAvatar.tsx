import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = 64_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const OUTPUT_ATTEMPTS = [
  { size: 256, quality: 0.8 },
  { size: 256, quality: 0.62 },
  { size: 192, quality: 0.62 },
  { size: 160, quality: 0.55 },
  { size: 128, quality: 0.45 },
];

function characterInitials(name: string): string {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
  return initials || 'PC';
}

function loadImage(file: File): Promise<{ image: HTMLImageElement; objectURL: string }> {
  return new Promise((resolve, reject) => {
    const objectURL = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve({ image, objectURL });
    image.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('That image could not be read. Try a PNG, JPEG, WebP, or GIF file.'));
    };
    image.src = objectURL;
  });
}

async function createAvatarDataURL(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 12 MB.');

  const { image, objectURL } = await loadImage(file);
  try {
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (sourceSize <= 0) throw new Error('That image has no visible dimensions.');
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    let latestResult = '';

    for (const attempt of OUTPUT_ATTEMPTS) {
      const canvas = document.createElement('canvas');
      canvas.width = attempt.size;
      canvas.height = attempt.size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser cannot prepare avatar images.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, attempt.size, attempt.size);
      latestResult = canvas.toDataURL('image/webp', attempt.quality);
      if (latestResult.length <= MAX_AVATAR_DATA_URL_LENGTH) return latestResult;
    }

    if (!latestResult.startsWith('data:image/')) throw new Error('The avatar could not be prepared.');
    throw new Error('That image could not be compressed enough. Try a simpler or smaller image.');
  } finally {
    URL.revokeObjectURL(objectURL);
  }
}

export function CharacterAvatar({ image, name, className = '' }: { image?: string; name: string; className?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-600/35 via-slate-900 to-fuchsia-600/25 shadow-lg shadow-violet-950/30 ${className}`}>
      {image
        ? <img src={image} alt={`${name || 'Character'} avatar`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center text-3xl font-black tracking-wider text-violet-200" aria-label={`${name || 'Character'} has no avatar`}>{characterInitials(name)}</div>}
    </div>
  );
}

export function CharacterAvatarEditor({
  image,
  name,
  onChange,
  className = '',
  compact = false,
}: {
  image?: string;
  name: string;
  onChange: (image?: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const inputID = useId();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsProcessing(true);
    setError('');
    try {
      onChange(await createAvatarDataURL(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The avatar could not be uploaded.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={inputID} className="group relative block cursor-pointer" title={image ? 'Change character avatar' : 'Upload character avatar'}>
        <CharacterAvatar image={image} name={name} className="w-full transition group-hover:border-violet-300/60 group-hover:brightness-75" />
        <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-950/85 px-2 py-1.5 text-center text-xs font-black text-violet-100 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">{isProcessing ? 'Preparing…' : image ? 'Change image' : 'Upload image'}</span>
      </label>
      <input id={inputID} type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isProcessing} onChange={(event) => void upload(event)} className="sr-only" />
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <label htmlFor={inputID} className="cursor-pointer rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-500">{isProcessing ? 'Preparing…' : image ? 'Change' : 'Upload'}</label>
        {image && <button type="button" onClick={() => { setError(''); onChange(undefined); }} className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10">Remove</button>}
      </div>
      {!compact && <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">Centered square crop • optimized for cloud saving</p>}
      {error && <p role="alert" className="mt-2 text-center text-xs leading-4 text-red-300">{error}</p>}
    </div>
  );
}
