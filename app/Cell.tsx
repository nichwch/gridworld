import { Agent, getAgentName } from "./World";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Cell component for individual grid cells
interface CellProps {
  content: string;
  rowIndex: number;
  colIndex: number;
  onClick: (rowIndex: number, colIndex: number) => void;
  loading: boolean;
  className?: string;
  loadedAgentActions: { agent: Agent; action: string }[] | null;
  hoveredAgentName: string | null;
  onAgentHover: (agentName: string | null) => void;
}

const Cell = ({
  content,
  rowIndex,
  colIndex,
  onClick,
  className,
  loadedAgentActions: loadingAgents,
  loading,
  hoveredAgentName,
  onAgentHover,
}: CellProps) => {
  let icon = "";
  const isAgent = getAgentName(content) !== null;
  const agentName = isAgent ? getAgentName(content) : null;
  const isHovered = agentName && hoveredAgentName === agentName;
  
  if (isAgent) {
    const initials = agentName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    icon = initials || "@";
  } else if (content.length > 0) {
    icon = content[0].toLowerCase();
  }

  // Only show hovercard if there's content
  const hoverCardContent = content.trim() || `Empty cell (${rowIndex}, ${colIndex})`;
  
  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button
          disabled={loading}
          className={`w-10 h-10 border-[0.5px] border-gray-500 cursor-pointer flex items-center justify-center 
            ${className} ${
            !loadingAgents && isAgent && loading ? "animate-pulse" : ""
          }
            ${isAgent && isHovered ? "bg-gray-300" : 
              isAgent ? "bg-gray-100 hover:bg-gray-200" : 
              "hover:bg-gray-100"}`}
          onClick={() => onClick(rowIndex, colIndex)}
          onMouseEnter={() => agentName && onAgentHover(agentName)}
          onMouseLeave={() => agentName && onAgentHover(null)}
        >
          {icon}
        </button>
      </HoverCardTrigger>
      {content.length > 0 && (
      <HoverCardContent 
        side="top" 
        className="max-w-xs whitespace-pre-wrap bg-white border-[0.5px] border-gray-500 text-gray-700 shadow-lg rounded-none p-2"
        sideOffset={2}
      >
          {hoverCardContent}
        </HoverCardContent>
      )}
    </HoverCard>
  );
};

export default Cell;
