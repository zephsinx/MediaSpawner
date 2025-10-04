import * as React from "react";
import { useState, useEffect } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";
import { Modal } from "./Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { toast } from "sonner";

/**
 * Props for the ProfileFormDialog component
 *
 * @interface ProfileFormDialogProps
 */
export interface ProfileFormDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should be closed */
  onClose: () => void;
  /** Callback when profile is successfully created or updated */
  onSuccess: (profile: SpawnProfile) => void;
  /** Profile to edit (undefined for create mode) */
  profile?: SpawnProfile;
  /** Dialog title override */
  title?: string;
}

/**
 * Form data for profile creation/editing
 */
interface ProfileFormData {
  name: string;
  description: string;
}

/**
 * Validation errors for form fields
 */
interface FormErrors {
  name?: string;
  description?: string;
}

/**
 * ProfileFormDialog component for creating and editing spawn profiles
 *
 * This component provides a reusable form dialog that can be used for both
 * creating new profiles and editing existing ones. It includes proper validation,
 * error handling, and follows the established UI patterns.
 *
 * @example
 * ```tsx
 * // Create mode
 * <ProfileFormDialog
 *   isOpen={isCreateDialogOpen}
 *   onClose={() => setIsCreateDialogOpen(false)}
 *   onSuccess={(profile) => handleProfileCreated(profile)}
 * />
 *
 * // Edit mode
 * <ProfileFormDialog
 *   isOpen={isEditDialogOpen}
 *   onClose={() => setIsEditDialogOpen(false)}
 *   onSuccess={(profile) => handleProfileUpdated(profile)}
 *   profile={profileToEdit}
 * />
 * ```
 *
 * @param props - The component props
 * @returns JSX element representing the profile form dialog
 */
export function ProfileFormDialog({
  isOpen,
  onClose,
  onSuccess,
  profile,
  title,
}: ProfileFormDialogProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!profile;
  const dialogTitle = title || (isEditMode ? "Edit Profile" : "Create Profile");

  // Initialize form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        description: profile.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [profile, isOpen]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Profile name is required";
    } else if (formData.name.trim().length < 1) {
      newErrors.name = "Profile name must be at least 1 character";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Profile name must be less than 100 characters";
    }

    // Validate description length
    if (formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trimmedName = formData.name.trim();
      const trimmedDescription = formData.description.trim() || undefined;

      let result;
      if (isEditMode && profile) {
        result = SpawnProfileService.updateProfile(profile.id, {
          name: trimmedName,
          description: trimmedDescription,
        });
      } else {
        result = SpawnProfileService.createProfile(
          trimmedName,
          trimmedDescription
        );
      }

      if (result.success && result.profile) {
        toast.success(
          isEditMode
            ? "Profile updated successfully"
            : "Profile created successfully"
        );
        onSuccess(result.profile);
        onClose();
      } else {
        const errorMessage = result.error || "Failed to save profile";
        setSubmitError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.name.trim().length <= 100 &&
    formData.description.length <= 500 &&
    Object.keys(errors).length === 0;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={dialogTitle} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Name Field */}
        <Input
          label="Profile Name"
          value={formData.name}
          onChange={(e) => handleFieldChange("name", e.target.value)}
          error={errors.name}
          placeholder="Enter profile name..."
          required
          autoFocus
          maxLength={100}
          helperText="A unique name to identify this profile"
        />

        {/* Profile Description Field */}
        <Input
          label="Description"
          type="textarea"
          value={formData.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          error={errors.description}
          placeholder="Enter profile description (optional)..."
          maxLength={500}
          helperText="Optional description of the profile's purpose"
        />

        {/* Submit Error Display */}
        {submitError && (
          <div className="p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error))] rounded-md">
            <p className="text-sm text-[rgb(var(--color-error))]">
              {submitError}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-[rgb(var(--color-border))]">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
          >
            {isEditMode ? "Update Profile" : "Create Profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
