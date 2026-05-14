import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.file_path;
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

const skipPrettier = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip)$/i;
const targetAbs = path.isAbsolute(norm) ? norm : path.join(root, relFromRoot);

const prettierBin = path.join(root, "node_modules", ".bin", "prettier");
const eslintBin = path.join(root, "node_modules", ".bin", "eslint");

const run = (bin, args) => {
  const r = spawnSync(bin, args, { cwd: root, stdio: "inherit" });
  return !r.error;
};

if (!skipPrettier.test(norm)) {
  run(prettierBin, ["--write", targetAbs]);
}

const eslintExt = /\.(mjs|cjs|js|jsx|ts|tsx|mts|cts)$/i;
if (eslintExt.test(norm)) {
  run(eslintBin, [relFromRoot, "--fix"]);
}

process.exit(0);
