export interface ManualArticleRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  source_name: string;
  source_url: string | null;
  published_at: string;
  categories: string[] | null;
  image_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualArticle extends ManualArticleRow {
  image_url: string | null;
}

export interface ManualArticleInput {
  title: string;
  slug: string;
  summary: string;
  content: string;
  source_name: string;
  source_url: string | null;
  published_at: string;
  categories: string[];
  image_path: string | null;
}

export interface ScrapedArticle {
  id: string;
  url: string;
  title: string;
  published_at: string;
  summary: string | null;
  source: string | null;
  image: string | null;
  scraped_at: string;
}

export interface ScrapeRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  found: number;
  inserted: number;
  updated: number;
  error: string | null;
}

export interface ScrapeStatus {
  lastRun: ScrapeRun | null;
  manualCount: number;
  scrapedCount: number;
  nextRunAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: string;
}

export interface NewsSession {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

export interface NewsApiError {
  status: number;
  code: string;
  message: string;
}
