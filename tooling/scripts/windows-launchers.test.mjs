import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

test("backend launcher pins the studio origin for the local smoke frontend", () => {
  const contents = fs.readFileSync(
    path.join(workspaceRoot, "start-backend.bat"),
    "utf8",
  );

  assert.match(
    contents,
    /set "STUDIO_ORIGIN=http:\/\/127\.0\.0\.1:14273,http:\/\/localhost:5173"/,
  );
});
