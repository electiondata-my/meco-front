/**
 * Client-safe doc utilities (no Node.js built-ins).
 * Used by both the server (lib/docs.ts) and client-side MDX components.
 */

/**
 * Slugify heading text to a URL-safe ID.
 * Matches the algorithm used in the h2/h3 MDX components so TOC anchors align.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Recursively extract plain text from React children (for heading slug gen). */
export function textContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node !== null && typeof node === "object" && "props" in node) {
    return textContent(
      (node as { props?: { children?: unknown } }).props?.children,
    );
  }
  return "";
}
