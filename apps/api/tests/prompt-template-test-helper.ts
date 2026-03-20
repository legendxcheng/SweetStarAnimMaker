import fs from "node:fs/promises";
import path from "node:path";

export async function ensureTestPromptTemplate(workspaceRoot: string) {
  const promptTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "master_plot.generate.txt",
  );

  await fs.mkdir(path.dirname(promptTemplatePath), { recursive: true });
  await fs.writeFile(
    promptTemplatePath,
    "Turn this premise into a master plot:\n{{premiseText}}",
    "utf8",
  );
}
