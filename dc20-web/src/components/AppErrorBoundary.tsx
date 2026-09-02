import React from 'react';

interface ErrorBoundaryState {
  failed: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100"><section className="max-w-xl rounded-3xl border border-violet-400/20 bg-slate-900 p-8 text-center shadow-2xl"><p className="text-4xl">✦</p><h1 className="mt-4 text-3xl font-black">DC20 Hub needs a fresh start</h1><p className="mt-3 leading-7 text-slate-400">Your saved campaigns remain in this browser. Reload the app to recover from the unexpected display error.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-500">Reload DC20 Hub</button></section></main>;
  }
}

export default AppErrorBoundary;
