"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listScrapedArticles } from "@/lib/news/api";
import type { ScrapedArticle } from "@/lib/news/types";

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ScrapedArticlesTab() {
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScrapedArticle | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listScrapedArticles({
        page,
        pageSize: PAGE_SIZE,
        search,
        source,
      });
      setArticles(result.items);
      setTotal(result.total);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Hasil scraping gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, source]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setSource(sourceInput.trim());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--y-text)]">
            Hasil Scraping
          </h2>
          <p className="text-[11px] text-[var(--y-text-mute)]">
            {total} artikel dari scraping otomatis
          </p>
        </div>

        <form
          onSubmit={handleFilter}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--y-text-mute)]"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari judul/ringkasan…"
              className="h-8 w-[190px] border-[var(--y-border)] bg-[var(--y-bg-elev)] pl-8 text-[12px] text-[var(--y-text)]"
            />
          </div>
          <Input
            value={sourceInput}
            onChange={(event) => setSourceInput(event.target.value)}
            placeholder="Filter sumber"
            className="h-8 w-[130px] border-[var(--y-border)] bg-[var(--y-bg-elev)] text-[12px] text-[var(--y-text)]"
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[12px] font-semibold text-[var(--y-text-dim)] transition-colors hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
          >
            Cari
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-[var(--y-danger)]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[var(--y-text)]">
                Hasil scraping gagal dimuat
              </div>
              <p className="mt-0.5 break-words text-[12px] text-[var(--y-text-dim)]">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[12px] font-semibold text-[var(--y-text-dim)] hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
            >
              <RefreshCw size={13} />
              Coba lagi
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="y-glass grid min-h-[180px] place-items-center rounded-2xl border border-[var(--y-border)]">
          <span className="inline-flex items-center gap-2 text-[12px] text-[var(--y-text-mute)]">
            <Loader2 size={15} className="animate-spin" />
            Memuat hasil scraping…
          </span>
        </div>
      ) : articles.length === 0 ? (
        <div className="y-glass grid min-h-[180px] place-items-center rounded-2xl border border-[var(--y-border)] p-6 text-center">
          <div>
            <Newspaper
              size={28}
              className="mx-auto mb-2 text-[var(--y-text-mute)]"
            />
            <p className="text-[13px] font-semibold text-[var(--y-text)]">
              Belum ada hasil scraping.
            </p>
            <p className="mt-1 text-[11px] text-[var(--y-text-mute)]">
              {search || source
                ? "Coba ubah kata kunci atau filter sumber."
                : "Hasil scraping harian akan tampil di sini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="y-glass overflow-hidden rounded-2xl border border-[var(--y-border)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead className="border-b border-[var(--y-border)] bg-[var(--y-bg-elev-2)]/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--y-text-mute)]">
                <tr>
                  <th className="px-3 py-2.5">Judul</th>
                  <th className="px-3 py-2.5">Sumber</th>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Waktu scrape</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-[var(--y-border)]/60 last:border-0 hover:bg-[var(--y-bg-hover)]/40"
                  >
                    <td className="max-w-[360px] px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setDetail(article)}
                        className="block max-w-full truncate text-left font-semibold text-[var(--y-text)] hover:text-[var(--y-primary)]"
                        title={article.title}
                      >
                        {article.title}
                      </button>
                      {article.summary && (
                        <div className="truncate text-[11px] text-[var(--y-text-mute)]">
                          {article.summary}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[150px] truncate px-3 py-2.5 text-[var(--y-text-dim)]">
                      {article.source ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--y-text-dim)]">
                      {formatDate(article.published_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--y-text-dim)]">
                      {formatDateTime(article.scraped_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--y-border)] px-3 py-2.5">
            <span className="text-[11px] text-[var(--y-text-mute)]">
              Menampilkan {articles.length} dari {total} artikel
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex h-7 items-center rounded-md border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-2.5 text-[11px] font-semibold text-[var(--y-text-dim)] hover:border-[var(--y-primary)] hover:text-[var(--y-text)] disabled:pointer-events-none disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-[11px] text-[var(--y-text-mute)]">
                Halaman {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={page >= totalPages || loading}
                className="inline-flex h-7 items-center rounded-md border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-2.5 text-[11px] font-semibold text-[var(--y-text-dim)] hover:border-[var(--y-primary)] hover:text-[var(--y-text)] disabled:pointer-events-none disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="y-glass-strong max-h-[88vh] overflow-y-auto border-[var(--y-border)] sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="pr-8 text-[var(--y-text)]">
              {detail?.title}
            </DialogTitle>
            <DialogDescription className="text-[var(--y-text-dim)]">
              {detail?.source ?? "Sumber tidak tersedia"}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              {detail.image && (
                <img
                  src={detail.image}
                  alt=""
                  className="max-h-[260px] w-full rounded-xl border border-[var(--y-border)] object-cover"
                />
              )}

              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev-2)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--y-text-mute)]">
                    Tanggal
                  </div>
                  <div className="mt-0.5 text-[var(--y-text)]">
                    {formatDate(detail.published_at)}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev-2)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--y-text-mute)]">
                    Waktu scrape
                  </div>
                  <div className="mt-0.5 text-[var(--y-text)]">
                    {formatDateTime(detail.scraped_at)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--y-border)] bg-[var(--y-bg-elev-2)] p-4 text-[13px] leading-relaxed text-[var(--y-text-dim)]">
                {detail.summary || "Ringkasan tidak tersedia."}
              </div>
            </div>
          )}

          <DialogFooter>
            {detail?.url && (
              <a
                href={detail.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-4 text-[13px] font-semibold text-[var(--y-text-dim)] hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
              >
                <ExternalLink size={14} />
                Buka sumber
              </a>
            )}
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="y-gradient-brand y-glow-primary inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
