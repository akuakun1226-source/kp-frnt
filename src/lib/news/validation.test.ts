import { describe, expect, it } from "vitest";
import {
  manualArticleSchema,
  slugify,
  stripHtml,
  validateImageFile,
} from "@/lib/news/validation";

const valid = {
  title: "Judul Berita DPRD",
  slug: "judul-berita-dprd",
  summary: "Ringkasan berita.",
  content: "<p>Isi berita.</p>",
  source_name: "DPRD Kuningan",
  source_url: "",
  published_at: "2026-11-05",
  categories: ["Berita"],
  image_path: null,
};

describe("manualArticleSchema", () => {
  it("menerima payload valid", () => {
    expect(manualArticleSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak slug tidak valid", () => {
    expect(
      manualArticleSchema.safeParse({ ...valid, slug: "Judul Berita" })
        .success,
    ).toBe(false);
  });

  it("menolak slug scraped-", () => {
    expect(
      manualArticleSchema.safeParse({ ...valid, slug: "scraped-abc" }).success,
    ).toBe(false);
  });

  it("menolak konten HTML kosong", () => {
    expect(
      manualArticleSchema.safeParse({ ...valid, content: "<p> </p>" }).success,
    ).toBe(false);
  });

  it("menolak kategori kosong", () => {
    expect(
      manualArticleSchema.safeParse({ ...valid, categories: [] }).success,
    ).toBe(false);
  });

  it("tidak mengenal status draft", () => {
    expect("status" in manualArticleSchema.parse(valid)).toBe(false);
  });

  it("menormalisasi source_url kosong menjadi null", () => {
    expect(manualArticleSchema.parse(valid).source_url).toBeNull();
  });
});

describe("slugify", () => {
  it("membuat slug dari judul", () => {
    expect(slugify("Judul Berita DPRD")).toBe("judul-berita-dprd");
  });

  it("menghapus diacritics dan tanda baca", () => {
    expect(slugify("  Kepala Désa & Berita!  ")).toBe("kepala-desa-berita");
  });
});

describe("stripHtml", () => {
  it("menghapus tag dan decode nbsp", () => {
    expect(stripHtml("<p>Isi&nbsp;<strong>berita</strong></p>")).toBe(
      "Isi berita",
    );
  });
});

describe("validateImageFile", () => {
  it("menerima JPG, PNG, dan WebP di bawah 5 MB", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validateImageFile({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("menolak format selain JPG, PNG, dan WebP", () => {
    expect(validateImageFile({ type: "image/gif", size: 1024 })).toBe(
      "Format gambar harus JPG, PNG, atau WebP.",
    );
  });

  it("menolak gambar di atas 5 MB", () => {
    expect(
      validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 }),
    ).toBe("Ukuran gambar maksimal 5 MB.");
  });
});
