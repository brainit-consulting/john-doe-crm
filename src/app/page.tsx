import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/roles";

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Lead pipeline",
    body: "Capture leads (even from a public form), score them, and move them new → contacted → qualified → won, with a “going cold” nudge when one falls quiet.",
  },
  {
    title: "One-click conversion",
    body: "Turn a won lead into a client in a single click. Its whole activity history comes along automatically.",
  },
  {
    title: "Projects & invoices",
    body: "Track each client’s projects through to delivery, then raise invoices with line items, send them, and export a clean PDF.",
  },
  {
    title: "Your morning dashboard",
    body: "Open the app to your funnel by stage, revenue this month, overdue work, and a live feed of everything happening.",
  },
  {
    title: "Talk, don’t type",
    body: "Dictate notes anywhere: fast in-browser speech, with accurate server transcription as an automatic backup.",
  },
  {
    title: "Roles for your team",
    body: "Owner, sales rep, and read-only viewer roles, so the right people see (and do) the right things.",
  },
];

export default async function HomePage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center sm:pt-32">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-brand">
          A DreamForgeWorld demonstration build
        </p>
        <h1 className="mt-4 text-5xl leading-tight tracking-tight sm:text-6xl">
          From first lead to paid invoice, in one calm app.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
          John Doe CRM is a complete, working CRM for small business owners and
          solo entrepreneurs. Capture leads, win them, deliver the work, and get
          paid, with a pipeline dashboard, full activity history, and voice-note
          dictation, all in one fast, uncluttered place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">Get started for free</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl tracking-tight">
          Everything to run lead → client → project → paid
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="text-xl text-brand">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Build your own / DreamForge Academy */}
      <section className="mx-auto mt-8 max-w-5xl px-6 pb-24">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900 sm:p-12">
          <h2 className="text-3xl tracking-tight sm:text-4xl">
            Curious how it was built?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-700 dark:text-neutral-300">
            John Doe CRM isn’t just a demo you click through; it’s a real,
            end-to-end reference build: Next.js 16, a typed Postgres database,
            secure authentication, invoicing with PDF export, and AI voice
            dictation. The same production-grade stack you’d use to ship your own
            SaaS.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-700 dark:text-neutral-300">
            We teach exactly how it’s made, piece by piece, at the DreamForge
            Academy.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a
              href="https://academy.dreamforgeworld.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg">Learn at DreamForge Academy →</Button>
            </a>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Prefer to watch? Subscribe to{" "}
              <a
                href="https://www.youtube.com/@BrainITConsulting"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
              >
                @BrainITConsulting
              </a>{" "}
              on YouTube for the full build-along series.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="font-display text-base text-neutral-700 dark:text-neutral-300">
          John Doe CRM
        </span>{" "}
        a{" "}
        <a
          href="https://dreamforgeworld.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline underline-offset-2 hover:text-brand-hover"
        >
          DreamForgeWorld
        </a>{" "}
        demonstration build.
      </footer>
    </main>
  );
}
