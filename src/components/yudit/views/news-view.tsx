"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsStatusCard } from "@/components/yudit/news/news-status-card";
import { getScrapeStatus } from "@/lib/news/api";
import type { ScrapeStatus } from "@/lib/news/types";

export function NewsView() {
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getScrapeStatus());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Status Berita gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="y-anim-fade">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--y-text)]">Berita DPRD</h1>
        <p className="text-[13px] text-[var(--y-text-dim)]">
          Kelola artikel manual dan pantau hasil scraping harian.
        </p>
      </div>

      <NewsStatusCard
        status={status}
        loading={loading}
        error={error}
        onRetry={load}
      />

      <Tabs defaultValue="manual" className="mt-5 gap-4">
        <TabsList className="w-full justify-start bg-[var(--y-bg-elev)]">
          <TabsTrigger
            value="manual"
            className="text-[var(--y-text-dim)] data-[state=active]:bg-[var(--y-bg-elev-2)] data-[state=active]:text-[var(--y-text)]"
          >
            Artikel Manual
          </TabsTrigger>
          <TabsTrigger
            value="scraped"
            className="text-[var(--y-text-dim)] data-[state=active]:bg-[var(--y-bg-elev-2)] data-[state=active]:text-[var(--y-text)]"
          >
            Hasil Scraping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <div className="y-glass rounded-2xl border border-[var(--y-border)] p-6 text-[13px] text-[var(--y-text-mute)]">
            Daftar artikel manual akan tampil di sini.
          </div>
        </TabsContent>

        <TabsContent value="scraped">
          <div className="y-glass rounded-2xl border border-[var(--y-border)] p-6 text-[13px] text-[var(--y-text-mute)]">
            Daftar hasil scraping akan tampil di sini.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
