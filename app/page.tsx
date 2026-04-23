import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const faqItems = [
  {
    question: "Does this only track one city?",
    answer:
      "No. You can track the same keyword across multiple neighborhoods, ZIP codes, and nearby cities so you can see where you are losing visibility."
  },
  {
    question: "How often are rankings updated?",
    answer:
      "You can trigger checks manually any time, and the built-in cron endpoint is designed for automated weekly checks and report emails."
  },
  {
    question: "Do I need technical SEO knowledge to use it?",
    answer:
      "No. The dashboard highlights your current position, your biggest competitor per keyword, and where ranking gaps are widest so you can act quickly."
  },
  {
    question: "Can agencies use this for multiple clients?",
    answer:
      "Yes. Agencies can create one account per client mailbox and run neighborhood-level tracking with a predictable per-client price."
  }
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
              Local SEO Rank Tracker
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
              Track local search rankings for small businesses
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Monitor how your Google Business Profile performs for high-intent local keywords in every neighborhood you serve.
              Spot exactly which competitors outrank you and get weekly reports you can turn into action.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
                className={cn(buttonVariants({ size: "lg" }), "text-center")}
              >
                Start Tracking for $15/mo
              </a>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "text-center"
                )}
              >
                View Dashboard
              </Link>
            </div>

            <div className="mt-7 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                Neighborhood-level keyword tracking
              </p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                Competitor gap analysis by keyword
              </p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                Weekly email reports for owners and teams
              </p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                Built for small business budgets
              </p>
            </div>
          </div>

          <Card className="border-emerald-500/25 bg-slate-950/80">
            <CardHeader>
              <CardTitle>Unlock your dashboard after checkout</CardTitle>
              <CardDescription>
                Stripe checkout grants access. Enter the purchase email to create your secure access cookie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/api/auth/unlock" method="POST" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="unlock-email">
                    Purchase Email
                  </label>
                  <Input id="unlock-email" name="email" type="email" required />
                </div>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  Unlock Dashboard Access
                </button>
              </form>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                If checkout is still processing, wait up to one minute for webhook confirmation and submit again.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold sm:text-3xl">Why local businesses lose "near me" traffic</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Blind spots by neighborhood</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Ranking tools often report one city-level position, hiding the neighborhood-specific gaps that decide who gets calls.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competitors move fast</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              One competitor with fresh reviews and better local relevance can outrank you in priority service areas within days.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enterprise pricing blocks SMBs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Most local rank tracking products start around $100 per month, which is difficult for owner-operators and small agencies.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold sm:text-3xl">Built to close ranking gaps quickly</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Track what matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Save your target business profile and monitor service keywords by neighborhood.</p>
              <p>See your current rank position alongside the top competitors for each search.</p>
              <p>Visual trend charts reveal whether your updates are improving visibility week over week.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Act on clear recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Weekly reports summarize where you dropped and who replaced you in each neighborhood.</p>
              <p>Use competitor snapshots to decide where to improve GBP content, location pages, and review velocity.</p>
              <p>Run manual checks after changes so you can verify impact before the next reporting cycle.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-emerald-500/30 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-2xl">Simple pricing for local growth teams</CardTitle>
            <CardDescription>One plan, full feature access, no setup fees.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-between gap-6 rounded-xl border border-slate-800 bg-slate-900/70 p-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-4xl font-semibold text-emerald-300">$15/mo</p>
                <p className="mt-2 text-sm text-slate-300">
                  Includes local rank tracking, competitor analysis, trend charts, and weekly email reports.
                </p>
              </div>
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
                className={cn(buttonVariants({ size: "lg" }), "text-center")}
              >
                Buy Monthly Access
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold sm:text-3xl">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-slate-300">
                {item.answer}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
