import { describe, it, expect } from "vitest";
import { SESSION_CONFIG } from "../../config/session";

describe("SESSION_CONFIG", () => {
  it("has a 5-minute timeout", () => {
    expect(SESSION_CONFIG.TIMEOUT).toBe(5 * 60 * 1000);
  });

  it("has a 1-minute warning time", () => {
    expect(SESSION_CONFIG.WARNING_TIME).toBe(1 * 60 * 1000);
  });

  it("tracks expected activity events", () => {
    expect(SESSION_CONFIG.ACTIVITY_EVENTS).toContain("mousedown");
    expect(SESSION_CONFIG.ACTIVITY_EVENTS).toContain("keydown");
    expect(SESSION_CONFIG.ACTIVITY_EVENTS).toContain("scroll");
    expect(SESSION_CONFIG.ACTIVITY_EVENTS).toContain("touchstart");
    expect(SESSION_CONFIG.ACTIVITY_EVENTS).toContain("click");
  });

  it("warning time is less than timeout", () => {
    expect(SESSION_CONFIG.WARNING_TIME).toBeLessThan(SESSION_CONFIG.TIMEOUT);
  });
});
