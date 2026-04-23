import { deflateSync, inflateSync } from "fflate";

export function encodeQuery(sql: string): string {
  const bytes = new TextEncoder().encode(sql);
  const compressed = deflateSync(bytes, { level: 9 });
  const b64 = btoa(String.fromCharCode(...compressed));
  return encodeURIComponent(b64);
}

export function decodeQuery(encoded: string): string {
  const b64 = decodeURIComponent(encoded);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const decompressed = inflateSync(bytes);
  return new TextDecoder().decode(decompressed);
}
