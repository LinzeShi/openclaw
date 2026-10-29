import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { useAutoCleanupTempDirTracker } from "openclaw/plugin-sdk/test-env";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  createTestRuntime,
  pathResolveCommand,
  pathSetCommand,
  stdoutText,
} from "./cli.test-support.js";

describe("openclaw path CLI insertions", () => {
  const tempDirs = useAutoCleanupTempDirTracker(afterEach);

  it.each(["jsonc", "yaml"])("inserts through dotted paths in %s", async (kind) => {
    const filePath = join(tempDirs.make("oc-path-cli-"), `config.${kind}`);
    for (const [path, before, value, expected] of [
      [
        "plugins.entries.+example",
        '{"plugins":{"entries":{}}}',
        "true",
        { plugins: { entries: { example: true } } },
      ],
      [
        'plugins/"entry.name".+',
        '{"plugins":{"entry.name":[1]}}',
        "2",
        { plugins: { "entry.name": [1, 2] } },
      ],
      [
        "plugins/entries/items.+1",
        '{"plugins":{"entries":{"items":[1,3]}}}',
        "2",
        { plugins: { entries: { items: [1, 2, 3] } } },
      ],
      [
        "plugins/entries/+literal.dot",
        '{"plugins":{"entries":{}}}',
        "true",
        { plugins: { entries: { "literal.dot": true } } },
      ],
    ] as const) {
      writeFileSync(filePath, before, "utf8");
      const address = `oc://config.${kind}/${path}`;
      const resolved = createTestRuntime();
      await pathResolveCommand(address, { file: filePath, json: true }, resolved);
      const rt = createTestRuntime();
      await pathSetCommand(address, value, { file: filePath, json: true }, rt);
      expect(rt.exitCode, stdoutText(rt)).toBe(0);
      expect(JSON.parse(stdoutText(resolved)).match, address).toMatchObject({
        kind: "insertion-point",
      });
      expect(parseYaml(readFileSync(filePath, "utf8")), address).toEqual(expected);
    }
  });
});
