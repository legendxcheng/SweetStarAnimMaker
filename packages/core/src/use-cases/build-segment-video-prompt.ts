export function buildSegmentVideoPrompt(
  template: string,
  input: {
    segmentSummary: string;
    shotsSummary: string;
  },
) {
  return template
    .replaceAll("{{segment_summary}}", input.segmentSummary)
    .replaceAll("{{shots_summary}}", input.shotsSummary)
    .replaceAll("{{shot_summary}}", input.shotsSummary);
}
