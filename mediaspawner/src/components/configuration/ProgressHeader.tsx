interface ProgressHeaderProps {
  currentStep: "basic" | "groups" | "assets" | "complete";
  completedSteps: {
    basicInfo: boolean;
    firstGroup: boolean;
    assetsAdded: boolean;
  };
}

interface ProgressStep {
  id: "basic" | "groups" | "assets" | "complete";
  label: string;
  description: string;
  icon: string;
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    id: "basic",
    label: "Basic Info",
    description: "Configuration name and description",
    icon: "📝",
  },
  {
    id: "groups",
    label: "Asset Groups",
    description: "Create and organize groups",
    icon: "📁",
  },
  {
    id: "assets",
    label: "Add Assets",
    description: "Assign media to groups",
    icon: "🖼️",
  },
  {
    id: "complete",
    label: "Complete",
    description: "Review and save",
    icon: "✅",
  },
];

export function ProgressHeader({
  currentStep,
  completedSteps,
}: ProgressHeaderProps) {
  const isStepCompleted = (stepId: string): boolean => {
    switch (stepId) {
      case "basic":
        return completedSteps.basicInfo;
      case "groups":
        return completedSteps.firstGroup;
      case "assets":
        return completedSteps.assetsAdded;
      case "complete":
        return (
          completedSteps.basicInfo &&
          completedSteps.firstGroup &&
          completedSteps.assetsAdded
        );
      default:
        return false;
    }
  };

  const getStepStatusStyles = (stepId: string): string => {
    const baseStyles = "transition-all duration-200 cursor-default";

    if (isStepCompleted(stepId)) {
      return `${baseStyles} bg-green-500 text-white hover:bg-green-600`;
    }
    if (stepId === currentStep) {
      return `${baseStyles} bg-blue-500 text-white shadow-lg`;
    }
    return `${baseStyles} bg-gray-200 text-gray-400`;
  };

  const currentStepIndex = PROGRESS_STEPS.findIndex(
    (step) => step.id === currentStep
  );
  const currentStepData = PROGRESS_STEPS[currentStepIndex];

  return (
    <div className="progress-header bg-gray-50 rounded-lg p-6">
      {/* Horizontal Progress Bar */}
      <div className="flex items-center justify-between mb-4">
        {PROGRESS_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div
              className={`
              w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium
              ${getStepStatusStyles(step.id)}
            `}
            >
              {isStepCompleted(step.id) ? "✓" : step.icon}
            </div>

            {/* Step Info */}
            <div className="ml-4">
              <div
                className={`font-semibold text-base ${
                  step.id === currentStep
                    ? "text-blue-700"
                    : isStepCompleted(step.id)
                    ? "text-green-700"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </div>
              <div className="text-sm text-gray-600">{step.description}</div>
            </div>

            {/* Connector Line */}
            {index < PROGRESS_STEPS.length - 1 && (
              <div
                className={`
                flex-1 h-1 mx-8 rounded transition-colors duration-200
                ${isStepCompleted(step.id) ? "bg-green-300" : "bg-gray-300"}
              `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Summary */}
      <div className="text-sm text-gray-600 text-center">
        <span className="font-medium">
          Step {currentStepIndex + 1} of {PROGRESS_STEPS.length}:
        </span>{" "}
        {currentStepData.label} - {currentStepData.description}
      </div>
    </div>
  );
}
