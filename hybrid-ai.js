import {
    getGenerativeModel,
    InferenceMode
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-ai.js";

import { ai } from "./firebase.js";

const hybridModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,

    onDeviceParams: {
        createOptions: {
            expectedInputs: [
                { type: "text", languages: ["en"] }
            ],
            expectedOutputs: [
                { type: "text", languages: ["en"] }
            ]
        }
    }
});

export async function askHybridAI(prompt) {
    const result = await hybridModel.generateContent(prompt);

    return {
        answer: result.response.text(),
        source: result.response.inferenceSource
    };
}