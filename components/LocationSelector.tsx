"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import type { LocationInput } from "@/lib/types";

type LocationSelectorProps = {
  value: LocationInput;
  onChange: (location: LocationInput) => void;
};

const presets: LocationInput[] = [
  { name: "Downtown", lat: 34.0522, lng: -118.2437, radiusKm: 3 },
  { name: "Northside", lat: 41.9145, lng: -87.6465, radiusKm: 3 },
  { name: "River District", lat: 29.4241, lng: -98.4936, radiusKm: 4 },
  { name: "Midtown", lat: 40.7549, lng: -73.984, radiusKm: 2.5 },
  { name: "Old Town", lat: 33.4484, lng: -112.074, radiusKm: 3 },
];

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.name === value.name)?.name ?? "custom",
    [value.name],
  );

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Neighborhood Target
      </label>
      <select
        className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
        value={selectedPreset}
        onChange={(event) => {
          const next = presets.find((preset) => preset.name === event.target.value);
          if (next) {
            onChange(next);
          }
        }}
      >
        {presets.map((preset) => (
          <option key={preset.name} value={preset.name}>
            {preset.name}
          </option>
        ))}
        <option value="custom">Custom location</option>
      </select>

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={value.name}
          onChange={(event) =>
            onChange({
              ...value,
              name: event.target.value,
            })
          }
          placeholder="Neighborhood name"
          className="border-slate-700 bg-slate-950 text-slate-100"
        />
        <Input
          type="number"
          step="0.1"
          min="0.5"
          max="50"
          value={value.radiusKm}
          onChange={(event) =>
            onChange({
              ...value,
              radiusKm: Number(event.target.value),
            })
          }
          className="border-slate-700 bg-slate-950 text-slate-100"
        />
        <Input
          type="number"
          step="0.0001"
          min="-90"
          max="90"
          value={value.lat}
          onChange={(event) =>
            onChange({
              ...value,
              lat: Number(event.target.value),
            })
          }
          placeholder="Latitude"
          className="border-slate-700 bg-slate-950 text-slate-100"
        />
        <Input
          type="number"
          step="0.0001"
          min="-180"
          max="180"
          value={value.lng}
          onChange={(event) =>
            onChange({
              ...value,
              lng: Number(event.target.value),
            })
          }
          placeholder="Longitude"
          className="border-slate-700 bg-slate-950 text-slate-100"
        />
      </div>
    </div>
  );
}
