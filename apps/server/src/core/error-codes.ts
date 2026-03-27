export const ErrorCodes = {
  TIMEOUT: "TIMEOUT",
  NOT_LOGGED_IN: "NOT_LOGGED_IN",
  RATE_LIMITED: "RATE_LIMITED",
  PAGE_CHANGED: "PAGE_CHANGED",
  UNKNOWN: "UNKNOWN"
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
