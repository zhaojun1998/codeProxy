import { describe, expect, test } from "vitest";
import {
  formatCompactNumber,
  formatCompactUsd,
  formatFixedNumber,
  formatUsd,
  getCompactNumberParts,
} from "../formatters";

describe("usage formatters", () => {
  test("formats compact numbers through billion and larger units", () => {
    expect(formatCompactNumber(23_800, { locale: "en-US", threshold: 10_000 })).toBe("23.8K");
    expect(formatCompactNumber(2_819_900_000, { locale: "en-US", threshold: 10_000 })).toBe("2.8B");
    expect(formatCompactNumber(1_500_000_000_000, { locale: "en-US", threshold: 10_000 })).toBe(
      "1.5T",
    );
  });

  test("returns compact metadata for tooltip decisions", () => {
    const parts = getCompactNumberParts(2_819_900_000, {
      locale: "en-US",
      threshold: 10_000,
    });

    expect(parts.compact).toBe(true);
    expect(parts.suffix).toBe("B");
    expect(parts.text).toBe("2.8B");
  });

  test("formats compact USD values with two decimals and raw USD values with four", () => {
    expect(formatFixedNumber(2_819_900_000, { locale: "en-US", fractionDigits: 2 })).toBe(
      "2,819,900,000.00",
    );
    expect(formatCompactUsd(12_345.67891, { locale: "en-US", threshold: 10_000 })).toBe("$12.35K");
    expect(formatCompactUsd(2_315.2875, { locale: "en-US", threshold: 10_000 })).toBe(
      "$2,315.2875",
    );
    expect(formatUsd(12_345.67891, { locale: "en-US", fractionDigits: 4 })).toBe("$12,345.6789");
  });
});
