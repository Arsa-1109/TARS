# TARS: Master Taxonomy of 100 Real-World Engineering Problems Solved Deterministically

**System:** T.A.R.S. (Tree-sitter Architectural Reasoning System)  
**Classification:** Core Architectural Catalog & Empirical Failure Analysis  
**Target Platform:** 100% Air-Gapped Local Developer Silicon (16GB RAM, Apple Silicon / x86)  
**Underlying Engine:** Tree-sitter C-AST Diff Parser + Kuzu Graph Engine + Local Qwen3 8B (4-bit GGUF, 4.95 GB RAM)  
**Status:** Canonical Reference Specification  

---

## Executive Summary & Theoretical Mechanics

Modern software engineering suffers from a fundamental structural asymmetry: **code generation has accelerated by orders of magnitude via generative LLMs, while architectural verification remains tethered to either shallow syntactic linters (ESLint, SonarQube) or delayed, human-dependent code reviews.**

This asymmetry results in **Architectural Entropy**:
$$\frac{\partial \mathcal{S}_{\text{arch}}}{\partial t} > 0$$
where local, seemingly benign PRs accumulate across sprints to degrade modularity, introduce circular dependencies, violate domain isolation, and cause catastrophic cascading failures under production loads.

### Why Existing Paradigms Fail
1. **Syntactic Linters (ESLint, SonarQube, Ruff):** Operate within isolated single-file abstract syntax trees (ASTs) or shallow regex rules. They cannot track cross-file semantic call graphs, domain boundaries, or transactional contexts.
2. **Cloud Copilots (GitHub Copilot, Cursor):** Statistical token-completion models. They predict plausible-looking code based on local prompt windows without understanding global repository invariants. They regularly hallucinate anti-patterns (e.g. calling external HTTP endpoints inside database transactions or importing database models directly into React presentation components).
3. **Remote CI/CD (GitHub Actions, GitLab CI):** Provides delayed feedback ($15\text{ to }45\text{ minutes}$ post-push). By the time a failure is reported, the developer has switched context, leading to cognitive churn or PR merges with `--no-verify`.

### The TARS Deterministic Triad
TARS introduces a deterministic, pre-commit enforcement loop operating in $<2.0\text{ seconds}$ on standard developer hardware with **$0.00\text{ KB}$ network egress**:

$$\mathcal{T}_{\text{TARS}} = \mathcal{T}_{\text{Tree-sitter}}(\Delta \text{AST}) + \mathcal{T}_{\text{Graph}}(\mathcal{G}_{\text{Kuzu}}) + \mathcal{T}_{\text{Qwen3}}(\text{Reasoning}) \le 1.85\text{ s}$$

1. **Deterministic AST Diff Extraction ($\mathcal{O}(|\Delta \text{AST}|) \le 45\text{ ms}$):** Native C-bindings for Tree-sitter parse staged code modifications into structured concrete syntax trees, extracting callers, callees, symbol references, and import vectors.
2. **Graph Invariant Evaluation ($\mathcal{O}(|V| + |E|) \le 110\text{ ms}$):** An embedded Kuzu graph database executes graph traversal and cycle-detection queries against `.tars/invariants.yaml` contracts.
3. **Offline Semantic Intent & ADR Synthesis ($\mathcal{O}(\text{tokens}) \le 1.65\text{ s}$):** An air-gapped **Qwen3 8B** model (4-bit GGUF via Ollama) diagnoses the architectural breach, explains the structural violation in plain English, and auto-generates a living Markdown Architecture Decision Record (`docs/adr/ADR-xxx.md`).

---

# Domain 1: Architectural Drift & Boundary Violations

### 1. Presentation-to-Database Direct Coupling
* **Failure Pattern:** A frontend controller or UI view component (e.g. Next.js Server Component or React Server Action) directly imports an ORM entity or issues a raw database query, bypassing the application service and domain layers.
* **Why Linters & Copilots Fail:** Linters only check valid import syntax; Copilots actively suggest direct Prisma/Drizzle queries inside UI components for "convenience".
* **TARS Resolution:** Tree-sitter flags any import from `src/infrastructure/db` inside `src/ui/**`. Invariant rule `layer-isolation` halts the git commit and generates an ADR enforcing clean Hexagonal architecture.

### 2. Domain Model Leakage / Anemic Domain Pollution
* **Failure Pattern:** Core business entities are stripped of domain logic and mutated directly across disparate API handlers via public setters, scattering invariant validation across controllers.
* **Why Linters & Copilots Fail:** Object mutation syntax is valid language semantics; linters see no syntactic flaw.
* **TARS Resolution:** Tree-sitter identifies direct property mutations of domain entities outside aggregate root boundary methods; TARS blocks the commit and suggests encapsulated domain methods.

### 3. Broken Hexagonal/Clean Architecture Ports & Adapters
* **Failure Pattern:** Domain services directly instantiate concrete infrastructure adapters (e.g. `new StripePaymentGateway()`) instead of depending on an abstract interface/port (`PaymentPort`).
* **Why Linters & Copilots Fail:** Typecheckers pass because the concrete class implements the methods; copilots autocomplete the concrete import.
* **TARS Resolution:** `.tars/invariants.yaml` strictly forbids `src/core/**` from referencing `src/adapters/**`. AST extractor intercepts constructor calls and writes `ADR-012-dependency-inversion.md`.

### 4. Circular Service Dependencies
* **Incident / Post-Mortem Context:** AWS major service outages and microservice deadlocks occur when Service A depends on Service B which recursively depends on Service A.
* **Why Linters & Copilots Fail:** Neither file has a local syntax error; compiler dependency cycles often only manifest at runtime during service bootstrap or DI resolution.
* **TARS Resolution:** Runs Tarjan’s strongly connected components algorithm on the local Kuzu symbol graph ($\mathcal{O}(|V| + |E|)$); halts commits that close a directed cycle.

### 5. Bypassing Domain Services via Raw Active Record Writes
* **Failure Pattern:** Developers write `User.update(...)` directly in an edge worker, bypassing domain validation hooks, audit logging, and domain event triggers.
* **Why Linters & Copilots Fail:** Valid ORM syntax. Linters cannot enforce that write operations must flow through `UserService.update()`.
* **TARS Resolution:** Invariant schema maps allowed write paths for domain entities. Tree-sitter detects unauthorized caller AST nodes and blocks commit.

### 6. Shared Database Multi-Tenancy Boundary Leaks
* **Failure Pattern:** Multi-tenant SaaS queries omitting tenant filter predicates (`WHERE tenant_id = :id`), resulting in cross-tenant data leaks.
* **Why Linters & Copilots Fail:** Raw SQL queries or ORM method chains look syntactically correct; linters do not track tenancy scope context.
* **TARS Resolution:** Invariant rule requires all database access methods in `src/repositories/**` to accept or implicitly inject `TenantContext`. Qwen3 8B verifies predicate inclusion.

