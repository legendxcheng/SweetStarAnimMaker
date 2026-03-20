import { fileURLToPath } from "node:url";

import { buildApp } from "./app";
// @ts-expect-error runtime env loader lives outside this app tsconfig root
import { loadRootEnv } from "../../../tooling/env/load-env.mjs";

export { buildApp } from "./app";

async function start() {
  loadRootEnv();
  const app = buildApp();

  try {
    await app.listen({
      host: "127.0.0.1",
      port: 3000,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void start();
}