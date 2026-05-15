import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.file_path ?? input.path;
if (!filePath || typeof filePath !== "string") {
  process.exit(0);
}

const root = path.join(__dirname, "..");
const norm = path.normalize(filePath);
const relFromRoot = path.isAbsolute(norm) ? path.relative(root, norm) : norm;

const resolved = path.resolve(root, relFromRoot);
const rootResolved = path.resolve(root);
if (!relFromRoot || (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep))) {
  process.exit(0);
}

const segments = relFromRoot.split(path.sep).filter(Boolean);
const top = segments[0] ?? "";
if (
  top === "node_modules" ||
  top === ".next" ||
  top === ".git" ||
  top === "coverage" ||
  top === "playwright-report" ||
  top === "test-results"
) {
  process.exit(0);
}

const skipPrettier = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip)$/i;
const targetAbs = path.isAbsolute(norm) ? norm : path.join(root, relFromRoot);

const prettierBin = path.join(root, "node_modules", ".bin", "prettier");
const eslintBin = path.join(root, "node_modules", ".bin", "eslint");

const run = (bin, args) => {
  const r = spawnSync(bin, args, { cwd: root, stdio: "inherit" });
  return !r.error && r.status === 0;
};

if (!skipPrettier.test(norm)) {
  if (!run(prettierBin, ["--write", targetAbs])) {
    process.exit(1);
  }
}

const eslintExt = /\.(mjs|cjs|js|jsx|ts|tsx|mts|cts)$/i;
if (eslintExt.test(norm)) {
  if (!run(eslintBin, [relFromRoot, "--fix"])) {
    process.exit(1);
  }
}

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

const runNpm = (args) => {
  const r = spawnSync(npmBin, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return !r.error && r.status === 0;
};

console.error(
  "\n[cursor hook] CI parity: prisma generate → typecheck → format (prettier --write .) → lint → vitest\n",
);

const ciSteps = [
  ["run", "db:generate"],
  ["run", "typecheck"],
  ["run", "format"],
  ["run", "lint"],
  ["test"],
];

for (const args of ciSteps) {
  if (!runNpm(args)) {
    console.error(`\n[cursor hook] failed: npm ${args.join(" ")}`);
    process.exit(1);
  }
}

process.exit(0);
