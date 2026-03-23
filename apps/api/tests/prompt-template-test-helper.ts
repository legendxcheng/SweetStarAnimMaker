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
  const shotScriptPromptTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "shot_script.generate.txt",
  );
  const characterPromptTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "character_sheet.prompt.generate.txt",
  );
  const characterTurnaroundTemplatePath = path.join(
    workspaceRoot,
    "prompt-templates",
    "character_sheet.turnaround.generate.txt",
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
  await fs.writeFile(
    shotScriptPromptTemplatePath,
    [
      "Turn this storyboard into shot script JSON:",
      "{{storyboard.title}}",
      "{{storyboard.scenes.0.segments.0.visual}}",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    characterPromptTemplatePath,
    [
      "Design a single reusable character appearance prompt for {{characterName}}.",
      "{{masterPlot.logline}}",
      "{{masterPlot.synopsis}}",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    characterTurnaroundTemplatePath,
    "Create a combined turnaround sheet for {{characterName}}.\n{{promptTextCurrent}}",
    "utf8",
  );
}
