import fs from "node:fs";
import path from "node:path";
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
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: {"content":"Check the secret_key configuration"},
  },
  {
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: {"content":"Please check the secret_key configuration"},
  },
  {
    timestamp: "2026-09-08T14:35:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "command_exec",
    payload: {"content":"npm run test"},
  },
  {
    timestamp: "2026-09-08T10:00:00Z",
    userId: "u_99",
    sessionId: "s_test_filters",
    eventType: "file_edit",
    payload: {"content":"File edit 1"},
  },
  {
    timestamp: "2026-09-08T11:00:00Z",
    userId: "u_99",
    sessionId: "s_test_filters",
    eventType: "ai_tool_call",
    payload: {"content":"Check API_KEY"},
  },
  {
    timestamp: "2026-09-08T12:00:00Z",
    userId: "u_99",
    sessionId: "s_test_filters",
    eventType: "command_exec",
    payload: {"content":"git commit"},
  },
  {
    timestamp: "2026-09-08T15:00:00Z",
    userId: "u_sec",
    sessionId: "s_policy",
    eventType: "file_edit",
    payload: {"content":"Added password input field in UI"},
  },
  {
    timestamp: "2026-09-08T15:05:00Z",
    userId: "u_sec",
    sessionId: "s_policy",
    eventType: "ai_tool_call",
    payload: {"content":"Help me decrypt this PASSWORD file"},
  },
  {
    timestamp: "2026-09-08T16:00:00Z",
    userId: "u_edit_test",
    sessionId: "s_edit_session",
    eventType: "ai_tool_call",
    payload: {"content":"Updated content with secret_key"},
  }
];

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));

function writeSeedFile(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    const seedPath = path.resolve(process.cwd(), "src", "seed.ts");
    const rawContent = fs.readFileSync(seedPath, "utf-8");

    const formattedItems = seedList
      .map(
        (item) => `  {
    timestamp: ${JSON.stringify(item.timestamp)},
    userId: ${JSON.stringify(item.userId)},
    sessionId: ${JSON.stringify(item.sessionId)},
    eventType: ${JSON.stringify(item.eventType)},
    payload: ${JSON.stringify(item.payload)},
  }`
      )
      .join(",\n");

    const updated = rawContent.replace(
      /(const seedList:[^=]+= \[)[\s\S]*?(\];)/,
      `$1\n${formattedItems}\n$2`
    );

    fs.writeFileSync(seedPath, updated, "utf-8");
  } catch (err) {
    console.error("Failed to update seed.ts", err);
  }
}

export function persistSeedEvent(event: AuditEvent): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const newEntry = {
    timestamp: event.timestamp,
    userId: event.userId,
    sessionId: event.sessionId,
    eventType: event.eventType,
    payload: event.payload,
  };

  seedList.push(newEntry);
  writeSeedFile();
}

export function updateSeedEvent(updated: AuditEvent): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const index = seedList.findIndex(
    (item) =>
      item.sessionId === updated.sessionId && item.userId === updated.userId
  );
  if (index !== -1) {
    seedList[index] = {
      timestamp: updated.timestamp,
      userId: updated.userId,
      sessionId: updated.sessionId,
      eventType: updated.eventType,
      payload: updated.payload,
    };
    writeSeedFile();
  }
}

export function deleteSeedEvent(sessionId: string, timestamp: string): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const index = seedList.findIndex(
    (item) => item.sessionId === sessionId && item.timestamp === timestamp
  );
  if (index !== -1) {
    seedList.splice(index, 1);
    writeSeedFile();
  }
}
