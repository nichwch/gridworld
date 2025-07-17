"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameState } from "./World";
import { getStoredApiKey } from "./SettingsModal";

interface ScenarioModalProps {
  onScenarioGenerated: (gameState: GameState) => void;
}

export default function ScenarioModal({ onScenarioGenerated }: ScenarioModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [worldDescription, setWorldDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateScenario = async () => {
    if (!worldDescription.trim()) {
      setError("Please enter a world description");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worldDescription: worldDescription.trim(),
          apiKey: getStoredApiKey(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      onScenarioGenerated(data.gameState);
      setIsModalOpen(false);
      setWorldDescription("");
    } catch (err) {
      console.error("Error generating scenario:", err);
      setError("Failed to generate scenario. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateScenario();
    }
  };

  return (
    <>
      <button
        className="cursor-pointer disabled:opacity-50"
        onClick={() => setIsModalOpen(true)}
      >
        new scenario
      </button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border border-black bg-white rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-normal text-gray-500">
              CREATE NEW SCENARIO
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                Describe your world scenario:
              </label>
              <textarea
                value={worldDescription}
                onChange={(e) => setWorldDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., A medieval kingdom under siege by dragons, with brave knights, cunning wizards, and desperate villagers..."
                rows={4}
                className="w-full border border-gray-300 p-3 text-sm resize-none focus:outline-none focus:border-gray-500"
                disabled={loading}
              />
              <div className="text-xs text-gray-400 mt-1">
                Press Ctrl+Enter (or Cmd+Enter) to generate
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                onClick={generateScenario}
                disabled={loading || !worldDescription.trim()}
              >
                {loading ? "Generating..." : "Create Scenario"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 