export function downloadHubBackup(contents: string) {
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `DC20Hub-Backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
