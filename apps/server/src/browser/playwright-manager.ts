import { chromium, type Browser } from "playwright";

let browserRef: Browser | null = null;

export const getBrowser = async (): Promise<Browser> => {
  if (!browserRef) {
    browserRef = await chromium.launch({ headless: true });
  }

  return browserRef;
};

export const closeBrowser = async (): Promise<void> => {
  if (browserRef) {
    await browserRef.close();
    browserRef = null;
  }
};