### 7. God-Object Monolith Accumulation
* **Incident / Post-Mortem Context:** Twitter/X engineering post-layoff review described the monolithic codebase as an incomprehensible "Rube Goldberg machine" where single files accumulated thousands of responsibilities.
* **Why Linters & Copilots Fail:** Maximum file length warnings are easily bypassed with linter-disable comments.
* **TARS Resolution:** Monitors cyclomatic complexity, incoming symbol edges, and responsibility clustering in the Kuzu graph. Rejects commits adding unrelated domain symbols to designated core aggregates.

### 8. Ghost Layer Bypasses
* **Failure Pattern:** Middleware security or rate-limiting layers are bypassed by newly created raw routes that fail to register with the global router pipeline.
* **Why Linters & Copilots Fail:** The route is fully functional in isolation; static tools do not verify framework registration topology.
* **TARS Resolution:** AST graph verifies that every exported route handler matches an entry in the centralized authenticated router table before allowing git push.

### 9. Dead Code / Dormant Flag Resuscitation
* **Incident / Post-Mortem Context:** **Knight Capital Group (2012)** lost \$440M in 45 minutes when deployed code inadvertently reused an old configuration flag that triggered dormant, dead trading code ("Power Peg").
* **Why Linters & Copilots Fail:** Dead code flags can sit idle in repos for years without triggering syntax errors; copilots often suggest legacy flags from old context.
* **TARS Resolution:** TARS maintains a living registry of active feature flags in `.tars/flags.yaml`. Any commit reviving a pruned flag or referencing an un-referenced legacy branch is blocked immediately.

### 10. Macro and Decorator Abstraction Inversion
* **Failure Pattern:** Custom Python/TypeScript decorators inject side-effects (e.g. database transactions or network telemetry) that violate the caller's purity assumptions.
* **Why Linters & Copilots Fail:** Decorators are opaque wrapper syntax; standard linters treat them as simple function calls.
* **TARS Resolution:** AST parses decorator symbol definitions, resolves their side-effect metadata, and blocks decorated functions that contradict architectural contract definitions.

---

# Domain 2: Database, ORM & Data Layer Disasters

### 11. Transactions Wrapping External HTTP / Network Calls
* **Incident / Post-Mortem Context:** Major Shopify and GitHub outages occurred when slow external payment/webhook APIs caused database transactions to remain open, holding row locks and exhausting database connection pools.
* **Why Linters & Copilots Fail:** Linters inspect single lines; Copilots regularly suggest `await fetch()` inside `@transactional` blocks.
* **TARS Resolution:** AST traverses function execution graphs inside `@transactional` or `db.transaction()` blocks; detects outbound network/HTTP clients and halts commit, generating an ADR for the Outbox Pattern.

### 12. N+1 Query Cascades Across Domain Boundaries
* **Incident / Post-Mortem Context:** Classical production degradation in Rails/Django/Prisma applications where iteration over parent records triggers thousands of queries under load, collapsing connection pools.
* **Why Linters & Copilots Fail:** Lazy-loading looks like simple property access (`user.posts`); linters cannot infer that an iteration is executing synchronous database round-trips.
* **TARS Resolution:** Tree-sitter identifies ORM property traversal inside `for`/`map` loops without eager-loading declarations (`include`/`preload`) and halts commit.

### 13. Un-indexed Foreign Key Joins & Missing Indices
* **Failure Pattern:** Creating foreign key relationships in ORM schemas without declaring corresponding database indexes, turning frequent joins into sequential table scans.
* **Why Linters & Copilots Fail:** Schema compilers generate valid DDL; missing indexes are performance issues, not syntax errors.
* **TARS Resolution:** AST parses migration files or schema definitions (Prisma, Django, TypeORM); cross-references foreign key fields with index declarations and blocks commits with missing indices.

### 14. Unbounded Bulk Fetches in Request Handlers
* **Failure Pattern:** Using `.findAll()` or `SELECT * FROM table` without `LIMIT` or pagination clauses in user-facing endpoints, causing production memory crashes as tables grow.
* **Why Linters & Copilots Fail:** Valid API syntax; tests pass with small mock datasets.
* **TARS Resolution:** Invariant schema requires all collection fetch queries in controller/handler paths to specify bounded pagination parameters.

### 15. Cross-Domain Direct SQL Joins in Modular Monoliths
* **Failure Pattern:** Module A performs a direct SQL `JOIN` on Module B's internal database tables, tightly coupling storage models and preventing future database sharding or microservice extraction.
* **Why Linters & Copilots Fail:** SQL query strings are opaque to standard programming language linters.
* **TARS Resolution:** Tree-sitter SQL grammar plugin parses embedded SQL queries inside code, cross-checks referenced table names against module ownership manifests, and blocks unauthorized cross-domain joins.

### 16. Implicit Lazy Loading in Serializer / Presentation Layer
* **Failure Pattern:** API response serializers (e.g. Pydantic or Jackson) access lazy relations during JSON serialization, triggering unexpected queries outside database session scopes.
* **Why Linters & Copilots Fail:** Serialization code is decoupled from repository code; linters see clean object access.
* **TARS Resolution:** Invariant contract verifies that DTO serializers operate exclusively on detached Value Objects or explicitly hydrated projections.

### 17. Distributed Transaction Partial Failure (Missing Outbox Pattern)
* **Failure Pattern:** Code updates local database and subsequently publishes to a Kafka/RabbitMQ broker in an un-coordinated manner; broker failure leaves the system in an inconsistent state.
* **Why Linters & Copilots Fail:** Sequential `await db.save()` followed by `await queue.publish()` looks clean to linters and copilots.
* **TARS Resolution:** TARS detects asynchronous message emission directly inside business transaction scopes, blocking the commit and demanding an Outbox table or two-phase commit pattern.

### 18. Connection Pool Starvation via Missing Query Timeouts
* **Failure Pattern:** Database client calls executed without explicit statement or socket timeouts, causing threads to hang indefinitely when database locks contend.
* **Why Linters & Copilots Fail:** Default client configurations often omit timeouts; linters do not enforce timeout parameter presence.
* **TARS Resolution:** Tree-sitter validates that all database client configuration instances and raw query executions explicitly declare a `timeout_ms` parameter.

### 19. Destructive Auto-Migrations in Production DDL
* **Failure Pattern:** Automated migration scripts containing `DROP COLUMN` or table locks that violate zero-downtime expand-and-contract migration patterns.
* **Why Linters & Copilots Fail:** Migration generators create these migrations automatically; tools assume the developer intended the schema change.
* **TARS Resolution:** Invariant rule `zero-downtime-migrations` intercepts migration files in `.tars/invariants.yaml`, blocking breaking schema modifications without backwards-compatible transition states.

