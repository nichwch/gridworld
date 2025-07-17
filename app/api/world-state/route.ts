import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getWorldDescription, getAgentName } from "@/app/World";

const adjacencyPrompt = `
MOVEMENT RULES: 
DEFAULT: Agents can only move to adjacent cells (one cell at a time). This is the standard movement rule.
EXCEPTION: Non-adjacent movement is allowed ONLY when there is a clear magical, supernatural, or special ability explanation.

Cells are adjacent if BOTH their row AND column are within 1 of each other.

Standard adjacent movement from (1,1):
(1,1) → (1,2) ✓ Same row, column differs by 1
(1,1) → (2,1) ✓ Row differs by 1, same column  
(1,1) → (2,2) ✓ Both row and column differ by 1
(1,1) → (1,0) ✓ Same row, column differs by 1
(1,1) → (0,1) ✓ Row differs by 1, same column
(1,1) → (0,0) ✓ Both row and column differ by 1

Non-adjacent movement is acceptable ONLY with proper justification:
✓ "<Wizard> teleports using magic from (1,1) to (5,8)"
✓ "<Knight> is thrown by an explosion from (2,2) to (5,5)"
✓ "<Rogue> uses shadow step ability to move from (3,3) to (8,1)"
✓ "<Dragon> flies from (0,0) to (10,10)"

FORBIDDEN: Non-adjacent movement without explanation:
✗ "<Knight> moves from (1,1) to (5,8)" (no explanation for long distance)
✗ "<Farmer> walks from (2,2) to (8,8)" (ordinary person, no special ability)

IF an agent attempts unexplained non-adjacent movement, they should move to an adjacent cell in the desired direction instead.`;

const singleAgentRulePrompt = `
CRITICAL RULE: ONLY ONE AGENT CAN OCCUPY A CELL AT ANY TIME. NO EXCEPTIONS.

This means:
- NEVER put multiple agents in the same cell content
- NEVER write things like "<Agent1> and <Agent2> are fighting here"
- NEVER write things like "<Agent1> is here, and <Agent2> arrives"
- NEVER combine multiple agent names in a single cell

CORRECT examples of single agent occupancy:
✓ "<Knight> is wounded"
✓ "<Druid> is casting a spell"
✓ "<Wizard> is dead"
✓ "<Rogue> is hiding in the shadows"

FORBIDDEN examples of multiple agent occupancy:
✗ "<Knight> and <Druid> are fighting"
✗ "<Knight> is here, and <Druid> is also here"
✗ "<Knight> defeats <Druid>" (implies both are in the same cell)
✗ "<Knight> fights <Druid> here"
✗ "<Knight> is with <Druid>"
✗ "<Knight> and <Druid>"

If agents interact with each other:
- Put the PRIMARY agent (the one taking action) in their target cell
- Put the SECONDARY agent (the one being acted upon) in a different cell or modify their state in their current cell
- Use the explanation field to describe the interaction between agents

Example of correct agent interaction:
If Knight attacks Druid at (2,2), and Knight moves from (1,1) to (2,2):
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": ""
    },
    {
      "row": 2,
      "col": 2,
      "newContent": "<Knight> stands victorious"
    },
    {
      "row": 2,
      "col": 3,
      "newContent": "<Druid> is wounded and retreated"
    }
  ],
  "explanation": "Knight attacked Druid, forcing the Druid to retreat to an adjacent cell"
}

REMEMBER: Each cell can contain AT MOST one agent name. If you need to describe interactions, use the explanation field and separate the agents into different cells.`;

