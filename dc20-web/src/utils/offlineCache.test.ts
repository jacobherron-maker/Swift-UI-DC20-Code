import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('offline precache', () => {
  it('only references public files that exist', () => {
    const publicDirectory = fileURLToPath(new URL('../../public/', import.meta.url));
    const worker = readFileSync(join(publicDirectory, 'sw.js'), 'utf8');
    const entries = Array.from(worker.matchAll(/^\s*'\/(.+)',?$/gm), ([, path]) => path);
    const missing = entries.filter((path) => !existsSync(join(publicDirectory, path)));
    expect(missing).toEqual([]);
    expect(entries).toContain('favicon.png');
    expect(worker).toContain("const CACHE_NAME = 'dc20-hub-v9';");
  });
});
