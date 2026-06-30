import type { CollectionEntry } from "astro:content";

type OpenApiEntry = CollectionEntry<"openapi">;

export function getOpenApiPath(id: string): string {
  return id === "introduction" ? "/openapi" : `/openapi/${id}`;
}

function stripFrontmatter(source: string): string {
  return source.replace(/^---[\s\S]*?---\s*/, "");
}

function evaluateArray<T>(source: string): T[] {
  try {
    return Function(`"use strict"; return (${source});`)() as T[];
  } catch {
    return [];
  }
}

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return "";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(
      (row) =>
        `| ${row.map((cell) => String(cell ?? "").replace(/\n/g, "<br>")).join(" | ")} |`,
    ),
  ].join("\n");
}

function normalizeJsxBlocks(source: string): string {
  let body = source;

  body = body.replace(
    /<Callout\s+label="([^"]+)">([\s\S]*?)<\/Callout>/g,
    (_match, label: string, content: string) =>
      `> **${label}:** ${content.trim()}`,
  );

  body = body.replace(
    /<TokenInput\s*\/>/g,
    "> API key input omitted. Use `Authorization: Bearer <your-api-key>` in requests.",
  );

  body = body.replace(
    /<EndpointBadge\s+method="([^"]+)"\s+url="([^"]+)"\s*\/>/g,
    (_match, method: string, url: string) =>
      `**Endpoint:** \`${method} ${url}\``,
  );

  body = body.replace(
    /<EndpointCard\s+method="([^"]+)"\s+url="([^"]+)"\s+params=\{\[([\s\S]*?)\]\}\s*\/>/g,
    (_match, method: string, url: string, params: string) => {
      const rows = evaluateArray<{
        name: string;
        type: string;
        required?: boolean;
        description: string;
      }>(`[${params}]`).map((param) => [
        `\`${param.name}\``,
        param.type,
        param.required ? "yes" : "no",
        param.description,
      ]);
      return [
        `**Endpoint:** \`${method} ${url}\``,
        table(["Parameter", "Type", "Required", "Description"], rows),
      ]
        .filter(Boolean)
        .join("\n\n");
    },
  );

  body = body.replace(
    /<FieldTable\s+fields=\{\[([\s\S]*?)\]\}\s*\/>/g,
    (_match, fields: string) => {
      const rows = evaluateArray<{
        name: string;
        type: string;
        description: string;
      }>(`[${fields}]`).map((field) => [
        `\`${field.name}\``,
        field.type,
        field.description,
      ]);
      return table(["Field", "Type", "Description"], rows);
    },
  );

  body = body.replace(
    /<StatusTable\s+codes=\{\[([\s\S]*?)\]\}\s*\/>/g,
    (_match, codes: string) => {
      const rows = evaluateArray<{
        code: string | number;
        title: string;
        description: string;
      }>(`[${codes}]`).map((code) => [
        `\`${code.code}\``,
        code.title,
        code.description,
      ]);
      return table(["Code", "Meaning", "Description"], rows);
    },
  );

  body = body.replace(
    /<GrayList\s+items=\{\[([\s\S]*?)\]\}\s*\/>/g,
    (_match, items: string) => {
      const rows = evaluateArray<string>(`[${items}]`);
      return rows.map((item) => `- ${item}`).join("\n");
    },
  );

  body = body.replace(/<TabCode\s+([\s\S]*?)\/>/g, (_match, attrs: string) => {
    const snippets: string[] = [];
    const propPattern = /(\w+)=\{`((?:\\`|[^`])*)`\}/g;
    let prop: RegExpExecArray | null;
    while ((prop = propPattern.exec(attrs)) !== null) {
      const lang = prop[1] === "curl" ? "bash" : prop[1];
      const code = prop[2]
        .replace(/\\`/g, "`")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t");
      snippets.push(`\`\`\`${lang}\n${code}\n\`\`\``);
    }
    return snippets.join("\n\n");
  });

  body = body.replace(
    /<[A-Za-z]+ApiTester\s*\/>/g,
    "> Interactive API tester omitted in text export.",
  );
  body = body.replace(
    /<ApiTester\s*\/>/g,
    "> Interactive API tester omitted in text export.",
  );

  return body.replace(/\n{3,}/g, "\n\n").trim();
}

export function entryToMarkdown(entry: OpenApiEntry): string {
  const path = getOpenApiPath(entry.id);
  const title = entry.data.pageTitle ?? entry.data.title;
  const source = stripFrontmatter(entry.body ?? "");
  const body = normalizeJsxBlocks(source);

  return (
    [
      `# ${title}`,
      entry.data.description,
      `Source: https://electiondata.my${path}`,
      "",
      body,
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim() + "\n"
  );
}

export function markdownToText(markdown: string): string {
  return (
    markdown
      .replace(/```[\w-]*\n([\s\S]*?)```/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/^\s*>\s?/gm, "")
      .replace(/\|/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

export function getAgentPrompt(pageUrl: string, markdownUrl: string): string {
  return [
    "Use the ElectionData.MY API documentation below as the source of truth.",
    `Page: ${pageUrl}`,
    `Markdown: ${markdownUrl}`,
    "",
    "Read the markdown version first. Then help me integrate or query the API using only the documented behavior.",
  ].join("\n");
}
