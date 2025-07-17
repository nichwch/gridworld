import { Agent } from "./World";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const AgentHistoryModal = ({
  isOpen,
  onClose,
  agent,
}: AgentHistoryModalProps) => {
  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border border-black bg-white rounded-none h-[600px] max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal text-gray-500">
            AGENT HISTORY - {agent.name.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col h-[500px]">
          {/* Agent Info */}
          <div className="border-b border-gray-500 pb-4 mb-4 flex-shrink-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-black">{agent.name}</span>
              </div>
              <div className="text-sm text-gray-500">
                Location: ({agent.location.row}, {agent.location.col})
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <div className="font-medium mb-1">Current State:</div>
              <div className="text-sm leading-relaxed bg-gray-50 p-2 border">
                {agent.currentState || "No current state"}
              </div>
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-3 font-semibold">
              COMPLETE HISTORY ({agent.privateHistory.length} entries)
            </div>
            
            {agent.privateHistory.length === 0 ? (
              <div className="text-sm text-gray-400">No history entries yet</div>
            ) : (
              <div className="space-y-4">
                {agent.privateHistory.reverse().map((entry, index) => (
                  <div key={index} className="border border-gray-300 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-500 font-semibold">
                        ENTRY #{agent.privateHistory.length - index}
                      </div>
                      <div className="text-xs text-gray-500">
                        Location: ({entry.location.row}, {entry.location.col})
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Action:</div>
                        <div className="text-sm text-gray-800 leading-relaxed bg-blue-50 p-2 border border-blue-200">
                          {entry.action}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-1">Agent State:</div>
                        <div className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-2 border">
                          {entry.agentState}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentHistoryModal; 