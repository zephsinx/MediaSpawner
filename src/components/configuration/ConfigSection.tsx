import React from "react";

interface ConfigSectionProps {
  title: string;
  completed: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  completed,
  expanded,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{completed ? "✅" : "⭕"}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">
            {expanded ? "Collapse" : "Expand"}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-6 border-t border-gray-200 bg-white rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  );
};
