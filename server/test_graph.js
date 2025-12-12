import dotenv from 'dotenv';
dotenv.config({ path: '../.env.production' }); // Try production env if .env missing
import { graph } from "./langgraph/graph.js";

const runTest = async () => {
    console.log("🚀 Starting Graph Test...");

    const mockState = {
        novelContext: {
            title: "Test Novel",
            genre: "都市情緣",
            settings: {},
            design_blueprint: { main_goal: "Test Goal" }
        },
        prevText: "Chapter 0 content...",
        memories: [],
        clues: [],
        characters: [{ name: "Protagonist", role: "Protagonist", description: "Test Character", status: "Active" }],
        tags: ["Sweet", "Urban"],
        tone: "一般",
        pov: "女主",
        useDeepSeek: false,
        plotState: {
            phase: "setup",
            instance_progress: 0,
            cycle_num: 1,
            sub_phase: "intro"
        }
    };

    try {
        const config = { configurable: { thread_id: "test_thread" } };
        const result = await graph.invoke(mockState, config);

        console.log("✅ Graph Execution Completed!");
        console.log("Draft Length:", result.draft ? result.draft.length : 0);
        console.log("Plot Phase:", result.plotState.phase);
        console.log("Critique Status:", result.critique ? result.critique.status : "N/A");
    } catch (error) {
        console.error("❌ Graph Execution Failed:", error);
    }
};

runTest();
