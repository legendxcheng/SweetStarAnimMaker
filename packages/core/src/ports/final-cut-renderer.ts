export interface RenderFinalCutInput {
  manifestPath: string;
}

export interface FinalCutRenderer {
  render(input: RenderFinalCutInput): Promise<Uint8Array> | Uint8Array;
}
