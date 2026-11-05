"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
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
import { NewsApiError, signInNews } from "@/lib/news/api";
import type { NewsSession } from "@/lib/news/types";

interface NewsLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn: (session: NewsSession) => void;
}

export function NewsLoginDialog({
  open,
  onOpenChange,
  onSignedIn,
}: NewsLoginDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await signInNews(email.trim(), password);
      onSignedIn(session);
      setEmail("");
      setPassword("");
      onOpenChange(false);
      toast.success("Masuk ke Berita berhasil.");
    } catch (cause) {
      if (cause instanceof NewsApiError && cause.status === 403) {
        setError("Akun Berita ini belum diaktifkan untuk menulis.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Gagal masuk ke Berita.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="y-glass-strong border-[var(--y-border)] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[var(--y-text)]">
            Masuk untuk menulis Berita
          </DialogTitle>
          <DialogDescription className="text-[var(--y-text-dim)]">
            Gunakan akun Supabase Berita yang sudah diaktifkan admin. Akun ini
            terpisah dari login arsip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="news-email"
              className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
            >
              Email
            </label>
            <Input
              id="news-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@contoh.com"
              className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="news-password"
              className="mb-1.5 block text-[12px] font-semibold text-[var(--y-text-dim)]"
            >
              Kata sandi
            </label>
            <Input
              id="news-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="border-[var(--y-border)] bg-[var(--y-bg-elev-2)] text-[var(--y-text)]"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-[12px] text-[var(--y-danger)]">
              {error}
            </div>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-[var(--y-text-dim)] hover:bg-[var(--y-bg-hover)] hover:text-[var(--y-text)]"
            >
              Batal
            </Button>
            <button
              type="submit"
              disabled={loading}
              className="y-gradient-brand y-glow-primary inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              Masuk
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
