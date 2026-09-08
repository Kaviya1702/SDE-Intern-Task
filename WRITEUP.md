# Neural Inverse — Session Audit Log
## Part 1 Architectural Trade-Offs & Scalability Write-Up

This document serves as the mandatory technical write-up for **Part 1** of the Neural Inverse SDE Intern Technical Assessment, as well as an architectural reference and interview guide for **Part 2**.

---

## 1. Trade-Offs Made Given the Time Box (3–4 Hours)

| Design Dimension | Implementation Choice | Trade-Off & Engineering Rationale |
| :--- | :--- | :--- |
| **Data Storage** | In-memory array (`AuditEvent[]`) with seed data generator | **Trade-off**: Data does not persist across application restarts.<br>**Rationale**: Within a 3–4 hour time box, an in-memory store eliminates database setup/migration overhead, keeps test runs ultra-fast, and provides immediate evaluation simplicity while demonstrating strict type safety. |
| **Policy Evaluation** | Synchronous denylist scan (`isFlagged()`) inside `POST /events` | **Trade-off**: Ingestion response time scales linearly with payload size and denylist length.<br>**Rationale**: For thousands of requests/sec, an inline check is extremely fast ($O(K)$ string search). Real-time response allows callers to receive `flagged: true` immediately in the HTTP 201 response. |
| **Frontend Stack** | Pure HTML5, CSS3 (Glassmorphism & CSS Variables), Vanilla JS | **Trade-off**: No component library or state management framework (e.g. React/Redux).<br>**Rationale**: Prevents framework setup overhead and build step friction. Delivers an instant-loading, zero-dependency visual interface with interactive querying, real-time telemetry, and an embedded API test playground. |
| **Denylist Configuration** | Environment variable (`AUDIT_DENYLIST`) + Config module fallback | **Trade-off**: Modifying denylist requires process restart or container redeploy.<br>**Rationale**: Satisfies the requirement of non-hardcoded rules cleanly without adding unnecessary complexity like remote config servers (e.g. LaunchDarkly/Consul). |

---

## 2. Scaling to Millions of Events/Day & Tamper-Evidence Design

To scale this audit system for thousands of concurrent developer sessions generating **10,000+ events/sec** while guaranteeing **cryptographic tamper-evidence**, the following architecture is proposed:

```
[ Developer IDE / Tooling ]
            │
            ▼ (TLS 1.3 + mTLS / AuthN)
┌────────────────────────────────────────┐
│   Stateless Ingestion Cluster (API)    │
└───────────────────┬────────────────────┘
                    │ (Partitioned by sessionId)
                    ▼
┌────────────────────────────────────────┐
│  Distributed Event Stream (Kafka/Kinesis)│
└─────────┬──────────────────────┬───────┘
          │                      │
          ▼                      ▼
┌───────────────────┐  ┌───────────────────────────┐
│ Async Policy Engine│  │ Append-Only Time-Series DB│
│ (Real-time Alert) │  │  (ClickHouse / Timescale) │
└───────────────────┘  └─────────────┬─────────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │  Cryptographic Hash Chain │
                       │    & Merkle Tree Ledger   │
                       └───────────────────────────┘
```

### A. High-Throughput Ingestion & Storage Architecture
1. **Asynchronous Stream Processing**:
   - Ingestion nodes validate schema and write events immediately to **Apache Kafka** or **AWS Kinesis** partitioned by `sessionId`.
   - Ingestion returns `202 Accepted` or `201 Created` with a transaction ID in $<5\text{ms}$.
2. **Append-Only Columnar Datastore**:
   - Events are batch-written from Kafka into **ClickHouse** or **TimescaleDB** partitioned by date (`YYYY-MM-DD`) and indexed by `(sessionId, timestamp)`.
   - Databases are configured with strict append-only constraints—`UPDATE` and `DELETE` SQL operations are privilege-revoked at the database user level.

### B. Cryptographic Tamper-Evidence & Immutability
1. **Event Hash-Chaining**:
   - Each event $E_i$ includes a SHA-256 hash calculated as:
     $$H_i = \text{SHA256}(H_{i-1} \parallel E_i.\text{timestamp} \parallel E_i.\text{userId} \parallel E_i.\text{payload})$$
   - If an attacker alters or deletes historical event $E_{i-k}$, every subsequent hash chain link $H_{i-k \dots n}$ fails verification.
2. **Merkle Trees & Immutable Epoch Anchoring**:
   - Every 1 minute or 10,000 events, a **Merkle Tree** is constructed from the event hashes.
   - The **Merkle Root Hash** is periodically published to an immutable Write-Once-Read-Many (WORM) storage target (e.g. AWS QLDB or AWS S3 Object Lock with Legal Hold).
   - Auditors can prove that any specific event existed at a given time and was not altered using an $O(\log N)$ Merkle proof without downloading the full dataset.
3. **Digital Signatures**:
   - Ingestion agents sign event hashes using asymmetric keypairs managed in a Hardware Security Module (HSM / AWS KMS).

---

## 3. Part 2 Interview Preparation & Fundamentals Guide

### A. CS Fundamentals
* **Hash Map vs. Balanced Binary Search Tree (AVL / Red-Black Tree)**:
  * *Hash Map*: $O(1)$ average time complexity for lookup/insertion; keys are unordered. Ideal for fast lookup by exact `sessionId`.
  * *Balanced Tree*: $O(\log N)$ worst-case lookup/insertion; keys remain strictly sorted. Ideal for range scans such as finding events between `from` and `to` timestamps.
* **Race Condition Prevention in Concurrent Writes**:
  * Concurrent writes to in-memory structures require synchronization (e.g., `sync.Mutex` or `sync.RWMutex` in Go, or atomic reference swapping). In Node.js, the single-threaded event loop handles synchronous array appends sequentially, preventing low-level memory races.
* **Efficient Time-Window Event Filtering**:
  * Store events in a sorted timestamp array. Perform a **Binary Search** (`lower_bound` / `upper_bound`) to locate start index $i$ and end index $j$ in $O(\log N)$ time, avoiding an $O(N)$ full table scan.
* **Authentication (AuthN) vs. Authorization (AuthZ)**:
  * *AuthN*: Verifying identity ("Who are you?") via JWT tokens or mTLS client certificates.
  * *AuthZ*: Verifying permissions ("What are you allowed to do?") e.g., checking if `u_1001` has rights to access session `s_1001`.

### B. Big-O Complexity Analysis
* `POST /events`:
  * Validation & ID Generation: $O(1)$
  * In-memory push: $O(1)$ amortized
  * Policy evaluation (`isFlagged`): $O(K \times M)$ where $K$ is the number of denylist keywords and $M$ is payload string length.
  * **Overall**: $O(M)$ time, $O(M)$ space.
* `GET /events`:
  * Filter scan by `sessionId`: $O(N)$ where $N$ is total events.
  * Time range & eventType filtering: $O(N)$
  * Sorting: $O(S \log S)$ where $S$ is matching session events.
  * **Overall**: $O(N + S \log S)$ time (or $O(\log N + S)$ when indexed by `(sessionId, timestamp)`).
