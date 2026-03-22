export interface ShotScriptItem {
  id: string;
  sceneId: string;
  segmentId: string;
  order: number;
  shotCode: string;
  shotPurpose: string;
  subjectCharacters: string[];
  environment: string;
  framing: string;
  cameraAngle: string;
  composition: string;
  actionMoment: string;
  emotionTone: string;
  continuityNotes: string;
  imagePrompt: string;
  negativePrompt: string | null;
  motionHint: string | null;
  durationSec: number | null;
}

export interface CurrentShotScriptSummary {
  id: string;
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  shotCount: number;
  totalDurationSec: number | null;
}

export interface CurrentShotScript {
  id: string;
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  shots: ShotScriptItem[];
}
