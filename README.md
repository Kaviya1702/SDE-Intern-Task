# Neural Inverse — Session Audit Log Platform
> SDE Intern Technical Assessment | Full-Stack Security & Compliance Engine

A TypeScript full-stack developer audit log system built for regulated, safety-critical development environments. Ingests developer actions (`file_edit`, `ai_tool_call`, `command_exec`), flags security risks against a configurable policy denylist, and presents a dark-mode audit trail dashboard with real-time telemetry and an interactive event ingestion playground.

---

## 🌟 Key Features

- **Ingestion Engine (`POST /events`)**: Strict schema validation for required fields (`timestamp`, `userId`, `sessionId`, `eventType`, `payload`). Validates ISO 8601 UTC timestamps and returns `201 Created` with a UUID and security policy evaluation flag.
- **Query & Filtering (`GET /events`)**: Required `sessionId` filter with optional `eventType`, `from`, and `to` timestamp range filters. Guarantees timestamp ascending sort order and returns `[]` for valid sessions without matching events.
- **Configurable Risk Policy Check**: Automatically flags `ai_tool_call` events containing sensitive terms (default: `["password", "secret_key", "api_key"]`). Fully configurable via the `AUDIT_DENYLIST` environment variable.
- **Full-Featured Dark Mode UI (`/`)**: Served directly at the root. Features live session quick-selectors, status statistics, keyword highlighting, risk badges, and an interactive event POSTing playground.
- **Comprehensive Unit Test Suite**: Powered by Node.js native test runner and `tsx`, verifying API contracts, edge-case input handling, policy check rules, and sorting logic.
- **Architectural Write-Up (`WRITEUP.md`)**: In-depth analysis of engineering trade-offs, scaling to $10,000+$ events/sec, cryptographic tamper-evidence (hash-chaining & Merkle trees), and CS fundamentals interview guide.

---

## 🚀 Quick Start & Run Instructions

### 1. Prerequisites
- Node.js `v20.x` or higher
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open your browser and navigate to:
- **UI Dashboard**: [http://localhost:3000/](http://localhost:3000/)
- **API Endpoint**: [http://localhost:3000/events?sessionId=s_1001](http://localhost:3000/events?sessionId=s_1001)

### 4. Custom Security Policy Denylist
Override the default denylist keywords using the `AUDIT_DENYLIST` environment variable:
```bash
AUDIT_DENYLIST="password,secret_key,api_key,private_key,token" npm run dev
```

---

## 🧪 Automated Testing

Execute the unit and integration test suite:

```bash
npm test
```

Expected output:
```
✔ POST /events creates an event with generated id and flags when denylist matches
✔ GET /events returns sorted events and flagged state for a session
✔ GET /events filters correctly by eventType and time range (from/to)
✔ POST /events rejects malformed input and missing fields
✔ Policy check is case-insensitive and only applies to ai_tool_call
✔ GET /events requires sessionId and returns empty array for valid no-match sessions
✔ GET /stats returns current cluster telemetry
```

---

## 📡 API Contract Reference

### 1. Ingest Event
**`POST /events`**

#### Request Body
```json
{
  "timestamp": "2026-09-08T14:32:00Z",
  "userId": "u_1234",
  "sessionId": "s_5678",
  "eventType": "ai_tool_call",
  "payload": {
    "content": "Check the secret_key configuration"
  }
}
```

#### Response (`201 Created`)
```json
{
  "id": "e4a77919-df49-4171-aa71-b0dbb6c6b412",
  "timestamp": "2026-09-08T14:32:00Z",
  "userId": "u_1234",
  "sessionId": "s_5678",
  "eventType": "ai_tool_call",
  "payload": {
    "content": "Check the secret_key configuration"
  },
  "flagged": true
}
```

#### Response (`400 Bad Request`)
Returned for missing required fields, invalid `eventType`, or malformed timestamp:
```json
{
  "error": "Invalid eventType. Must be file_edit, ai_tool_call, or command_exec"
}
```

---

### 2. Query Session Events
**`GET /events?sessionId=s_1001&eventType=ai_tool_call&from=2026-09-08T09:00:00Z&to=2026-09-08T12:00:00Z`**

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sessionId` | `string` | **Yes** | Session identifier (e.g. `s_1001`). |
| `eventType` | `string` | No | One of `file_edit`, `ai_tool_call`, or `command_exec`. |
| `from` | `string` | No | ISO 8601 UTC timestamp filter start. |
| `to` | `string` | No | ISO 8601 UTC timestamp filter end. |

#### Response (`200 OK`)
```json
[
  {
    "id": "7f8b9a12-...",
    "timestamp": "2026-09-08T09:05:00Z",
    "userId": "u_1001",
    "sessionId": "s_1001",
    "eventType": "ai_tool_call",
    "payload": { "content": "Explain this function" },
    "flagged": false
  },
  {
    "id": "9a8b7c6d-...",
    "timestamp": "2026-09-08T09:15:00Z",
    "userId": "u_1001",
    "sessionId": "s_1001",
    "eventType": "ai_tool_call",
    "payload": { "content": "Check the password configuration" },
    "flagged": true
  }
]
```

---

## 📁 Repository Structure

```
SDE-Intern-Task/
├── public/
│   └── index.html          # High-end dark mode UI & live POST playground
├── src/
│   ├── config.ts           # Configurable policy denylist handler
│   ├── seed.ts             # Seed events fixture (~20 events, 3 sessions)
│   ├── server.ts           # Express server, route handlers & policy check
│   └── server.test.ts      # Automated unit & integration test suite
├── package.json            # Node.js dependencies & npm scripts
├── tsconfig.json           # TypeScript configuration
├── WRITEUP.md              # Technical trade-offs & scale/tamper-evidence design
└── README.md               # Quick start & API documentation
```

---

## 📄 Written Trade-Offs & Scaling Architecture

See the detailed **[WRITEUP.md](WRITEUP.md)** for:
1. Engineering trade-offs made given the 3–4 hour time constraint.
2. Distributed system architecture for handling **10,000 events/sec**.
3. Cryptographic tamper-evidence design (**SHA-256 Hash Chaining** & **Merkle Tree Proofs**).
4. Part 2 CS fundamentals & interview walkthrough notes.
