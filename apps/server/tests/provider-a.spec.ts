import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerChatRoute } from "../src/routes/chat.js";
import { ProviderAAdapter } from "../src/providers/provider-a/adapter.js";
import { ProviderBAdapter } from "../src/providers/provider-b/adapter.js";

describe("provider-a adapter", () => {
  afterEach(() => {
    delete process.env.PROVIDER_A_MODE;
    delete process.env.PROVIDER_A_URL;
    delete process.env.PROVIDER_B_MODE;
    delete process.env.PROVIDER_B_URL;
  });

  it("returns echo response in default mode", async () => {
    const adapter = new ProviderAAdapter();

    const response = await adapter.sendChat({
      model: "default",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(response.provider).toBe("provider-a");
    expect(response.model).toBe("default");
    expect(response.text).toBe("provider-a echo: hello");
    expect(response.error_code).toBeNull();
  });

  it("chat route is wired to provider-a adapter", async () => {
    const app = Fastify();
    registerChatRoute(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: {
        model: "default",
        messages: [{ role: "user", content: "route-check" }]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      provider: "provider-a",
      model: "default",
      text: "provider-a echo: route-check",
      error_code: null
    });

    await app.close();
  });

  it("returns echo response for provider-b", async () => {
    const adapter = new ProviderBAdapter();

    const response = await adapter.sendChat({
      model: "default",
      messages: [{ role: "user", content: "hello-b" }]
    });

    expect(response.provider).toBe("provider-b");
    expect(response.model).toBe("default");
    expect(response.text).toBe("provider-b echo: hello-b");
    expect(response.error_code).toBeNull();
  });

  it("chat route supports provider-b with same response shape", async () => {
    const app = Fastify();
    registerChatRoute(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: {
        provider: "provider-b",
        model: "default",
        messages: [{ role: "user", content: "route-check-b" }]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      provider: "provider-b",
      model: "default",
      text: "provider-b echo: route-check-b",
      error_code: null
    });

    await app.close();
  });

  it("chat route returns unified error shape for invalid request", async () => {
    const app = Fastify();
    registerChatRoute(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: {
        provider: "provider-a",
        model: "default"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      provider: "provider-a",
      model: "default",
      error_code: "UNKNOWN"
    });

    await app.close();
  });

  it("chat route returns unified error shape for unsupported provider", async () => {
    const app = Fastify();
    registerChatRoute(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: {
        provider: "provider-x",
        model: "default",
        messages: [{ role: "user", content: "test" }]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      provider: "provider-x",
      model: "default",
      text: "Unsupported provider: provider-x",
      error_code: "UNKNOWN"
    });

    await app.close();
  });
});
