import { describe, expect, it } from "vitest";
import { applyLiveTick } from "@/lib/market/spans";

const bar = { time: 1_700_000_040, open: 100, high: 102, low: 99, close: 101, volume: 10 };

describe("live candle updates", () => {
  it("moves the open minute up and down with the last price", () => {
    const up = applyLiveTick([bar], "1m", 104, bar.time + 20, true);
    expect(up[0]).toMatchObject({ open: 100, high: 104, low: 99, close: 104, time: bar.time });
    const down = applyLiveTick(up, "1m", 98, bar.time + 40, true);
    expect(down[0]).toMatchObject({ open: 100, high: 104, low: 98, close: 98 });
  });

  it("opens the next minute and leaves the closed minute unchanged", () => {
    const next = applyLiveTick([bar], "1m", 103, bar.time + 60, true);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(bar);
    expect(next[1]).toMatchObject({ time: bar.time + 60, open: 103, close: 103 });
  });

  it("does not invent an evening candle after the session", () => {
    const evening = [bar];
    expect(applyLiveTick(evening, "1m", 110, bar.time + 7 * 3600, true)).toBe(evening);
    const closed = [bar];
    expect(applyLiveTick(closed, "1m", 110, bar.time + 10, false)).toBe(closed);
  });
});
