"use client";

import { useCallback, useEffect, useState } from "react";
import { getNewsSession } from "@/lib/news/api";
import { getNewsSupabase } from "@/lib/news/supabase";
import type { NewsSession } from "@/lib/news/types";

export function useNewsSession(): {
  session: NewsSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [session, setSession] = useState<NewsSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getNewsSession();
    setSession(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const next = await getNewsSession();
      if (!active) return;
      setSession(next);
      setLoading(false);
    };

    sync();

    const subscription =
      getNewsSupabase()?.auth.onAuthStateChange(() => {
        sync();
      });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, refresh };
}
