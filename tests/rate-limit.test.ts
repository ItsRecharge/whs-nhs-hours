import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within the window", () => {
    expect(rateLimit("k", 3, 1000)).toBe(true);
    expect(rateLimit("k", 3, 1000)).toBe(true);
    expect(rateLimit("k", 3, 1000)).toBe(true);
    expect(rateLimit("k", 3, 1000)).toBe(false);
  });

  it("frees capacity as the window slides", () => {
    expect(rateLimit("k", 2, 1000)).toBe(true);
    vi.advanceTimersByTime(600);
    expect(rateLimit("k", 2, 1000)).toBe(true);
    expect(rateLimit("k", 2, 1000)).toBe(false);
    vi.advanceTimersByTime(500); // first hit now outside window
    expect(rateLimit("k", 2, 1000)).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("a", 1, 1000)).toBe(true);
    expect(rateLimit("a", 1, 1000)).toBe(false);
    expect(rateLimit("b", 1, 1000)).toBe(true);
  });
});
