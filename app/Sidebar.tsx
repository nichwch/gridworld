import AgentHistoryModal from "./AgentHistoryModal";
import { Agent } from "./World";
import { useState } from "react";

interface SidebarProps {
  agents: Agent[];
  hoveredAgentName: string | null;
  onAgentHover: (agentName: string | null) => void;
  worldDescription: string;
  turnSummary: string;
}

const Sidebar = ({ agents, hoveredAgentName, onAgentHover, worldDescription, turnSummary }: SidebarProps) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsHistoryModalOpen(true);
  };

  return (
    <>
      <div className="w-[300px] border-r border-gray-500 flex flex-col h-full overflow-hidden">
        {/* World Description */}
        <div className="border-b border-gray-500 bg-gray-200 flex-shrink-0 max-h-[200px] overflow-y-auto">
          <div className="p-4">
            <div className="text-xs text-gray-500 font-semibold mb-2">WORLD DESCRIPTION</div>
            <div className="text-sm text-gray-700 leading-relaxed">
              {worldDescription}
            </div>
          </div>
        </div>

        {/* Turn Summary */}
        {turnSummary && (
          <div className="border-b border-gray-500 bg-gray-200 flex-shrink-0 max-h-[200px] overflow-y-auto">
            <div className="p-4">
              <div className="text-xs text-gray-500 font-semibold mb-2">LAST TURN SUMMARY</div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {turnSummary}
              </div>
            </div>
          </div>
        )}

        {/* Agents - scrollable section */}
        <div className="flex-1 overflow-y-auto">
          {agents.length === 0 ? (
            <div className="text-sm text-gray-400 p-4">No agents on the board</div>
          ) : (
            <div className="">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className={`border-b border-gray-500 py-2 px-4 cursor-pointer transition-colors ${
                    hoveredAgentName === agent.name 
                      ? "bg-gray-300" 
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => handleAgentClick(agent)}
                  onMouseEnter={() => onAgentHover(agent.name)}
                  onMouseLeave={() => onAgentHover(null)}
                >
                  <div className="mb-2">
                    <div className="text-black text-sm">
                      {agent.name}{" "}
                      <span className="text-gray-500">
                        [
                        {agent.name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                        ]
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-1">
                    Location: ({agent.location.row}, {agent.location.col})
                  </div>

                  <div className="text-xs text-gray-500">
                    <div className="text-xs leading-relaxed break-words">
                      {agent.currentState || "No current state"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AgentHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        agent={selectedAgent}
      />
    </>
  );
};

export default Sidebar; 