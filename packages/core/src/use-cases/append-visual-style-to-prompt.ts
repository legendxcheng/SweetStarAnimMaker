export function appendVisualStyleToPrompt(promptText: string, visualStyleText: string) {
  const trimmedPrompt = promptText.trim();
  const trimmedVisualStyleText = visualStyleText.trim();

  if (!trimmedVisualStyleText) {
    return trimmedPrompt;
  }

  return `${trimmedPrompt}\n\n画面风格：${trimmedVisualStyleText}`;
}
