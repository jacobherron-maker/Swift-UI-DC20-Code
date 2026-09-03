import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (operation: () => Promise<{ error?: string; message?: string }>) => {
    setIsWorking(true);
    setError('');
    setMessage('');
    try {
      const result = await operation();
      if (result.error) setError(result.error);
      if (result.message) setMessage(result.message);
    } finally {
      setIsWorking(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => mode === 'signin'
      ? signInWithEmail(email.trim(), password)
      : signUpWithEmail(email.trim(), password));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_45%,#020617_100%)] p-5 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-violet-300/15 bg-slate-950/80 p-7 shadow-2xl shadow-violet-950/60 backdrop-blur-xl sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl shadow-lg shadow-violet-950">✦</div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-violet-300">DC20 Hub</p>
          <h1 className="mt-2 text-3xl font-black text-white">Your campaigns, everywhere.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Sign in to securely sync characters, monsters, encounters, combats, campaign notes, and preferences across your devices.</p>
        </div>

        <button
          type="button"
          disabled={isWorking}
          onClick={() => void run(signInWithGoogle)}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white px-4 py-3 font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <span className="text-lg font-black text-blue-600">G</span>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-white/10" />or use email<span className="h-px flex-1 bg-white/10" /></div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-900 p-1">
          {(['signin', 'signup'] as AuthMode[]).map((option) => <button key={option} type="button" onClick={() => { setMode(option); setError(''); setMessage(''); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === option ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>{option === 'signin' ? 'Sign In' : 'Create Account'}</button>)}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-bold text-slate-300">Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400" placeholder="you@example.com" /></label>
          <label className="block text-sm font-bold text-slate-300">Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400" placeholder="At least 6 characters" /></label>
          {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div>}
          <button type="submit" disabled={isWorking} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 font-black text-white shadow-lg shadow-violet-950 disabled:opacity-50">{isWorking ? 'Working…' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
        </form>

        {mode === 'signin' && <button type="button" disabled={!email.trim() || isWorking} onClick={() => void run(() => sendPasswordReset(email.trim()))} className="mt-4 w-full text-sm font-semibold text-violet-300 hover:text-violet-200 disabled:opacity-40">Forgot your password?</button>}
        <p className="mt-6 text-center text-xs leading-5 text-slate-600">Your password is handled by the authentication provider. DC20 Hub never stores it in campaign data.</p>
      </div>
    </main>
  );
}
