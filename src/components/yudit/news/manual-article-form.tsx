"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NewsArticleEditor } from "@/components/yudit/news/news-article-editor";
import {
  buildNewsImageUrl,
  createManualArticle,
  updateManualArticle,
  uploadNewsImage,
} from "@/lib/news/api";
import type {
  ManualArticle,
  ManualArticleInput,
} from "@/lib/news/types";
import {
  manualArticleSchema,
  slugify,
  validateImageFile,
} from "@/lib/news/validation";

interface ManualArticleFormProps {
  open: boolean;
  article: ManualArticle | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function makeDefaults(article: ManualArticle | null): ManualArticleInput {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    summary: article?.summary ?? "",
    content: article?.content ?? "",
    source_name: article?.source_name ?? "DPRD Kuningan",
    source_url: article?.source_url ?? "",
    published_at: article?.published_at ?? todayIso(),
    categories: article?.categories ?? [],
    image_path: article?.image_path ?? null,
  };
}

function parseCategories(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-[11px] text-[var(--y-danger)]">{message}</p>
  );
}

type ManualArticleFormValues = z.input<typeof manualArticleSchema>;

export function ManualArticleForm({
  open,
  article,
  onOpenChange,
  onSaved,
}: ManualArticleFormProps) {
  const [categoriesText, setCategoriesText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ManualArticleFormValues, unknown, ManualArticleInput>({
    resolver: zodResolver(manualArticleSchema),
    defaultValues: makeDefaults(article),
  });

  const titleField = form.register("title");
  const imagePath = form.watch("image_path");
  const previewUrl = uploadedPreview ?? buildNewsImageUrl(imagePath ?? null);
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    const defaults = makeDefaults(article);
    form.reset(defaults);
    setCategoriesText(defaults.categories.join(", "));
    setUploadedPreview(null);
    setFileError(null);
    setSubmitError(null);
    setUploading(false);
    setSaving(false);
  }, [open, article, form]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateImageFile(file);
    if (validation) {
      setFileError(validation);
      return;
    }

    setFileError(null);
    setUploading(true);
    try {
      const uploaded = await uploadNewsImage(file);
      form.setValue("image_path", uploaded.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setUploadedPreview(uploaded.url);
    } catch (cause) {
      setFileError(
        cause instanceof Error ? cause.message : "Gagal mengunggah gambar.",
      );
    } finally {
      setUploading(false);
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      if (article) {
        await updateManualArticle(article.id, values);
      } else {
        await createManualArticle(values);
      }
      toast.success(
        article ? "Artikel manual diperbarui." : "Artikel manual dibuat.",
      );
      onSaved();
      onOpenChange(false);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Gagal menyimpan artikel.",
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="y-glass-strong max-h-[92vh] overflow-y-auto border-[var(--y-border)] sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle className="text-[var(--y-text)]">
            {article ? "Edit Artikel Manual" : "Tulis Berita Manual"}
          </DialogTitle>
          <DialogDescription className="text-[var(--y-text-dim)]">
            Artikel manual langsung terbit dan tidak memakai status draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="news-title"
              className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
            >
              Judul
            </label>
            <Input
              id="news-title"
              {...titleField}
              onChange={(event) => {
                titleField.onChange(event);
                if (!article) {
                  form.setValue("slug", slugify(event.target.value), {
                    shouldValidate: true,
                  });
                }
              }}
              placeholder="Judul berita"
              className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
              disabled={saving}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <label
              htmlFor="news-slug"
              className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
            >
              Slug
            </label>
            <Input
              id="news-slug"
              {...form.register("slug")}
              placeholder="judul-berita"
              className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] font-mono text-[12px] text-[var(--y-text)] disabled:opacity-60"
              disabled={Boolean(article) || saving}
            />
            <p className="mt-1 text-[11px] text-[var(--y-text-mute)]">
              {article
                ? "Slug tidak dapat diubah setelah artikel dibuat."
                : "Slug dibuat otomatis dari judul. Huruf kecil, angka, dan tanda hubung."}
            </p>
            <FieldError message={errors.slug?.message} />
          </div>

          <div>
            <label
              htmlFor="news-summary"
              className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
            >
              Ringkasan
            </label>
            <Textarea
              id="news-summary"
              {...form.register("summary")}
              placeholder="Ringkasan singkat berita"
              rows={2}
              className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
              disabled={saving}
            />
            <FieldError message={errors.summary?.message} />
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]">
              Isi Berita
            </span>
            <NewsArticleEditor
              value={form.watch("content")}
              onChange={(html) =>
                form.setValue("content", html, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <FieldError message={errors.content?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="news-categories"
                className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
              >
                Kategori
              </label>
              <Input
                id="news-categories"
                value={categoriesText}
                onChange={(event) => {
                  const text = event.target.value;
                  setCategoriesText(text);
                  form.setValue("categories", parseCategories(text), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                placeholder="Berita, DPRD"
                className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
                disabled={saving}
              />
              <p className="mt-1 text-[11px] text-[var(--y-text-mute)]">
                Pisahkan dengan koma.
              </p>
              <FieldError message={errors.categories?.message} />
            </div>

            <div>
              <label
                htmlFor="news-published-at"
                className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
              >
                Tanggal terbit
              </label>
              <Input
                id="news-published-at"
                type="date"
                {...form.register("published_at")}
                className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
                disabled={saving}
              />
              <FieldError message={errors.published_at?.message} />
            </div>

            <div>
              <label
                htmlFor="news-source-name"
                className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
              >
                Nama sumber
              </label>
              <Input
                id="news-source-name"
                {...form.register("source_name")}
                placeholder="DPRD Kuningan"
                className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
                disabled={saving}
              />
              <FieldError message={errors.source_name?.message} />
            </div>

            <div>
              <label
                htmlFor="news-source-url"
                className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
              >
                URL sumber
              </label>
              <Input
                id="news-source-url"
                type="url"
                {...form.register("source_url")}
                placeholder="https://contoh.com/berita"
                className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
                disabled={saving}
              />
              <FieldError message={errors.source_url?.message} />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]">
              Gambar sampul
            </span>
            <div className="rounded-xl border border-[var(--y-border)] bg-[var(--y-bg-elev-2)] p-3">
              {previewUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Pratinjau gambar artikel"
                    className="h-24 w-36 rounded-lg border border-[var(--y-border)] object-cover"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--y-border)] bg-[var(--y-bg-elev)] px-3 text-[12px] font-semibold text-[var(--y-text-dim)] hover:border-[var(--y-primary)] hover:text-[var(--y-text)] disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue("image_path", null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setUploadedPreview(null);
                      }}
                      disabled={uploading || saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.3)] px-3 text-[12px] font-semibold text-[var(--y-danger)] hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--y-border)] py-6 text-[12px] font-semibold text-[var(--y-text-dim)] transition-colors hover:border-[var(--y-primary)] hover:text-[var(--y-text)] disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ImagePlus size={16} />
                  )}
                  {uploading ? "Mengunggah…" : "Pilih gambar JPG, PNG, atau WebP"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="hidden"
              />
              {fileError && (
                <p className="mt-2 text-[11px] text-[var(--y-danger)]">
                  {fileError}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[12px] text-[var(--y-danger)]">
              {submitError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-[var(--y-text-dim)] hover:bg-[var(--y-bg-hover)] hover:text-[var(--y-text)]"
            >
              Batal
            </Button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="y-gradient-brand y-glow-primary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {article ? "Simpan Perubahan" : "Terbitkan Berita"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
