export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

// Scans from `startIdx` (the tag's opening `<`) to just past its closing `/>`,
// tracking string literals so brackets inside attribute strings (e.g. "string[]") aren't miscounted.
function scanJsxTagEnd(source: string, startIdx: number): number {
  let i = startIdx;
  let depth = 0;
  let inString: string | null = null;
  while (i < source.length) {
    const ch = source[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
    else if (depth === 0 && ch === "/" && source[i + 1] === ">") return i + 2;
    i++;
  }
  return i;
}

// Same string-aware scan, but for the matching close of a single `{` or `[` opened at `openIdx`.
function scanBalanced(source: string, openIdx: number): number {
  let depth = 0;
  let inString: string | null = null;
  let i = openIdx;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return i;
}

function extractAttr(tagText: string, attrName: string): string | null {
  const marker = `${attrName}=`;
  const idx = tagText.indexOf(marker);
  if (idx === -1) return null;
  const i = idx + marker.length;
  const openChar = tagText[i];
  if (openChar === '"') {
    const end = tagText.indexOf('"', i + 1);
    return tagText.slice(i + 1, end);
  }
  if (openChar === "{") {
    const end = scanBalanced(tagText, i);
    return tagText.slice(i + 1, end - 1);
  }
  return null;
}

function evalExpr(exprText: string): any {
  return new Function(`return (${exprText});`)();
}

function replaceSelfClosingTag(source: string, tagName: string, transform: (tagText: string) => string): string {
  const tagMatcher = new RegExp(`<(${tagName})\\b`, "g");
  let result = "";
  let idx = 0;
  while (true) {
    tagMatcher.lastIndex = idx;
    const m = tagMatcher.exec(source);
    if (!m) {
      result += source.slice(idx);
      break;
    }
    result += source.slice(idx, m.index);
    const end = scanJsxTagEnd(source, m.index + m[0].length);
    result += transform(source.slice(m.index, end));
    idx = end;
  }
  return result;
}

function paramsTable(items: Array<{ name: string; type: string; required?: boolean; description: string }>): string {
  const rows = items.map(p => `| \`${p.name}\` | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description} |`);
  return ["| Name | Type | Required | Description |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

function fieldsTable(items: Array<{ name: string; type: string; description: string }>): string {
  const rows = items.map(f => `| \`${f.name}\` | ${f.type} | ${f.description} |`);
  return ["| Name | Type | Description |", "| --- | --- | --- |", ...rows].join("\n");
}

// Converts an OpenAPI endpoint page's raw MDX body into plain markdown for the
// "Copy as Markdown" button — swapping site-specific components (EndpointCard,
// TabCode, FieldTable, etc.) for their plain-markdown equivalents.
export function mdxToAiMarkdown(content: string): string {
  let out = content;

  out = out.replace(/<TokenInput\s*\/>\n?/g, "");
  out = out.replace(/<\w*ApiTester\s*\/>\n?/g, "");

  out = replaceSelfClosingTag(out, "EndpointBadge", tagText => {
    const method = extractAttr(tagText, "method") ?? "";
    const url = extractAttr(tagText, "url") ?? "";
    return `**${method}** \`${url}\``;
  });

  out = replaceSelfClosingTag(out, "EndpointCard", tagText => {
    const method = extractAttr(tagText, "method") ?? "";
    const url = extractAttr(tagText, "url") ?? "";
    const paramsExpr = extractAttr(tagText, "params");
    const params = paramsExpr ? evalExpr(paramsExpr) : [];
    const header = `**${method}** \`${url}\``;
    return params.length ? `${header}\n\n${paramsTable(params)}` : header;
  });

  out = replaceSelfClosingTag(out, "FieldTable", tagText => {
    const fieldsExpr = extractAttr(tagText, "fields");
    const fields = fieldsExpr ? evalExpr(fieldsExpr) : [];
    return fieldsTable(fields);
  });

  out = replaceSelfClosingTag(out, "TabCode", tagText => {
    const curlExpr = extractAttr(tagText, "curl");
    const curl = curlExpr ? evalExpr(curlExpr) : "";
    return "```bash\n" + curl + "\n```";
  });

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let inCodeFence = false;

  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length as 2 | 3;
      const raw = match[2].trim();
      const text = stripInlineMarkdown(raw);
      const id = slugify(text);
      items.push({ id, text, level });
    }
  }

  return items;
}
