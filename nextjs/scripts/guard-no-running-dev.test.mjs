import test from "node:test";
import assert from "node:assert/strict";

import { findConflictingNextDevProcesses } from "./guard-no-running-dev.mjs";

test("findConflictingNextDevProcesses only flags next dev in the current repo", () => {
  const repoRoot = "/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs";
  const processTable = `
81308 node /Users/maxpetrusenko/Desktop/Gauntlet/Nerdy/frontend/node_modules/.bin/../next/dist/bin/next dev --hostname 0.0.0.0 --port 3000
59889 node /Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs/node_modules/.bin/next dev --port 3001
65431 /bin/bash -lc ps -ax -o pid= -o command= | rg "next dev|next/dist/bin/next"
65782 rg next dev|next/dist/bin/next
`;

  assert.deepEqual(findConflictingNextDevProcesses(processTable, repoRoot), [
    {
      pid: "59889",
      command:
        "node /Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs/node_modules/.bin/next dev --port 3001",
    },
  ]);
});
