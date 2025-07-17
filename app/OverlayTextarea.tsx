'use client'
import { useRef } from "react";

// Trigger sequence constant - detects names in angle brackets like <Frat boy 1> or <Lizard King>
export const TRIGGER_SEQUENCE = "<[^<>]+>";
// Split content by trigger sequence to find matches
export const splitAgents = (text: string) => {
  const regex = new RegExp(`(${TRIGGER_SEQUENCE})`, "g");
  return text.split(regex);
};

// Check if text matches the trigger pattern
export const isAgent = (text: string) => {
  const regex = new RegExp(`^${TRIGGER_SEQUENCE}$`);
  return regex.test(text);
};


interface OverlayTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const OverlayTextarea = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: OverlayTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync scroll positions between textarea and overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Render highlights by splitting content and styling matches
  const renderHighlights = () => {
    const parts = splitAgents(value);

    return parts.map((part, index) => {
      const matches = isAgent(part);
      return (
        <span
          key={index}
          className={
            matches
              ? "bg-red-100 border-red-800 text-red-800 outline-red-800 rounded"
              : "opacity-0"
          }
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div className="relative">
      {/* Overlay for highlighting */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-10 whitespace-pre-wrap"
        style={{
          font: "inherit",
          lineHeight: "inherit",
          color: "transparent",
          overflow: "hidden",
        }}
      >
        {renderHighlights()}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        className={`relative z-0 bg-transparent ${className}`}
        style={{
          resize: "none",
          outline: "none",
        }}
      />
    </div>
  );
};

export default OverlayTextarea;
