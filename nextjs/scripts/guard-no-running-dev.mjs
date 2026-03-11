import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function findConflictingNextDevProcesses(processTable, rootDir = projectRoot) {
  return processTable
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) return null;
      return { pid: match[1], command: match[2] };
    })
    .filter(Boolean)
    .filter(({ command }) => command.includes(rootDir))
    .filter(({ command }) => command.includes("next dev"))
    .filter(({ command }) => !command.includes("rg next dev"))
    .filter(({ command }) => !command.includes("ps -ax -o pid="));
}

function main() {
  const result = spawnSync("ps", ["-ax", "-o", "pid=", "-o", "command="], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error("Failed to inspect running processes.");
    process.exit(result.status ?? 1);
  }

  const conflicts = findConflictingNextDevProcesses(result.stdout, projectRoot);

  if (conflicts.length === 0) {
    console.log("No conflicting local Next.js dev server found.");
    return;
  }

  console.error("Refusing to build/deploy while `next dev` is running in this repo.");
  console.error("Stop the local dev server first to avoid corrupting `.next`.");
  for (const conflict of conflicts) {
    console.error(`- pid ${conflict.pid}: ${conflict.command}`);
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
