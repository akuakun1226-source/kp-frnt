import { describe, expect, it } from "vitest";
import { getNextScrapeRun } from "@/lib/news/schedule";

describe("getNextScrapeRun", () => {
  it("06.00 WIB sebelum cutoff", () => {
    expect(
      getNextScrapeRun(new Date("2026-11-05T10:00:00Z")).toISOString(),
    ).toBe("2026-11-05T23:00:00.000Z");
  });

  it("setelah cutoff memakai hari berikutnya", () => {
    expect(
      getNextScrapeRun(new Date("2026-11-05T23:30:00Z")).toISOString(),
    ).toBe("2026-11-06T23:00:00.000Z");
  });

  it("tepat di cutoff memakai hari berikutnya", () => {
    expect(
      getNextScrapeRun(new Date("2026-11-05T23:00:00Z")).toISOString(),
    ).toBe("2026-11-06T23:00:00.000Z");
  });
});
