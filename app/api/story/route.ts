import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getWorldDescription, type TurnState, type Agent } from "@/app/World";

export async function POST(request: NextRequest) {
  try {
    const { gameState, worldDescription, apiKey } = await request.json();
    
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
    
    // Get current world state
    const currentWorld = gameState.history[gameState.history.length - 1].world;
    const currentWorldString = getWorldDescription(currentWorld);
    
    // Build history context
    const historyContext = gameState.history.map((turn: TurnState, index: number) => {
      const worldDesc = getWorldDescription(turn.world);
      return `Turn ${index + 1}:\n${worldDesc}\nSummary: ${turn.description || "No summary available"}`;
    }).join("\n\n");
    
    // Create agents summary
    const agentsContext = gameState.agents.map((agent: Agent) => {
      return `${agent.name}: Located at (${agent.location.row}, ${agent.location.col}). Current state: ${agent.currentState}`;
    }).join("\n");

    const prompt = `
You are a master storyteller tasked with weaving together the events of a gridworld adventure into an engaging narrative.

WORLD SETTING:
${worldDescription}

CURRENT AGENTS:
${agentsContext}

CURRENT WORLD STATE:
${currentWorldString}

FULL HISTORY OF EVENTS:
${historyContext}

Your task is to create a compelling story that:
1. Captures the essence of this world and its inhabitants
2. Weaves together the sequence of events from the history
3. Brings the characters to life with personality and motivation
4. Creates narrative tension and intrigue
5. Describes the current state as the latest chapter in an ongoing saga

Write this as an engaging story narrative, not a technical summary. Use vivid descriptions, character development, and dramatic storytelling techniques. The story should feel like reading an excerpt from a fantasy novel or adventure tale.

Make the story approximately 200-400 words long.
`;

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are a master storyteller who specializes in creating engaging narratives from game states. Your stories are vivid, dramatic, and capture the imagination of readers."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const story = completion.choices[0]?.message?.content || "The tale remains untold...";

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error generating story:", error);
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 }
    );
  }
} 