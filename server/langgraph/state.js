import { Annotation } from "@langchain/langgraph";

/**
 * @typedef {Object} NovelContext
 * @property {string} title
 * @property {string} genre
 * @property {Object} settings
 * @property {Object} design_blueprint
 */

/**
 * @typedef {Object} PlotState
 * @property {string} phase
 * @property {string} sub_phase
 * @property {string} arcName
 * @property {number} instance_progress
 * @property {number} cycle_num
 */

// Define the state channels
export const NovelGenerationState = Annotation.Root({
  // --- Static / Input Context ---
  /** @type {NovelContext} */
  novelContext: Annotation(),

  /** @type {string} Previous chapter content or summary */
  prevText: Annotation(),

  /** @type {Array<Object>} List of characters */
  characters: Annotation(),

  /** @type {Array<Object>} List of memories */
  memories: Annotation(),

  /** @type {Array<string>} List of clues */
  clues: Annotation(),

  /** @type {Array<string>} Style tags */
  tags: Annotation(),

  /** @type {string} Tone (e.g., "Generic", "Dark") */
  tone: Annotation(),

  /** @type {string} Point of View */
  pov: Annotation(),

  /** @type {boolean} Whether to use DeepSeek model */
  useDeepSeek: Annotation(),

  // --- Dynamic Flow State ---

  /** @type {PlotState} Current plot status (Director output) */
  plotState: Annotation(),

  /** @type {Object} Director's instructions */
  directorOutput: Annotation(),

  /** @type {Object} Detailed chapter plan (Planner output) */
  chapterPlan: Annotation(),

  /** @type {string} Generated draft text (Writer output) */
  draft: Annotation(),

  /** @type {Object} Editor's critique result */
  critique: Annotation(),

  // --- Feedback / Interrupt ---
  /** @type {string} Optional user feedback to guide revisions */
  userFeedback: Annotation(),

  // Output Metadata (Deltas for Frontend)
  new_memories: Annotation(),
  character_updates: Annotation(),
  new_clues: Annotation(),
  resolved_clues: Annotation(),
});