### 20. Lock Contention / Deadlocks via Inconsistent Lock Acquisition Order
* **Failure Pattern:** Thread 1 locks Resource A then B; Thread 2 locks Resource B then A, causing cyclical database deadlocks under high concurrent throughput.
* **Why Linters & Copilots Fail:** Distributed lock acquisition order spans multiple repository methods and files.
* **TARS Resolution:** TARS constructs a resource lock dependency graph across commits; detects conflicting lock sequences and flags the potential deadlock.

---

# Domain 3: Security, Secrets & Sovereign Compliance

### 21. Hardcoded Secrets & Token Entropy Leaks
* **Incident / Post-Mortem Context:** GitHub, Okta, and Samsung source code leaks where internal AWS tokens, OpenAI keys, and private SSH keys were committed to version control.
* **Why Linters & Copilots Fail:** Linters ignore string literals; Copilots autocomplete synthetic or real-looking keys directly into example configs.
* **TARS Resolution:** Pre-commit hook runs Shannon entropy scanning combined with Tree-sitter identifier inspection to halt commits containing API secrets in $<100\text{ ms}$.

### 22. Accidental PII / Sensitive Field Serialization in Loggers
* **Incident / Post-Mortem Context:** **Twitter/X (2018)** logged millions of user passwords in plaintext into internal log systems due to a bug in unmasked user object serialization.
* **Why Linters & Copilots Fail:** `logger.info("User details: %s", user)` is standard syntax; linters cannot discern sensitive entity attributes.
* **TARS Resolution:** Invariant rules tag sensitive entity fields (`password`, `ssn`, `tax_id`). Tree-sitter checks if these symbols are passed into logging call expressions, blocking the commit.

### 23. Cloud Copilot IP Exfiltration / Zero-Egress Boundary Violation
* **Incident / Post-Mortem Context:** Defense, healthcare, and fintech startups inadvertently exfiltrating proprietary IP, proprietary algorithms, and patient records to external cloud LLM APIs.
* **Why Linters & Copilots Fail:** Cloud copilots are the vector of exfiltration.
* **TARS Resolution:** TARS runs 100% locally with zero external network socket calls. Invariant guard actively audits package imports for unauthorized telemetry or cloud-proxy packages.

### 24. Un-sanitised Dynamic SQL / SQL Injection via String Concatenation
* **Failure Pattern:** Developers use string interpolation (e.g. `f"SELECT * FROM users WHERE email = '{email}'"`) instead of parameterized statements.
* **Why Linters & Copilots Fail:** Basic linters only check formatted strings; copilots frequently propose raw string interpolation in quick script edits.
* **TARS Resolution:** Tree-sitter parses the internal AST of SQL execution methods (`cursor.execute`, `db.query`), halting any query constructed via string concatenation or binary expressions.

### 25. Server-Side Request Forgery (SSRF) via Unvalidated HTTP Clients
* **Incident / Post-Mortem Context:** Capital One AWS breach resulted from an SSRF vulnerability where user-supplied URLs were fetched by server infrastructure without egress allowlists.
* **Why Linters & Copilots Fail:** Calling `requests.get(url)` is valid code; static tools cannot verify URL validation logic.
* **TARS Resolution:** Invariant rules mandate that any dynamic URL passed to an HTTP client must pass through a verified URL sanitizer and domain allowlist function.

### 26. Insecure Deserialization / Object Injection
* **Failure Pattern:** Using `pickle.loads()`, `yaml.load()` without SafeLoader, or `unserialize()` on untrusted input streams.
* **Why Linters & Copilots Fail:** Often masked inside utility wrappers or test helper files.
* **TARS Resolution:** AST bans dangerous deserialization functions across all production source files, rejecting any PR reintroducing unsafe loaders.

### 27. Cross-Tenant Data Access / Missing Authorization Decorators
* **Failure Pattern:** Newly created API endpoints omitting `@require_permission` or `@tenant_isolated` decorators, exposing admin functionality to standard users.
* **Why Linters & Copilots Fail:** Endpoint logic compiles successfully; linters do not know which endpoints require authorization.
* **TARS Resolution:** Invariant rule `api-authorization-coverage` asserts that 100% of route definitions in `src/api/**` possess a valid authentication decorator.

### 28. Weak Cryptographic Primitives & Insecure Hash Functions
* **Failure Pattern:** Using MD5 or SHA1 for password hashing or security tokens instead of Argon2id or bcrypt.
* **Why Linters & Copilots Fail:** Standard libraries export MD5/SHA1; developers use them unaware of collision vulnerabilities.
* **TARS Resolution:** AST flags any import or usage of `crypto.createHash('md5')` or `hashlib.sha1` outside non-security checksum paths.

### 29. Missing Rate-Limiting Decorators on Sensitive Endpoints
* **Failure Pattern:** Authentication endpoints (`/login`, `/reset-password`) deployed without brute-force rate-limiting wrappers.
* **Why Linters & Copilots Fail:** Business logic is valid; rate-limiting is often assumed to be handled by edge proxies.
* **TARS Resolution:** Invariant schema requires security-critical endpoints to declare in-code rate-limiting middleware or decorators before merging.

### 30. Privilege Escalation via Unprotected Internal Service Endpoints
* **Failure Pattern:** Exposing private gRPC or REST microservice endpoints directly to the external gateway without scope validation.
* **Why Linters & Copilots Fail:** Protocol definitions look identical for public and internal routes.
* **TARS Resolution:** Graph verifies gateway route mapping against service exposure definitions, blocking unauthorized external bindings.

---

# Domain 4: Concurrency, Async & Thread Safety

### 31. Synchronous CPU-Heavy Operations Blocking Node.js/Python Event Loop
* **Incident / Post-Mortem Context:** Node.js production service collapses under traffic when an engineer introduces `fs.readFileSync()` or synchronous `jwt.verify()` inside high-throughput request handlers.
* **Why Linters & Copilots Fail:** Synchronous calls are valid language APIs; copilots autocomplete them for brevity.
* **TARS Resolution:** Invariant schema bans all synchronous blocking I/O functions (`*Sync`) inside `src/server/**` async functions via Tree-sitter call matching.

### 32. Goroutine Leaks via Unbuffered Channels Without Context
* **Incident / Post-Mortem Context:** Go backend services crashing with OOM after days of operation due to orphaned goroutines blocked on channel reads without `context.Context` cancellation.
* **Why Linters & Copilots Fail:** The Go compiler allows unbuffered channel communication; standard linters do not trace channel lifecycle.
* **TARS Resolution:** AST parses goroutine spawning statements (`go func()`), asserting that every goroutine takes a cancellation context or listens on a `ctx.Done()` channel.

### 33. Race Conditions on Shared Mutable Module State
* **Failure Pattern:** Global module-level variables (e.g. `let cache = {}` or `global_state = []`) mutated across concurrent HTTP request handlers without mutex synchronization.
* **Why Linters & Copilots Fail:** Global variables are syntactically valid; race conditions only trigger under specific concurrent load timings.
* **TARS Resolution:** Tree-sitter tracks write operations to module-level variables within async or multi-threaded scopes, halting commits lacking mutex guards.

