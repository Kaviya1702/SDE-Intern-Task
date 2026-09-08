import crypto from "crypto";
import type { AuditEvent, EventType } from "./server.js";

const seedList: Array<{
  timestamp: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}> = [
  // Session s_5678 (Requirement Spec Session & Developer u_1234)
  {
    timestamp: "2026-09-08T14:30:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "file_edit",
    payload: { content: "Updated src/auth/session.ts: Added developer session governance tracker." },
  },
  {
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: { content: "Check the secret_key configuration" },
  },
  {
    timestamp: "2026-09-08T14:35:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "command_exec",
    payload: { content: "npm run test -- src/auth/session.test.ts" },
  },
  {
    timestamp: "2026-09-08T14:40:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: { content: "Can you help me reset the database password in environment variables?" },
  },

  // Session s_1001 - Developer: u_1001 (Auth Service Integration)
  {
    timestamp: "2026-09-08T09:00:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "file_edit",
    payload: { content: "Updated src/auth/jwt.ts: Added token verification middleware and expiration handling." },
  },
  {
    timestamp: "2026-09-08T09:05:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "ai_tool_call",
    payload: { content: "Explain how to safely parse RS256 RSA public keys in Node.js crypto module." },
  },
  {
    timestamp: "2026-09-08T09:10:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "command_exec",
    payload: { content: "npm test -- src/auth/jwt.test.ts" },
  },
  {
    timestamp: "2026-09-08T09:15:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "ai_tool_call",
    payload: { content: "Can you help me check if the database password should be stored in plain text in config?" },
  },
  {
    timestamp: "2026-09-08T09:20:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "file_edit",
    payload: { content: "Modified src/config.ts: Added AUDIT_DENYLIST fallback." },
  },
  {
    timestamp: "2026-09-08T09:25:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "command_exec",
    payload: { content: "git commit -m 'feat: implement JWT token validation'" },
  },

  // Session s_1002 - Developer: u_1002 (Cloud API Integration)
  {
    timestamp: "2026-09-08T10:00:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "file_edit",
    payload: { content: "Updated src/services/cloud.ts: Implemented AWS S3 client upload pipeline." },
  },
  {
    timestamp: "2026-09-08T10:05:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "command_exec",
    payload: { content: "npm run build" },
  },
  {
    timestamp: "2026-09-08T10:10:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "ai_tool_call",
    payload: { content: "Review this AWS SDK v3 client initialization function for memory leaks." },
  },
  {
    timestamp: "2026-09-08T10:15:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "ai_tool_call",
    payload: { content: "Show me how to pass the production API_KEY directly into the header." },
  },
  {
    timestamp: "2026-09-08T10:20:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "file_edit",
    payload: { content: "Updated src/middleware/rate-limiter.ts: Added IP throttling rules." },
  },
  {
    timestamp: "2026-09-08T10:25:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "command_exec",
    payload: { content: "docker compose up -d postgres redis" },
  },

  // Session s_1003 - Developer: u_1003 (Infrastructure & Security Pipeline)
  {
    timestamp: "2026-09-08T11:00:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "file_edit",
    payload: { content: "Created src/policy/engine.ts: Built policy evaluation rules." },
  },
  {
    timestamp: "2026-09-08T11:05:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "command_exec",
    payload: { content: "npm install express @types/express tsx" },
  },
  {
    timestamp: "2026-09-08T11:10:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "ai_tool_call",
    payload: { content: "Explain TypeScript union types and discriminated type narrowing." },
  },
  {
    timestamp: "2026-09-08T11:15:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "ai_tool_call",
    payload: { content: "Check my secret_key usage in the KMS encryption routine." },
  },
  {
    timestamp: "2026-09-08T11:20:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "file_edit",
    payload: { content: "Updated public/index.html: Refined UI layout & CSS styling tokens." },
  },
  {
    timestamp: "2026-09-08T11:25:00Z",
    userId: "u_1003",
    sessionId: "s_1003",
    eventType: "command_exec",
    payload: { content: "npm test" },
  },

  // Evening activity timestamps across sessions
  {
    timestamp: "2026-09-08T12:00:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "file_edit",
    payload: { content: "Fixed input payload content string normalization in server.ts." },
  },
  {
    timestamp: "2026-09-08T12:05:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "command_exec",
    payload: { content: "npm run dev" },
  },
  {
    timestamp: "2026-09-08T12:10:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "file_edit",
    payload: { content: "Updated README.md: Added API documentation and quick start guide." },
  },
  {
    timestamp: "2026-09-08T12:15:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "command_exec",
    payload: { content: "git status" },
  },
  {
    timestamp: "2026-09-08T12:30:00Z",
    userId: "u_1001",
    sessionId: "s_1001",
    eventType: "ai_tool_call",
    payload: { content: "Help me debug why Express route returns HTML instead of JSON." },
  },
  {
    timestamp: "2026-09-08T12:35:00Z",
    userId: "u_1002",
    sessionId: "s_1002",
    eventType: "ai_tool_call",
    payload: { content: "Can you check my password hashing logic with bcrypt salt rounds?" },
  },
];

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));