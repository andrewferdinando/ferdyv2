import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// This reads your key from Vercel
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  // Simple test you can run in a browser
  const task = new URL(req.url).searchParams.get("task");
  if (task === "ping") return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Use ?task=ping to test" }, { status: 400 });
}

export async function POST(req: NextRequest) {
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
}
