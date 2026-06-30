import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { entryToMarkdown } from "@src/lib/openapiAgent";

type OpenApiEntry = CollectionEntry<"openapi">;

export async function getStaticPaths() {
  const entries = await getCollection("openapi");
  return entries
    .filter((entry: OpenApiEntry) => entry.id !== "introduction")
    .map((entry: OpenApiEntry) => ({
      params: { slug: entry.id },
      props: { entry },
    }));
}

export async function GET({ props }: { props: { entry: OpenApiEntry } }) {
  return new Response(entryToMarkdown(props.entry), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
