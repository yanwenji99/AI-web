import type { ChatRequest, ChatResponse, WebProvider } from "../base-provider.js";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { BrowserContext, Page } from "playwright";
import { getBrowser } from "../../browser/playwright-manager.js";
import { ErrorCodes, type ErrorCode } from "../../core/error-codes.js";
import { providerASelectors } from "./selectors.js";

const DEFAULT_STORAGE_STATE_PATH = "apps/server/data/cookies/provider-a-state.json";
const MANUAL_LOGIN_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 250;
const DEFAULT_KEEP_ALIVE_IDLE_MS = 10 * 60_000;

type WebSession = {
  context: BrowserContext;
  page: Page;
  release: () => Promise<void>;
};

export class ProviderAAdapter implements WebProvider {
  public readonly id = "provider-a";
  private keepAliveContext: BrowserContext | null = null;
  private keepAlivePage: Page | null = null;
  private keepAliveStorageStatePath: string | null = null;
  private keepAliveHeadless: boolean | null = null;
  private keepAliveIdleTimer: NodeJS.Timeout | null = null;

  public async sendChat(request: ChatRequest): Promise<ChatResponse> {
    const mode = process.env.PROVIDER_A_MODE ?? "echo";

    if (mode !== "web") {
      return this.sendEcho(request);
    }

    return this.sendWeb(request);
  }

  private sendEcho(request: ChatRequest): ChatResponse {
    const prompt = this.getLatestUserPrompt(request);

    if (!prompt) {
      return {
        provider: this.id,
        model: request.model,
        text: "",
        error_code: ErrorCodes.UNKNOWN
      };
    }

    return {
      provider: this.id,
      model: request.model,
      text: `provider-a echo: ${prompt}`,
      error_code: null
    };
  }

