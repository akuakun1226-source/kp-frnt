import { getNextScrapeRun } from "@/lib/news/schedule";
import {
  getNewsApiUrl,
  getNewsSupabase,
  getNewsUrl,
} from "@/lib/news/supabase";
import type {
  ManualArticle,
  ManualArticleInput,
  ManualArticleRow,
  NewsListParams,
  NewsSession,
  Paginated,
  ScrapeRun,
  ScrapeStatus,
  ScrapedArticle,
} from "@/lib/news/types";

const MANUAL_COLUMNS =
  "id,slug,title,summary,content,source_name,source_url,published_at,categories,image_path,created_by,created_at,updated_at" as const;

const SCRAPED_COLUMNS =
  "id,url,title,published_at,summary,source,image,scraped_at" as const;

export class NewsApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "NewsApiError";
  }
}

export function isNewsAdminUser(
  user: { app_metadata?: Record<string, unknown> } | null,
): boolean {
  return user?.app_metadata?.news_role === "admin";
}

export function parseNewsError(status: number, body: unknown): NewsApiError {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const nested =
    record.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>)
      : {};

  const code =
    typeof nested.code === "string"
      ? nested.code
      : typeof record.code === "string"
        ? record.code
        : "request_failed";
  const message =
    typeof nested.message === "string"
      ? nested.message
      : typeof record.message === "string"
        ? record.message
        : "Permintaan Berita gagal.";

  return new NewsApiError(status, code, message);
}

export function buildNewsImageUrl(path: string | null): string | null {
  if (!path) return null;

  const segments = path.split("/");
  if (
    path.includes("\\") ||
    path.startsWith("/") ||
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  const base = getNewsUrl();
  if (!base) return null;

  const encoded = segments.map((segment) => encodeURIComponent(segment)).join(
    "/",
  );
  return `${base}/storage/v1/object/public/article-images/${encoded}`;
}

function emptyPage<T>(page: number, pageSize: number): Paginated<T> {
  return { items: [], total: 0, page, pageSize };
}

function pageParams(params: NewsListParams): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
} {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export async function getNewsSession(): Promise<NewsSession | null> {
  const client = getNewsSupabase();
  if (!client) return null;

  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
      isAdmin: isNewsAdminUser(user),
    };
  } catch {
    return null;
  }
}

export async function signInNews(
  email: string,
  password: string,
): Promise<NewsSession> {
  const client = getNewsSupabase();
  if (!client) {
    throw new NewsApiError(
      500,
      "not_configured",
      "Konfigurasi Berita belum diset.",
    );
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new NewsApiError(
      401,
      "unauthorized",
      "Email atau kata sandi Berita salah.",
    );
  }

  if (!isNewsAdminUser(data.user)) {
    await client.auth.signOut();
    throw new NewsApiError(
      403,
      "forbidden",
      "Akun Berita tidak punya akses tulis.",
    );
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    isAdmin: true,
  };
}

export async function signOutNews(): Promise<void> {
  const client = getNewsSupabase();
  if (!client) return;
  await client.auth.signOut();
}

export async function listManualArticles(
  params: NewsListParams = {},
): Promise<Paginated<ManualArticle>> {
  const { page, pageSize, from, to } = pageParams(params);
  const client = getNewsSupabase();
  if (!client) return emptyPage<ManualArticle>(page, pageSize);

  const base = client
    .from("manual_articles")
    .select<typeof MANUAL_COLUMNS, ManualArticleRow>(MANUAL_COLUMNS, {
      count: "exact",
    });
  const safe = params.search?.replace(/[%,]/g, " ").trim();
  const filtered = safe
    ? base.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`)
    : base;

  const { data, error, count } = await filtered
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new NewsApiError(500, "query_failed", error.message);
  }

  return {
    items: (data ?? []).map((row) => ({
      ...row,
      image_url: buildNewsImageUrl(row.image_path),
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listScrapedArticles(
  params: NewsListParams = {},
): Promise<Paginated<ScrapedArticle>> {
  const { page, pageSize, from, to } = pageParams(params);
  const client = getNewsSupabase();
  if (!client) return emptyPage<ScrapedArticle>(page, pageSize);

  const base = client
    .from("scraped_articles")
    .select(SCRAPED_COLUMNS, { count: "exact" });
  const safe = params.search?.replace(/[%,]/g, " ").trim();
  const searched = safe ? base.ilike("title", `%${safe}%`) : base;
  const source = params.source?.trim();
  const filtered = source ? searched.eq("source", source) : searched;

  const { data, error, count } = await filtered
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new NewsApiError(500, "query_failed", error.message);
  }

  return {
    items: (data ?? []) as ScrapedArticle[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getScrapeStatus(): Promise<ScrapeStatus> {
  const nextRunAt = getNextScrapeRun().toISOString();
  const client = getNewsSupabase();
  if (!client) {
    return {
      lastRun: null,
      manualCount: 0,
      scrapedCount: 0,
      nextRunAt,
    };
  }

  const [runResult, manualResult, scrapedResult] = await Promise.all([
    client
      .from("scrape_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("manual_articles")
      .select("*", { count: "exact", head: true }),
    client
      .from("scraped_articles")
      .select("*", { count: "exact", head: true }),
  ]);

  if (runResult.error) {
    throw new NewsApiError(500, "query_failed", runResult.error.message);
  }
  if (manualResult.error) {
    throw new NewsApiError(500, "query_failed", manualResult.error.message);
  }
  if (scrapedResult.error) {
    throw new NewsApiError(500, "query_failed", scrapedResult.error.message);
  }

  return {
    lastRun: (runResult.data as ScrapeRun | null) ?? null,
    manualCount: manualResult.count ?? 0,
    scrapedCount: scrapedResult.count ?? 0,
    nextRunAt,
  };
}

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const client = getNewsSupabase();
  const apiUrl = getNewsApiUrl();
  if (!client || !apiUrl) {
    throw new NewsApiError(
      500,
      "not_configured",
      "Konfigurasi Berita belum diset.",
    );
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) {
    throw new NewsApiError(
      401,
      "unauthorized",
      "Silakan masuk ke Berita.",
    );
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw parseNewsError(res.status, body);
  return (body?.data ?? body) as T;
}

export async function createManualArticle(
  input: ManualArticleInput,
): Promise<ManualArticle> {
  return adminFetch<ManualArticle>("/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateManualArticle(
  id: string,
  input: ManualArticleInput,
): Promise<ManualArticle> {
  const { slug: _slug, ...payload } = input;
  return adminFetch<ManualArticle>(`/manual/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteManualArticle(id: string): Promise<void> {
  await adminFetch<void>(`/manual/${id}`, { method: "DELETE" });
}

export async function uploadNewsImage(
  file: File,
): Promise<{ path: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  return adminFetch<{ path: string; url: string }>("/images", {
    method: "POST",
    body: form,
  });
}
