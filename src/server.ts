import express, { Request, Response } from "express";
import crypto from "crypto";
import { seedEvents } from "./seed.js";

const app = express();
const PORT = 3000;

// JSON request body read panna
app.use(express.json());

// Allowed event types
const EVENT_TYPES = [
  "file_edit",
  "ai_tool_call",
  "command_exec",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

// Event structure
interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  payload: {
    content?: string;
    [key: string]: unknown;
  };
}

// In-memory storage
const events: AuditEvent[] = [];

// Load seed events
events.push(...(seedEvents as AuditEvent[]));

// Configurable denylist
const DENYLIST = ["password", "secret_key", "api_key"];

// Check whether an event should be flagged
function isFlagged(event: AuditEvent): boolean {
  if (event.eventType !== "ai_tool_call") {
    return false;
  }

  const content = event.payload.content;

  if (typeof content !== "string") {
    return false;
  }

  const lowerContent = content.toLowerCase();

  return DENYLIST.some((keyword) =>
    lowerContent.includes(keyword.toLowerCase())
  );
}

// POST /events
app.post("/events", (req: Request, res: Response) => {
  const { timestamp, userId, sessionId, eventType, payload } = req.body;

  // Required field validation
  if (!timestamp || !userId || !sessionId || !eventType || !payload) {
    return res.status(400).json({
      error: "Missing required field",
    });
  }

  // Event type validation
  if (!EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({
      error:
        "Invalid eventType. Must be file_edit, ai_tool_call, or command_exec",
    });
  }

  // Timestamp validation
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      error: "Malformed timestamp",
    });
  }

  const newEvent: AuditEvent = {
    id: crypto.randomUUID(),
    timestamp,
    userId,
    sessionId,
    eventType,
    payload,
  };

  events.push(newEvent);

  return res.status(201).json(newEvent);
});

// GET /events
app.get("/events", (req: Request, res: Response) => {
  const { sessionId, eventType, from, to } = req.query;

  // sessionId is required
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({
      error: "sessionId is required",
    });
  }

  let filteredEvents = events.filter(
    (event) => event.sessionId === sessionId
  );

  // Filter by event type
  if (eventType && typeof eventType === "string") {
    filteredEvents = filteredEvents.filter(
      (event) => event.eventType === eventType
    );
  }

  // Filter from timestamp
  if (from && typeof from === "string") {
    filteredEvents = filteredEvents.filter(
      (event) => new Date(event.timestamp) >= new Date(from)
    );
  }

  // Filter to timestamp
  if (to && typeof to === "string") {
    filteredEvents = filteredEvents.filter(
      (event) => new Date(event.timestamp) <= new Date(to)
    );
  }

  // Sort by timestamp ascending
  filteredEvents.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  );

  // Add flagged field
  const response = filteredEvents.map((event) => ({
    ...event,
    flagged: isFlagged(event),
  }));

  return res.json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});