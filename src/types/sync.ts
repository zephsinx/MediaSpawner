/**
 * Types for Streamer.bot configuration sync functionality
 */

/**
 * Possible sync status states
 */
export type SyncStatus =
  | "synced"
  | "out-of-sync"
  | "unknown"
  | "error"
  | "offline";

/**
 * Specific error types for sync operations
 */
export type SyncErrorType =
  | "connection_failed"
  | "timeout"
  | "api_error"
  | "validation_error"
  | "permission_denied"
  | "config_export_failed"
  | "config_import_failed"
  | "unknown_error";

/**
 * Persistence metadata for sync status
 */
export interface SyncPersistenceInfo {
  /** When the status was last saved to localStorage */
  lastSaved?: Date;
  /** Storage key used for persistence */
  storageKey?: string;
  /** Whether the status is currently persisted */
  isPersisted?: boolean;
}

/**
 * Cache information for sync status
 */
export interface SyncCacheInfo {
  /** When the status was last cached */
  cachedAt?: Date;
  /** Cache TTL in milliseconds */
  ttl?: number;
  /** Whether the cache entry is still valid */
  isValid?: boolean;
  /** Cache hit count for performance tracking */
  hitCount?: number;
}

/**
 * Enhanced error details for sync operations
 */
export interface SyncErrorDetails {
  /** Specific error type */
  type: SyncErrorType;
  /** User-friendly error message */
  message: string;
  /** Original error message from the system */
  originalError?: string;
  /** Whether this error can be retried */
  canRetry: boolean;
  /** Number of retry attempts made */
  retryCount?: number;
  /** Maximum number of retries allowed */
  maxRetries?: number;
  /** When the error first occurred */
  firstOccurred?: Date;
  /** When the error last occurred */
  lastOccurred?: Date;
}

/**
 * Sync status information with enhanced metadata
 */
export interface SyncStatusInfo {
  /** Current sync status */
  status: SyncStatus;
  /** When the status was last checked */
  lastChecked?: Date;
  /** Local configuration hash */
  localConfigHash?: string;
  /** Remote configuration hash */
  remoteConfigHash?: string;
  /** Error message (deprecated - use errorDetails instead) */
  errorMessage?: string;
  /** Error type (deprecated - use errorDetails instead) */
  errorType?: SyncErrorType;
  /** Whether the error can be retried (deprecated - use errorDetails instead) */
  canRetry?: boolean;
  /** Enhanced error details */
  errorDetails?: SyncErrorDetails;
  /** Persistence metadata */
  persistence?: SyncPersistenceInfo;
  /** Cache information */
  cache?: SyncCacheInfo;
}

/**
 * Result of sync status check operation
 */
export interface SyncStatusCheckResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Updated sync status information */
  statusInfo?: SyncStatusInfo;
  /** Error message if operation failed */
  error?: string;
  /** Whether the result was served from cache */
  fromCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** When the operation completed */
  completedAt?: Date;
}

/**
 * Result of sync operation
 */
export interface SyncOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** When the operation completed */
  timestamp?: Date;
  /** Enhanced error details if operation failed */
  errorDetails?: SyncErrorDetails;
  /** Whether the operation was retried */
  wasRetried?: boolean;
  /** Number of retry attempts made */
  retryCount?: number;
}

/**
 * Configuration hash information for comparison
 */
export interface ConfigHashInfo {
  hash: string;
  timestamp: Date;
  configSize: number;
}

/**
 * Sync status check options
 */
export interface SyncStatusCheckOptions {
  /** Force refresh, bypassing cache */
  forceRefresh?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Sync operation options
 */
export interface SyncOperationOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to update cache after operation */
  updateCache?: boolean;
  /** Custom error handler */
  onError?: (error: SyncErrorDetails) => void;
}

/**
 * Sync status statistics for monitoring
 */
export interface SyncStatusStats {
  /** Total number of sync checks performed */
  totalChecks: number;
  /** Number of successful sync checks */
  successfulChecks: number;
  /** Number of failed sync checks */
  failedChecks: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Number of cache misses */
  cacheMisses: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Last successful sync check timestamp */
  lastSuccessfulCheck?: Date;
  /** Last failed sync check timestamp */
  lastFailedCheck?: Date;
  /** Most common error type */
  mostCommonError?: SyncErrorType;
}
