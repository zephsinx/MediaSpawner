import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  extraContent?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  extraContent,
}: ConfirmDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          confirmButton: "destructive" as const,
          icon: X,
          iconColor: "text-[rgb(var(--color-error))]",
          iconBg: "bg-[rgb(var(--color-error-bg))]",
        };
      case "warning":
        return {
          confirmButton: "outline" as const,
          icon: AlertTriangle,
          iconColor: "text-[rgb(var(--color-warning))]",
          iconBg: "bg-[rgb(var(--color-warning))]/10",
        };
      case "info":
        return {
          confirmButton: "primary" as const,
          icon: Info,
          iconColor: "text-[rgb(var(--color-accent))]",
          iconBg: "bg-[rgb(var(--color-accent))]/10",
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.icon;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[rgb(var(--color-bg))] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            "border-[rgb(var(--color-border))] text-[rgb(var(--color-fg))]"
          )}
        >
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                styles.iconBg
              )}
            >
              <IconComponent className={cn("h-5 w-5", styles.iconColor)} />
            </div>
            <Dialog.Title className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              {title}
            </Dialog.Title>
          </div>

          {/* Message */}
          <Dialog.Description className="text-sm text-[rgb(var(--color-muted-foreground))] leading-relaxed">
            {message}
          </Dialog.Description>

          {/* Optional extra content (e.g., checkboxes) */}
          {extraContent && <div>{extraContent}</div>}

          {/* Actions */}
          <div className="flex space-x-3 justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" onClick={onCancel}>
                {cancelText}
              </Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button variant={styles.confirmButton} onClick={onConfirm}>
                {confirmText}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
