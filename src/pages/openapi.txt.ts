import { getEntry } from "astro:content";
import { entryToMarkdown, markdownToText } from "@src/lib/openapiAgent";

export async function GET() {
  const entry = await getEntry("openapi", "introduction");
  if (!entry) return new Response("Not found", { status: 404 });

  return new Response(markdownToText(entryToMarkdown(entry)), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
