"use client";
import { useState, useEffect } from "react";
import {
  GameState,
  getNextTurnState,
  parseAgentsFromWorld,
  Agent,
} from "./World";
import Cell from "./Cell";
import OverlayTextarea from "./OverlayTextarea";
import Sidebar from "./Sidebar";
// import AgentActionsModal from "./AgentActionsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ForestGameStart } from "./GameStates";
import StoryModal from "./StoryModal";
import ScenarioModal from "./ScenarioModal";
import SettingsModal, { getStoredApiKey, hasApiKey } from "./SettingsModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const [gameState, setGameState] = useState<GameState>(ForestGameStart);
  const [loading, setLoading] = useState(false);
  const [loadedAgentActions, setLoadingAgents] = useState<
    { agent: Agent; action: string }[] | null
  >(null);

  // Settings modal and API key state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasValidApiKey, setHasValidApiKey] = useState(false);

  // Agent hover state
  const [hoveredAgentName, setHoveredAgentName] = useState<string | null>(null);

  // Check for API key on mount
  useEffect(() => {
    const storedKey = getStoredApiKey();
    setApiKey(storedKey);
    setHasValidApiKey(hasApiKey());
  }, []);

  const grid = gameState.history[gameState.history.length - 1].world;

  // Handle cell click to open modal
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
    setIsModalOpen(true);
  };

  // Handle textarea change to update cell content
  const handleCellContentChange = (newContent: string) => {
    if (selectedCell) {
      const newGrid = [...grid];
      newGrid[selectedCell.row][selectedCell.col] = newContent;
      gameState.history[gameState.history.length - 1].world = newGrid;
      setGameState({
        ...gameState,
        agents: parseAgentsFromWorld(newGrid, gameState.agents),
      });
    }
  };

  // Handle API key changes
  const handleApiKeyChange = (newApiKey: string | null) => {
    setApiKey(newApiKey);
    setHasValidApiKey(newApiKey !== null);
  };

  return (
    <div className="text-gray-500 h-screen flex flex-col">
      {/* navbar */}
      <div className="px-4 flex items-center border-b border-gray-500 sticky top-0 bg-white gap-2">
        <h1 className="font-semibold">gridworld</h1>
        <button
          className="cursor-pointer disabled:opacity-50"
          disabled={loading || !hasValidApiKey}
          onClick={async () => {
            setLoading(true);
            setLoadingAgents(null); // Reset agent actions
            const nextTurnState = await getNextTurnState(
              gameState,
              (agentActions) => {
                setLoadingAgents(agentActions);
              },
              apiKey!
            );
            setGameState(nextTurnState);
            setLoading(false);
          }}
        >
          {!loading && "next turn"}
          {loadedAgentActions === null && loading
            ? "agents are plotting..."
            : loading && "calculating world state..."}
        </button>
        <div
          className={!hasValidApiKey ? "opacity-50 pointer-events-none" : ""}
        >
          <StoryModal gameState={gameState} />
        </div>
        <div
          className={!hasValidApiKey ? "opacity-50 pointer-events-none" : ""}
        >
          <ScenarioModal
            onScenarioGenerated={(newGameState) => {
              setGameState(newGameState);
            }}
          />
        </div>
        <a
          className="ml-auto"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/nichwch/gridworld"
        >
          fork on github
        </a>
        <button
          className={`cursor-pointer disabled:opacity-50 ${
            !hasValidApiKey ? "text-red-500 font-semibold" : ""
          }`}
          onClick={() => setIsSettingsOpen(true)}
        >
          {!hasValidApiKey ? "api key required" : "api key"}
        </button>
      </div>
      <div className="flex flex-row h-full">
        <Sidebar
          agents={gameState.agents}
          hoveredAgentName={hoveredAgentName}
          onAgentHover={setHoveredAgentName}
          worldDescription={gameState.worldDescription}
          turnSummary={
            gameState.history[gameState.history.length - 1].description
          }
        />
        <div className={`mx-auto w-fit mt-10 ${loading ? "opacity-50" : ""}`}>
          {/* Header row with column labels */}
          <div className="flex">
            <div className="w-10 h-6"></div> {/* Empty corner */}
            {grid[0].map((_, colIndex) => (
              <div
                key={colIndex}
                className="w-10 h-6 text-sm text-gray-500 flex items-center justify-center"
              >
                {colIndex}
              </div>
            ))}
          </div>

          {/* Grid rows with row labels */}
          <div className="flex">
            {/* Row labels column */}
            <div className="flex flex-col">
              {grid.map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="w-10 h-10 text-sm text-gray-500 flex items-center justify-center"
                >
                  {rowIndex}
                </div>
              ))}
            </div>

            {/* Actual grid */}
            <div className="border-[0.5px] border-gray-500">
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((cell, colIndex) => (
                    <Cell
                      key={colIndex}
                      content={cell}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      onClick={handleCellClick}
                      loading={loading}
                      loadedAgentActions={loadedAgentActions}
                      hoveredAgentName={hoveredAgentName}
                      onAgentHover={setHoveredAgentName}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal with custom styling */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border border-black bg-white rounded-none h-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-normal text-gray-500">
              CELL {selectedCell?.row}, {selectedCell?.col}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {selectedCell && (
              <div className="space-y-4">
                <div>
                  <OverlayTextarea
                    value={grid[selectedCell.row][selectedCell.col]}
                    onChange={handleCellContentChange}
                    placeholder="Enter cell content..."
                    rows={3}
                    className="w-full border-none rounded-none resize-none border-t border-gray-500 p-0 h-[400px]"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onApiKeyChange={handleApiKeyChange}
      />
    </div>
  );
}
