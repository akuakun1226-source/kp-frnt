"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualArticlesTab } from "@/components/yudit/news/manual-articles-tab";
import { NewsLoginDialog } from "@/components/yudit/news/news-login-dialog";
import { NewsStatusCard } from "@/components/yudit/news/news-status-card";
import { ScrapedArticlesTab } from "@/components/yudit/news/scraped-articles-tab";
import { getScrapeStatus, signOutNews } from "@/lib/news/api";
import type { NewsSession, ScrapeStatus } from "@/lib/news/types";
import { useNewsSession } from "@/lib/news/use-news-session";
import { canManageWorkspace, useYudit } from "@/lib/yudit/store";

export function NewsView() {
  const user = useYudit((state) => state.user);
  const canWrite = canManageWorkspace(user);
  const { session, loading: sessionLoading, refresh } = useNewsSession();
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

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

  const handleSignedIn = useCallback(
    (_session: NewsSession) => {
      void refresh();
    },
    [refresh],
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOutNews();
      toast.success("Keluar dari Berita.");
    } catch {
      toast.error("Gagal keluar dari Berita.");
    } finally {
      await refresh();
    }
  }, [refresh]);

  return (
    <div className="y-anim-fade">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--y-text)]">
            Berita DPRD
          </h1>
          <p className="text-[13px] text-[var(--y-text-dim)]">
            Kelola artikel manual dan pantau hasil scraping harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessionLoading ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--y-text-mute)]">
              <Loader2 size={13} className="animate-spin" />
              Memeriksa sesi…
            </span>
          ) : session ? (
            <>
              <span className="hidden text-[11px] text-[var(--y-text-mute)] sm:inline">
                {session.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[13px] font-semibold text-[var(--y-text-dim)] transition-all hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
              >
                <LogOut size={15} />
                Keluar dari Berita
              </button>
            </>
          ) : canWrite ? (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="y-gradient-brand y-glow-primary inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
            >
              <LogIn size={15} />
              Masuk untuk menulis
            </button>
          ) : null}
        </div>
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
          <ManualArticlesTab
            session={session}
            canWrite={canWrite}
            onRequireLogin={() => setLoginOpen(true)}
          />
        </TabsContent>

        <TabsContent value="scraped">
          <ScrapedArticlesTab />
        </TabsContent>
      </Tabs>

      <NewsLoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSignedIn={handleSignedIn}
      />
    </div>
  );
}
