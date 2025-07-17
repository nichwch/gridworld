"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange: (apiKey: string | null) => void;
}

const OPENROUTER_API_KEY_STORAGE_KEY = "openrouter_api_key";

export default function SettingsModal({ isOpen, onClose, onApiKeyChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    setIsLoading(true);
    setError(null);

    try {
      if (apiKey.trim()) {
        // Basic validation - OpenRouter API keys typically start with 'sk-'
        if (!apiKey.startsWith('sk-')) {
          setError("OpenRouter API keys typically start with 'sk-'");
          setIsLoading(false);
          return;
        }
        localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, apiKey.trim());
        onApiKeyChange(apiKey.trim());
      } else {
        localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
        onApiKeyChange(null);
      }
      onClose();
    } catch {
      setError("Failed to save API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setApiKey("");
    localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
    onApiKeyChange(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border border-black bg-white rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal text-gray-500">
            OPENROUTER API KEY
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Enter your OpenRouter API key:
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-gray-500"
              disabled={isLoading}
            />
            <div className="text-xs text-gray-400 mt-1">
              Get your API key from{" "}
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </div>
            <div className='text-xs text-gray-400 mt-1'>Your API key is stored in your browser&apos;s local storage. We do not store any of your data - we merely forward requests to OpenRouter.</div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </button>
            <button
              className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onClose()}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 disabled:opacity-50"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export utility functions for other components to use
export const getStoredApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
};

export const hasApiKey = (): boolean => {
  return getStoredApiKey() !== null;
}; 