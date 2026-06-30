import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { getOpenApiPath } from "@src/lib/openapiAgent";

type OpenApiEntry = CollectionEntry<"openapi">;

export async function GET() {
  const entries = await getCollection("openapi");
  const sorted = entries.sort((a: OpenApiEntry, b: OpenApiEntry) =>
    getOpenApiPath(a.id).localeCompare(getOpenApiPath(b.id)),
  );
  const body = [
    "# ElectionData.MY",
    "",
    "ElectionData.MY publishes Malaysian election data and API documentation.",
    "",
    "## Open Election API docs",
    "",
    ...sorted.map((entry: OpenApiEntry) => {
      const path = getOpenApiPath(entry.id);
      const title = entry.data.pageTitle ?? entry.data.title;
      return `- [${title}](https://electiondata.my${path}.md): ${entry.data.description}`;
    }),
    "",
    "Full docs: https://electiondata.my/llms-full.txt",
  ].join("\n");

  return new Response(body + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
