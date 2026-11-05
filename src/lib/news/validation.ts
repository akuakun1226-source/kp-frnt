import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return "Format gambar harus JPG, PNG, atau WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Ukuran gambar maksimal 5 MB.";
  }
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeImagePath(value: string): boolean {
  const segments = value.split("/");
  return (
    !value.includes("\\") &&
    !value.startsWith("/") &&
    segments.every(
      (segment) => !!segment && segment !== "." && segment !== "..",
    )
  );
}

export const manualArticleSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi."),
  slug: z
    .string()
    .trim()
    .regex(
      SLUG_PATTERN,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
    )
    .refine(
      (value) => !value.startsWith("scraped-"),
      "Slug tidak boleh diawali scraped-.",
    ),
  summary: z.string().trim().min(1, "Ringkasan wajib diisi."),
  content: z
    .string()
    .trim()
    .min(1, "Konten artikel wajib diisi.")
    .refine(
      (value) => stripHtml(value).length > 0,
      "Konten artikel wajib diisi.",
    ),
  source_name: z.string().trim().min(1, "Nama sumber wajib diisi."),
  source_url: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed ? trimmed : null;
    })
    .refine(
      (value) => value === null || isHttpUrl(value),
      "URL sumber harus memakai http atau https.",
    ),
  published_at: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal terbit harus berformat YYYY-MM-DD."),
  categories: z
    .array(z.string())
    .transform((items) => [
      ...new Set(items.map((item) => item.trim()).filter(Boolean)),
    ])
    .pipe(z.array(z.string()).min(1, "Kategori wajib diisi.")),
  image_path: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return trimmed ? trimmed : null;
    })
    .refine(
      (value) => value === null || isSafeImagePath(value),
      "Path gambar tidak valid.",
    ),
});
