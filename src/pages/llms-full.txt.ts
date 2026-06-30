import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { entryToMarkdown, getOpenApiPath } from "@src/lib/openapiAgent";

type OpenApiEntry = CollectionEntry<"openapi">;

export async function GET() {
  const entries = await getCollection("openapi");
  const sorted = entries.sort((a: OpenApiEntry, b: OpenApiEntry) =>
    getOpenApiPath(a.id).localeCompare(getOpenApiPath(b.id)),
  );
  const body = sorted.map(entryToMarkdown).join("\n\n---\n\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
