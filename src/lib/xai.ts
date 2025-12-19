
import OpenAI from 'openai';

// Lazy initialization to avoid module-level errors
export function getXAIClient() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error('XAI_API_KEY environment variable is not set. Please add it to .env.local');
    }
    return new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
    });
}
