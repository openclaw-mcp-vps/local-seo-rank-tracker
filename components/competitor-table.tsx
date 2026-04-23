import type { RankingResultRecord } from "@/lib/types";

type CompetitorTableProps = {
  rows: RankingResultRecord[];
};

function positionDelta(targetPosition: number | null, competitorPosition: number | undefined) {
  if (!targetPosition || !competitorPosition) {
    return "-";
  }

  const delta = targetPosition - competitorPosition;
  if (delta === 0) {
    return "Tie";
  }

  if (delta > 0) {
    return `-${delta}`;
  }

  return `+${Math.abs(delta)}`;
}

export function CompetitorTable({ rows }: CompetitorTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Competitor analysis appears after your first completed ranking check.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/80 text-slate-300">
          <tr>
            <th className="px-4 py-3">Keyword</th>
            <th className="px-4 py-3">Neighborhood</th>
            <th className="px-4 py-3">Your Position</th>
            <th className="px-4 py-3">Top Competitor</th>
            <th className="px-4 py-3">Gap</th>
            <th className="px-4 py-3">Competitor Set</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-200">
          {rows.map((row) => {
            const topCompetitor = row.competitors.find((entry) => !entry.isTarget);

            return (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-4 font-medium">{row.keyword}</td>
                <td className="px-4 py-4">{row.neighborhood}</td>
                <td className="px-4 py-4">
                  {row.targetPosition ? `#${row.targetPosition}` : "Not in top results"}
                </td>
                <td className="px-4 py-4">
                  {topCompetitor ? `${topCompetitor.name} (#${topCompetitor.position})` : "No data"}
                </td>
                <td className="px-4 py-4">
                  {positionDelta(row.targetPosition, topCompetitor?.position)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {row.competitors.slice(0, 5).map((competitor) => (
                      <span
                        key={`${row.id}-${competitor.position}-${competitor.name}`}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          competitor.isTarget
                            ? "border-emerald-500 text-emerald-300"
                            : "border-slate-700 text-slate-300"
                        }`}
                      >
                        {competitor.position}. {competitor.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
