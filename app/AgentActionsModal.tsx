import { Agent } from "./World";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface AgentAction {
  agent: Agent;
  action: string;
}

interface AgentActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentActions: AgentAction[];
  isWorldGenerating: boolean;
}

const AgentActionsModal = ({
  isOpen,
  onClose,
  agentActions,
  isWorldGenerating,
}: AgentActionsModalProps) => {
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);

  const selectedAgent = agentActions[selectedAgentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border border-black bg-white rounded-none h-[500px] max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal text-gray-500">
            AGENT ACTIONS
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex h-[400px]">
          {/* Left side - Agent list */}
          <div className="w-1/3 border-r border-gray-500 flex flex-col">
            <div className="text-xs text-gray-500 mb-2 px-2 flex-shrink-0">AGENTS</div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {agentActions.map((agentAction, index) => (
                  <div
                    key={agentAction.agent.name}
                    className={`px-2 py-1 cursor-pointer text-sm ${
                      index === selectedAgentIndex
                        ? "bg-gray-100 text-black"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedAgentIndex(index)}
                  >
                    {agentAction.agent.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Selected agent's action */}
          <div className="w-2/3 pl-4 flex flex-col">
            {selectedAgent ? (
              <>
                <div className="text-xs text-gray-500 mb-2 flex-shrink-0">
                  ACTION FOR {selectedAgent.agent.name.toUpperCase()}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="text-sm text-gray-800 leading-relaxed pr-2">
                    {selectedAgent.action}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">No agent selected</div>
            )}
          </div>
        </div>

        {/* Bottom status */}
        <div className="mt-auto pt-4 border-t border-gray-500">
          <div className="text-xs text-gray-500">
            {isWorldGenerating ? (
              <span className="animate-pulse">CALCULATING WORLD STATE...</span>
            ) : (
              "WORLD GENERATION COMPLETE"
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentActionsModal; 