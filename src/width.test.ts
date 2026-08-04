import { describe, expect, it } from "bun:test";
import { getVisibleWidth } from "./width.ts";

describe("getVisibleWidth", () => {
  it("returns correct width for plain text", () => {
    expect(getVisibleWidth("hello")).toBe(5);
    expect(getVisibleWidth("")).toBe(0);
  });

  it("ignores ANSI color codes", () => {
    expect(getVisibleWidth("\x1b[32mhello\x1b[0m")).toBe(5);
    expect(getVisibleWidth("\x1b[1m\x1b[33mbold yellow\x1b[0m")).toBe(11);
  });

  it("ignores OSC 8 hyperlinks", () => {
    const hyperlink = "\x1b]8;;http://example.com\x1b\\link\x1b]8;;\x1b\\";
    expect(getVisibleWidth(hyperlink)).toBe(4);
  });

  it("handles combined ANSI and hyperlinks", () => {
    const complex =
      "\x1b[32m\x1b]8;;http://ex.com\x1b\\green link\x1b]8;;\x1b\\\x1b[0m";
    expect(getVisibleWidth(complex)).toBe(10);
  });

  it("handles Unicode characters correctly", () => {
    expect(getVisibleWidth("hello")).toBe(5);
    expect(getVisibleWidth("café")).toBe(4);
  });
});