  private async sendWeb(request: ChatRequest): Promise<ChatResponse> {
    const targetUrl = process.env.PROVIDER_A_URL;

    if (!targetUrl) {
      return {
        provider: this.id,
        model: request.model,
        text: "PROVIDER_A_URL is not configured",
        error_code: ErrorCodes.NOT_LOGGED_IN
      };
    }

    const prompt = this.getLatestUserPrompt(request);
    if (!prompt) {
      return {
        provider: this.id,
        model: request.model,
        text: "",
        error_code: ErrorCodes.UNKNOWN
      };
    }

    const timeout = request.timeoutMs ?? 30_000;
    const headless = process.env.PROVIDER_A_HEADLESS !== "false";
    const keepAlive = process.env.PROVIDER_A_KEEP_ALIVE === "true";
    const keepAliveIdleMs = Number.parseInt(
      process.env.PROVIDER_A_KEEP_ALIVE_IDLE_MS ?? String(DEFAULT_KEEP_ALIVE_IDLE_MS),
      10
    );
    const loginRequiredSelector =
      process.env.PROVIDER_A_LOGIN_REQUIRED_SELECTOR ?? providerASelectors.loginRequired;
    const loadingSelector = process.env.PROVIDER_A_RESPONSE_LOADING_SELECTOR ?? providerASelectors.responseLoading;
    const storageStatePath = resolve(
      process.env.PROVIDER_A_STORAGE_STATE_PATH ?? DEFAULT_STORAGE_STATE_PATH
    );

    const session = await this.getWebSession({
      headless,
      keepAlive,
      keepAliveIdleMs,
      storageStatePath
    });
    const { context, page } = session;

    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });

      const loginState = await this.ensureInputReady({
        page,
        inputSelector: providerASelectors.input,
        loginRequiredSelector,
        timeoutMs: timeout,
        manualLoginWaitMs: MANUAL_LOGIN_WAIT_MS,
        allowManualTakeover: !headless
      });

      if (!loginState.ready) {
        return {
          provider: this.id,
          model: request.model,
          text:
            "Provider A login is required. Please run with PROVIDER_A_HEADLESS=false and complete login in the opened browser window, then retry.",
          error_code: ErrorCodes.NOT_LOGGED_IN
        };
      }

      // Persist as soon as login is confirmed so auth state is retained
      // even when later send/parse steps fail.
      await this.persistStorageState(context, storageStatePath);

      await page.fill(providerASelectors.input, prompt);
      const previousAssistantText = await this.getLatestAssistantText(page);

      const sendButton = page.locator(providerASelectors.sendButton);
      if ((await sendButton.count()) > 0 && (await sendButton.first().isVisible())) {
        await sendButton.first().click();
      } else {
        await page.press(providerASelectors.input, "Enter");
      }

      const text = await this.waitForAssistantReply({
        page,
        timeoutMs: timeout,
        previousAssistantText,
        loadingSelector
      });

      return {
        provider: this.id,
        model: request.model,
        text,
        error_code: null
      };
    } catch (error) {
      if (keepAlive && this.shouldResetKeepAlive(error)) {
        await this.resetKeepAliveSession();
      }

      return {
        provider: this.id,
        model: request.model,
        text: String(error),
        error_code: this.mapErrorCode(error)
      };
    } finally {
      await session.release();
    }
  }

  private async getWebSession(options: {
    headless: boolean;
    keepAlive: boolean;
    keepAliveIdleMs: number;
    storageStatePath: string;
  }): Promise<WebSession> {
    if (!options.keepAlive) {
      const browser = await getBrowser({ headless: options.headless });
      const context = await this.createContext(browser, options.storageStatePath);
      const page = await context.newPage();
      return {
        context,
        page,
        release: async () => {
          await context.close();
        }
      };
    }

    this.clearKeepAliveIdleTimer();

    const keepAliveConfigChanged =
      this.keepAliveContext &&
      (this.keepAliveStorageStatePath !== options.storageStatePath ||
        this.keepAliveHeadless !== options.headless ||
        this.keepAlivePage?.isClosed());

    if (keepAliveConfigChanged) {
      await this.resetKeepAliveSession();
    }

    if (!this.keepAliveContext || !this.keepAlivePage || this.keepAlivePage.isClosed()) {
      const browser = await getBrowser({ headless: options.headless });
      this.keepAliveContext = await this.createContext(browser, options.storageStatePath);
      this.keepAlivePage = await this.keepAliveContext.newPage();
      this.keepAliveStorageStatePath = options.storageStatePath;
      this.keepAliveHeadless = options.headless;
    }

    const context = this.keepAliveContext;
    const page = this.keepAlivePage;

    return {
      context,
      page,
      release: async () => {
        this.scheduleKeepAliveIdleCleanup(options.keepAliveIdleMs);
      }
    };
  }

  private scheduleKeepAliveIdleCleanup(idleMs: number): void {
    this.clearKeepAliveIdleTimer();

    const timeoutMs = Number.isFinite(idleMs) && idleMs > 0 ? idleMs : DEFAULT_KEEP_ALIVE_IDLE_MS;
    this.keepAliveIdleTimer = setTimeout(() => {
      void this.resetKeepAliveSession();
    }, timeoutMs);
  }

  private clearKeepAliveIdleTimer(): void {
    if (!this.keepAliveIdleTimer) {
      return;
    }

    clearTimeout(this.keepAliveIdleTimer);
    this.keepAliveIdleTimer = null;
  }

  private async resetKeepAliveSession(): Promise<void> {
    this.clearKeepAliveIdleTimer();

    const page = this.keepAlivePage;
    const context = this.keepAliveContext;
    this.keepAlivePage = null;
    this.keepAliveContext = null;
    this.keepAliveStorageStatePath = null;
    this.keepAliveHeadless = null;

    if (page && !page.isClosed()) {
      await page.close();
    }

    if (context) {
      await context.close();
    }
  }

  private async createContext(
    browser: Awaited<ReturnType<typeof getBrowser>>,
    storageStatePath: string
  ): Promise<BrowserContext> {
    if (existsSync(storageStatePath)) {
      return browser.newContext({ storageState: storageStatePath });
    }

    return browser.newContext();
  }

  private async persistStorageState(context: BrowserContext, storageStatePath: string): Promise<void> {
    await mkdir(dirname(storageStatePath), { recursive: true });
    const state = await context.storageState();
    await writeFile(storageStatePath, JSON.stringify(state, null, 2), "utf8");
  }

  private async ensureInputReady(options: {
    page: Page;
    inputSelector: string;
    loginRequiredSelector: string;
    timeoutMs: number;
    manualLoginWaitMs: number;
    allowManualTakeover: boolean;
  }): Promise<{ ready: boolean }> {
    const readyBeforeManual = await this.waitForInputOrLogin(options.page, {
      inputSelector: options.inputSelector,
      loginRequiredSelector: options.loginRequiredSelector,
      timeoutMs: options.timeoutMs
    });

    if (readyBeforeManual === "ready") {
      return { ready: true };
    }

    if (readyBeforeManual === "login-required" && options.allowManualTakeover) {
      await options.page.bringToFront();
      const readyAfterManual = await this.waitForInputOrLogin(options.page, {
        inputSelector: options.inputSelector,
        loginRequiredSelector: options.loginRequiredSelector,
        timeoutMs: options.manualLoginWaitMs
      });

      if (readyAfterManual === "ready") {
        return { ready: true };
      }
    }

    return { ready: false };
  }

  private async waitForInputOrLogin(
    page: Page,
    options: {
      inputSelector: string;
      loginRequiredSelector: string;
      timeoutMs: number;
    }
  ): Promise<"ready" | "login-required" | "timeout"> {
    const deadline = Date.now() + options.timeoutMs;
    const inputLocator = page.locator(options.inputSelector).first();
    const loginLocator = options.loginRequiredSelector
      ? page.locator(options.loginRequiredSelector).first()
      : null;

    while (Date.now() < deadline) {
      if ((await inputLocator.count()) > 0 && (await inputLocator.isVisible())) {
        return "ready";
      }

      if (loginLocator && (await loginLocator.count()) > 0 && (await loginLocator.isVisible())) {
        return "login-required";
      }

      await page.waitForTimeout(POLL_INTERVAL_MS);
    }

    return "timeout";
  }

  private async getLatestAssistantText(page: Page): Promise<string> {
    const locator = page.locator(providerASelectors.messageItem);
    const count = await locator.count();

    if (count === 0) {
      return "";
    }

    return (await locator.nth(count - 1).innerText()).trim();
  }

  private async waitForAssistantReply(options: {
    page: Page;
    timeoutMs: number;
    previousAssistantText: string;
    loadingSelector: string;
  }): Promise<string> {
    const deadline = Date.now() + options.timeoutMs;
    let latest = options.previousAssistantText;
    let stableRounds = 0;

    while (Date.now() < deadline) {
      if (options.loadingSelector) {
        const loading = options.page.locator(options.loadingSelector).first();
        if ((await loading.count()) > 0 && (await loading.isVisible())) {
          await options.page.waitForTimeout(POLL_INTERVAL_MS);
          continue;
        }
      }

      const current = await this.getLatestAssistantText(options.page);
      if (!current) {
        await options.page.waitForTimeout(POLL_INTERVAL_MS);
        continue;
      }

      if (current !== latest) {
        latest = current;
        stableRounds = 0;
      } else {
        stableRounds += 1;
      }

      if (current !== options.previousAssistantText && stableRounds >= 2) {
        return current;
      }

      await options.page.waitForTimeout(POLL_INTERVAL_MS);
    }

    throw new Error("Timed out waiting for assistant reply");
  }

  private getLatestUserPrompt(request: ChatRequest): string {
    for (let index = request.messages.length - 1; index >= 0; index -= 1) {
      const message = request.messages[index];
      if (!message) {
        continue;
      }

      if (message.role === "user") {
        return message.content.trim();
      }
    }

    return "";
  }

  private mapErrorCode(error: unknown): ErrorCode {
    const message = String(error).toLowerCase();

    if (message.includes("not logged in") || message.includes("login is required")) {
      return ErrorCodes.NOT_LOGGED_IN;
    }

    if (message.includes("timeout")) {
      return ErrorCodes.TIMEOUT;
    }

    if (message.includes("selector") || message.includes("strict mode violation")) {
      return ErrorCodes.PAGE_CHANGED;
    }

    return ErrorCodes.UNKNOWN;
  }

  private shouldResetKeepAlive(error: unknown): boolean {
    const message = String(error).toLowerCase();

    return (
      message.includes("target page") ||
      message.includes("target closed") ||
      message.includes("context has been closed") ||
      message.includes("browser has been closed")
    );
  }
}
