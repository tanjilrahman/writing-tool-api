import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");

// Define available writing styles with better descriptions
const WRITING_STYLES = {
  casual:
    "Casual, friendly, human like, everyday language with contractions and simple words",
  proofread:
    "Proofread the text for any errors and make sure it is grammatically correct. Do not change the meaning of the text.",
  professional: "Business-appropriate language that's clear and direct",
  persuasive: "Compelling language that drives action",
  freestyle: "", // Custom instructions will be provided at runtime
};

// Helper function to handle CORS
function corsResponse(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return corsResponse(
    new NextResponse(null, {
      status: 204,
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { text, style, freestyle } = await req.json();

    // Validate required fields
    if (!text) {
      return corsResponse(
        NextResponse.json({ error: "Text is required" }, { status: 400 })
      );
    }

    // Initialize the model with improved configuration
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: style === "proofread" ? 0.1 : 0.7,
        topP: style === "proofread" ? 0.5 : 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Prepare the prompt based on style and freestyle
    const basePrompt =
      style === "freestyle"
        ? `You are a helpful writing assistant. The user has provided some text and instructions for how to help with it.
         
         Instructions: ${freestyle}
         
         Text: "${text}"
         
         Provide a response that follows the user's instructions. Return ONLY your response.`
        : style === "proofread"
        ? `You are a professional proofreader. Review the text for grammar, spelling, and punctuation errors only.
         Make minimal changes to fix these errors while preserving the exact meaning, tone, and style of the original text.
         If the text is already correct, return it unchanged.
         
         Return ONLY your corrected version of the text:
         
         Text to proofread: "${text}"`
        : `You are a professional writing assistant. Your task is to improve the given text by making it more ${
            WRITING_STYLES[style as keyof typeof WRITING_STYLES]
          }. 

         Return ONLY your improved version of the text:
         
         Text to improve: "${text}"`;

    // Generate the response
    const result = await model.generateContent(basePrompt);
    const response = await result.response;
    const generatedText = response.text();

    return corsResponse(
      NextResponse.json({
        result: generatedText,
      })
    );
  } catch (error) {
    console.error("Error processing writing request:", error);
    return corsResponse(
      NextResponse.json(
        { error: "Failed to process writing request" },
        { status: 500 }
      )
    );
  }
}
