import { getEntry } from "astro:content";
import { entryToMarkdown } from "@src/lib/openapiAgent";

export async function GET() {
  const entry = await getEntry("openapi", "introduction");
  if (!entry) return new Response("Not found", { status: 404 });

  return new Response(entryToMarkdown(entry), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
