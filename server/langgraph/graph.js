import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { NovelGenerationState } from "./state.js";
import { directorNode, plannerNode, writerNode, editorNode } from "./nodes.js";

// ==========================================
// 🕸️ Graph Definition
// ==========================================

const shouldContinue = (state) => {
    const { critique } = state;
    if (critique && critique.status === "REWRITE_REQUIRED") {
        console.log("🔄 Rewrite required, looping back to Writer...");
        return "writer";
    }
    console.log("✅ Chapter passed checks, finishing...");
    return END;
};

const workflow = new StateGraph(NovelGenerationState)
    .addNode("director", directorNode)
    .addNode("planner", plannerNode)
    .addNode("writer", writerNode)
    .addNode("editor", editorNode)

    .addEdge(START, "director")
    .addEdge("director", "planner")
    .addEdge("planner", "writer")
    .addEdge("writer", "editor")
    .addConditionalEdges("editor", shouldContinue);

// Export the compiled graph
export const graph = workflow.compile({
    checkpointer: new MemorySaver()
});
