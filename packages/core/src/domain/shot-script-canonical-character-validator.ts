import type { ShotScriptItem } from "@sweet-star/shared";

export interface ShotScriptCanonicalCharacterContext {
  characterId: string;
  characterName: string;
  promptTextCurrent: string;
  imageAssetPath?: string | null;
}

export interface ShotScriptCanonicalCharacterViolation {
  shotId: string;
  shotCode: string;
  field: "subject" | "visual" | "action";
  canonicalCharacterName: string;
  invalidText: string;
  message: string;
}

export interface ShotScriptCanonicalCharacterValidator {
  validateShots(shots: ShotScriptItem[]): ShotScriptCanonicalCharacterViolation[];
}

const genericSubstitutes = [
  "年轻男子",
  "年轻男人",
  "男子",
  "男人",
  "女人",
  "女生",
  "男特工",
  "女特工",
  "主角",
] as const;

export function buildShotScriptCanonicalCharacterValidator(
  characters: ShotScriptCanonicalCharacterContext[],
): ShotScriptCanonicalCharacterValidator {
  const approvedCharacters = characters
    .map((character) => ({
      ...character,
      aliases: buildAliases(character.characterName),
    }))
    .filter((character) => character.characterName.trim().length > 0);

  return {
    validateShots(shots) {
      return shots.flatMap((shot) => validateShot(shot, approvedCharacters));
    },
  };
}

function validateShot(
  shot: ShotScriptItem,
  approvedCharacters: Array<
    ShotScriptCanonicalCharacterContext & {
      aliases: string[];
    }
  >,
): ShotScriptCanonicalCharacterViolation[] {
  const violations: ShotScriptCanonicalCharacterViolation[] = [];
  const fields = {
    subject: shot.subject,
    visual: shot.visual,
    action: shot.action,
  } satisfies Record<"subject" | "visual" | "action", string>;

  for (const character of approvedCharacters) {
    if (!containsToken(fields.subject, character.characterName)) {
      const alias = character.aliases.find((candidate) => containsToken(fields.subject, candidate));

      if (alias) {
        violations.push(
          createViolation({
            shot,
            field: "subject",
            canonicalCharacterName: character.characterName,
            invalidText: alias,
            reason: "使用了未登记简称",
          }),
        );
        continue;
      }
    }

    if (!containsToken(fields.subject, character.characterName)) {
      continue;
    }

    for (const field of ["visual", "action"] as const) {
      if (containsToken(fields[field], character.characterName)) {
        continue;
      }

      const generic = genericSubstitutes.find((candidate) => containsToken(fields[field], candidate));

      if (!generic) {
        continue;
      }

      violations.push(
        createViolation({
          shot,
          field,
          canonicalCharacterName: character.characterName,
          invalidText: generic,
          reason: "描写了已批准角色，但未保留标准角色名",
        }),
      );
    }
  }

  return dedupeViolations(violations);
}

function createViolation(input: {
  shot: ShotScriptItem;
  field: "subject" | "visual" | "action";
  canonicalCharacterName: string;
  invalidText: string;
  reason: string;
}): ShotScriptCanonicalCharacterViolation {
  return {
    shotId: input.shot.id,
    shotCode: input.shot.shotCode,
    field: input.field,
    canonicalCharacterName: input.canonicalCharacterName,
    invalidText: input.invalidText,
    message: `shot ${input.shot.order} ${input.field} ${input.reason}“${input.invalidText}”，必须改为“${input.canonicalCharacterName}”`,
  };
}

function buildAliases(characterName: string) {
  const asciiTokens = characterName.match(/[A-Za-z0-9]+/g) ?? [];
  return [...new Set(asciiTokens.filter((token) => token !== characterName))];
}

function containsToken(text: string, token: string) {
  if (!text.trim() || !token.trim()) {
    return false;
  }

  if (/^[A-Za-z0-9]+$/.test(token)) {
    return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(token)}([^A-Za-z0-9]|$)`).test(text);
  }

  return text.includes(token);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeViolations(violations: ShotScriptCanonicalCharacterViolation[]) {
  const seen = new Set<string>();
  return violations.filter((violation) => {
    const key = [
      violation.shotId,
      violation.field,
      violation.canonicalCharacterName,
      violation.invalidText,
    ].join("::");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
