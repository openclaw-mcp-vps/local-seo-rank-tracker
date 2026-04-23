import Link from "next/link";
import { BarChart3, LineChart, MapPin, Timer, Trophy } from "lucide-react";

import { UnlockAccessForm } from "@/components/UnlockAccessForm";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

const faqs = [
  {
    question: "How does Local SEO Rank Tracker check my rankings?",
    answer:
      "It runs Google Maps searches using your target keywords and neighborhood coordinates, then captures where your business appears versus nearby competitors.",
  },
  {
    question: "Can I track multiple service areas?",
    answer:
      "Yes. Add separate neighborhoods like Downtown, Northside, and River District to compare visibility across each local market.",
  },
  {
    question: "What does the weekly report include?",
    answer:
      "Each report highlights keyword movement, top competitors gaining ground, and specific opportunities to improve your map-pack position.",
  },
  {
    question: "Is this only for agencies?",
    answer:
      "No. Solo business owners can use it directly, while agencies can monitor multiple client locations with one workflow.",
  },
];

type HomePageProps = {
  searchParams: Promise<{
    paywall?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const showPaywallNotice = params.paywall === "locked";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-16 pt-8 sm:px-8 lg:px-10">
      {showPaywallNotice ? (
        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Your dashboard is paywalled. Complete checkout, then unlock access with your purchase
          email.
        </div>
      ) : null}

      <header className="rounded-2xl border border-slate-800/90 bg-slate-950/60 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-cyan-300" />
            <p className="text-sm font-semibold tracking-wide text-cyan-200">
              Local SEO Rank Tracker
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white">
              Dashboard
            </Link>
            <a
              href={stripePaymentLink}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
              )}
            >
              Buy Access
            </a>
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge className="border border-cyan-300/35 bg-cyan-400/10 text-cyan-200">
            Built for local businesses and agencies
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Track local search rankings for small businesses
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-300">
            Know exactly where you rank in Google Maps for every neighborhood you serve.
            Spot which competitors are taking your clicks in "near me" searches, then act
            before you lose more customers.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={stripePaymentLink}
              className={cn(buttonVariants(), "bg-cyan-300 text-slate-950 hover:bg-cyan-200")}
            >
              Start for $15/month
            </a>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-slate-700 bg-slate-900/50",
              )}
            >
              Open Dashboard
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-400">
            <p className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-300" /> Weekly competitor analysis
            </p>
            <p className="flex items-center gap-2">
              <LineChart className="size-4 text-cyan-300" /> Neighborhood-by-neighborhood rank tracking
            </p>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-xl text-white">What you can monitor today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-1 font-medium text-slate-100">Keyword: "emergency plumber near me"</p>
              <p>Downtown: Rank #4 (up 3 spots this week)</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-1 font-medium text-slate-100">Keyword: "roof repair in eastside"</p>
              <p>Eastside: Rank #9 (competitor jumped from #6 to #3)</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-1 font-medium text-slate-100">Keyword: "best family dentist"</p>
              <p>North Hills: Rank #2 (holding top 3 for 4 weeks)</p>
            </div>
            <p className="pt-1 text-slate-400">
              Every report includes ranking trends, competitor movement, and practical local SEO
              actions to win more map-pack clicks.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="problem" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">The problem</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            Local businesses lose calls every week because they cannot see where they rank in
            each neighborhood customers search from.
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">Why current tools fail</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            Enterprise SEO suites are bloated and expensive. Most charge $100+ per month for
            features a single-location business never touches.
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-white">The outcome</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            You get focused, local ranking intelligence at a practical price, so you can act on
            real competitor moves instead of guessing.
          </CardContent>
        </Card>
      </section>

      <section id="solution" className="space-y-5">
        <h2 className="text-2xl font-semibold text-white">A focused local SEO workflow</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="size-4 text-cyan-300" /> Location checks
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Track rankings by neighborhood coordinates, not just one city-wide average.
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="size-4 text-cyan-300" /> Trend visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Review historical rank movement and identify when visibility improves or slips.
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Timer className="size-4 text-cyan-300" /> Weekly reporting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Get scheduled competitor analysis delivered by email so you never miss local market
              changes.
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="text-white">Simple pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold text-white">
              $15<span className="text-base font-normal text-slate-400"> / month</span>
            </p>
            <ul className="space-y-2 text-slate-300">
              <li>- Unlimited neighborhood checks for your tracked keywords</li>
              <li>- Competitor table with ratings and review counts</li>
              <li>- Weekly email reports with movement highlights</li>
              <li>- Dashboard access behind secure purchase cookie</li>
            </ul>
            <a
              href={stripePaymentLink}
              className={cn(
                buttonVariants(),
                "w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200",
              )}
            >
              Buy Monthly Access
            </a>
          </CardContent>
        </Card>

        <UnlockAccessForm />
      </section>

      <section id="faq" className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-base text-white">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
