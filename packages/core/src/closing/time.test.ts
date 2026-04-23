import { describe, it, expect } from "vitest";
import {
  pktDateString,
  pktDayBoundary,
  pktDayBoundaryFromDateString,
  addPktDays,
} from "./time";

describe("pktDateString", () => {
  it("returns the PKT calendar date for a UTC instant", () => {
    // 2026-04-22 18:59 UTC = 2026-04-22 23:59 PKT
    expect(pktDateString(new Date("2026-04-22T18:59:00Z"))).toBe("2026-04-22");
    // 2026-04-22 19:00 UTC = 2026-04-23 00:00 PKT
    expect(pktDateString(new Date("2026-04-22T19:00:00Z"))).toBe("2026-04-23");
  });
});

describe("pktDayBoundary", () => {
  it("returns 19:00 UTC previous day as start", () => {
    // Any instant on 2026-04-22 PKT should map to [2026-04-21 19:00Z, 2026-04-22 19:00Z)
    const { start, end } = pktDayBoundary(new Date("2026-04-22T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-04-21T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-22T19:00:00.000Z");
  });

  it("an instant at boundary maps correctly", () => {
    // Exactly 19:00 UTC = 00:00 PKT of next day
    const { start } = pktDayBoundary(new Date("2026-04-22T19:00:00Z"));
    expect(start.toISOString()).toBe("2026-04-22T19:00:00.000Z");
  });
});

describe("pktDayBoundaryFromDateString", () => {
  it("maps YYYY-MM-DD to [start, end)", () => {
    const { start, end } = pktDayBoundaryFromDateString("2026-04-22");
    expect(start.toISOString()).toBe("2026-04-21T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-22T19:00:00.000Z");
  });

  it("rejects garbage strings", () => {
    expect(() => pktDayBoundaryFromDateString("oops")).toThrow();
  });
});

describe("addPktDays", () => {
  it("moves forward", () => {
    expect(addPktDays("2026-04-22", 1)).toBe("2026-04-23");
    expect(addPktDays("2026-04-30", 1)).toBe("2026-05-01");
  });
  it("moves backward", () => {
    expect(addPktDays("2026-05-01", -1)).toBe("2026-04-30");
  });
});
