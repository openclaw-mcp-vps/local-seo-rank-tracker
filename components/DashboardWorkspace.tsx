"use client";

import { useEffect, useMemo, useState } from "react";

import { CompetitorTable } from "@/components/CompetitorTable";
import { LocationSelector } from "@/components/LocationSelector";
import { RankingChart } from "@/components/RankingChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DashboardKeyword, LocationInput } from "@/lib/types";

const defaultLocation: LocationInput = {
  name: "Downtown",
  lat: 34.0522,
  lng: -118.2437,
  radiusKm: 3,
};

type DashboardWorkspaceProps = {
  email: string;
};

type RankingsApiResponse = {
  email: string;
  keywords: DashboardKeyword[];
  run?:
    | {
        status: "completed";
      }
    | {
        status: "queued";
        jobId: string;
      };
  error?: string;
};

export function DashboardWorkspace({ email }: DashboardWorkspaceProps) {
  const [keywords, setKeywords] = useState<DashboardKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [keywordInput, setKeywordInput] = useState("");
  const [trackedBusiness, setTrackedBusiness] = useState("");
  const [location, setLocation] = useState<LocationInput>(defaultLocation);

  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(null);

  const selectedKeyword = useMemo(() => {
    if (!keywords.length) {
      return null;
    }

    return (
      keywords.find((keyword) => keyword.keywordId === selectedKeywordId) ??
      keywords[0]
    );
  }, [keywords, selectedKeywordId]);

  async function loadRankings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rankings", {
        cache: "no-store",
      });
      const data = (await response.json()) as RankingsApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to load ranking data.");
      }

      setKeywords(data.keywords);
      setSelectedKeywordId((previous) => previous ?? data.keywords[0]?.keywordId ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected dashboard error.");
    } finally {
      setLoading(false);
    }
  }

  async function runRankingCheck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunningCheck(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/rankings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: keywordInput,
          trackedBusiness,
          location,
        }),
      });

      const data = (await response.json()) as RankingsApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "Ranking check failed.");
      }

      setKeywords(data.keywords);
      setSelectedKeywordId(data.keywords[0]?.keywordId ?? null);

      if (data.run?.status === "queued") {
        setStatus(`Check queued as job ${data.run.jobId}. Refresh in a minute for results.`);
      } else {
        setStatus("Ranking check completed and saved.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run ranking check.");
    } finally {
      setRunningCheck(false);
    }
  }

  useEffect(() => {
    void loadRankings();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Run a local ranking check</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={runRankingCheck} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Keyword to track
                </label>
                <Input
                  required
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="best family dentist near me"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Your business name
                </label>
                <Input
                  required
                  value={trackedBusiness}
                  onChange={(event) => setTrackedBusiness(event.target.value)}
                  placeholder="Bright Smile Dental"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
            </div>

            <LocationSelector value={location} onChange={setLocation} />

            <Button
              type="submit"
              disabled={runningCheck}
              className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            >
              {runningCheck ? "Checking rankings..." : "Run Ranking Check"}
            </Button>
          </form>

          {status ? <p className="mt-3 text-sm text-cyan-200">{status}</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Tracked keyword performance</h2>
          <Badge className="border border-slate-700 bg-slate-900 text-slate-200">{email}</Badge>
        </div>

        {loading ? (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardContent className="py-10 text-center text-slate-300">
              Loading ranking history...
            </CardContent>
          </Card>
        ) : null}

        {!loading && keywords.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardContent className="py-10 text-center text-slate-300">
              No keywords tracked yet. Run your first check to build your local SEO baseline.
            </CardContent>
          </Card>
        ) : null}

        {!loading && keywords.length > 0 ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {keywords.map((keyword) => {
                const rankDelta =
                  keyword.latestRank && keyword.previousRank
                    ? keyword.previousRank - keyword.latestRank
                    : null;

                return (
                  <button
                    type="button"
                    key={keyword.keywordId}
                    onClick={() => setSelectedKeywordId(keyword.keywordId)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedKeyword?.keywordId === keyword.keywordId
                        ? "border-cyan-400/60 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-sm text-slate-200">{keyword.keyword}</p>
                    <p className="mt-1 text-xs text-slate-400">{keyword.location.name}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {keyword.latestRank ? `#${keyword.latestRank}` : "Not ranked"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {rankDelta === null
                        ? "Awaiting trend data"
                        : rankDelta > 0
                          ? `${rankDelta} spots gained`
                          : `${Math.abs(rankDelta)} spots dropped`}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedKeyword ? (
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">
                    Ranking trend: {selectedKeyword.keyword} ({selectedKeyword.location.name})
                  </h3>
                  <RankingChart history={selectedKeyword.history} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Current competitors</h3>
                  <CompetitorTable
                    competitors={selectedKeyword.competitors}
                    trackedBusiness={selectedKeyword.trackedBusiness}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
