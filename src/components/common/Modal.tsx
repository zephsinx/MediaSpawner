import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useModalFocusManagement } from "../../hooks/useFocusManagement";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const focusManagement = useModalFocusManagement();

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "max-w-sm";
      case "md":
        return "max-w-md";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-2xl";
      default:
        return "max-w-md";
    }
  };

  // Handle focus management when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      // Initialize focus management when modal opens
      const cleanup = focusManagement.initializeFocusManagement(
        focusManagement.containerRef.current,
      );
      return cleanup;
    } else {
      // Clean up focus management when modal closes
      focusManagement.cleanupFocusManagement();
    }
  }, [isOpen, focusManagement]);

  // Callback ref to ensure focus management is initialized when DOM is ready
  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      focusManagement.containerRef.current = node;
      if (isOpen && node) {
        // Initialize focus management when the DOM element is ready
        const cleanup = focusManagement.initializeFocusManagement(node);
        return cleanup;
      }
    },
    [isOpen, focusManagement],
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--color-fg))]/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={contentRef}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[rgb(var(--color-bg))] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            "border-[rgb(var(--color-border))] text-[rgb(var(--color-fg))]",
            getSizeStyles(),
            "max-h-[90vh] overflow-y-auto",
          )}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[rgb(var(--color-border))] pb-4">
            <Dialog.Title className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-ring))] focus:ring-offset-2 rounded-sm"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="text-[rgb(var(--color-fg))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
