"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EngineHealth = {
  status: string;
  service: string;
  version: string;
  python_version: string;
  timestamp: string;
};

type HealthResult =
  | { reachable: true; engine: EngineHealth }
  | { reachable: false; error: string };

type Status = "loading" | "up" | "down";

function StatusDot({ status }: { status: Status }) {
  const color =
    status === "up"
      ? "bg-emerald-500"
      : status === "down"
        ? "bg-red-500"
        : "bg-zinc-500";
  return (
    <span className="relative flex h-3 w-3">
      {status === "up" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${color}`} />
    </span>
  );
}

function ServiceCard({
  name,
  status,
  detail,
}: {
  name: string;
  status: Status;
  detail: React.ReactNode;
}) {
  const label =
    status === "up" ? "Online" : status === "down" ? "Offline" : "Checking…";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">{name}</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <StatusDot status={status} />
          {label}
        </div>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-zinc-400">{detail}</div>
    </div>
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [engineStatus, setEngineStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/engine/health")
      .then((r) => r.json() as Promise<HealthResult>)
      .then((data) => {
        if (cancelled) return;
        setHealth(data);
        setEngineStatus(data.reachable ? "up" : "down");
      })
      .catch(() => {
        if (cancelled) return;
        setEngineStatus("down");
        setHealth({ reachable: false, error: "Request failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-100">
      <main className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Service status</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Web app and Price &amp; News Engine health.
          </p>
        </div>

        <div className="grid gap-4">
          <ServiceCard
            name="Next.js web app"
            status="up"
            detail="Rendering this page, so the frontend is running."
          />

          <ServiceCard
            name="Price & News Engine (FastAPI)"
            status={engineStatus}
            detail={
              engineStatus === "loading" ? (
                "Pinging /api/engine/health…"
              ) : health?.reachable ? (
                <ul className="space-y-1">
                  <li>
                    Version:{" "}
                    <span className="text-zinc-200">
                      {health.engine.version}
                    </span>
                  </li>
                  <li>
                    Python:{" "}
                    <span className="text-zinc-200">
                      {health.engine.python_version}
                    </span>
                  </li>
                  <li>
                    Reported at:{" "}
                    <span className="text-zinc-200">
                      {health.engine.timestamp}
                    </span>
                  </li>
                </ul>
              ) : (
                <span className="text-red-400">
                  {health && !health.reachable ? health.error : "Unreachable"}.
                  Start it with{" "}
                  <code className="rounded bg-black/40 px-1 py-0.5">
                    uvicorn main:app --reload --port 8000
                  </code>{" "}
                  in <code>price-engine/</code>.
                </span>
              )
            }
          />
        </div>

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">
            ← Back home
          </Link>
        </p>
      </main>
    </div>
  );
}
