import crypto from "crypto";
import type { AuditEvent, EventType } from "./server.js";

const seedList: Array<{
  timestamp: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}> = [
  {
    timestamp: "2026-09-08T14:30:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "file_edit",
    payload: { content: "Updated src/auth/session.ts: Added developer session governance tracker." },
  },
];

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));