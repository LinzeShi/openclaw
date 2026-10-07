import MarkdownIt from "markdown-it";

const blockParser = new MarkdownIt({ html: true });

function stripTildeFencedCode(text: string): string {
  if (!text.includes("~~~")) {
    return text;
  }
  const lineOffsets = [0];
  for (const newline of text.matchAll(/\r\n?|\n/g)) {
    lineOffsets.push(newline.index + newline[0].length);
  }
  let cursor = 0;
  const parts: string[] = [];
  for (const token of blockParser.parse(text, {})) {
    if (token.type !== "fence" || token.markup[0] !== "~" || !token.map) {
      continue;
    }
    const [startLine, endLine] = token.map;
    const bodyLines = token.content
      ? token.content.split("\n").length - (token.content.endsWith("\n") ? 1 : 0)
      : 0;
    // A closed fence spans its opening line, body, and a closing line.
    // Preserve unfinished fences, which the parser also emits as fence tokens.
    if (endLine - startLine <= bodyLines + 1) {
      continue;
    }
    parts.push(text.slice(cursor, lineOffsets[startLine]), " ");
    cursor = lineOffsets[endLine] ?? text.length;
  }
  return parts.join("") + text.slice(cursor);
}

/**
 * Flattens Markdown into a single line of readable plain text.
 *
 * For one-line surfaces that render text verbatim — session-list previews,
 * sidebar narration — where unrendered syntax like `[title](url)` would leak
 * to the user. Lossy by design: it drops fenced code entirely and keeps only
 * link/image text, so it must not be used where the Markdown is rendered.
 */
export function flattenMarkdownToPlainText(text: string): string {
  return stripTildeFencedCode(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
    .replace(/(\*{1,2})(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\p{L}\p{N}])(_{1,2})(?=\S)([\s\S]*?\S)\2(?![\p{L}\p{N}])/gu, "$1$3")
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
