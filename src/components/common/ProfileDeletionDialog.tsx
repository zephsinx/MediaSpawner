import { useState } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

/**
 * Props for the ProfileDeletionDialog component
 *
 * @interface ProfileDeletionDialogProps
 */
export interface ProfileDeletionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should be closed */
  onClose: () => void;
  /** Callback when profile is successfully deleted */
  onSuccess: () => void;
  /** Profile to delete */
  profile: SpawnProfile;
}

/**
 * ProfileDeletionDialog component for confirming profile deletion
 *
 * This component provides a confirmation dialog that warns users about
 * data loss when deleting a profile. It shows profile information and
 * handles the deletion process with proper error handling.
 *
 * @example
 * ```tsx
 * <ProfileDeletionDialog
 *   isOpen={isDeleteDialogOpen}
 *   onClose={() => setIsDeleteDialogOpen(false)}
 *   onSuccess={() => handleProfileDeleted()}
 *   profile={profileToDelete}
 * />
 * ```
 *
 * @param props - The component props
 * @returns JSX element representing the profile deletion confirmation dialog
 */
export function ProfileDeletionDialog({
  isOpen,
  onClose,
  onSuccess,
  profile,
}: ProfileDeletionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle profile deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = SpawnProfileService.deleteProfile(profile.id);

      if (result.success) {
        toast.success("Profile deleted successfully");
        onSuccess();
        onClose();
      } else {
        const errorMessage = result.error || "Failed to delete profile";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    setError(null);
    onClose();
  };

  /**
   * Generate profile information display
   */
  const getProfileInfo = () => {
    const spawnCount = profile.spawns.length;
    const enabledSpawnCount = profile.spawns.filter(
      (spawn) => spawn.enabled
    ).length;

    return (
      <div className="space-y-3">
        {/* Profile Details */}
        <div className="p-3 bg-[rgb(var(--color-muted))]/20 border border-[rgb(var(--color-border))] rounded-md">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-[rgb(var(--color-fg))]">
                Profile Name:
              </span>
              <span className="ml-2 text-sm text-[rgb(var(--color-muted-foreground))]">
                {profile.name}
              </span>
            </div>
            {profile.description && (
              <div>
                <span className="text-sm font-medium text-[rgb(var(--color-fg))]">
                  Description:
                </span>
                <span className="ml-2 text-sm text-[rgb(var(--color-muted-foreground))]">
                  {profile.description}
                </span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-[rgb(var(--color-fg))]">
                Spawns:
              </span>
              <span className="ml-2 text-sm text-[rgb(var(--color-muted-foreground))]">
                {spawnCount} total ({enabledSpawnCount} enabled)
              </span>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="p-3 bg-[rgb(var(--color-warning))]/10 border border-[rgb(var(--color-warning))]/20 rounded-md">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-[rgb(var(--color-warning))]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm">
              <p className="font-medium text-[rgb(var(--color-warning))] mb-1">
                Warning: This action cannot be undone
              </p>
              <p className="text-[rgb(var(--color-muted-foreground))]">
                Deleting this profile will permanently remove all spawns and
                their configurations. Make sure you have exported your data if
                you need to keep it.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error))] rounded-md">
            <p className="text-sm text-[rgb(var(--color-error))]">{error}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Delete Profile"
      message={`Are you sure you want to delete the profile "${profile.name}"?`}
      confirmText={isDeleting ? "Deleting..." : "Delete Profile"}
      cancelText="Cancel"
      variant="danger"
      onConfirm={handleDelete}
      onCancel={handleClose}
      extraContent={getProfileInfo()}
    />
  );
}