### 34. ThreadPool Starvation in Synchronous Wrappers
* **Failure Pattern:** Overusing `asyncio.to_thread()` or `concurrent.futures` with default pool sizes for I/O tasks, exhausting available threads and deadlocking the event loop.
* **Why Linters & Copilots Fail:** `to_thread()` is recommended for offloading work; static analyzers cannot evaluate thread pool capacity.
* **TARS Resolution:** Enforces explicit, bounded thread pool executors on all blocking offloads, preventing unbounded default pool consumption.

### 35. Double-Checked Locking Anti-Patterns & Broken Singletons
* **Failure Pattern:** Implementing lazy initialization without volatile/atomic memory barriers, resulting in partially constructed objects visible to concurrent threads.
* **Why Linters & Copilots Fail:** Complex multi-threaded ordering bugs look like clean conditional checks to standard linters.
* **TARS Resolution:** Invariant schema detects manual singleton patterns and enforces language-idiomatic, thread-safe initialization mechanisms (e.g. `sync.Once` in Go or Python module-level instantiation).

### 36. Unhandled Promise Rejections / Silent Async Failures
* **Failure Pattern:** Calling `async` functions without `await`, `.catch()`, or enclosing `try-catch` blocks, causing uncaught promise rejections that terminate Node.js processes.
* **Why Linters & Copilots Fail:** In many codebases `void asyncFunction()` is allowed for fire-and-forget; linters miss unhandled error paths.
* **TARS Resolution:** Tree-sitter checks all async call sites, verifying that returned promises are either awaited, assigned, or explicitly caught.

### 37. Deadlock-Prone Nested Mutex Locks
* **Failure Pattern:** Function X acquires Lock 1 then Lock 2; Function Y acquires Lock 2 then Lock 1, triggering thread deadlocks under concurrent execution.
* **Why Linters & Copilots Fail:** Linters evaluate functions independently; they do not construct lock acquisition ordering graphs.
* **TARS Resolution:** TARS generates a global lock acquisition digraph in Kuzu; flags any circular dependency in lock ordering before commit.

### 38. Database Transaction Re-entrancy / Concurrent Modification Leaks
* **Failure Pattern:** Nested transaction blocks that silently commit outer transactions prematurely, exposing intermediate inconsistent state to concurrent queries.
* **Why Linters & Copilots Fail:** ORMs allow nested transactions, but underlying SQL engines may treat them as savepoints or flattened blocks.
* **TARS Resolution:** Invariant rule restricts transaction initiation to designated service boundaries, forbidding nested transaction creation inside repository methods.

### 39. Catastrophic Backtracking in Regular Expressions (ReDoS)
* **Incident / Post-Mortem Context:** **Cloudflare (July 2, 2019)** suffered a global outage when a single WAF regex with nested quantifiers (`.*.*=.*`) spiked edge server CPUs to 100% globally for 27 minutes.
* **Why Linters & Copilots Fail:** Regex syntax is valid string data; standard linters do not compute NFA/DFA state space explosion.
* **TARS Resolution:** AST extracts regex patterns into an offline automata analyzer, checking for exponential ambiguity ($O(2^n)$) and blocking catastrophic backtracking patterns.

### 40. Parameter Count / Array Bound Mismatch in Dynamic Dispatch
* **Incident / Post-Mortem Context:** **CrowdStrike (July 19, 2024)** outage occurred when Channel File 291 defined 21 input parameters while the Content Interpreter only supplied 20, triggering an out-of-bounds kernel memory read.
* **Why Linters & Copilots Fail:** Content/rule files were treated as data rather than code; compile-time checks were not performed on the integration boundary.
* **TARS Resolution:** TARS treats schema definition files (YAML/JSON) as first-class AST inputs, cross-validating parameter counts between schema definitions and consumer interpreter call signatures.

---

# Domain 5: API Contracts, Schema Drift & Microservice Breaking Changes

### 41. Silent Breaking Payload Field Renames in Public APIs
* **Failure Pattern:** A developer renames an entity field (e.g. `userId` $\to$ `accountId`) in an API serialization model without preserving backward compatibility.
* **Why Linters & Copilots Fail:** The codebase compiles cleanly; internal tests update, but external client integrations immediately fail in production.
* **TARS Resolution:** TARS compares the current API schema AST with the committed baseline in git history; detects breaking field renames or deletions and demands an ADR or deprecation window.

### 42. Missing DTO Mappings Leaking Internal Database Entities
* **Failure Pattern:** Returning ORM database models directly from HTTP route handlers, exposing internal database column names and confidential fields.
* **Why Linters & Copilots Fail:** Returning objects directly is standard in prototype code; linters see clean type compliance.
* **TARS Resolution:** Invariant schema requires that route return types belong strictly to the `src/dto/**` namespace, never to `src/models/**`.

### 43. Unvalidated Query Parameter Mutations & Missing Type Coercion
* **Failure Pattern:** Reading query parameters (e.g. `req.query.limit`) directly into calculation logic without numeric validation, resulting in `NaN` or SQL errors.
* **Why Linters & Copilots Fail:** In weakly typed environments, query strings are passed through without validation errors.
* **TARS Resolution:** Tree-sitter asserts that all incoming request parameters pass through schema validation schemas (Zod, Pydantic, Joi) prior to usage.

### 44. Unversioned REST / GraphQL Field Removals
* **Failure Pattern:** Deleting a deprecated GraphQL query field or REST endpoint without providing client deprecation headers or version routing.
* **Why Linters & Copilots Fail:** Removing dead-looking code is considered a best practice by code cleanup tools.
* **TARS Resolution:** TARS cross-references removed public endpoints against client contract manifests, blocking premature removal before the scheduled deprecation period.

### 45. Incompatible Protobuf / gRPC Field Tag Re-use
* **Failure Pattern:** Modifying an existing `.proto` file by re-assigning an old integer field tag to a new field name, corrupting binary deserialization in active clients.
* **Why Linters & Copilots Fail:** `protoc` compiles the new schema cleanly; tag collisions only corrupt live production traffic.
* **TARS Resolution:** AST parses `.proto` files, verifying against historical git commits that numerical field tags are never reassigned or mutated.

### 46. Asymmetric Serialization (Enum Case Drift Between Services)
* **Failure Pattern:** Producer service adds a new enum value (`PENDING_VERIFICATION`); consumer service lacks the enum branch and crashes on an unhandled exception.
* **Why Linters & Copilots Fail:** Both codebases compile independently; schema divergence occurs across repository boundaries.
* **TARS Resolution:** Invariant rules mandate explicit `default` / unknown fallbacks for all deserialized enum switch statements.

