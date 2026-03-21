import fs from "node:fs/promises";
import path from "node:path";

export async function ensureTestPromptTemplate(workspaceRoot: string) {
  const masterPlotPromptTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "master_plot.generate.txt",
  );
  const storyboardPromptTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "storyboard.generate.txt",
  );

  await fs.mkdir(path.dirname(masterPlotPromptTemplatePath), { recursive: true });
  await fs.writeFile(
    masterPlotPromptTemplatePath,
    "Turn this premise into a master plot:\n{{premiseText}}",
    "utf8",
  );
  await fs.writeFile(
    storyboardPromptTemplatePath,
    [
      "Turn this master plot into storyboard scenes:",
      "{{masterPlot.title}}",
      "{{masterPlot.logline}}",
      "{{masterPlot.synopsis}}",
    ].join("\n"),
    "utf8",
  );
}
