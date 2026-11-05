"use client";

import {
  AlertTriangle,
  CalendarClock,
  Clock,
  FileText,
  Loader2,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import type { ScrapeStatus } from "@/lib/news/types";

interface NewsStatusCardProps {
  status: ScrapeStatus | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function formatJakarta(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock;
}) {
  return (
    <div className="rounded-xl border border-[var(--y-border)] bg-[var(--y-bg-elev-2)]/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--y-text-mute)]">
        <Icon size={12} />
        {label}
      </div>
      <div className="truncate text-sm font-bold text-[var(--y-text)]">
        {value}
      </div>
    </div>
  );
}

export function NewsStatusCard({
  status,
  loading,
  error,
  onRetry,
}: NewsStatusCardProps) {
  if (loading) {
    return (
      <div className="y-glass rounded-2xl border border-[var(--y-border)] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(239,68,68,0.12)]">
            <Newspaper size={17} className="text-[var(--y-primary)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--y-text)]">
              Status Berita
            </div>
            <div className="text-[11px] text-[var(--y-text-mute)]">
              Memuat status scraping…
            </div>
          </div>
          <Loader2
            size={16}
            className="ml-auto animate-spin text-[var(--y-primary)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[66px] animate-pulse rounded-xl bg-[var(--y-bg-elev-2)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-[var(--y-danger)]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--y-text)]">
              Status Berita gagal dimuat
            </div>
            <div className="mt-0.5 break-words text-[12px] text-[var(--y-text-dim)]">
              {error}
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[12px] font-semibold text-[var(--y-text-dim)] transition-colors hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
            >
              <RefreshCw size={13} />
              Coba lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  const lastRun = status?.lastRun ?? null;

  return (
    <div className="y-glass rounded-2xl border border-[var(--y-border)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(239,68,68,0.12)]">
            <Newspaper size={17} className="text-[var(--y-primary)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--y-text)]">
              Status Berita
            </div>
            <div className="text-[11px] text-[var(--y-text-mute)]">
              Scraping otomatis setiap hari pukul 06.00 WIB
            </div>
          </div>
        </div>
        <span className="rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#10b981]">
          Otomatis
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Terakhir scraping"
          value={formatJakarta(lastRun?.finished_at ?? lastRun?.started_at)}
          icon={Clock}
        />
        <Metric
          label="Berikutnya"
          value={formatJakarta(status?.nextRunAt)}
          icon={CalendarClock}
        />
        <Metric
          label="Artikel manual"
          value={status?.manualCount ?? 0}
          icon={FileText}
        />
        <Metric
          label="Hasil scraping"
          value={status?.scrapedCount ?? 0}
          icon={Newspaper}
        />
      </div>

      {lastRun?.error && (
        <div className="mt-3 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] p-3 text-[12px] text-[var(--y-text-dim)]">
          <span className="font-semibold text-[var(--y-warn)]">
            Error terakhir:
          </span>{" "}
          {lastRun.error}
        </div>
      )}
    </div>
  );
}
