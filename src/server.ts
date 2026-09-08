import express, { type Request, type Response } from "express";
import crypto from "crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDenyList } from "./config.js";
import { seedEvents, persistSeedEvent } from "./seed.js";

export const EVENT_TYPES = [
  "file_edit",
  "ai_tool_call",
  "command_exec",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}

const events: AuditEvent[] = [...seedEvents];
const PORT = Number(process.env.PORT ?? 3000);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function isFlagged(event: AuditEvent): boolean {
  if (event.eventType !== "ai_tool_call") {
    return false;
  }

  const content = event.payload?.content;
  let contentString = "";

  if (typeof content === "string") {
    contentString = content;
  } else if (content !== null && typeof content === "object") {
    contentString = JSON.stringify(content);
  } else if (typeof event.payload === "string") {
    contentString = event.payload;
  } else if (event.payload !== null && typeof event.payload === "object") {
    contentString = JSON.stringify(event.payload);
  }

  if (!contentString) {
    return false;
  }

  const normalized = contentString.toLowerCase();
  return getDenyList().some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.post("/events", (req: Request, res: Response) => {
    const { timestamp, userId, sessionId, eventType, payload } = req.body ?? {};

    if (
      !isNonEmptyString(timestamp) ||
      !isNonEmptyString(userId) ||
      !isNonEmptyString(sessionId) ||
      !isNonEmptyString(eventType) ||
      !payload || typeof payload !== "object"
    ) {
      return res.status(400).json({
        error: "Missing required field",
      });
    }

    if (!EVENT_TYPES.includes(eventType as EventType)) {
      return res.status(400).json({
        error: "Invalid eventType. Must be file_edit, ai_tool_call, or command_exec",
      });
    }

    if (!isValidTimestamp(timestamp)) {
      return res.status(400).json({
        error: "Malformed timestamp",
      });
    }

    const newEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp,
      userId: userId.trim(),
      sessionId: sessionId.trim(),
      eventType: eventType as EventType,
      payload,
    };

    events.push(newEvent);
    persistSeedEvent(newEvent);
    return res.status(201).json({
      ...newEvent,
      flagged: isFlagged(newEvent),
    });
  });

  app.get("/events", (req: Request, res: Response) => {
    const { sessionId, eventType, from, to } = req.query;

    if (!isNonEmptyString(sessionId)) {
      return res.status(400).json({
        error: "sessionId is required",
      });
    }

    if (from && typeof from === "string" && !isValidTimestamp(from)) {
      return res.status(400).json({
        error: "Malformed from timestamp",
      });
    }

    if (to && typeof to === "string" && !isValidTimestamp(to)) {
      return res.status(400).json({
        error: "Malformed to timestamp",
      });
    }

    let filteredEvents = events.filter((event) => event.sessionId === sessionId);

    if (isNonEmptyString(eventType)) {
      filteredEvents = filteredEvents.filter((event) => event.eventType === eventType);
    }

    if (isNonEmptyString(from)) {
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.timestamp).getTime() >= new Date(from).getTime()
      );
    }

    if (isNonEmptyString(to)) {
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.timestamp).getTime() <= new Date(to).getTime()
      );
    }

    filteredEvents.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return res.json(
      filteredEvents.map((event) => ({
        ...event,
        flagged: isFlagged(event),
      }))
    );
  });

  app.get("/stats", (_req: Request, res: Response) => {
    const uniqueSessions = Array.from(new Set(events.map((e) => e.sessionId)));
    const totalEvents = events.length;
    const totalFlagged = events.filter(isFlagged).length;

    res.json({
      totalEvents,
      totalFlagged,
      sessions: uniqueSessions,
      denylist: getDenyList(),
    });
  });

  app.get("/config/denylist", (_req: Request, res: Response) => {
    res.json({ denylist: getDenyList() });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  return app;
}

const app = createApp();

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;