import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { buildSeedChain, MIN_CHAIN_SIZE, MAX_CHAIN_SIZE } from "./generator.js";

const CHAIN_SIZE = 20;
const HEX_REGEX = /^[0-9a-f]+$/;

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

describe("buildSeedChain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("input validation", () => {
    it.each([
      ["a fraction", MIN_CHAIN_SIZE + 0.5],
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["a numeric string", String(MIN_CHAIN_SIZE)],
      ["undefined", undefined],
    ])("throws when chainSize is not an integer (%s)", (_label, value) => {
      expect(() => buildSeedChain(value as number)).toThrow();
    });

    it("throws when chainSize is below MIN_CHAIN_SIZE", () => {
      expect(() => buildSeedChain(MIN_CHAIN_SIZE - 1)).toThrow();
    });

    it("throws when chainSize is above MAX_CHAIN_SIZE", () => {
      expect(() => buildSeedChain(MAX_CHAIN_SIZE + 1)).toThrow();
    });

    it.each([
      ["MIN_CHAIN_SIZE", MIN_CHAIN_SIZE],
      ["MAX_CHAIN_SIZE", MAX_CHAIN_SIZE],
    ])("does not throw when chainSize equals %s", (_label, value) => {
      expect(() => buildSeedChain(value)).not.toThrow();
    });

    it("throws an error message that mentions the allowed range", () => {
      expect(() => buildSeedChain(MIN_CHAIN_SIZE - 1)).toThrow(
        new RegExp(`${MIN_CHAIN_SIZE}.*${MAX_CHAIN_SIZE}`),
      );
    });
  });

  describe("output shape", () => {
    it("returns an object with a chain array and a commitment string", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(Array.isArray(result.chain)).toBe(true);
      expect(typeof result.commitment).toBe("string");
    });

    it("returns a chain with exactly chainSize elements", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(result.chain).toHaveLength(CHAIN_SIZE);
    });

    it("returns only strings as chain elements", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      for (const element of result.chain) {
        expect(typeof element).toBe("string");
      }
    });

    it("returns a commitment that is not included in the chain", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(result.chain).not.toContain(result.commitment);
    });
  });

  describe("element formats", () => {
    it("returns a head (last chain element) of the expected fixed length", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      const head = result.chain[result.chain.length - 1]!;
      expect(head).toHaveLength(48);
    });

    it("returns a head that contains only valid hex characters", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      const head = result.chain[result.chain.length - 1]!;
      expect(head).toMatch(HEX_REGEX);
    });

    it("returns every non-head element as a 64-character hex SHA-256 digest", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      const nonHeadElements = result.chain.slice(0, -1);
      for (const element of nonHeadElements) {
        expect(element).toHaveLength(64);
        expect(element).toMatch(HEX_REGEX);
      }
    });

    it("returns a commitment as a 64-character hex SHA-256 digest", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(result.commitment).toHaveLength(64);
      expect(result.commitment).toMatch(HEX_REGEX);
    });
  });

  describe("chain integrity", () => {
    it("places the head at the last index of the returned chain", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      const head = result.chain[result.chain.length - 1]!;
      const secondToLast = result.chain[result.chain.length - 2]!;
      expect(sha256(head)).toBe(secondToLast);
    });

    it("produces the commitment by hashing the first chain element", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(sha256(result.chain[0]!)).toBe(result.commitment);
    });

    it("produces each chain element by hashing the element that follows it", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(sha256(result.chain[1]!)).toBe(result.chain[0]);
    });

    it("holds the hash relationship for every adjacent pair, not just one", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      for (let i = 0; i < result.chain.length - 1; i++) {
        expect(sha256(result.chain[i + 1]!)).toBe(result.chain[i]);
      }
    });

    it("matches a known SHA-256 chain when randomBytes is mocked to a fixed value", () => {
      vi.spyOn(crypto, "randomBytes").mockImplementation((() =>
        Buffer.alloc(24, 1)) as any);
      const result = buildSeedChain(3);
      expect(result.chain).toEqual([
        "a86598d64eca6ac668457d4cc38429ceb0f8d015fc195c513a29924dbb49d897",
        "f95c1628c3b3207f8d9cc2a8b11e6be479d8213ea57d1ea2aa2ac8f9bdc681eb",
        "010101010101010101010101010101010101010101010101",
      ]);
      expect(result.commitment).toBe(
        "61c2278d52b44b85134d2416d83b3b02469858be98e77d1f4723f0b16421cd59",
      );
    });
  });

  describe("randomness", () => {
    it("returns different heads on consecutive calls", () => {
      const first = buildSeedChain(CHAIN_SIZE);
      const second = buildSeedChain(CHAIN_SIZE);
      expect(first.chain[first.chain.length - 1]).not.toBe(
        second.chain[second.chain.length - 1],
      );
    });

    it("returns different commitments on consecutive calls", () => {
      const first = buildSeedChain(CHAIN_SIZE);
      const second = buildSeedChain(CHAIN_SIZE);
      expect(first.commitment).not.toBe(second.commitment);
    });
  });

  describe("immutability", () => {
    it("returns a frozen result object", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("returns a frozen chain array", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(Object.isFrozen(result.chain)).toBe(true);
    });

    it("does not allow modifying the chain array", () => {
      const result = buildSeedChain(CHAIN_SIZE);
      expect(() => (result.chain as string[]).push("x")).toThrow(TypeError);
    });
  });
});
