import "server-only";

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not configured");
}

const client = new OpenAI({ apiKey });

export const openai = client;
export default client;
export const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