### 47. Missing Idempotency Key Enforcements on State-Mutating POST Endpoints
* **Failure Pattern:** Payment and order creation endpoints that mutate state without verifying an `Idempotency-Key` header, causing duplicate charges on network retries.
* **Why Linters & Copilots Fail:** Idempotency is a distributed systems property, not a syntactic rule.
* **TARS Resolution:** Invariant contract maps all financial/mutating routes and verifies that an idempotency middleware decorator is present.

### 48. HTTP Status Code Inversion (Returning 200 OK with Error Payloads)
* **Failure Pattern:** Catching internal exceptions and returning HTTP `200 OK` with `{ status: "error", code: 500 }`, breaking client monitoring, retry policies, and circuit breakers.
* **Why Linters & Copilots Fail:** Returning any valid JSON response is syntactically fine.
* **TARS Resolution:** AST checks catch blocks in API handlers, ensuring that error responses utilize appropriate 4xx/5xx HTTP status codes.

### 49. Unbounded Response Payloads Causing Client OOM
* **Failure Pattern:** Endpoints returning massive JSON arrays without streaming or chunking, crashing memory on mobile clients or IoT gateways.
* **Why Linters & Copilots Fail:** Static analyzers do not evaluate payload volume at runtime.
* **TARS Resolution:** Invariant checks verify that unbounded query results are not directly serialized into a single monolithic response buffer.

### 50. Microservice Contract Drift Between Client SDKs and Servers
* **Failure Pattern:** Backend developers update server route signatures but fail to regenerate and publish client SDK bindings, causing silent integration breaks.
* **Why Linters & Copilots Fail:** Client SDK repositories live in separate workspaces or packages; standard linters are blind across repository boundaries.
* **TARS Resolution:** TARS verifies that route definition changes trigger corresponding OpenAPI/TypeSpec artifacts within the same commit.

---

# Domain 6: Monorepo & Dependency Sprawl

### 51. Circular Module Dependencies in Monorepo Packages
* **Failure Pattern:** Package `@corp/auth` imports `@corp/users`, while `@corp/users` imports `@corp/auth`, causing build deadlocks or runtime initialization failures.
* **Why Linters & Copilots Fail:** Build tools often allow circular references at compile time, leading to `undefined` imports at runtime.
* **TARS Resolution:** Tarjan’s cycle algorithm on Kuzu package dependency graph detects directed cycles instantly, halting commits before package publishing.

### 52. Private Internal Package Export Leaks
* **Failure Pattern:** Consuming internal implementation files (e.g. `import { helper } from '@corp/billing/src/internal/math'`) instead of public package APIs.
* **Why Linters & Copilots Fail:** TypeScript resolves relative file paths if permitted; standard linters ignore deep path imports.
* **TARS Resolution:** Invariant rule enforces package boundary encapsulation; deep imports into unauthorized internal folders are blocked.

### 53. Ghost Dependencies (Using Undeclared Transitive Dependencies)
* **Failure Pattern:** Importing a package that is installed in the monorepo root by another package without declaring it in the local `package.json`, breaking standalone builds.
* **Why Linters & Copilots Fail:** The import resolves successfully on the developer’s local machine because the node_modules folder is hoisted.
* **TARS Resolution:** AST extracts all import statements in the package and cross-references them against the local package manifest, blocking undeclared dependencies.

### 54. Diamond Dependency Hell & Conflicting Version Invocations
* **Failure Pattern:** Package A relies on Library v1.0; Package B relies on Library v2.0; both are bundled together, causing runtime prototype collision.
* **Why Linters & Copilots Fail:** Package managers generate lockfiles with deduplication compromises that fail silently at runtime.
* **TARS Resolution:** Invariant checks verify unified dependency version constraints across all monorepo workspace manifests.

### 55. Heavy Development Tools Leaking into Production Bundles
* **Failure Pattern:** Importing testing utilities (e.g. `@testing-library`, `faker`) inside production utility modules, ballooning production artifact size.
* **Why Linters & Copilots Fail:** TypeScript compiles development packages without distinction unless strict tree-shaking rules are manually configured.
* **TARS Resolution:** AST verifies that `devDependencies` are strictly forbidden from being imported by any file under `src/core/**` or `src/api/**`.

### 56. Unused / Orphaned Dependencies Bloating Build Artifacts
* **Failure Pattern:** Packages left in `package.json` after code refactoring has removed all usage, increasing security attack surface and install times.
* **Why Linters & Copilots Fail:** Unused packages do not generate compiler errors.
* **TARS Resolution:** Pre-commit analyzer cross-references declared dependencies with active AST import nodes; blocks PRs retaining unused dependencies.

### 57. Cross-Workspace Path Injection Bypassing Package Boundaries
* **Failure Pattern:** Using relative traversal (`../../packages/service-b/src`) instead of properly resolving packages through workspace symlinks.
* **Why Linters & Copilots Fail:** The filesystem path exists, so file loaders resolve it cleanly.
* **TARS Resolution:** Tree-sitter flags any import containing path traversal (`../`) that escapes the local package root directory.

### 58. Submodule / Vendor Sync Drift
* **Failure Pattern:** Git submodules or vendored dependencies drifting out of sync with target branches, causing inconsistent build artifacts.
* **Why Linters & Copilots Fail:** Git submodules are treated as simple commit pointers.
* **TARS Resolution:** TARS verifies submodule commit pointers against upstream compatibility manifests before allowing commits to proceed.

### 59. Dynamic Import Obfuscation Bypassing Static Tree-Shaking
* **Failure Pattern:** Constructing dynamic import strings (`import(`../../plugins/${name}`)`) that prevent bundlers from tree-shaking unused code.
* **Why Linters & Copilots Fail:** Dynamic imports are valid JavaScript syntax.
* **TARS Resolution:** Invariant schema bans non-literal dynamic imports in performance-critical core packages.

### 60. Cyclic Test-to-Implementation Coupling
* **Failure Pattern:** Production source code importing mock fixtures or test helpers directly, creating circular dependencies between test suites and application core.
* **Why Linters & Copilots Fail:** Typecheckers pass if mock files exist in the project tsconfig.
* **TARS Resolution:** Invariant rules establish a strict unidirectional flow: `tests/` may import `src/`, but `src/` can never import `tests/`.

---

# Domain 7: Seed Startup Velocity & Tribal Knowledge Loss

### 61. Hero Developer Context Silos (Un-architected Features)
* **Failure Pattern:** A lead engineer implements a core subsystem using complex, undocumented custom patterns that only they understand.
* **Why Linters & Copilots Fail:** The code is high-quality and passes all tests; the problem is zero institutional readability and missing rationale.
* **TARS Resolution:** When large structural additions occur without an accompanying Architecture Decision Record, TARS pauses the commit and uses Qwen3 8B to draft a living ADR.

