export const logInfo = (message: string, data?: unknown): void => {
  if (data === undefined) {
    console.log(`[info] ${message}`);
    return;
  }

  console.log(`[info] ${message}`, data);
};

export const logError = (message: string, data?: unknown): void => {
  if (data === undefined) {
    console.error(`[error] ${message}`);
    return;
  }

  console.error(`[error] ${message}`, data);
};