const agentActionToJson = async (agentAction: string, worldString:string, worldDescription:string, apiKey: string): Promise<string> => {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: `
An AI agent has made a decision in a text-based gridworld game.
Your job is to convert their decision into a JSON object that represents the changes that should occur in the world.

Here is the agent action:
${agentAction}

Here is the world description:
${worldDescription}

Here is the world state:
${worldString}

Based on the agent actions, determine what changes should occur in the world. Consider:
- How agents might move or interact with objects
- What new objects or structures might be created by agents
- How existing objects might be modified or destroyed by agents
- How agents' states/conditions might change (injured, empowered, etc.)

IMPORTANT: Only output changes that are DIRECTLY caused by the agent's action. Do not include:
- Environmental changes that happen independently (fire spreading, plants growing)
- Actions by non-agent entities (minions, drones, traps)
- Natural processes or automatic effects

Focus solely on what THIS SPECIFIC AGENT does and its immediate consequences.

${singleAgentRulePrompt}

${adjacencyPrompt}

IMPORTANT: You can change agent states by modifying their cell content on the board. For example:
- "<Knight> is wounded" (if the knight gets injured)
- "<Druid> is planting a tree" (if the druid starts an action)
- "<Wizard> is casting a spell" (if the wizard begins magic)

CRITICAL MOVEMENT RULE: When moving an agent, you MUST include TWO changes:
1. Clear the OLD location by setting it to "" (empty string)
2. Set the NEW location with the agent's updated content

NEVER leave an agent in their old location when moving them - this creates duplicates!

Example of CORRECT movement (two changes):
- Change 1: Row X, Col Y → "" (clear old location)
- Change 2: Row A, Col B → "<Agent> new state" (set new location)

Example of INCORRECT movement (creates duplicates):
- Change 1: Row A, Col B → "<Agent> new state" (missing the clear old location step)

When updating agents, make sure you preserve their initial state and only add statuses on. If a status will affect agents in future turns, include it in their state. 

Agent states are derived from their board representation before each turn, so any changes you make to agent cells will update their current state.

Respond with a JSON object containing the changes to apply to the world grid. Use this format:
{
  "changes": [
    {
      "row": number,
      "col": number,
      "newContent": "string description of new cell content"
    }
  ],
  "explanation": "Brief explanation of what happened this turn"
}

Here are some examples of valid changes:

1. Move Knight from (1,1) to (1,2) - Adjacent movement
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": ""
    },
    {
      "row": 1,
      "col": 2,
      "newContent": "<Knight> is at (1,2)"
    }
  ],
  "explanation": "The knight moved from (1,1) to (1,2)"
}

2. Update Knight state without movement
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": "<Knight> is wounded"
    }
  ],
  "explanation": "The knight was wounded but remains in place"
}

Only include cells that actually change. Empty cells should have newContent as an empty string "".
      `,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content || "{}";
};

const generateEnvironmentalActions = async (worldString: string, worldDescription: string, apiKey: string): Promise<AgentActionJson[]> => {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  // Generate environmental actions in one step
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: `
Examine this gridworld state and generate actions for environmental elements that could act this turn.
Environmental actors include things like:
- Minions, drones, or autonomous creatures
- Traps or mechanisms that activate
- Weather effects or environmental hazards
- Magical effects or spells in progress
- Growing plants or spreading fires
- Any non-agent entities that could cause changes

World Description: ${worldDescription}

Current World State:
${worldString}

Generate specific actions for environmental elements and convert them directly to world state changes.

${singleAgentRulePrompt}

${adjacencyPrompt}

Return a JSON object with an array of environmental actions. Each action should follow this format:
{
  "environmentalActions": [
    {
      "changes": [
        {
          "row": number,
          "col": number,
          "newContent": "string description of new cell content"
        }
      ],
      "explanation": "Brief explanation of what environmental change occurred"
    }
  ]
}

Examples of environmental changes:

1. Fire spreading from (2,3) to (2,4)
{
  "environmentalActions": [
    {
      "changes": [
        {
          "row": 2,
          "col": 4,
          "newContent": "Fire spreads hungrily"
        }
      ],
      "explanation": "Fire spread from (2,3) to the dry grass at (2,4)"
    }
  ]
}

2. Minion moving and trap activating - Adjacent movement only
{
  "environmentalActions": [
    {
      "changes": [
        {
          "row": 5,
          "col": 1,
          "newContent": ""
        },
        {
          "row": 4,
          "col": 1,
          "newContent": "Goblin minion patrols"
        }
      ],
      "explanation": "Goblin minion moved from (5,1) to adjacent (4,1) on patrol"
    },
    {
      "changes": [
        {
          "row": 3,
          "col": 3,
          "newContent": "Spikes shoot up from trap"
        }
      ],
      "explanation": "Pressure plate trap activated and shot spikes"
    }
  ]
}

If no environmental actions are needed, return: {"environmentalActions": []}

Only include cells that actually change. Empty cells should have newContent as an empty string "".
        `,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  
  const response = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(response);
  return parsed.environmentalActions || [];
};

