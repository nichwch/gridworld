import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Agent, getWorldDescription } from "@/app/World";

export async function POST(request: NextRequest) {
  try {
    const { agent, world, description, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });

    // Create a prompt for the agent action
    const prompt = `You are an AI agent in a text-based gridworld game. Your role is to determine what action this agent should take.

Remember, only one agent can occupy a cell at a time. DO NOT ALLOW MULTIPLE AGENTS TO OCCUPY THE SAME CELL. 
Do not reference the rules of the world state, or the fact that the world is a grid.

Agent Information:
- Name: ${agent.name}
- Color: ${agent.color}
- Current State: ${agent.currentState}
- Private History: ${(agent as Agent).privateHistory.map((entry)=>JSON.stringify(entry)).join(", ")}

World Description: ${description}

Current World State:
${getWorldDescription(world)}

Based on the agent's character, the current world state, and their private history, what should ${agent.name} do?

Respond with a a paragraph on what the agent does, as well as their inner monologue. This should be a paragraph or two. 
Focus on what the agent would logically do given their personality and situation. Don't reference the rules of the world state, or the fact that the world is a grid.

If the agent is dead, respond with "The agent is dead."`;

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates realistic actions for agents in a text-based game world. Be concise and focused on character-appropriate actions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const action = completion.choices[0]?.message?.content || "The agent considers their options.";

    return NextResponse.json({ action });
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    return NextResponse.json(
      { error: "Failed to generate agent action" },
      { status: 500 }
    );
  }
} 