import type { Spawn } from "../types/spawn";
import { validateSpawn } from "../types/spawn";
import { validateTrigger } from "./triggerValidation";

export interface SpawnValidationStatus {
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
}

/**
 * Get comprehensive validation status for a spawn
 * Combines spawn validation, trigger validation, and checks for empty assets
 */
export const getSpawnValidationStatus = (
  spawn: Spawn,
): SpawnValidationStatus => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate spawn structure
  const spawnValidation = validateSpawn(spawn);
  if (!spawnValidation.isValid) {
    errors.push(...spawnValidation.errors);
  }

  // Validate trigger configuration
  const triggerValidation = validateTrigger(spawn.trigger);
  if (!triggerValidation.isValid) {
    errors.push(...triggerValidation.errors);
  }
  if (triggerValidation.warnings.length > 0) {
    warnings.push(...triggerValidation.warnings);
  }

  // Check for empty assets (warning, not error)
  if (!spawn.assets || spawn.assets.length === 0) {
    warnings.push("Spawn has no assets");
  }

  // Determine overall status: error > warning > valid
  let status: "valid" | "warning" | "error";
  if (errors.length > 0) {
    status = "error";
  } else if (warnings.length > 0) {
    status = "warning";
  } else {
    status = "valid";
  }

  return {
    status,
    errors,
    warnings,
  };
};
