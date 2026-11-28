import crypto from "crypto";

interface SeedChainResults {
  chain: readonly string[];
  commitment: string;
}

interface MultiplierResults {
  serverSeed: string;
  clientSeed: string;
  multiplier: number;
}

export const MIN_CHAIN_SIZE = 1;
export const MAX_CHAIN_SIZE = 150;
export const HEX_SLICE_LENGTH = 13; // 13 char === 52 bits which is within JS Number.MAX_SAFE_INTEGER

export function buildSeedChain(chainSize: number): Readonly<SeedChainResults> {
  if (
    !Number.isInteger(chainSize) ||
    chainSize < MIN_CHAIN_SIZE ||
    chainSize > MAX_CHAIN_SIZE
  ) {
    throw new Error(
      `Chain size must be an integer >= ${MIN_CHAIN_SIZE} ` +
        `and <= ${MAX_CHAIN_SIZE}`,
    );
  }

  const head = crypto.randomBytes(24).toString("hex");
  const chain = [head];

  for (let i = 0; i < chainSize; i++) {
    const currSeed = chain[i]!;
    const nextSeed = crypto.createHash("sha256").update(currSeed).digest("hex");
    chain.push(nextSeed);
  }

  const commitment = chain.pop()!;
  const reversedChain = Object.freeze(chain.reverse());

  return Object.freeze({ chain: reversedChain, commitment });
}

export function generateMultiplier(
  serverSeed: string,
  clientSeed: string,
): Readonly<MultiplierResults> {
  if (!serverSeed.trim()) {
    throw new Error("Server seed cannot be an empty string or white spaces");
  }

  if (!clientSeed.trim()) {
    throw new Error("Client seed cannot be an empty string or white spaces");
  }

  const seeds = `${serverSeed}${clientSeed}`;
  const hash = crypto.createHash("sha256").update(seeds).digest("hex");

  const slicedHash = hash.slice(0, HEX_SLICE_LENGTH);
  const hashNumber = parseInt(slicedHash, 16);

  const bits = slicedHash.length * 4;
  const totalOutcomes = 2 ** bits;

  // TODO: 100 * totalOutcomes can pass Number.MAX_SAFE_INTEGER with 13 hex
  // characters, so the result may be inexact.
  const multiplier =
    Math.floor((100 * totalOutcomes) / (totalOutcomes - hashNumber)) / 100;

  return Object.freeze({ serverSeed, clientSeed, multiplier });
}
