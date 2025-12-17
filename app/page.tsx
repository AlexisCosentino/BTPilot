export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          BTPilot
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Start building a mobile-first field ops app.
        </h1>
        <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
          Clean Next.js App Router scaffold with Tailwind CSS. Ready for auth,
          data, and PWA features as you iterate.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">App Router</h2>
          <p className="mt-2 text-sm text-slate-600">
            Organized under <code className="font-mono">app/</code> for layouts,
            metadata, and server-first routing.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Tailwind</h2>
          <p className="mt-2 text-sm text-slate-600">
            Global styles with sensible defaults and utilities for rapid,
            mobile-first UI work.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">PWA ready</h2>
          <p className="mt-2 text-sm text-slate-600">
            Dependencies in place for manifest/service worker setup when you are
            ready to go offline.
          </p>
        </div>
      </div>
    </section>
  );
}
