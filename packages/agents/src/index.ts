export {
  generateMorningBrief,
  type MorningBriefDeps,
  type MorningBriefResult,
  type BriefEvent,
  type BriefGoal,
  type LlmRouter,
} from './brief.morning';
export {
  generateEodReflection,
  type EodReflectionDeps,
  type EodReflectionResult,
} from './brief.eod';
export { generateAutolinkSummary, type AutolinkSummaryDeps } from './notes.autolink.summary';
export {
  decomposeGoal,
  weeksBetween,
  type DecomposeGoalDeps,
  type GoalDecomposeOutput,
} from './goal.decompose';
export {
  askGrounded,
  type AskGroundedDeps,
  type AskGroundedHit,
  type AskGroundedResult,
} from './notes.askGrounded';
export {
  extractGmailActions,
  type ExtractGmailDeps,
  type ExtractGmailResult,
  type GmailExtractionOutput,
} from './gmail.extract';
export * as stubs from './stubs/index.js';
