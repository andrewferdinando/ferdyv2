import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const dynamic = "force-dynamic";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

const requestSchema = z.object({
  text: z.string().min(1, "Text must not be empty"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { text } = parsed.data;
    const client = getClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.75,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a social media copywriter. The user will give you existing post copy. " +
            "Return exactly 5 alternative rewrites that keep the same core message but vary " +
            "the tone, structure, or hook. Each alternative should be a complete, ready-to-post caption. " +
            'Respond with a JSON object: { "alternatives": ["...", "...", "...", "...", "..."] }',
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "No response from AI" },
        { status: 500 },
      );
    }

    const result = JSON.parse(raw) as { alternatives?: string[] };

    if (!Array.isArray(result.alternatives) || result.alternatives.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Unexpected AI response format" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, alternatives: result.alternatives });
  } catch (err) {
    console.error("[regenerate-copy] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
