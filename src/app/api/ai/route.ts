import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Force dynamic rendering - this route must run at request time
export const dynamic = 'force-dynamic';

// Lazy initialization - only creates client when needed
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

export async function GET(req: NextRequest) {
  // Simple test you can run in a browser
  const task = new URL(req.url).searchParams.get("task");
  if (task === "ping") return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Use ?task=ping to test" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    // Check API key first
    const client = getClient();
    
    // This proves ChatGPT is reachable
    const body = await req.json().catch(() => ({}));
    if (body?.task === "ping") {
      const r = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Reply with the single word: PONG" },
          { role: "user", content: "Say it" }
        ],
        temperature: 0
      });
      const text = r.choices[0]?.message?.content?.trim() || "";
      return NextResponse.json({ ok: text === "PONG", text });
    }
    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI API error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
