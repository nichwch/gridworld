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

interface StoryModalProps {
  gameState: GameState;
}

export default function StoryModal({ gameState }: StoryModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [story, setStory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateStory = async () => {
    setLoading(true);
    setError(null);
    setStory("");
    setIsModalOpen(true);

    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameState,
          worldDescription: gameState.worldDescription,
          apiKey: getStoredApiKey(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStory(data.story);
    } catch (err) {
      console.error("Error generating story:", err);
      setError("Failed to generate story. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="cursor-pointer disabled:opacity-50"
        disabled={loading}
        onClick={generateStory}
      >
        {loading ? "generating story..." : "generate story"}
      </button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border border-black bg-white rounded-none max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-normal text-gray-500">
                STORY
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">
                  The chronicler weaves your tale...
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 py-4">
                {error}
              </div>
            )}

            {story && !loading && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {story}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 