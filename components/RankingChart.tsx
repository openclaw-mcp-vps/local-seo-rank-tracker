"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RankingHistoryPoint } from "@/lib/types";

type RankingChartProps = {
  history: RankingHistoryPoint[];
};

export function RankingChart({ history }: RankingChartProps) {
  const chartData = useMemo(
    () =>
      history.map((point) => ({
        day: new Date(point.checkedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        rank: point.rank,
      })),
    [history],
  );

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
        No ranking history yet. Run your first check to populate trend data.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#253044" />
          <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis
            reversed
            allowDecimals={false}
            domain={[1, 20]}
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `#${value}`}
          />
          <Tooltip
            formatter={(value) => [`#${value}`, "Rank"]}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #253044",
              backgroundColor: "#111827",
              color: "#e2e8f0",
            }}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{ stroke: "#22d3ee", strokeWidth: 2, fill: "#0d1117" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
