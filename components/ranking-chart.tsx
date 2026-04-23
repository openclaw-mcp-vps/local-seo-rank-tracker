"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { TrendPoint } from "@/lib/types";

type RankingChartProps = {
  trend: TrendPoint[];
};

function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export function RankingChart({ trend }: RankingChartProps) {
  if (trend.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        Run your first check to generate trend data.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ top: 16, right: 20, left: -10, bottom: 4 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="checkedAt"
            tickFormatter={formatDateLabel}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#334155"
          />
          <YAxis
            yAxisId="rank"
            reversed
            domain={[1, 20]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#334155"
          />
          <YAxis
            yAxisId="visibility"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            stroke="#334155"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px"
            }}
            labelStyle={{ color: "#cbd5e1" }}
          />
          <Legend />
          <Line
            yAxisId="rank"
            type="monotone"
            dataKey="averagePosition"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#22c55e" }}
            name="Avg Position"
          />
          <Line
            yAxisId="visibility"
            type="monotone"
            dataKey="visibilityScore"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#38bdf8" }}
            name="Visibility"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
