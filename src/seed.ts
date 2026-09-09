import fs from "node:fs";
import path from "node:path";
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
  // Initial seed event (Exact Neural Inverse requirement contract example)
  {
    id: "e_seed_5678",
    timestamp: "2026-09-08T14:32:00Z",
    userId: "u_1234",
    sessionId: "s_5678",
    eventType: "ai_tool_call",
    payload: { content: "Check the secret_key configuration" },
  },
];

export const seedEvents: AuditEvent[] = seedList.map((event) => {
  if (!event.id) {
    event.id = crypto.randomUUID();
  }
  return {
    id: event.id,
    timestamp: event.timestamp,
    userId: event.userId,
    sessionId: event.sessionId,
    eventType: event.eventType,
    payload: event.payload,
  };
});

function writeSeedFile(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    seedList.forEach((item) => {
      if (!item.id) {
        item.id = crypto.randomUUID();
      }
    });

    const seedPath = path.resolve(process.cwd(), "src", "seed.ts");
    const rawContent = fs.readFileSync(seedPath, "utf-8");

    const formattedItems = seedList
      .map(
        (item) => `  {
    id: ${JSON.stringify(item.id)},
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
    id: event.id,
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
      item.id === updated.id ||
      (item.sessionId === updated.sessionId && item.timestamp === updated.timestamp)
  );
  if (index !== -1) {
    seedList[index] = {
      id: updated.id,
      timestamp: updated.timestamp,
      userId: updated.userId,
      sessionId: updated.sessionId,
      eventType: updated.eventType,
      payload: updated.payload,
    };
    writeSeedFile();
  }
}

export function deleteSeedEvent(id: string, sessionId?: string, timestamp?: string): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const index = seedList.findIndex(
    (item) =>
      item.id === id ||
      (item.sessionId === sessionId && item.timestamp === timestamp)
  );
  if (index !== -1) {
    seedList.splice(index, 1);
    writeSeedFile();
  }
}
