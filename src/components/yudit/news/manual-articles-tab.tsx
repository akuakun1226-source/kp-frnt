"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ManualArticleForm } from "@/components/yudit/news/manual-article-form";
import { deleteManualArticle, listManualArticles } from "@/lib/news/api";
import type { ManualArticle, NewsSession } from "@/lib/news/types";

interface ManualArticlesTabProps {
  session: NewsSession | null;
  canWrite: boolean;
  onRequireLogin: () => void;
}

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

export function ManualArticlesTab({
  session,
  canWrite,
  onRequireLogin,
}: ManualArticlesTabProps) {
  const [articles, setArticles] = useState<ManualArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManualArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManualArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = canWrite && Boolean(session);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listManualArticles({
        page,
        pageSize: PAGE_SIZE,
        search,
      });
      setArticles(result.items);
      setTotal(result.total);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Daftar artikel manual gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    if (!canWrite) return;
    if (!session) {
      onRequireLogin();
      return;
    }
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(article: ManualArticle) {
    if (!canEdit) return;
    setEditing(article);
    setFormOpen(true);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const handleSaved = useCallback(() => {
    if (page === 1) {
      void load();
    } else {
      setPage(1);
    }
  }, [load, page]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteManualArticle(deleteTarget.id);
      toast.success("Artikel manual dihapus.");
      setDeleteTarget(null);
      if (articles.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void load();
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Gagal menghapus artikel.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--y-text)]">
            Artikel Manual
          </h2>
          <p className="text-[11px] text-[var(--y-text-mute)]">
            {total} artikel terbit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--y-text-mute)]"
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari judul…"
                className="h-8 w-[190px] border-[var(--y-border)] bg-[var(--y-bg-elev)] pl-8 text-[12px] text-[var(--y-text)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[12px] font-semibold text-[var(--y-text-dim)] transition-colors hover:border-[var(--y-primary)] hover:text-[var(--y-text)]"
            >
              Cari
            </button>
          </form>

          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="y-gradient-brand y-glow-primary inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Tulis Berita
            </button>
          )}
        </div>
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
                Daftar artikel gagal dimuat
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
            Memuat artikel…
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
              Belum ada artikel manual.
            </p>
            <p className="mt-1 text-[11px] text-[var(--y-text-mute)]">
              {search
                ? "Coba kata kunci lain atau hapus filter pencarian."
                : "Artikel manual yang diterbitkan akan tampil di sini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="y-glass overflow-hidden rounded-2xl border border-[var(--y-border)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead className="border-b border-[var(--y-border)] bg-[var(--y-bg-elev-2)]/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--y-text-mute)]">
                <tr>
                  <th className="px-3 py-2.5">Cover</th>
                  <th className="px-3 py-2.5">Judul</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Sumber</th>
                  {canEdit && <th className="px-3 py-2.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-[var(--y-border)]/60 last:border-0 hover:bg-[var(--y-bg-hover)]/40"
                  >
                    <td className="px-3 py-2.5">
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt=""
                          className="h-11 w-16 rounded-md border border-[var(--y-border)] object-cover"
                        />
                      ) : (
                        <div className="grid h-11 w-16 place-items-center rounded-md border border-[var(--y-border)] bg-[var(--y-bg-elev-2)]">
                          <Newspaper
                            size={16}
                            className="text-[var(--y-text-mute)]"
                          />
                        </div>
                      )}
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5">
                      <div className="truncate font-semibold text-[var(--y-text)]">
                        {article.title}
                      </div>
                      <div className="truncate text-[11px] text-[var(--y-text-mute)]">
                        {article.summary}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(article.categories ?? []).slice(0, 2).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-[var(--y-bg-elev-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--y-text-dim)]"
                          >
                            {item}
                          </span>
                        ))}
                        {(article.categories?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-[var(--y-text-mute)]">
                            +{(article.categories?.length ?? 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--y-text-dim)]">
                      {formatDate(article.published_at)}
                    </td>
                    <td className="max-w-[160px] px-3 py-2.5">
                      {article.source_url ? (
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-[var(--y-text-dim)] hover:text-[var(--y-primary)]"
                          title={article.source_url}
                        >
                          {article.source_name}
                        </a>
                      ) : (
                        <span className="block truncate text-[var(--y-text-dim)]">
                          {article.source_name}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Edit artikel"
                            onClick={() => openEdit(article)}
                            className="grid h-7 w-7 place-items-center rounded-md text-[var(--y-text-dim)] hover:bg-[var(--y-bg-hover)] hover:text-[var(--y-primary)]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Hapus artikel"
                            onClick={() => setDeleteTarget(article)}
                            className="grid h-7 w-7 place-items-center rounded-md text-[var(--y-text-dim)] hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--y-danger)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
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

      <ManualArticleForm
        open={formOpen}
        article={editing}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="y-glass-strong border-[var(--y-border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--y-text)]">
              Hapus artikel manual?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--y-text-dim)]">
              Artikel “{deleteTarget?.title}” akan dihapus permanen dari Berita.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-[var(--y-border)] bg-[var(--y-bg-elev)] text-[var(--y-text-dim)] hover:bg-[var(--y-bg-hover)] hover:text-[var(--y-text)]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-[var(--y-danger)] text-white hover:bg-[#dc2626]"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
