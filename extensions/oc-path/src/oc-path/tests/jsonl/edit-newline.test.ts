import { describe, expect, it } from "vitest";
import { parseJsonl } from "../../jsonl/parse.js";
import { parseOcPath } from "../../oc-path.js";
import { setOcPath } from "../../universal.js";

describe("JSONL edits preserve the final record separator", () => {
  it.each(["\n", "\r\n"])("keeps %j before a subsequent appended record", (newline) => {
    const raw = `{"event":"start"}${newline}{"event":"old"}${newline}`;
    const result = setOcPath(
      parseJsonl(raw).ast,
      parseOcPath("oc://events.jsonl/L2/event"),
      "updated",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ast.raw).toBe(`{"event":"start"}${newline}{"event":"updated"}${newline}`);
    const appended = `${result.ast.raw}{"event":"next"}${newline}`;
    expect(
      appended
        .trimEnd()
        .split(newline)
        .map((line) => JSON.parse(line)),
    ).toEqual([{ event: "start" }, { event: "updated" }, { event: "next" }]);
  });

  it("does not add a final separator to an unterminated file", () => {
    const result = setOcPath(
      parseJsonl('{"event":"old"}').ast,
      parseOcPath("oc://events.jsonl/L1/event"),
      "updated",
    );
    expect(result.ok && result.ast.raw).toBe('{"event":"updated"}');
  });

  it.each(["\n", "\r\n", ""])(
    "preserves %j when appending through an insertion path",
    (newline) => {
      const result = setOcPath(
        parseJsonl(`{"event":"start"}${newline}`).ast,
        parseOcPath("oc://events.jsonl/+"),
        '{"event":"next"}',
      );
      const separator = newline || "\n";
      expect(result.ok && result.ast.raw).toBe(
        `{"event":"start"}${separator}{"event":"next"}${newline}`,
      );
    },
  );

  it("retains trailing blank records across repeated edits", () => {
    let ast = parseJsonl('{"event":"start"}\n\n').ast;
    for (const value of ["updated", "again"]) {
      const result = setOcPath(ast, parseOcPath("oc://events.jsonl/L1/event"), value);
      expect(result.ok && result.ast.raw).toBe(`{"event":"${value}"}\n\n`);
      if (result.ok && result.ast.kind === "jsonl") {
        ast = result.ast;
      }
    }
  });
});
