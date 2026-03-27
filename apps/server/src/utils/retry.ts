export const retryOnce = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch {
    return await fn();
  }
};
