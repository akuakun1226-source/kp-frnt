import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getNewsUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_NEWS_URL?.trim().replace(/\/$/, "") ||
    null;
}

export function isNewsConfigured(): boolean {
  return Boolean(
    getNewsUrl() &&
      process.env.NEXT_PUBLIC_SUPABASE_NEWS_ANON_KEY?.trim(),
  );
}

export function getNewsSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = getNewsUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_NEWS_ANON_KEY?.trim();
  if (!url || !anonKey) {
    client = null;
    return client;
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "dprd-news-auth",
    },
  });

  return client;
}

export function getNewsApiUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_NEWS_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const url = getNewsUrl();
  return url ? `${url}/functions/v1/news-admin` : null;
}