const adjudicateConflicts = async (actionsWithConflicts: AgentActionJson[][], worldDescription:string, worldString:string, apiKey: string) => {
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });

    const prompt = `You are managing a text-based gridworld game. Your role is to determine how the world changes based on agent actions.

Here are a list of JSON actions agents have produced. You must reconcile these changes to ensure that the world state is consistent.
Agents may act in ways that are inconsistent with each other. For example, they may move to the same cell, or they may kill the same agent. 
They may fight with each other, both claiming victory - it is your job to adjudicate these conflicts.  

World Description: ${worldDescription}

Current World State:
${worldString}

Conflicting Agent Actions This Turn:
${actionsWithConflicts.map((actions: AgentActionJson[], index: number) => 
  `Conflict set ${index + 1}. ${actions.map((action: AgentActionJson) => action.explanation).join("\n")}`).join("\n")
}

Based on the agent actions, determine what changes should occur in the world. Consider:
- How agents might move or interact with objects
- What new objects or structures might be created
- How existing objects might be modified or destroyed
- Environmental changes that might occur. Remember, non-agent tiles can also create changes in the world!
- How agents' states/conditions might change (injured, empowered, etc.)

${singleAgentRulePrompt}

${adjacencyPrompt}

IMPORTANT: You can change agent states by modifying their cell content on the board. For example:
- "<Knight> is wounded" (if the knight gets injured)
- "<Druid> is planting a tree" (if the druid starts an action)
- "<Wizard> is casting a spell" (if the wizard begins magic)

CRITICAL MOVEMENT RULE: When moving an agent, you MUST include TWO changes:
1. Clear the OLD location by setting it to "" (empty string)
2. Set the NEW location with the agent's updated content

NEVER leave an agent in their old location when moving them - this creates duplicates!

Example of CORRECT movement (two changes):
- Change 1: Row X, Col Y → "" (clear old location)
- Change 2: Row A, Col B → "<Agent> new state" (set new location)

Example of INCORRECT movement (creates duplicates):
- Change 1: Row A, Col B → "<Agent> new state" (missing the clear old location step)

When updating agents, make sure you preserve their initial state and only add statuses on. If a status will affect agents in future turns, include it in their state. 

Agent states are derived from their board representation before each turn, so any changes you make to agent cells will update their current state.

Respond with a JSON object containing the changes to apply to the world grid, with conflicts resolved. Use this format:
{
  "changes": [
    {
      "row": number,
      "col": number,
      "newContent": "string description of new cell content"
    }
  ],
  "explanation": "Brief explanation of what happened this turn"
}

Here are some examples of valid changes:

1. Move Knight from (1,1) to (1,2) - Adjacent movement (TWO CHANGES REQUIRED)
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": ""
    },
    {
      "row": 1,
      "col": 2,
      "newContent": "<Knight> is at (1,2)"
    }
  ],
  "explanation": "The knight moved from (1,1) to (1,2)"
}

2. Wizard teleports using magic - Non-adjacent movement with justification (TWO CHANGES REQUIRED)
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": ""
    },
    {
      "row": 5,
      "col": 8,
      "newContent": "<Wizard> appears in a flash of light"
    }
  ],
  "explanation": "The wizard cast a teleportation spell to move from (1,1) to (5,8)"
}

3. Update Knight state in place - No movement (ONE CHANGE ONLY)
{
  "changes": [
    {
      "row": 1,
      "col": 1,
      "newContent": "<Knight> is wounded"
    }
  ],
  "explanation": "The knight was wounded but remains at (1,1)"
}

Only include cells that actually change. Empty cells should have newContent as an empty string "".

FINAL VALIDATION: Before submitting your response, double-check that:
- No cell contains multiple agent names
- No duplicate agents exist on the board (each agent appears in exactly ONE cell)
- All agent interactions are properly separated into different cells
- If an agent moved, their old location is cleared (set to empty string "")
- Each agent has only ONE location on the board`;

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that manages world state changes in a text-based game. Always respond with valid JSON in the exact format requested. Be logical and consistent with how agents interact with the world. You can modify agent states by changing their cell content on the board.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(responseText);
}

