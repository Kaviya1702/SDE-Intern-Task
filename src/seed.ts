import crypto from "crypto";
import type { AuditEvent, EventType } from "./server.js";

const seedList: Array<{
  id?: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}> = [
  // --- session s_5678 / u_1234 ---
  // intentionally listed out of timestamp order to exercise GET sort
  {
    id: "e_seed_5678",
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    // FLAGGED: contains "secret_key"
    payload: { content: "Please check the secret_key configuration" },
  },
  {
    timestamp: "2026-09-08T09:00:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "file_edit",
    payload: { content: "Initial scaffold for login module" },
  },
  {
    timestamp: "2026-09-08T16:00:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    // FLAGGED: contains "api_key"
    payload: { content: "Help me rotate the api_key in production" },
  },
  {
    timestamp: "2026-09-08T11:00:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "file_edit",
    // denylist word "password" in a non-AI event — must NOT be flagged
    payload: { content: "Add password field to settings form" },
  },
  {
    timestamp: "2026-09-08T14:35:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "command_exec",
    payload: { content: "npm run build" },
  },
  {
    timestamp: "2026-09-08T13:00:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "command_exec",
    payload: { content: "git commit -m 'fix auth flow'" },
  },
  {
    timestamp: "2026-09-08T15:10:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    // safe AI call — must NOT be flagged
    payload: { content: "What does this function do?" },
  },

  // --- session s_abcd / u_42 ---
  {
    timestamp: "2026-09-08T08:20:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "ai_tool_call",
    // FLAGGED: contains "api_key"
    payload: { content: "Rotate the api_key stored in env vars" },
  },
  {
    timestamp: "2026-09-08T08:00:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "command_exec",
    payload: { content: "git pull origin main" },
  },
  {
    timestamp: "2026-09-08T09:15:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "ai_tool_call",
    // safe AI call
    payload: { content: "Explain the caching strategy used here" },
  },
  {
    timestamp: "2026-09-08T08:05:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "file_edit",
    // denylist word "password" in a non-AI event — must NOT be flagged
    payload: { content: "Updated README with password reset instructions" },
  },
  {
    timestamp: "2026-09-08T08:45:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "command_exec",
    payload: { content: "npm test" },
  },
  {
    timestamp: "2026-09-08T08:10:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "ai_tool_call",
    // safe AI call
    payload: { content: "Summarise the diff for review" },
  },
  {
    timestamp: "2026-09-08T08:30:00Z",
    userId: "u_42",
    sessionId: "s_abcd",
    eventType: "file_edit",
    payload: { content: "Refactor database connection pooling" },
  },

  // --- session s_efgh / u_77 ---
  {
    timestamp: "2026-09-08T07:30:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "file_edit",
    payload: { content: "Updated deployment script" },
  },
  {
    timestamp: "2026-09-08T07:00:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "command_exec",
    payload: { content: "docker compose up" },
  },
  {
    timestamp: "2026-09-08T07:10:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "file_edit",
    // denylist word "secret_key" in a non-AI event — must NOT be flagged
    payload: { content: "Store secret_key in environment variable" },
  },
  {
    timestamp: "2026-09-08T08:05:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "ai_tool_call",
    // safe AI call
    payload: { content: "Generate a summary of today's changes" },
  },
  {
    timestamp: "2026-09-08T07:15:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "ai_tool_call",
    // FLAGGED: contains "secret_key"
    payload: { content: "Check the secret_key in the config file" },
  },
  {
    timestamp: "2026-09-08T07:45:00Z",
    userId: "u_77",
    sessionId: "s_efgh",
    eventType: "command_exec",
    payload: { content: "kubectl apply -f deploy.yaml" },
  },
];

// Malformed sample used only to verify POST /events validation.
// NOT inserted into seedEvents or the in-memory store.
export const malformedSample = {
  timestamp: "not-a-date",
  userId: "u_1234",
  sessionId: "s_5678",
  eventType: "file_edit",
  payload: { content: "This entry has a malformed timestamp" },
};

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));
