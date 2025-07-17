import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { type GameState, type Grid, parseAgentsFromWorld } from "@/app/World";

// Import the single agent rule from world-state route
const singleAgentRulePrompt = `
CRITICAL RULE: ONLY ONE AGENT CAN OCCUPY A CELL AT ANY TIME. NO EXCEPTIONS.

Agents are specified like this: "<AgentName> description of their state/action"
Environment elements are just descriptive text without angle brackets.

CORRECT examples:
✓ "<Knight> stands guard at the castle gate"
✓ "<Druid> is planting magical seeds"
✓ "<Wizard> studies ancient scrolls"
✓ "ancient oak tree"
✓ "crumbling stone wall"
✓ "" (empty cell)

FORBIDDEN examples:
✗ "<Knight> and <Druid> are fighting" (multiple agents in one cell)
✗ "<Knight> fights <Druid>" (implies both agents in same cell)
✗ "<Knight> is with <Druid>" (multiple agents)

REMEMBER: Each cell can contain AT MOST one agent (one <AgentName>). Environment elements have no angle brackets.`;

interface ScenarioData {
  grid: Grid;
  worldDescription: string;
}

// Generate grid and world description
const generateScenario = async (userDescription: string, apiKey: string): Promise<ScenarioData> => {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });
  const prompt = `
You are a creative game master tasked with creating a 15x15 gridworld scenario.

User's Description:
${userDescription}

${singleAgentRulePrompt}

Your task:
1. Create a 15x15 grid (exactly 15 rows, exactly 15 columns)
2. Place 3-6 sentient agents that fit the user's description
3. Add relevant terrain, objects, and structures around them
4. Create a world description that captures the essence of the scenario

SENTIENT AGENTS (can act, think, make decisions):
- Format: "<AgentName> description of their current state/action"
- These are the ONLY entities that can take actions in the game
- Examples: "<Knight> stands ready to defend", "<Wizard> studies magical tomes"

NON-SENTIENT ENVIRONMENT (static objects, terrain, structures):
- Format: Just descriptive text (no angle brackets)
- These are passive elements that agents can interact with but cannot act independently
- Examples: "ancient oak tree", "crumbling stone wall", "treasure chest", "rushing river"
- DO NOT make environment elements sentient or give them agency

Empty cells: "" (empty string)

Guidelines:
- Only 3-6 sentient agents total (those with <AgentName> format)
- Agents should be spread across the grid (not clustered)
- Each agent should have clear motivations and potential for interaction
- Fill the world with interesting but NON-SENTIENT terrain and objects
- Make the world engaging and ready for adventure

Respond with JSON in this exact format:
{
  "grid": [
    ["cell content", "cell content", ...], // exactly 15 columns
    // ... exactly 15 rows total
  ],
  "worldDescription": "A compelling description of this world and its current situation"
}

CRITICAL: The grid MUST be exactly 15x15. Each agent must appear exactly once on the grid.
`;

  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: "You are a creative game master who designs engaging gridworld scenarios. Always respond with valid JSON in the exact format requested. The grid must be exactly 15x15."
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 2000,
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error("No response from scenario generation");
  }

  return JSON.parse(response);
};

export async function POST(request: NextRequest) {
  try {
    const { worldDescription, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is required" },
        { status: 400 }
      );
    }

    // Step 1: Generate grid and world description
    const scenarioData = await generateScenario(worldDescription, apiKey);
    
    // Step 2: Parse agents from the generated grid
    const agents = parseAgentsFromWorld(scenarioData.grid, []);

    // Step 3: Create the complete GameState object
    const gameState: GameState = {
      worldDescription: scenarioData.worldDescription,
      history: [
        {
          world: scenarioData.grid,
          legend: {},
          cellToLegendMap: {},
          description: "Initial scenario setup",
        },
      ],
      agents: agents,
    };

    return NextResponse.json({ gameState });
  } catch (error) {
    console.error("Error generating scenario:", error);
    return NextResponse.json(
      { error: "Failed to generate scenario" },
      { status: 500 }
    );
  }
} 