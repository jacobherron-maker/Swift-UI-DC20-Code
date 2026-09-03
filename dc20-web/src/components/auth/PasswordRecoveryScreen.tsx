import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function PasswordRecoveryScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setIsWorking(true);
    setError('');
    try {
      const result = await updatePassword(password);
      if (result.error) setError(result.error);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_45%,#020617_100%)] p-5 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-violet-300/15 bg-slate-950/80 p-8 shadow-2xl shadow-violet-950/60">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">DC20 Hub Account</p>
        <h1 className="mt-2 text-3xl font-black">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enter a new password for your account. You’ll return to your cloud-synced hub when it has been updated.</p>
        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-slate-300">New password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400" /></label>
          <label className="block text-sm font-bold text-slate-300">Confirm new password<input type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400" /></label>
          {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          <button type="submit" disabled={isWorking} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 font-black text-white disabled:opacity-50">{isWorking ? 'Updating…' : 'Update Password'}</button>
        </form>
        <button type="button" onClick={() => void signOut()} className="mt-4 w-full text-sm font-semibold text-slate-500 hover:text-slate-300">Cancel and sign out</button>
      </div>
    </main>
  );
}
