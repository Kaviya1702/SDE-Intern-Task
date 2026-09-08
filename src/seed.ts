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
  }
];

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));

function persistSeedEvent(event){if(process.env.NODE_ENV==="test"){return}const newEntry={timestamp:event.timestamp,userId:event.userId,sessionId:event.sessionId,eventType:event.eventType,payload:event.payload};seedList.push(newEntry);const formattedItems=seedList.map(item=>`  {
    timestamp: ${JSON.stringify(item.timestamp)},
    userId: ${JSON.stringify(item.userId)},
    sessionId: ${JSON.stringify(item.sessionId)},
    eventType: ${JSON.stringify(item.eventType)},
    payload: ${JSON.stringify(item.payload)},
  }`).join(",\n");const fileContent=`import fs from "node:fs";
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
${formattedItems}
];

export const seedEvents: AuditEvent[] = seedList.map((event) => ({
  id: crypto.randomUUID(),
  ...event,
}));

${persistSeedEvent.toString()}
`;try{const seedPath=path.resolve(process.cwd(),"src","seed.ts");fs.writeFileSync(seedPath,fileContent,"utf-8")}catch(err){console.error("Failed to write to seed.ts",err)}}
