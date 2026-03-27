export const mergeStreamChunks = (chunks: string[]): string => {
  // Keep this simple for local MVP. Later you can add token-level deduping.
  return chunks.join("");
};