const summarizeChanges = async (changes: AgentActionJson[], worldDescription:string, worldString:string, apiKey: string) => {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  const prompt = `
You are a storyteller summarizing the events of a turn in a fantasy adventure game.

World Setting: ${worldDescription}

Changes that occurred this turn:
${changes.map(change => change.explanation).join('; ')}

Write a single descriptive paragraph that captures the essence of what happened this turn. Focus on:
- The actions and events that took place
- Character interactions and developments
- Environmental changes or effects
- The overall narrative flow

Do NOT reference:
- Grid coordinates or positions
- Technical game mechanics
- Cell contents or movements

Write in an engaging, narrative style as if describing events in a story. Be descriptive but concise - aim for 2-4 sentences that paint a vivid picture of the turn's events.

Output only the summary paragraph, nothing else.
  `
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0]?.message?.content || "No changes occurred this turn.";
}

// Helper function to apply changes to a world grid (simulation)
const simulateWorldChanges = (originalWorld: string[][], changes: { row: number; col: number; newContent: string }[]): string[][] => {
  // Create deep copy of the world
  const newWorld = originalWorld.map(row => [...row]);
  
  // Apply all changes
  for (const change of changes) {
    if (change.row >= 0 && change.row < newWorld.length && 
        change.col >= 0 && change.col < newWorld[0].length) {
      newWorld[change.row][change.col] = change.newContent;
    }
  }
  
  return newWorld;
};

// Function to detect agent-level conflicts
const detectAgentConflicts = (originalWorld: string[][], allChanges: { row: number; col: number; newContent: string }[]): {
  duplicatedAgents: { name: string; locations: { row: number; col: number }[] }[];
  missingAgents: { name: string; originalLocation: { row: number; col: number } }[];
} => {
  // Get original agents from the world
  const originalAgents = new Map<string, { row: number; col: number }>();
  for (let row = 0; row < originalWorld.length; row++) {
    for (let col = 0; col < originalWorld[row].length; col++) {
      const agentName = getAgentName(originalWorld[row][col]);
      if (agentName) {
        originalAgents.set(agentName, { row, col });
      }
    }
  }

  // Simulate the world after all changes
  const newWorld = simulateWorldChanges(originalWorld, allChanges);
  
  // Count agent occurrences in the new world
  const agentLocations = new Map<string, { row: number; col: number }[]>();
  for (let row = 0; row < newWorld.length; row++) {
    for (let col = 0; col < newWorld[row].length; col++) {
      const agentName = getAgentName(newWorld[row][col]);
      if (agentName) {
        if (!agentLocations.has(agentName)) {
          agentLocations.set(agentName, []);
        }
        agentLocations.get(agentName)!.push({ row, col });
      }
    }
  }

  // Find duplicated agents (appearing in multiple cells)
  const duplicatedAgents: { name: string; locations: { row: number; col: number }[] }[] = [];
  for (const [agentName, locations] of agentLocations.entries()) {
    if (locations.length > 1) {
      duplicatedAgents.push({ name: agentName, locations });
    }
  }

  // Find missing agents (were in original world but not in new world)
  const missingAgents: { name: string; originalLocation: { row: number; col: number } }[] = [];
  for (const [agentName, originalLocation] of originalAgents.entries()) {
    if (!agentLocations.has(agentName)) {
      missingAgents.push({ name: agentName, originalLocation });
    }
  }

  return { duplicatedAgents, missingAgents };
};