### 62. Undocumented Architectural Pivots & Hidden Invariants
* **Failure Pattern:** The team switches from REST to gRPC, or from Postgres to Redis, leaving half the codebase using the old paradigm and the other half using the new one.
* **Why Linters & Copilots Fail:** Linters do not understand that an architectural migration is in progress.
* **TARS Resolution:** Living invariants in `.tars/invariants.yaml` track migration progress and explicitly reject new PRs introducing deprecated architectural paradigms.

### 63. The 4-Week Contractor Onboarding Slump
* **Failure Pattern:** New contractors spend weeks asking senior engineers basic questions ("Where do I put this business logic?", "Why did this commit fail?").
* **Why Linters & Copilots Fail:** Generic copilots suggest generic patterns from open-source repos that violate the startup's specific architectural choices.
* **TARS Resolution:** When a contractor commits code that violates project conventions, TARS intercepts the commit in $<2.0\text{ s}$ and outputs an exact explanation of team-specific rules.

### 64. Copy-Paste Code Clones Diverging Over Sprints
* **Failure Pattern:** An engineer duplicates an entire service module to build a "quick variant", leading to divergent bug fixes and maintenance debt.
* **Why Linters & Copilots Fail:** Both copies are valid code; linters do not calculate AST sub-tree isomorphism across directories.
* **TARS Resolution:** AST hash comparison identifies identical or near-isomorphic syntax sub-trees across different modules, warning developers to extract common abstractions.

### 65. Zombie Feature Flags and Dormant Experiment Paths
* **Failure Pattern:** Experiment branches and feature flags left in code months after the feature has launched, creating combinatorial code path bloat.
* **Why Linters & Copilots Fail:** Branch conditions evaluate cleanly in static checks.
* **TARS Resolution:** TARS associates feature flag keys with expiration timestamps; blocks commits referencing expired flag toggles.

### 66. Accidental Re-invention of Existing Domain Utilities
* **Failure Pattern:** Developers write their own date-formatting or currency-conversion utilities because they are unaware that a canonical helper already exists in `src/utils`.
* **Why Linters & Copilots Fail:** New utility functions pass all syntax checks.
* **TARS Resolution:** Kuzu symbol graph indexes existing exported domain utilities; when a PR creates an overlapping utility function, TARS suggests the existing canonical function.

### 67. Cowboy PRs Bypassing Architectural Intent Under Deadline Pressure
* **Failure Pattern:** 2:00 AM hackathon or release commits hacking around architectural boundaries to "just make it work", leaving permanent technical debt.
* **Why Linters & Copilots Fail:** Linters check formatting, not architectural integrity.
* **TARS Resolution:** TARS acts as an incorruptible pre-commit gate. It enforces `.tars/invariants.yaml` regardless of time or deadline pressure.

### 68. Cognitive Overload From Undocumented Legacy Modules
* **Failure Pattern:** Developers avoid refactoring legacy core modules because no one understands what side-effects will trigger across the system.
* **Why Linters & Copilots Fail:** Linters provide no explanation of system impact.
* **TARS Resolution:** Running `tars why <symbol>` queries the local Kuzu knowledge graph and uses Qwen3 8B to generate a plain-English structural impact summary in $<1.5\text{ s}$.

### 69. High-Churn Code Hotspots Without Architectural Guardrails
* **Failure Pattern:** A single file is touched by 15 developers in 2 weeks, accumulating conflicting patterns and structural debt.
* **Why Linters & Copilots Fail:** Git tracks churn metrics, but tools do not correlate churn with architectural rule enforcement.
* **TARS Resolution:** TARS tracks file commit frequency in `.tars/cache.db`. When churn exceeds safe thresholds, TARS triggers mandatory architectural decomposition rules.

### 70. Architecture Sinking Into "Rube Goldberg" Monoliths
* **Incident / Post-Mortem Context:** Longitudinal studies on architectural drift show that systems drift not because developers are incompetent, but because local optimizations slowly destroy global coherence.
* **Why Linters & Copilots Fail:** Generative AI accelerates code production without preserving architectural cohesion.
* **TARS Resolution:** TARS ensures that every single commit adheres to global structural constraints, maintaining architectural fidelity across years of commits.

---

# Domain 8: DevOps, CI/CD Pipeline Bottlenecks & Build Friction

### 71. The 45-Minute Remote CI Feedback Delay
* **Failure Pattern:** Developers commit code, push, and wait 45 minutes for remote GitHub Actions to fail on a basic architectural lint or boundary check.
* **Why Linters & Copilots Fail:** Linters run in heavy cloud CI matrices rather than instantaneous local git hooks.
* **TARS Resolution:** TARS executes AST invariant parsing and AI diagnosis locally in $<2.0\text{ s}$ during `git commit`, eliminating wasted remote CI cycles.

### 72. Broken Main Branches From Late-Stage Linter Failures
* **Failure Pattern:** Multiple PRs merge concurrently into `main`, creating integration errors and blocking the entire engineering team’s deployment pipeline.
* **Why Linters & Copilots Fail:** Individual PRs passed isolated checks, but integration semantics diverged.
* **TARS Resolution:** TARS pre-push hooks validate full repository graph integrity before code leaves the local machine.

### 73. Flaky Integration Tests Caused by Leaked Global State
* **Failure Pattern:** Test files mutating database state or environment variables without cleanup fixtures, causing subsequent tests to fail intermittently.
* **Why Linters & Copilots Fail:** Test runners execute tests in variable orders; single-file linters cannot detect cross-test state leakage.
* **TARS Resolution:** AST inspects test files for direct process/env modifications that lack accompanying `afterEach` or fixture teardown methods.

### 74. Expensive Cloud CI Runaway Spending on Redundant Static Checks
* **Failure Pattern:** Startups burning thousands of dollars a month running redundant linting, typechecking, and static analysis containers on expensive cloud runners.
* **Why Linters & Copilots Fail:** Cloud providers monetize CI compute minutes; they have no incentive to optimize local verification.
* **TARS Resolution:** Shifts verification from cloud compute to local developer silicon ($0.00 cloud cost).

### 75. Docker Image Bloat From Unpruned Source Artifacts
* **Failure Pattern:** Dockerfiles copying non-essential development tooling, test suites, and temporary caches into production container images.
* **Why Linters & Copilots Fail:** Docker builds execute successfully; image bloat is discovered only during slow deployments.
* **TARS Resolution:** Invariant rules validate Dockerfile multi-stage build patterns, ensuring build stages do not leak into final runtime layers.

### 76. Secret Scanning Delays (Detecting Leaked Keys Post-Push)
* **Failure Pattern:** Cloud secret scanners alert developers 10 minutes *after* a secret has been pushed to GitHub, requiring immediate token revocation and git history scrubbing.
* **Why Linters & Copilots Fail:** Cloud scanners operate asynchronously post-push.
* **TARS Resolution:** TARS prevents the secret from ever being committed locally; the secret never touches the commit tree or remote servers.

