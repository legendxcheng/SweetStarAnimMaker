import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const servicesPackageJsonPath = path.join(process.cwd(), "packages", "services", "package.json");
const require = createRequire(pathToFileURL(servicesPackageJsonPath));

try {
  const packageJsonPath = require.resolve("better-sqlite3/package.json");
  const packageDir = path.dirname(packageJsonPath);
  const nativeBindingPath = path.join(
    packageDir,
    "build",
    "Release",
    "better_sqlite3.node",
  );

  if (fs.existsSync(nativeBindingPath)) {
    console.log("better-sqlite3 binding already present");
    process.exit(0);
  }

  console.log("building better-sqlite3 native binding");

  const result = spawnSync("npm", ["run", "build-release"], {
    cwd: packageDir,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} catch (error) {
  console.warn("skipping better-sqlite3 native build", error);
}
