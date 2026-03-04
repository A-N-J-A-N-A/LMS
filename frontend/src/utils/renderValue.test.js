import { renderValue } from "./renderValue";

describe("renderValue", () => {
  test("returns dash for null and undefined", () => {
    expect(renderValue(null)).toBe("-");
    expect(renderValue(undefined)).toBe("-");
  });

  test("formats backend timestamp object", () => {
    const value = { timestamp: "2026-01-10T00:00:00Z" };
    expect(renderValue(value)).toBe(new Date(value.timestamp).toLocaleDateString());
  });

  test("stringifies unknown objects", () => {
    expect(renderValue({ a: 1 })).toBe(JSON.stringify({ a: 1 }));
  });

  test("returns primitive values as-is", () => {
    expect(renderValue("hello")).toBe("hello");
    expect(renderValue(42)).toBe(42);
    expect(renderValue(false)).toBe(false);
  });
});
