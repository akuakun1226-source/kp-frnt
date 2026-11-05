import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildNewsImageUrl,
  isNewsAdminUser,
  parseNewsError,
} from "@/lib/news/api";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_NEWS_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_NEWS_URL = "https://news.supabase.co";
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_NEWS_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_NEWS_URL = ORIGINAL_URL;
  }
});

describe("buildNewsImageUrl", () => {
  it("mengembalikan null untuk path kosong", () => {
    expect(buildNewsImageUrl(null)).toBeNull();
    expect(buildNewsImageUrl("")).toBeNull();
  });

  it("menolak path dengan .. atau backslash", () => {
    expect(buildNewsImageUrl("manual/../rahasia.png")).toBeNull();
    expect(buildNewsImageUrl("manual\\rahasia.png")).toBeNull();
  });

  it("meng-encode setiap segmen path", () => {
    expect(buildNewsImageUrl("manual/a b/foto.png")).toBe(
      "https://news.supabase.co/storage/v1/object/public/article-images/manual/a%20b/foto.png",
    );
  });
});

describe("isNewsAdminUser", () => {
  it("menerima news_role admin", () => {
    expect(
      isNewsAdminUser({ app_metadata: { news_role: "admin" } }),
    ).toBe(true);
  });

  it("menolak role lain atau user kosong", () => {
    expect(isNewsAdminUser({ app_metadata: { news_role: "viewer" } })).toBe(
      false,
    );
    expect(isNewsAdminUser({ app_metadata: {} })).toBe(false);
    expect(isNewsAdminUser(null)).toBe(false);
  });
});

describe("parseNewsError", () => {
  it("membaca bentuk error Edge Function", () => {
    const error = parseNewsError(400, {
      error: { code: "validation_error", message: "Judul wajib diisi." },
    });

    expect(error.status).toBe(400);
    expect(error.code).toBe("validation_error");
    expect(error.message).toBe("Judul wajib diisi.");
  });

  it("memakai fallback jika body tidak berbentuk standar", () => {
    const error = parseNewsError(502, null);

    expect(error.status).toBe(502);
    expect(error.code).toBe("request_failed");
    expect(error.message).toBe("Permintaan Berita gagal.");
  });
});
