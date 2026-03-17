export interface StoredScriptMetadata {
  scriptRelPath: string;
  scriptBytes: number;
}

export interface WriteOriginalScriptInput {
  storageDir: string;
  script: string;
}

export interface DeleteOriginalScriptInput {
  storageDir: string;
}

export interface ScriptStorage {
  writeOriginalScript(
    input: WriteOriginalScriptInput,
  ): Promise<StoredScriptMetadata> | StoredScriptMetadata;
  deleteOriginalScript(
    input: DeleteOriginalScriptInput,
  ): Promise<void> | void;
}
