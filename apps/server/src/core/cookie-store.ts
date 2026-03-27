type CookieRef = {
  provider: string;
  filePath: string;
};

const cookieRefs = new Map<string, CookieRef>();

export const setCookieRef = (provider: string, filePath: string): void => {
  cookieRefs.set(provider, { provider, filePath });
};

export const getCookieRef = (provider: string): CookieRef | undefined => {
  return cookieRefs.get(provider);
};
