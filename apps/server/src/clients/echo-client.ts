const endpoint = process.env.CHAT_ENDPOINT ?? "http://127.0.0.1:3000/chat";
const message = process.argv.slice(2).join(" ") || "ping from ts client";

const payload = {
  provider: "provider-a",
  model: "default",
  timeoutMs: 15000,
  messages: [
    {
      role: "user",
      content: message
    }
  ]
};

const run = async (): Promise<void> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as unknown;

  if (!response.ok) {
    console.error("Request failed", { status: response.status, body });
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(body, null, 2));
};

run().catch((error: unknown) => {
  console.error("Client execution failed", error);
  process.exitCode = 1;
});
