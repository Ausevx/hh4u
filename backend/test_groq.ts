import { GroqLLMService } from './src/services/ai/groq/groqLLMService';
import * as dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    const groq = new GroqLLMService(process.env.GROQ_API_KEY!);
    const out1 = await groq.generatePersonalizedAnswer({
        originalQuery: "Hi, I have a headache.",
        templateText: "Take 1 pill of Arnica.",
        userLanguage: "English"
    });
    console.log("OUT1:", JSON.stringify(out1));

    const out2 = await groq.generatePersonalizedAnswer({
        originalQuery: "Quiero una pastilla para dolor de cabeza",
        templateText: "Toma 1 pastilla de Arnica.",
        userLanguage: "Spanish"
    });
    console.log("OUT2:", JSON.stringify(out2));
};

test();
