import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { EventEmitter } from "node:events";
import { createApp } from "./server.js";

const app = createApp();

function request(method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as { port: number };
      const baseUrl = `http://127.0.0.1:${port}`;
      const payload = body ? JSON.stringify(body) : undefined;

      const req = fetch(`${baseUrl}${path}`, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload,
      }).then(async (res) => {
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        server.close();
        resolve({ status: res.status, body: json });
      }).catch((error) => {
        server.close();
        reject(error);
      });

      void req;
    });
  });
}

test("POST /events creates an event with generated id and flags when denylist matches", async () => {
  const result = await request("POST", "/events", {
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: { content: "Please check the secret_key configuration" },
  });

  assert.equal(result.status, 201);
  assert.ok(result.body.id);
  assert.equal(result.body.eventType, "ai_tool_call");
  assert.equal(result.body.flagged, true);
  assert.equal(result.body.payload.content.includes("secret_key"), true);
});

test("GET /events returns sorted events and flagged state for a session", async () => {
  await request("POST", "/events", {
    timestamp: "2026-09-08T14:35:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "command_exec",
    payload: { content: "npm run test" },
  });

  const result = await request("GET", "/events?sessionId=s_5678");

  assert.equal(result.status, 200);
  assert.ok(Array.isArray(result.body));
  assert.ok(result.body.length >= 2);
  assert.deepEqual(
    result.body.map((event: any) => event.timestamp),
    [...result.body].map((event: any) => event.timestamp).sort()
  );
  assert.ok(result.body.some((event: any) => event.flagged === true));
});

test("GET /events filters correctly by eventType and time range (from/to)", async () => {
  const session = "s_test_filters";

  await request("POST", "/events", {
    timestamp: "2026-09-08T10:00:00Z",
    userId: "u_99",
    sessionId: session,
    eventType: "file_edit",
    payload: { content: "File edit 1" },
  });

  await request("POST", "/events", {
    timestamp: "2026-09-08T11:00:00Z",
    userId: "u_99",
    sessionId: session,
    eventType: "ai_tool_call",
    payload: { content: "Check API_KEY" },
  });

  await request("POST", "/events", {
    timestamp: "2026-09-08T12:00:00Z",
    userId: "u_99",
    sessionId: session,
    eventType: "command_exec",
    payload: { content: "git commit" },
  });

  // Filter by eventType
  const aiOnly = await request("GET", `/events?sessionId=${session}&eventType=ai_tool_call`);
  assert.equal(aiOnly.status, 200);
  assert.equal(aiOnly.body.length, 1);
  assert.equal(aiOnly.body[0].eventType, "ai_tool_call");

  // Filter by time range from/to
  const timeFiltered = await request(
    "GET",
    `/events?sessionId=${session}&from=2026-09-08T10:30:00Z&to=2026-09-08T12:30:00Z`
  );
  assert.equal(timeFiltered.status, 200);
  assert.equal(timeFiltered.body.length, 2);
});

test("POST /events rejects malformed input and missing fields", async () => {
  // Malformed timestamp
  const badDate = await request("POST", "/events", {
    timestamp: "not-a-date",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "file_edit",
    payload: { content: "Updated file" },
  });
  assert.equal(badDate.status, 400);
  assert.equal(badDate.body.error, "Malformed timestamp");

  // Invalid event type
  const badType = await request("POST", "/events", {
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "unknown_action",
    payload: { content: "Test" },
  });
  assert.equal(badType.status, 400);
  assert.match(badType.body.error, /Invalid eventType/i);

  // Missing required field
  const missingField = await request("POST", "/events", {
    timestamp: "2026-09-08T14:32:00Z",
    sessionId: "s_5678",
    eventType: "file_edit",
    payload: { content: "Missing userId" },
  });
  assert.equal(missingField.status, 400);
  assert.equal(missingField.body.error, "Missing required field");
});

test("Policy check is case-insensitive and only applies to ai_tool_call", async () => {
  // file_edit with password keyword should NOT be flagged
  const fileEditRes = await request("POST", "/events", {
    timestamp: "2026-09-08T15:00:00Z",
    userId: "u_sec",
    sessionId: "s_policy",
    eventType: "file_edit",
    payload: { content: "Added password input field in UI" },
  });
  assert.equal(fileEditRes.status, 201);
  assert.equal(fileEditRes.body.flagged, false);

  // ai_tool_call with uppercase PASSWORD keyword SHOULD be flagged
  const aiToolRes = await request("POST", "/events", {
    timestamp: "2026-09-08T15:05:00Z",
    userId: "u_sec",
    sessionId: "s_policy",
    eventType: "ai_tool_call",
    payload: { content: "Help me decrypt this PASSWORD file" },
  });
  assert.equal(aiToolRes.status, 201);
  assert.equal(aiToolRes.body.flagged, true);
});

test("GET /events requires sessionId and returns empty array for valid no-match sessions", async () => {
  const missing = await request("GET", "/events");
  assert.equal(missing.status, 400);

  const empty = await request("GET", "/events?sessionId=missing_session");
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body, []);
});

test("GET /stats returns current cluster telemetry", async () => {
  const res = await request("GET", "/stats");
  assert.equal(res.status, 200);
  assert.ok(res.body.totalEvents >= 20);
  assert.ok(Array.isArray(res.body.sessions));
  assert.ok(Array.isArray(res.body.denylist));
});
