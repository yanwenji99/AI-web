export const ErrorCodes = {
  TIMEOUT: "TIMEOUT",
  NOT_LOGGED_IN: "NOT_LOGGED_IN",
  RATE_LIMITED: "RATE_LIMITED",
  PAGE_CHANGED: "PAGE_CHANGED",
  UNKNOWN: "UNKNOWN"
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const RetryableErrorCodes = new Set<ErrorCode>([
  ErrorCodes.TIMEOUT,
  ErrorCodes.RATE_LIMITED,
  ErrorCodes.PAGE_CHANGED
]);

export const NonRetryableErrorCodes = new Set<ErrorCode>([
  ErrorCodes.NOT_LOGGED_IN,
  ErrorCodes.UNKNOWN
]);

export const isRetryableErrorCode = (errorCode: ErrorCode): boolean => {
  return RetryableErrorCodes.has(errorCode);
};
