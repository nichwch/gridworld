// Extract agent name from text (returns just the name without brackets)
export const getAgentName = (text: string) => {
  if (text.length === 0) return null;

  // Use a capturing group to extract just the name inside the brackets
  const regex = new RegExp(`<([^<>]+)>`);
  const match = text.match(regex);

  return match ? match[1] : null;
};

export type Grid = string[][];

export interface Agent {
  name: string;
  color: string;
  currentState: string;
  location: { row: number; col: number };
  privateHistory: {
    action: string;
    agentState: string;
    location: { row: number; col: number };
  }[];
}

export interface Legend {
  [key: string]: string;
}

export interface CellToLegendMap {
  [key: string]: string;
}

export interface TurnState {
  world: Grid;
  legend: Legend;
  cellToLegendMap: CellToLegendMap;
  description: string;
}

export interface GameState {
  worldDescription: string;
  history: TurnState[];
  agents: Agent[];
}

export interface WorldChange {
  row: number;
  col: number;
  newContent: string;
}

export interface WorldStateResponse {
  changes: WorldChange[];
  explanation: string;
}

export const initializeEmptyWorld = (rows: number, cols: number): Grid => {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
};

// Create a concise description of the world showing only non-empty cells
export const getWorldDescription = (world: Grid): string => {
  const nonEmptyCells: string[] = [];

  world.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.trim() !== "") {
        nonEmptyCells.push(`(${rowIndex},${colIndex}): ${cell}`);
      }
    });
  });

  return nonEmptyCells.length > 0
    ? nonEmptyCells.join("\n")
    : "The world is empty.";
};

export const parseAgentsFromWorld = (
  world: Grid,
  existingAgents: Agent[]
): Agent[] => {
  // Find all agents in the world with their locations
  const agentsInWorld: {
    name: string;
    state: string;
    location: { row: number; col: number };
  }[] = [];

  world.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const agentName = getAgentName(cell);
      if (agentName !== null) {
        agentsInWorld.push({
          name: agentName,
          state: cell,
          location: { row: rowIndex, col: colIndex },
        });
      }
    });
  });

  const newAgents = agentsInWorld.filter(
    (agent) => !existingAgents.some((a) => a.name === agent.name)
  );

  const removedAgents = existingAgents.filter(
    (agent) => !agentsInWorld.some((a) => a.name === agent.name)
  );

  // Remove agents that are no longer in the world
  existingAgents = existingAgents.filter(
    (agent) => !removedAgents.some((a) => a.name === agent.name)
  );

  // Update existing agents with new state and location, and record history
  existingAgents = existingAgents.map((agent) => {
    const newAgent = agentsInWorld.find((a) => a.name === agent.name);
    if (newAgent) {
      return {
        ...agent,
        currentState: newAgent.state,
        location: { row: newAgent.location.row, col: newAgent.location.col },
      };
    }
    return agent;
  });

  // Add new agents with their location and empty history
  const newAgentObjects: Agent[] = newAgents.map((agent) => ({
    name: agent.name,
    color: "red",
    currentState: agent.state,
    location: agent.location,
    privateHistory: [],
  }));

  return [...existingAgents, ...newAgentObjects];
};

// Apply world changes to create a new grid
const applyWorldChanges = (
  currentWorld: Grid,
  changes: WorldChange[]
): Grid => {
  // Create a deep copy of the current world
  const newWorld = currentWorld.map((row) => [...row]);

  // Apply each change
  changes.forEach((change) => {
    if (
      change.row >= 0 &&
      change.row < newWorld.length &&
      change.col >= 0 &&
      change.col < newWorld[0].length
    ) {
      newWorld[change.row][change.col] = change.newContent;
    }
  });

  return newWorld;
};

// Get next world state by calling the GPT-4 API
const getNextWorldState = async (
  currentWorld: Grid,
  agentActions: string[],
  worldDescription: string,
  apiKey: string
): Promise<WorldStateResponse> => {
  try {
    const response = await fetch("/api/world-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        world: currentWorld,
        agentActions,
        worldDescription,
        apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const worldStateResponse: WorldStateResponse = await response.json();
    return worldStateResponse;
  } catch (error) {
    console.error("Error getting next world state:", error);
    return {
      changes: [],
      explanation: "No changes occurred this turn due to an error.",
    };
  }
};

// Generate the next turn state based on agent actions
export const getNextTurnState = async (
  gameState: GameState,
  setLoadingAgents: (
    agentActions: { agent: Agent; action: string }[] | null
  ) => void,
  apiKey: string
): Promise<GameState> => {
  const { worldDescription, history } = gameState;
  const newAgents = parseAgentsFromWorld(
    history[history.length - 1].world,
    gameState.agents
  );
  gameState.agents = newAgents;
  const { agents } = gameState;

  const currentTurnState = history[history.length - 1];
  const currentGrid = currentTurnState.world;

  setLoadingAgents(null);
  // Calculate actions for all agents
  const agentActionStrings = await Promise.all(
    agents.map((agent) =>
      calculateAgentAction(agent, currentGrid, worldDescription, apiKey)
    )
  );

  // Create agent action objects with agent and action
  const agentActions = agents.map((agent, index) => ({
    agent,
    action: agentActionStrings[index],
  }));

  setLoadingAgents(agentActions);
  console.log("Agent actions:", agentActions);

  // Get the next world state from GPT-4
  const worldStateResponse = await getNextWorldState(
    currentGrid,
    agentActionStrings,
    worldDescription,
    apiKey
  );

  console.log("World changes:", worldStateResponse);

  // Apply the changes to create the new world
  const newWorld = applyWorldChanges(currentGrid, worldStateResponse.changes);

  // Create a new turn state with the updated world
  const newTurnState: TurnState = {
    world: newWorld,
    legend: currentTurnState.legend,
    cellToLegendMap: currentTurnState.cellToLegendMap,
    description: worldStateResponse.explanation,
  };

  // Update agents based on the new world state
  const updatedAgents = parseAgentsFromWorld(newWorld, agents);

  return {
    ...gameState,
    history: [...history, newTurnState],
    agents: updatedAgents,
  };
};

// Calculate agent action by calling the GPT-4 API
const calculateAgentAction = async (
  agent: Agent,
  world: Grid,
  description: string,
  apiKey: string
): Promise<string> => {
  try {
    const response = await fetch("/api/agent-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent,
        world,
        description,
        apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // update agent's private history
    agent.privateHistory.push({
      action: data.action,
      agentState: agent.currentState,
      location: agent.location,
    });
    return data.action;
  } catch (error) {
    console.error("Error calculating agent action:", error);
    return "The agent hesitates, unsure of what to do next.";
  }
};