// Function to resolve agent conflicts
const resolveAgentConflicts = async (
  duplicatedAgents: { name: string; locations: { row: number; col: number }[] }[],
  missingAgents: { name: string; originalLocation: { row: number; col: number } }[],
  originalWorld: string[][],
  worldDescription: string,
  apiKey: string
): Promise<AgentActionJson> => {
  if (duplicatedAgents.length === 0 && missingAgents.length === 0) {
    return { changes: [], explanation: "No agent conflicts to resolve" };
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  const worldString = originalWorld.map((row, rowIndex) => 
    row.map((cell, colIndex) => `(${rowIndex},${colIndex}): ${cell || "empty"}`).join(" | ")
  ).join("\n");

  const prompt = `You are managing a text-based gridworld game. Critical agent conflicts have been detected that must be resolved.

World Description: ${worldDescription}

Current World State:
${worldString}

AGENT CONFLICTS DETECTED:

${duplicatedAgents.length > 0 ? `DUPLICATED AGENTS (appearing in multiple cells):
${duplicatedAgents.map(agent => 
  `- ${agent.name} appears at: ${agent.locations.map(loc => `(${loc.row},${loc.col})`).join(", ")}`
).join("\n")}` : ""}

${missingAgents.length > 0 ? `MISSING AGENTS (disappeared from the world):
${missingAgents.map(agent => 
  `- ${agent.name} was originally at (${agent.originalLocation.row},${agent.originalLocation.col}) but is now missing`
).join("\n")}` : ""}

You must resolve these conflicts by:

FOR DUPLICATED AGENTS:
- Keep the agent in ONE location that makes the most sense based on recent actions
- Remove the agent from all other duplicate locations (set those cells to empty "")
- Choose the location that best represents where the agent should logically be

FOR MISSING AGENTS:
- Restore the agent to their most logical location (usually their original position)
- Set their state to reflect their current condition

${singleAgentRulePrompt}

Respond with a JSON object containing the changes needed to fix these agent conflicts:
{
  "changes": [
    {
      "row": number,
      "col": number,
      "newContent": "string description of new cell content"
    }
  ],
  "explanation": "Brief explanation of how agent conflicts were resolved"
}

CRITICAL: Each agent must appear in exactly ONE cell after your changes. Empty cells should have newContent as an empty string "".`;

  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that resolves agent conflicts in a text-based game. Always respond with valid JSON in the exact format requested. Ensure each agent appears in exactly one location."
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const responseText = completion.choices[0]?.message?.content || "{}";
  console.log('agent conflict resolution')
  console.dir(responseText, { depth: null });
  return JSON.parse(responseText);
};

type AgentActionJson = {
  changes: {
    row: number;
    col: number;
    newContent: string;
  }[];
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    const { world, agentActions, worldDescription, apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is required" },
        { status: 400 }
      );
    }

    const worldString = getWorldDescription(world);
    
    // Convert agent actions to JSON
    const agentJsonActions = await Promise.all(agentActions.map(async (action: string) => agentActionToJson(action, worldString, worldDescription, apiKey)));
    const agentJsonActionsParsed = agentJsonActions.map((action: string) => JSON.parse(action));

    // Generate environmental actions
    const environmentalActions = await generateEnvironmentalActions(worldString, worldDescription, apiKey);
    

    // Combine agent and environmental actions
    const allActions = [...agentJsonActionsParsed, ...environmentalActions];

    const locationToActionMap: Record<string, AgentActionJson[]> = {};
    // find conflict in allActions (now including environmental actions)
    for (const action of allActions) {
      for (const change of action.changes) {
        const location = `${change.row},${change.col}`;
        if (!locationToActionMap[location]) {
          locationToActionMap[location] = [];
        }
        locationToActionMap[location].push(action);
      }
    }

    const actionsWithConflicts:AgentActionJson[][] = [];
    const actionsWithoutConflicts:AgentActionJson[] = [];
    for (const location in locationToActionMap) {
      const actions = locationToActionMap[location];
      if (actions.length > 1) {
        actionsWithConflicts.push(actions);
      } else {
        actionsWithoutConflicts.push(actions[0]);
      }
    }
    let changes:AgentActionJson[] = actionsWithoutConflicts;
    if (actionsWithConflicts.length > 0) {
      console.log("Adjudicating conflicts", actionsWithConflicts);
      const adjudicatedChanges = await adjudicateConflicts(actionsWithConflicts, worldDescription, worldString, apiKey);
      changes = [...changes, adjudicatedChanges];
    }

    // Detect and resolve agent-level conflicts (duplication/disappearance)
    const allChangesToApply = changes.map((change: AgentActionJson) => change.changes).flat();
    const agentConflicts = detectAgentConflicts(world, allChangesToApply);
    
    if (agentConflicts.duplicatedAgents.length > 0 || agentConflicts.missingAgents.length > 0) {
      console.log("Agent conflicts detected:", agentConflicts);
      const agentConflictResolution = await resolveAgentConflicts(
        agentConflicts.duplicatedAgents,
        agentConflicts.missingAgents,
        world,
        worldDescription,
        apiKey
      );
      changes = [...changes, agentConflictResolution];
      console.log("Agent conflicts resolved:", agentConflictResolution);
    }

    const summarizedChanges = await summarizeChanges(changes, worldDescription, worldString, apiKey);
    
    const res = {
      changes: changes.map((change: AgentActionJson) => change.changes).flat(),
      explanation: summarizedChanges
    }
    return NextResponse.json(res);
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    return NextResponse.json(
      { error: "Failed to generate world state" },
      { status: 500 }
    );
  }
} 