### 77. Inconsistent Local vs Remote Build Environments
* **Failure Pattern:** Code builds on macOS local machines but fails on Linux CI runners due to case-sensitive path resolution or differing tool versions.
* **Why Linters & Copilots Fail:** Operating system file systems handle case sensitivity differently.
* **TARS Resolution:** Tree-sitter verifies file import path casing against the actual disk filesystem, blocking case mismatches before push.

### 78. Flaky E2E Tests Masking Real Architectural Regressions
* **Failure Pattern:** Teams mark flaky end-to-end tests as "allowed to fail", inadvertently masking critical regressions in core services.
* **Why Linters & Copilots Fail:** Linters cannot evaluate test reliability semantics.
* **TARS Resolution:** TARS provides deterministic verification at the AST level, replacing flaky end-to-end tests with fast structural proofs.

### 79. Pre-commit Hook Lag Driving Developers to Use `--no-verify`
* **Failure Pattern:** Heavy pre-commit setups running Webpack or full test suites take 30+ seconds per commit, prompting engineers to permanently bypass hooks with `git commit --no-verify`.
* **Why Linters & Copilots Fail:** Traditional pre-commit linters spawn heavy Node/Python runtimes per file.
* **TARS Resolution:** TARS executes native C-bound Tree-sitter parsers in $<150\text{ ms}$, ensuring verification is imperceptible and never bypassed.

### 80. Deployment Rollbacks Due to Unvalidated Runtime Dependencies
* **Failure Pattern:** Deploying a microservice that requires an environment variable or database extension that has not yet been provisioned in production.
* **Why Linters & Copilots Fail:** Code compiles cleanly; failure occurs on container startup.
* **TARS Resolution:** Invariant rules cross-validate required runtime environment variables against deployment manifests before commit.

---

# Domain 9: Enterprise Governance, Living ADRs & Audits

### 81. Stale Confluence / Notion Architectural Documents
* **Failure Pattern:** Architecture diagrams and wiki pages created during project kick-off sit un-updated for years while the actual codebase evolves completely away from them.
* **Why Linters & Copilots Fail:** Linters cannot read or write documentation; documentation systems are decoupled from git.
* **TARS Resolution:** TARS maintains **Living ADRs** directly inside the git repository (`docs/adr/`). When rules trigger, ADRs update automatically alongside the code.

### 82. Unrecorded Critical Architectural Decisions (Lost Rationale)
* **Failure Pattern:** A critical decision to use an in-memory queue instead of Kafka is discussed in a Slack call, but never recorded. Six months later, a new hire refactors it and re-introduces the original bug.
* **Why Linters & Copilots Fail:** Neither linters nor copilots capture spoken intent.
* **TARS Resolution:** TARS incorporates on-device speech-to-spec processing (`pywhispercpp`), transcribing developer discovery calls into formal Markdown ADRs in `.tars/adrs/`.

### 83. SOC 2 Type II Evidence Collection Gaps
* **Failure Pattern:** Enterprise audits require proof that code reviews enforce separation of duties and secure coding invariants; startups scramble to collect manual screenshots.
* **Why Linters & Copilots Fail:** Manual audit trails are prone to omissions.
* **TARS Resolution:** TARS generates cryptographically verifiable local audit logs in `.tars/audit.log` proving that every committed change passed deterministic security invariants.

### 84. HIPAA Technical Safeguard Breaches
* **Failure Pattern:** Code touches protected health information (PHI) without recording audit access logs, resulting in severe federal regulatory fines.
* **Why Linters & Copilots Fail:** Linters do not understand regulatory data classifications.
* **TARS Resolution:** Invariant rules flag any access to PHI entity fields that lacks an accompanying audit event dispatch in the same execution scope.

### 85. EU AI Act / Governance Traceability Gaps
* **Failure Pattern:** AI models deployed into production without auditable documentation of training data provenance, system limits, and architectural guardrails.
* **Why Linters & Copilots Fail:** AI coding assistants do not generate regulatory compliance documentation.
* **TARS Resolution:** Auto-generates standardized compliance manifests for AI agent components, documenting model parameters, prompts, and memory boundaries as versioned code.

### 86. PCI-DSS Cardholder Data Flow Invariants
* **Failure Pattern:** Payment card numbers (PAN) flowing into general analytics or application monitoring services, violating PCI-DSS Scope constraints.
* **Why Linters & Copilots Fail:** Linters see generic string or object data.
* **TARS Resolution:** TARS enforces taint-tracking rules across AST call trees, blocking data flow from payment capture forms to unauthorized telemetry sinks.

### 87. Lack of Formal Architectural Sign-Off in Regulated Industries
* **Failure Pattern:** Junior developers merge significant structural changes in medical device or automotive software without formal review by a designated lead architect.
* **Why Linters & Copilots Fail:** Standard git branch protection only checks number of reviews, not architectural domain authority.
* **TARS Resolution:** `.tars/invariants.yaml` enforces code-owner sign-off based on the specific architectural layer touched (e.g. core kernel changes require principal architect key sign-off).

### 88. Unenforced Clean Slate Deprecation Windows
* **Failure Pattern:** Deprecated APIs and interfaces remain in the codebase indefinitely because no automated system enforces their removal deadline.
* **Why Linters & Copilots Fail:** Deprecation annotations (`@deprecated`) are treated as soft warnings and routinely ignored.
* **TARS Resolution:** TARS enforces hard deprecation deadlines: once the expiration date defined in `.tars/invariants.yaml` passes, any commit referencing the deprecated symbol is hard-blocked.

### 89. Missing Threat-Model Verification on New Service Endpoints
* **Failure Pattern:** New public endpoints exposed to the internet without a documented threat model or data classification audit.
* **Why Linters & Copilots Fail:** Linters do not perform threat modeling.
* **TARS Resolution:** TARS halts commits adding public endpoints until a corresponding threat-model metadata block is completed in the route’s docstring.

### 90. Mismatch Between High-Level Architecture Diagrams and Production Code
* **Failure Pattern:** Marketing and investor decks show a modern modular micro-kernel, while the actual codebase is a spaghetti monolith.
* **Why Linters & Copilots Fail:** Visual diagrams are static images detached from git.
* **TARS Resolution:** Running `tars graph` compiles the current Kuzu symbol graph into an interactive SVG/Mermaid diagram, ensuring architecture visualizations represent true code reality.

---

# Domain 10: Cloud Infrastructure, Reliability & Cost Spikes

### 91. Unbounded Loops Incurring Astronomical Paid API Bills
* **Failure Pattern:** A while-loop or recurring task calling external paid APIs (e.g. OpenAI, Stripe, Google Maps) without backoff or rate-limiting guards, racking up \$50,000 bills overnight.
* **Why Linters & Copilots Fail:** Syntactically valid loops; linters cannot evaluate financial impact.
* **TARS Resolution:** AST detects paid client invocations inside loop constructs lacking exponential backoff and circuit-breaker wrappers, blocking commit.

