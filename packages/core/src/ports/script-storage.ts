export interface StoredPremiseMetadata {
  premiseRelPath: string;
  premiseBytes: number;
}

export interface WritePremiseInput {
  storageDir: string;
  premiseText: string;
}

export interface DeletePremiseInput {
  storageDir: string;
}

export interface PremiseStorage {
  readPremise(
    input: DeletePremiseInput,
  ): Promise<string> | string;
  writePremise(
    input: WritePremiseInput,
  ): Promise<StoredPremiseMetadata> | StoredPremiseMetadata;
  deletePremise(
    input: DeletePremiseInput,
  ): Promise<void> | void;
}
