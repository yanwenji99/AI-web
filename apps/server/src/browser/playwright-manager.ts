import { chromium, type Browser } from "playwright";

type BrowserMode = "headless" | "headed";

const browserRefs = new Map<BrowserMode, Browser>();

export const getBrowser = async (options?: { headless?: boolean }): Promise<Browser> => {
  const headless = options?.headless ?? true;
  const mode: BrowserMode = headless ? "headless" : "headed";
  const existing = browserRefs.get(mode);

  if (existing) {
    return existing;
  }

  const browser = await chromium.launch({ headless });
  browserRefs.set(mode, browser);
  return browser;
};

export const closeBrowser = async (): Promise<void> => {
  const closeJobs: Array<Promise<void>> = [];

  for (const browser of browserRefs.values()) {
    closeJobs.push(browser.close());
  }

  await Promise.allSettled(closeJobs);
  browserRefs.clear();
};
