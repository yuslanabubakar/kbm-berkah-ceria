import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatRupiah,
  formatThousandsInput,
  parseThousandsInput,
} from "@/lib/formatCurrency";

describe("formatRupiah", () => {
  test("formats regular positive integer values", () => {
    assert.equal(formatRupiah(10000), "Rp10.000");
    assert.equal(formatRupiah(1500000), "Rp1.500.000");
    assert.equal(formatRupiah(25000000), "Rp25.000.000");
  });

  test("handles zero", () => {
    assert.equal(formatRupiah(0), "Rp0");
  });

  test("rounds decimals properly", () => {
    assert.equal(formatRupiah(1234.4), "Rp1.234");
    assert.equal(formatRupiah(1234.6), "Rp1.235");
  });

  test("formats negative numbers", () => {
    assert.equal(formatRupiah(-50000), "Rp-50.000");
  });
});

describe("formatThousandsInput & parseThousandsInput", () => {
  test("formats positive values with dots and empty for zero/blank", () => {
    assert.equal(formatThousandsInput(150000), "150.000");
    assert.equal(formatThousandsInput(0), "");
    assert.equal(formatThousandsInput(""), "");
  });

  test("parses formatted strings back to integer", () => {
    assert.equal(parseThousandsInput("150.000"), 150000);
    assert.equal(parseThousandsInput("Rp 2.500.000"), 2500000);
    assert.equal(parseThousandsInput(""), 0);
  });
});
