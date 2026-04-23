"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function UnlockAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error || "Unable to unlock access right now.");
        return;
      }

      setMessage("Access unlocked. Redirecting to your dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Network issue while unlocking access. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <CardTitle className="text-white">Already purchased?</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUnlock} className="space-y-3">
          <p className="text-sm text-slate-300">
            Enter your checkout email to unlock the dashboard on this device.
          </p>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@business.com"
            required
            className="border-slate-700 bg-slate-950 text-slate-100"
          />
          <Button
            type="submit"
            className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            disabled={loading}
          >
            {loading ? "Unlocking..." : "Unlock Dashboard"}
          </Button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