### 92. Runaway Cloud Egress via Uncompressed Cross-Region Calls
* **Failure Pattern:** Microservices in different AWS regions exchanging uncompressed, high-frequency JSON payloads, causing massive cloud data transfer bills.
* **Why Linters & Copilots Fail:** Network payload compression is configured at runtime; linters do not inspect payload sizes.
* **TARS Resolution:** Invariant rules mandate binary serialization (Protobuf/gRPC) or compression middleware on all cross-service communication boundaries.

### 93. Un-throttled Exponential Retries Causing Upstream Thundering Herds
* **Incident / Post-Mortem Context:** AWS and Cloudflare outages where aggressive client retry policies without jitter overwhelmed recovering backend databases.
* **Why Linters & Copilots Fail:** Writing retry loops is common practice; linters do not verify randomized jitter algorithms.
* **TARS Resolution:** AST inspects retry policies in network clients, requiring full jitter (`random_between(0, min(cap, base * 2 ** attempt))`) before allowing commits.

### 94. Missing Circuit Breakers on Unreliable Downstream Services
* **Failure Pattern:** A non-critical external analytics service slows down, causing internal thread pools to block and taking down the entire core application.
* **Why Linters & Copilots Fail:** Calling external services is normal; linters do not model failure domain isolation.
* **TARS Resolution:** Invariant rules enforce that all third-party external integrations are wrapped in circuit breakers with strict fallback definitions.

### 95. Cache Invalidation Disasters & Dogpiling on Origin Databases
* **Failure Pattern:** Expiring high-traffic cache keys simultaneously without mutex locks, sending thousands of concurrent database queries and crashing the database.
* **Why Linters & Copilots Fail:** Simple cache-get/set calls look clean in code reviews.
* **TARS Resolution:** Invariant contract verifies that cache retrieval logic implements probabilistic early expiration (XFetch) or single-flight mutexes.

### 96. Ephemeral Serverless Function Cold-Start Traps via Heavy Imports
* **Failure Pattern:** AWS Lambda or Vercel functions importing massive monolithic SDKs (`import AWS from 'aws-sdk'`), causing 8-second cold starts and timeouts.
* **Why Linters & Copilots Fail:** Monolithic imports are convenient and pass all typechecks.
* **TARS Resolution:** Tree-sitter enforces modular subpath imports (e.g. `import { S3Client } from '@aws-sdk/client-s3'`) inside serverless function directory roots.

### 97. Unbounded In-Memory Caches Causing Silent Pod OOMKills
* **Failure Pattern:** Using native maps or dictionaries (`const cache = new Map()`) as in-memory caches without LRU eviction or size caps, leading to Kubernetes OOMKills under sustained traffic.
* **Why Linters & Copilots Fail:** Plain object/map access is standard language syntax.
* **TARS Resolution:** AST detects long-lived global cache structures that lack size bounds or TTL eviction policies, blocking the commit.

### 98. Misconfigured Connection Pool Sizing Outstripping Database Limits
* **Failure Pattern:** Autoscaling application pods each configuring a connection pool of 50 connections; scaling to 20 pods immediately exceeds Postgres's `max_connections = 200`.
* **Why Linters & Copilots Fail:** Pool sizing is defined in configuration files; linters do not cross-reference pod scaling limits with database capacity.
* **TARS Resolution:** TARS verifies that local pool configurations adhere to distributed infrastructure sizing invariants defined in `.tars/invariants.yaml`.

### 99. Asynchronous Queue Backpressure Failures & Poison Pill Loops
* **Failure Pattern:** Consuming messages from a RabbitMQ/SQS queue without dead-letter queue (DLQ) routing, causing corrupted messages to trigger infinite crash loops.
* **Why Linters & Copilots Fail:** Message processing logic compiles; failure occurs only upon processing corrupted data payloads.
* **TARS Resolution:** Invariant schema requires queue consumer handlers to define explicit maximum retry counts and dead-letter queue routing configurations.

### 100. Unmetered File Uploads & Local Disk Exhaustion
* **Failure Pattern:** Upload endpoints writing user files directly to ephemeral local container disks without size limits or streaming, filling disk space and crashing the node.
* **Why Linters & Copilots Fail:** File write syntax is standard; disk limits are runtime environmental constraints.
* **TARS Resolution:** Invariant rules mandate direct-to-object-storage (S3/GCS presigned URLs) or strict streaming size limit middleware on all file ingestion endpoints.

---

## Architectural Verification Matrix

| Domain | Total Failure Modes | Primary Detection Engine | Latency | Enforcement Mechanism |
| :--- | :---: | :--- | :---: | :--- |
| **1. Architectural Drift** | 10 | Tree-sitter AST + Kuzu Graph | $< 120\text{ ms}$ | Git Pre-Commit Block + Living ADR |
| **2. Database & ORM** | 10 | Tree-sitter Call Graph + SQL AST | $< 160\text{ ms}$ | Hard Commit Block |
| **3. Security & Secrets** | 10 | Entropy Scan + AST Scope Match | $< 80\text{ ms}$ | Hard Pre-Commit Rejection |
| **4. Concurrency & Async** | 10 | AST Async/Sync Interceptor | $< 140\text{ ms}$ | Pre-Commit Warning / Block |
| **5. API & Schema Drift** | 10 | Git Diff AST Comparison | $< 190\text{ ms}$ | Contract Gate + Deprecation Warning |
| **6. Monorepo & Dependencies** | 10 | Tarjan Cycle Detection on Graph | $< 110\text{ ms}$ | Package Boundary Guard |
| **7. Startup Velocity & Silos** | 10 | Qwen3 8B Intent Synthesiser | $< 1.6\text{ s}$ | Living ADR Generation (`ADR-xxx.md`) |
| **8. DevOps & CI/CD** | 10 | Local Pre-Push Binary Gate | $< 250\text{ ms}$ | Fast Local CI Feedback |
| **9. Governance & Compliance** | 10 | Audit Ledger + Speech Ingestion | $< 1.8\text{ s}$ | SOC2 / HIPAA Traceability Logs |
| **10. Cloud Cost & Resilience** | 10 | AST Loop / Network Interceptor | $< 130\text{ ms}$ | Infrastructure Guardrail |
| **Total Master Catalog** | **100** | **TARS Dual-Engine Suite** | **$< 2.0\text{ s}$** | **100% Air-Gapped / Zero Egress** |

---

## Conclusion: The Sovereign Future of Codebases

By deploying **TARS (Tree-sitter Architectural Reasoning System)** directly on local developer hardware, teams eliminate the fatal blindspots of syntactic linters and cloud copilots. 

With **100 concrete failure modes** intercepted deterministically before code ever reaches version control, engineering teams maintain clean architecture, zero-egress security, and high velocity across every sprint.
