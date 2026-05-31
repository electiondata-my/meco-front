import { deflateSync, inflateSync } from "fflate";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Invalid hex-encoded query");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export function encodeQuery(sql: string): string {
  const bytes = new TextEncoder().encode(sql);
  const compressed = deflateSync(bytes, { level: 9 });
  return bytesToHex(compressed);
}

export function decodeQuery(encoded: string): string {
  const decompressed = inflateSync(hexToBytes(encoded));
  return new TextDecoder().decode(decompressed);
}
