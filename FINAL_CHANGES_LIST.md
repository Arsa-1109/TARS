TARS — FINAL COMPLETE ENGINEERING / LOGIC / BACKEND / SECURITY / PRODUCT UPGRADE LIST

CURRENT CODEBASE VERIFICATION SNAPSHOT
────────────────────────────────────────────────────────────────────

• Python compilation succeeds across apps/scripts/tests.
• 177 tests are collected in the current environment.
• 3 test modules fail during collection because Tree-sitter is unavailable.
• Excluding those collection-blocked modules, the current run produced 155 passed and
  22 failed tests.
• The failures include Cortex availability, MCP Git execution, search citation
  deduplication, self-learning/supersession, and interaction telemetry.
• The implementation should be brought to a state where a clean local installation
  can start all required capabilities deterministically and the critical end-to-end
  paths pass from ingestion → memory → reasoning → action → audit.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. BUILD A REAL TEMPORAL MEMORY SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every important object should understand time.

Add:

created_at
effective_from
effective_to
superseded_at
superseded_by
source_timestamp

Apply to:

documents
policies
decisions
commitments
company facts
architecture rules
people/roles
action items

TARS should be able to answer:

"What was true on a specific date?"

"Which decision was active when this commitment was created?"

"What replaced this policy?"

Current knowledge must not accidentally mix with expired historical knowledge.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. IMPLEMENT TRUE HYBRID RETRIEVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build the retrieval pipeline as:

Query
→ semantic/vector retrieval
→ BM25/lexical retrieval
→ metadata filtering
→ graph expansion
→ reciprocal-rank fusion
→ temporal filtering
→ authorization filtering
→ reranking
→ evidence set

Use vectors for semantic meaning.

Use BM25 for:

names
acronyms
exact terminology
IDs
technical identifiers

Use graph search for relationships.

Use metadata for:

company
department
person
client
decision
date
document type
clearance


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. MAKE EVIDENCE FIRST-CLASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every important answer/claim should carry structured evidence:

source_id
source_type
source_title
location
page/timestamp/line
author
retrieval_method
source_timestamp
confidence
relationship_path

Example:

Claim:
Enterprise SSO is required for Enterprise tier.

Evidence:
CALL-104
00:14:32–00:14:51

Confirmed by:
DEC-031

Related:
ARCH-008

Do not make claims look authoritative when there is no supporting evidence.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. INTRODUCE AN EXPLICIT FACT-CONFIDENCE LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI-derived information should move through:

EXTRACTED
→ UNVERIFIED
→ REVIEW_REQUIRED
→ CONFIRMED
→ REJECTED
→ SUPERSEDED

Example:

Meeting
→ extraction
→ "Customer requested SAML"
→ UNVERIFIED
→ human confirmation
→ CONFIRMED
→ trusted institutional memory

AI extraction must not automatically become company truth.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MAKE ACCESS CONTROL SERVER-AUTHORITATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The server must determine:

user
organisation
role
department
clearance
resource visibility
action permissions

Do not rely on:

localStorage role
frontend-selected persona
request body role
request header clearance
query-string user identity

Correct model:

request
→ authenticated identity
→ authorization
→ resource filtering
→ operation
→ response


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ENFORCE CLEARANCE BEFORE RETRIEVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Restricted data must be filtered before:

BM25
vector retrieval
graph expansion
reranking
LLM context creation
summarisation
recommendations
MCP responses
background workers

Correct:

authorization
→ candidate generation
→ retrieval
→ reasoning

Never:

retrieve everything
→ hide restricted results later


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. BUILD PROPER ORGANISATION-LEVEL MULTI-TENANCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every tenant-owned entity should be associated with:

organisation_id

and be scoped on every query.

Apply to:

documents
memories
graph nodes
graph edges
decisions
calls
actions
audit
chat
Think Tank
policies
invariants

No global-memory behaviour should remain.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REPLACE ALL PLAUSIBLE FAKE-SUCCESS BEHAVIOUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use explicit states:

QUEUED
RUNNING
COMPLETED
FAILED
TIMEOUT
OFFLINE
UNAVAILABLE
PARTIAL
NO_EVIDENCE
REQUIRES_REVIEW

Never transform:

model failure
retrieval failure
graph failure
transcription failure
execution failure

into a successful-looking result.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. MAKE ALL FALLBACKS EXPLICITLY NON-AUTHORITATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every fallback result should expose:

source_mode:
LIVE
MOCK
FALLBACK
SYNTHETIC

and:

authoritative: true/false

Synthetic/demo information must never automatically become institutional memory.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. CREATE ONE CANONICAL API CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define one official API surface.

Example:

/api/search
/api/ingest/upload
/api/calls
/api/calls/{id}
/api/decisions
/api/decisions/{id}
/api/actions
/api/actions/{id}
/api/architecture/invariants
/api/mcp/...
/api/settings

Keep compatibility aliases only temporarily.

All frontend requests should pass through one API service layer.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. FINISH ACTION HUB AS A REAL GOVERNED ACTION SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

DETECTED
→ PROPOSED
→ REVIEW_REQUIRED
→ APPROVED / REJECTED
→ QUEUED
→ EXECUTING
→ COMPLETED / FAILED

Store:

source
reason
evidence
owner
deadline
tool
parameters
risk
approval
approver
execution time
result
rollback
audit reference


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. REMOVE EVERY AUTOMATIC APPROVAL PATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never allow internal origin to implicitly mean:

approved = true

Explicitly distinguish:

system-generated
policy-approved
human-approved
automatically-allowed

Automatic execution must come from an explicit policy.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. ADD A REAL POLICY ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create machine-readable action policies containing:

action_type
allowed_roles
allowed_clearances
required_approval
max_risk
allowed_tools
conditions
resource_scope

The deterministic policy engine decides permission.

The LLM explains the result.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. BUILD A PROPER TAMPER-EVIDENT AUDIT TRAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use hash chaining:

event_1
→ hash_1
→ event_2
→ hash_2
→ event_3

Store:

event_id
timestamp
actor
organisation
action
source
input_hash
result_hash
previous_hash

Add an independent audit verification endpoint.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. GIVE EVERY AI ANSWER AN EXECUTION-SAFE PROVENANCE MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Record:

request
retrieved evidence IDs
context IDs
model
model version
template version
timestamp
result
actions proposed

Expose:

Evidence
Decision factors
Constraints
Conclusion

Do not expose hidden chain-of-thought.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. MAKE MODEL ROUTING DETERMINISTIC AND POLICY-DRIVEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define model roles:

EXTRACTION
FAST_INTERACTIVE
DEEP_REASONING
VISION
TRANSCRIPTION
EMBEDDING

Use:

qwen3:1.7b
→ extraction

qwen3:8b
→ deep reasoning

with explicit fallback order.

Expose:

model
latency
queue_time
fallback_used
token usage


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. INTRODUCE MODEL CAPABILITY DISCOVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

At startup detect:

CPU
RAM
GPU
VRAM
Ollama
installed models
Whisper
Tree-sitter
Kùzu
vector support
storage

Generate a runtime capability profile and use it to configure TARS.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. MAKE TELEMETRY TRUTHFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not hard-code:

egress
latency
CPU
GPU
queue depth
MCP state
worker status

unless actually measured.

Use:

AVAILABLE
UNAVAILABLE
NOT VERIFIED
MEASURED

with timestamp and source of measurement.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. MAKE ZERO-EGRESS A RUNTIME PROPERTY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enforce network policy:

ALLOW
localhost
127.0.0.1
approved local sockets

DENY
external APIs
cloud models
unknown hosts

Optional outbound integrations must pass:

policy
→ explicit approval
→ allowed destination
→ audit


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. MAKE DOCUMENT INGESTION FULLY TRANSACTIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

UPLOAD
→ HASH
→ PARSE
→ VALIDATE
→ CHUNK
→ EXTRACT
→ INDEX
→ GRAPH SYNC
→ COMMIT

Failure at any critical stage should rollback or enter a clearly marked PARTIAL state.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. BUILD PROPER DOCUMENT VERSIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never simply overwrite institutional documents.

Use:

Document v1
Document v2
Document v3

with:

v3 SUPERSEDES v2
v2 SUPERSEDES v1

Support:

CURRENT
AS_OF_DATE
HISTORICAL


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. ADD STRONGER SEMANTIC GRAPH EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract:

Person
Company
Customer
Product
Project
Decision
Policy
Feature
Technology
Commitment
Risk
Architecture Component
Document

Create relationships such as:

Customer → requested → Feature
Founder → made → Decision
Decision → affects → Project
Project → depends_on → Component
Call → created → Commitment
Policy → constrains → Action
Document → supports → Claim


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. ADD CONFLICT DETECTION ACROSS THE ENTIRE MEMORY LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detect:

decision vs decision
policy vs policy
document vs decision
customer commitment vs roadmap
company fact vs company fact
architecture rule vs code
action vs policy

Return:

current statement
conflicting memory
effective dates
sources
severity
review requirement


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24. MAKE VOICE-TO-SPEC EVIDENCE-GROUNDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each extracted item should preserve:

source_call_id
timestamp_start
timestamp_end
source_quote
confidence
review_status

Never generate authoritative speaker names without actual speaker identification.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
25. ADD A FORMAL REVIEW QUEUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Centralise:

unverified memory
conflicts
AI extraction
sensitive content
high-risk actions
policy conflicts
architecture exceptions
failed actions

Actions:

APPROVE
REJECT
EDIT
MERGE
SUPERSEDE
ESCALATE


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
26. CONNECT EVERY WORKSPACE THROUGH SHARED CANONICAL OBJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use canonical IDs:

CALL
COMMITMENT
ACTION
DECISION
PROJECT
ARCHITECTURE
DOCUMENT
INVARIANT

Example:

CALL-082
→ ACT-119
→ DEC-041
→ ARCH-019
→ INV-017

Every workspace should navigate through those relationships.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
27. MAKE THINK TANK PERSISTENT AND REAL-TIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current state should not depend primarily on local React state.

Implement:

persistent channels
persistent messages
participants
message ownership
WebSocket transport
reconnection
server-side history
AI events
access control

SSE should only be used for event notification where appropriate.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
28. MAKE DECISION SIMULATION EVIDENCE-DRIVEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Simulation should consider:

company financial memory
current commitments
roadmap
team capacity
dependencies
historical decisions
architecture constraints

Output:

scenario
affected projects
affected clients
affected commitments
affected architecture
resource impact
financial impact
delivery impact
risk

Every major output should identify its inputs.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
29. BUILD DECISION LINEAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Decision states:

DRAFT
→ SIMULATED
→ REVIEW
→ APPROVED
→ ACTIVE
→ SUPERSEDED

Connect decisions to:

calls
documents
actions
projects
policies
invariants
people


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
30. STRENGTHEN THE ARCHITECTURE SENTINEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Expand deterministic AST/static checking to:

Python
TypeScript
JavaScript
SQL
Docker
YAML
Terraform

Cover:

dependency direction
forbidden imports
secret exposure
unsafe network calls
transaction misuse
API boundary violations
auth bypass
sensitive logging
deprecated APIs
cross-layer coupling


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
31. ADD ARCHITECTURE EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Support:

exception_id
rule_id
reason
owner
approval
created_at
expires_at

Expired exceptions must automatically stop suppressing the rule.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
32. MAKE MADR/ADR PART OF THE MEMORY GRAPH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every ADR should exist as a graph entity.

Connect:

ADR
→ decision
→ invariant
→ project
→ code
→ incident
→ people
→ actions


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
33. BUILD A CONTROLLED MCP SECURITY BOUNDARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every tool should declare:

tool
read/write
risk
required clearance
allowed roles
approval requirement
allowed arguments
resource scope
audit requirement

Validate all of this server-side.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
34. MAKE MCP CONFIGURATION BACKEND-AUTHORITATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend generates:

executable
script path
gateway URL
environment
workspace
authentication
available tools

Frontend only:

fetch
preview
copy
download


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
35. ADD A REAL AGENT EXECUTION SANDBOX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Restrict:

filesystem
network
commands
environment variables
CPU
RAM
time
workspace

Execution flow:

proposal
→ policy
→ approval
→ sandbox
→ execution
→ result
→ audit


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
36. ADD ROLLBACK WHEREVER POSSIBLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Store:

action
rollback_action
rollback_available

Explicitly classify:

REVERSIBLE
IRREVERSIBLE


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
37. CREATE ONE AUTHORITATIVE STORAGE MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define ownership clearly:

SQL
→ transactional data

Vector index
→ retrieval index

Graph
→ relationship state

Filesystem/object store
→ original artefacts

No entity should have multiple competing systems of record.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
38. ADD CONSISTENCY CHECKS BETWEEN STORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detect:

SQL record missing graph node
memory missing embedding
orphaned vector
orphaned graph edge
action without source
decision without provenance
document without file
file without document record


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
39. BUILD PROPER LIFECYCLE STATE MACHINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend should reject invalid transitions.

Example:

Action:
OPEN
→ IN_PROGRESS
→ DONE

Decision:
DRAFT
→ SIMULATED
→ REVIEW
→ ACTIVE
→ SUPERSEDED

Extraction:
PENDING
→ REVIEW
→ CONFIRMED / REJECTED


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
40. MAKE ERRORS MACHINE-READABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Standardise:

code
message
retryable
component
request_id
details

Example:

{
  "code": "INFERENCE_UNAVAILABLE",
  "message": "Local Ollama unavailable",
  "retryable": true,
  "component": "ollama"
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
41. ADD REQUEST IDS AND TRACE IDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A single operation should be traceable across:

frontend
API
retrieval
LLM
graph
action
audit

Example:

TARS-REQ-8F21


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
42. ADD HEALTH/READINESS SEPARATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Expose:

LIVENESS
READINESS
DEPENDENCY STATUS

Example:

API             READY
SQL             READY
GRAPH           READY
OLLAMA          READY
QWEN 1.7B       READY
QWEN 8B         UNAVAILABLE
WHISPER         READY
MCP             READY


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
43. BUILD A GENUINE OFFLINE/DEGRADED MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Examples:

Ollama unavailable
→ retrieval-only

Graph unavailable
→ transactional-memory mode

Whisper unavailable
→ document/knowledge functionality remains usable

Clearly show capability boundaries.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
44. REMOVE EXTERNAL FRONTEND RUNTIME DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avoid dependencies on:

Google Fonts
external analytics
remote assets
cloud telemetry
third-party APIs

A disconnected machine should still run the complete UI.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
45. ADD AUTOMATED ZERO-EGRESS VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test while WAN is unavailable:

startup
→ ingestion
→ search
→ reasoning
→ transcription
→ simulation
→ architecture scan
→ MCP

Verify:

external DNS = 0
external HTTP = 0
external model traffic = 0


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
46. ADD ADVERSARIAL SECURITY TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test:

prompt injection
malicious documents
path traversal
oversized uploads
malformed files
SQL injection
MCP argument injection
tool abuse
unauthorised retrieval
secret leakage
network egress
command injection


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
47. ADD SAFE RED-TEAM SIMULATION MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Support harmless synthetic events:

SIMULATED SECRET ACCESS
SIMULATED NETWORK EGRESS
SIMULATED PRIVILEGE ESCALATION
SIMULATED MALICIOUS MCP TOOL
SIMULATED ARCHITECTURE VIOLATION

Flow:

DETECT
→ CLASSIFY
→ BLOCK
→ EXPLAIN
→ AUDIT


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
48. MAKE ONBOARDING DERIVE FROM ACTUAL COMPANY MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

role
department
projects
decisions
policies
architecture
glossary
company profile

Generate:

learning plan
knowledge gaps
questions
progress


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
49. CREATE AN INSTITUTIONAL GLOSSARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Store:

term
definition
aliases
department
canonical source
first seen
related projects
related decisions


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
50. BUILD A TRUE KNOWLEDGE GRAPH EXPLORER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting from any entity:

Company
Person
Customer
Document
Decision
Project
Feature
Action
Invariant

show connected entities and provenance paths.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
51. ADD MEMORY CONSOLIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detect:

duplicate facts
duplicate documents
duplicate decisions
duplicate actions
obsolete memory
conflicting memory

Suggest:

MERGE
SUPERSEDE
ARCHIVE
KEEP BOTH

Never silently delete.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
52. BUILD A MEMORY RETENTION POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Support:

retain forever
archive after X
delete after approval
legal hold
sensitive retention policy


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
53. ADD FULL SOVEREIGN EXPORT/IMPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export:

documents
memories
graph
decisions
actions
policies
invariants
audit
company configuration

Include:

snapshot version
checksums
metadata
integrity verification


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
54. ENCRYPT SENSITIVE LOCAL DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Protect:

documents
databases
graph
actions
credentials
MCP secrets
sensitive audit metadata

Support:

vault locked
vault unlocked
key available
key unavailable


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
55. ADD SECRET MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not expose secrets through:

.env
frontend storage
logs
model prompts
generated config
audit payloads

Use a local secret store.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
56. MAKE OBSERVABILITY SOVEREIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use local structured logs.

Include:

timestamp
request_id
component
event
latency
status

Do not depend on external analytics.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
57. ADD PROPER REGRESSION / END-TO-END TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test:

Upload
→ Parse
→ Index
→ Search
→ Reason

Audio
→ Transcribe
→ Extract
→ Review
→ Action

Decision
→ Conflict
→ Simulation
→ Approval

Code
→ AST
→ Invariant
→ Commit block

MCP
→ Query
→ Proposal
→ Approval
→ Execution
→ Audit


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
58. ADD DETERMINISTIC TEST FIXTURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create permanent fixture organisations for:

normal company
restricted data
temporal policies
architecture rules
multi-company isolation
MCP governance
action execution


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
59. SEPARATE PRODUCTION, DEMO AND MOCK CODE PATHS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Clearly separate:

PRODUCTION
DEMO
TEST

Mock data must never silently activate because production functionality failed.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
60. MAKE EVERY AI-DERIVED FIELD TRACEABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI-derived fields should carry:

derived_by_ai
model
model_version
source
confidence
created_at
review_status


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
61. ADD MODEL ABSTENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TARS must be able to say:

INSUFFICIENT EVIDENCE

Example:

"Who approved this exception?"

Response:

"No verified approval record found."

Never invent the answer.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
62. ADD CONFIDENCE CALIBRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Separate:

retrieval confidence
extraction confidence
evidence coverage
contradiction state
human verification


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
63. BUILD AN EXPLAIN-THE-DECISION CHAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Expose:

QUESTION
→ MEMORY
→ EVIDENCE
→ CONSTRAINTS
→ DECISION
→ ACTION

without exposing hidden chain-of-thought.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
64. ADD POLICY-AWARE REASONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context should include:

current company facts
active policies
active decisions
user permissions
current date
relevant evidence

Never rely on static policy text embedded in Python.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
65. MAKE ALL COMPANY CONFIGURATION DYNAMIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not hard-code:

company name
FTE
MRR
cash
burn
customers
pricing
team members
policies

Store these in company profile/institutional memory with provenance and dates.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
66. ADD A UNIFIED POLICY / CONFIGURATION REGISTRY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Centralise:

company settings
taxonomy
glossary
departments
roles
clearances
policies
invariants
model routing
resource limits
action rules


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
67. FINISH THE RESOURCE GOVERNOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Track:

CPU
RAM
GPU
VRAM
concurrency
queue depth
job priority

Priority:

INVARIANT
>
INTERACTIVE
>
BACKGROUND

Background processing should yield when critical work starts.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
68. INTRODUCE A CAPABILITY MATRIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show runtime availability for:

document parsing
vector retrieval
graph
reasoning model
extraction model
Whisper
AST
MCP
execution
external integrations


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
69. ADD INTEGRATION CONTRACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define for every dependency:

version
health check
timeout
retry
failure mode
security policy
resource impact

Apply to:

Ollama
Whisper
Kùzu
SQLite
vectors
MCP


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
70. KEEP GUARANTEES DETERMINISTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LLM:

interpret
extract
summarise
reason
generate

Deterministic:

authorize
filter
validate
calculate
enforce
audit
verify
execute policy
block code


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
71. FIX DEPENDENCY FAILURE CASCADING INTO ROUTE DISAPPEARANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A missing optional package such as Tree-sitter must not cause an entire router
to disappear.

Do not silently skip an entire Cortex module when one dependency is missing.

Use:

dependency-specific health states
partial capability loading
explicit startup diagnostics
clear API availability states

Required capability failures should be reported clearly rather than turning
existing endpoints into unexplained 404s.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
72. ELIMINATE DUPLICATE / CONFLICTING ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The current ingestion router contains duplicate call-upload route declarations
and multiple compatibility aliases.

Consolidate:

document upload
call upload
transcription
Voice-to-Spec

into one predictable lifecycle.

Also remove unnecessary duplicate route aliases after migration.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
73. ELIMINATE MULTIPLE BACKEND ENTRYPOINT DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

There is more than one gateway-style application definition.

Choose one canonical application entrypoint.

One:

FastAPI application
startup process
health endpoint
event gateway
configuration source

should be authoritative.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
74. FIX CORS CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not use:

allow_origins = ["*"]
with:

allow_credentials = true

Restrict CORS to the known local frontend origin(s), or disable credentials
when wildcard origins are intentionally required.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
75. REMOVE CONFIGURATION / VERSION DRIFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use one canonical application version.

Synchronise:

README
API metadata
frontend version
backend version
protocol version
MCP version
database/schema version


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
76. FIX GLOBAL SSE INFORMATION LEAKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The ingestion SSE stream currently behaves as a global event bus.

Events can contain:

filenames
client names
task IDs
processing state

Make the stream:

authenticated
tenant-scoped
clearance-aware
user-scoped where required

A user must not receive another organisation's events.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
77. AUTHORIZE GLOBAL QOS / WATCHER CONTROL ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endpoints such as:

/qos/pause
/qos/resume
/watcher/start
/watcher/scan

change global server state.

Require appropriate administrative permissions.

Do not allow any anonymous caller to pause ingestion for the whole instance.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
78. SECURE RAW DOCUMENT FILE SERVING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The raw document endpoint must verify:

authenticated user
organisation
document ownership
clearance

before serving bytes.

Do not authorize access solely from a filename.

Also return the correct MIME type for:

PDF
DOCX
XLSX
PPTX
CSV
TXT
etc.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
79. MAKE UPLOADED FILE NAMES IMMUTABLE AND COLLISION-SAFE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not store uploads using only the original filename.

Use:

document ID
content hash
immutable storage path

so two files called:

report.pdf

cannot overwrite each other.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
80. ADD REAL UPLOAD VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enforce:

maximum file size
allowed extension
content-type validation
magic-byte/signature validation
safe filename handling
archive restrictions where applicable
malformed-file rejection

Do not trust browser-provided MIME types.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
81. MAKE AMBIENT WATCHER TENANT-AWARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The current drop folder is global.

Define a controlled ingestion boundary such as:

drop/{organisation_id}/...

and associate every ingestion event with the proper organisation.

No global background watcher should be able to inject data into another company's
memory.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
82. PERSIST INGESTION DEDUPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not rely only on in-memory SHA-256 dictionaries.

Persist the hash and ingestion state.

After a restart:

same file
→ recognised as already ingested

without reprocessing unnecessarily.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
83. PUT LIMITS ON AMBIENT INGESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Protect against:

very large files
very long audio
rapid file bursts
directory flooding
repeated file events

Add:

size limits
queue limits
rate limits
worker limits
backpressure


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
84. REMOVE FABRICATED WHISPER TRANSCRIPT SUCCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a critical data-integrity fix.

If Whisper cannot transcribe audio, TARS must NOT create a fabricated transcript
and mark the task COMPLETED.

Correct:

Whisper failure
→ FAILED / UNAVAILABLE
→ no derived commitments
→ no trusted memory

Synthetic transcripts may exist only inside explicit test/demo mode.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
85. PERSIST CALL/TASK LIFECYCLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current transcription tasks are held substantially in memory.

Persist:

task_id
call_id
company_id
file_id
status
created_at
started_at
completed_at
duration
transcript
error
spec_result

A restart must not erase the call system's state.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
86. STOP AUTOMATIC ACTION CREATION FROM UNVERIFIED EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Voice-to-Spec should not directly create authoritative Action Hub tasks from
unreviewed AI extraction.

Preferred:

transcription
→ extraction
→ evidence
→ REVIEW_REQUIRED
→ human confirmation
→ action creation


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
87. REMOVE GENERIC / FABRICATED ACTION OWNERSHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not automatically assign every extracted commitment to:

Engineering Lead

unless that assignment is actually supported.

Use:

unassigned
suggested owner
confirmed owner

with evidence.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
88. ELIMINATE DUPLICATE VOICE-TO-SPEC IMPLEMENTATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

There are multiple extraction paths with different:

models
prompts
fallbacks
heuristics
action-dispatch behaviour

Create one canonical Voice-to-Spec engine.

One transcript should produce one consistent extraction contract.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
89. USE CONSISTENT PROMPT-INJECTION PROTECTION FOR ALL LLM INPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The different extraction paths do not currently apply identical input-boundary
protection.

Every external source should be framed consistently:

document text
transcript
MCP-provided content
user-provided content
retrieved memory

Treat external content as untrusted data.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
90. FIX ACTION HUB DTO / DATABASE FIELD LOSS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend models contain fields such as:

title
priority
assignee
department

while the Action Hub database currently persists a smaller field set.

Ensure every contract field that is exposed as real data is actually persisted
and returned.

No silent data loss during round trips.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
91. VALIDATE ACTION STATUS TRANSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not accept arbitrary strings as statuses.

Define allowed states and transitions.

Reject:

DONE
→ OPEN

unless an explicit re-open workflow exists.

Persist transition history for important actions.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
92. UNIFY THE TWO ACTION-HUB STORAGE PATHS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The current code has:

main SQLite action_items
+
separate action_hub.sqlite3

Define one system of record.

Every operation must use the same authoritative store.

Reset, create, read, update and delete must all affect the same database.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
93. UNIFY THE TWO GRAPH IMPLEMENTATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current code contains:

TarsGraph
+
KuzuGraphEngine

with different persistence/fallback behaviour.

Define one canonical graph abstraction and one clear fallback.

Do not allow the app to unknowingly maintain two divergent graph states.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
94. MAKE GRAPH FALLBACK PERSISTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If native Kùzu is unavailable, fallback graph state must persist.

Do not use an in-memory substitute for institutional memory.

Restarting TARS must not erase graph relationships.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
95. ADD COMPANY / TENANT ID TO GRAPH NODES AND EDGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Graph entities must carry organisation scope.

Apply to:

Document
Decision
ActionItem
ClientCall
Invariant
CodeEntity
all relevant relationships

Graph queries must filter by organisation before returning results.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
96. REMOVE FIXED GLOBAL DEMO IDS FROM GENERAL GRAPH STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avoid globally reusing:

DEC-014
COM-ACME-001
DEC-GEN-001
DEC-GEN-002
DEC-GEN-003
INV-GEN-001

Generate tenant-scoped or truly demo-scoped IDs.

Demo seeding must never contaminate unrelated companies.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
97. FIX AUTOMATIC ONE-YEAR GRAPH EXPIRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documents currently receiving a default:

valid_until = now + one year

must not expire automatically unless a retention/validity policy explicitly says so.

Permanent knowledge should remain valid indefinitely.

Temporary knowledge should carry an explicit expiration policy.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
98. FIX NATIVE-KUZU / FALLBACK SPLIT-BRAIN BEHAVIOUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If native graph sync partially succeeds and fallback code then also executes,
TARS can create divergent state.

Use:

native success → return
native failure before mutation → fallback
unknown/partial mutation state → reconciliation required

Never blindly write to both systems.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
99. DEDUPLICATE GRAPH RELATIONSHIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Relationship creation should use idempotent semantics.

Repeated sync of the same action/call relationship must not produce duplicate:

EXTRACTED_FROM
RELATES_TO
ENFORCES
DEPENDS_ON

edges.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
100. KEEP GRAPH NODE UPDATES COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When an entity already exists, update all mutable fields that belong to that
entity.

Do not update:

title
department
clearance

while leaving stale:

valid_from
valid_until
lifecycle
ownership
source
metadata

behind.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
101. STOP GLOBAL "ACTIVE COMPANY" RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Company profile resolution must be request-scoped.

Do not globally use:

"latest bloomed company"

as the active company for unrelated users.

Every request should resolve:

organisation_id
→ company profile

independently.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
102. FIX GENESIS PARTIAL-SUCCESS SEMANTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genesis currently can continue after some graph/action/demo seeding errors.

Do not return:

BLOOMED

when major operations failed.

Use:

BLOOMED
PARTIALLY_BLOOMED
FAILED

with per-stage results.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
103. REMOVE HARD-CODED GENESIS USERS / ACTION OWNERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genesis for a new company must not automatically create unrelated people such as:

Aryan
Elena
Marcus

unless those identities actually belong to the newly created company.

Seed data must be dynamically generated from the new organisation profile.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
104. MAKE WORKSPACE RESET AUTHORITATIVE AND COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reset must consistently clear:

main DB
action DB
graph
vector index
vault
documents
memories
calls
chat
Think Tank
audit where appropriate
temporary files
demo fixtures

Never report a full reset when one store still contains data.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
105. ADD REAL DATABASE MIGRATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace ad-hoc schema changes with:

schema_version

and ordered migration files.

Support:

upgrade
rollback where possible
migration verification
startup compatibility checks

Never destroy user data during a schema migration.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
106. FIX DESTRUCTIVE CHAT-MESSAGE MIGRATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never solve schema changes by:

DROP TABLE chat_messages

during normal startup.

Perform safe migrations:

create new schema
copy existing rows
validate
swap
preserve history


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
107. ADD DATABASE INTEGRITY CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use:

foreign keys
unique constraints
check constraints
indexes
NOT NULL rules
referential integrity

Enable:

PRAGMA foreign_keys = ON

for SQLite connections where applicable.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
108. FIX SESSION SECURITY AND EXPIRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sessions should include:

created_at
expires_at
revoked_at
authenticated_user_id
organisation_id

Support:

expiration
revocation
logout invalidation
server-side validation

Do not maintain immortal sessions.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
109. STOP DEFAULTING UNKNOWN USERS TO A PRIVILEGED PERSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current request resolution can fall back to:

usr-alex

This must be removed from normal production paths.

Unknown identity:

→ UNAUTHENTICATED
→ 401/403

not automatically Founder.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
110. STOP TRUSTING USER-SUPPLIED ROLE / CLEARANCE IN CHAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current chat requests can contain:

user_id
user_role
clearance

These values must be ignored as authority.

Resolve them from the authenticated backend session.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
111. MAKE THINK TANK SERVER-SIDE AUTHENTICATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every Think Tank operation must check:

channel access
organisation
message ownership
role
permission
edit permission
delete permission

The API must not trust:

sender
sender_role
sender_id

supplied in the request body.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
112. PREVENT THINK TANK CHANNEL COLLISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating a channel with an existing derived ID should not silently overwrite
the previous channel using:

INSERT OR REPLACE

Use explicit conflict detection.

Channels should have stable ownership/organisation metadata.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
113. MAKE TEACH-TARS GOVERNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The teaching endpoint should:

authenticate actor
authorize teaching permission
store provenance
store source
store organisation
store effective date
store confidence
enter review where appropriate

It should not directly create trusted institutional memory from arbitrary caller input.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
114. REMOVE HARDCODED COMPANY FACTS FROM REASONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reasoning prompts currently contain fixed company facts such as:

team members
financial values
MRR
ARR
customer count
cash
burn
policy wording

These must come from:

CompanyProfile
Policy registry
Institutional Memory
Decision Graph

with evidence and effective dates.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
115. MAKE SEARCH / CHAT SELF-LEARNING SUPERSSESSION CORRECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix the current self-learning behaviour so that when a fact is explicitly
updated:

new fact
→ supersedes old fact
→ retrieval ranks current fact above old fact
→ historical fact remains available when requested

This must work with:

title
content
timestamp
supersession
query ranking


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
116. FIX SEARCH CITATION DEDUPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identical document chunks/citations should collapse into one canonical citation.

Deduplication should consider:

document ID
chunk ID/location
content hash
page/line range

The same source must not appear repeatedly as separate evidence.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
117. PRESERVE ORIGINAL TITLE / CASE IN SELF-LEARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not lowercase titles or other human-readable metadata during ingestion.

Normalisation can be used for search indexing.

Stored canonical title must preserve original presentation.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
118. FIX INTERACTION TELEMETRY DATA NORMALISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Telemetry should preserve original:

title
query
response
user identity reference
source
timestamp

Do not lowercase content simply for storage/search convenience.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
119. FIX MCP UNKNOWN-ACTOR DEFAULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unknown MCP actors must not silently become:

ENGINEER
ALL_TEAM

Default policy:

unknown actor
→ deny

unless explicitly authenticated and authorised.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
120. REMOVE HARDCODED PRIVILEGED MCP ACTOR NAMES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not grant executive privilege based on literal strings such as:

SYSTEM
ORCHESTRATOR
CORTEX
INGESTION
TEST
ALEX

Resolve privileged capability from:

authenticated identity
server-issued role
explicit system identity
signed/internal credential


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
121. MAKE MCP MEMORY CREATION FOLLOW THE NORMAL MEMORY PIPELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

memory.create should not bypass:

organisation scope
clearance
provenance
review state
deduplication
graph sync
embedding
temporal metadata

It should use the same canonical memory service as normal ingestion.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
122. REMOVE CANNED MCP FALLBACK DATA FROM NORMAL LIVE MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MCP failures must not return synthetic:

client commitments
financial impact
decision conflicts

Use:

MCP_UNAVAILABLE
NO_DATA
FAILED

and only allow synthetic fixtures under explicit TEST/DEMO mode.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
123. BOUND MCP TOOL INPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validate:

string lengths
integer ranges
file paths
argument types
allowed enum values
tool-specific constraints

Example:

git.log n

must have a safe maximum.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
124. MAKE MCP FILESYSTEM ROOT EXPLICIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not derive the security boundary purely from:

os.getcwd()

Use an explicit configured repository/workspace root.

Resolve and validate every path against that root.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
125. FIX MCP GIT WORKING-DIRECTORY BEHAVIOUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Git tools currently depend on the process working directory.

Always execute Git against the configured repository root.

The following must work regardless of where FastAPI/MCP is launched from:

git.status
git.diff
git.log


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
126. BOUND MCP FILESYSTEM READ SIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

filesystem.read should not load arbitrarily massive files into memory.

Add:

maximum bytes
streaming where needed
safe truncation
binary detection

Return an explicit truncation indicator.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
127. FIX COMMAND-PALETTE ENDPOINT ALIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The command palette currently calls endpoint variants that do not consistently
match the backend's canonical Action Hub routes.

Make command palette use the same API service and canonical endpoints as the
rest of the application.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
128. MAKE COMMAND-PALETTE SEARCH AUTHORISATION-AWARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Command palette currently aggregates:

search
decisions
actions

without a complete server-authoritative access model.

Use one authorised federated-search endpoint so the palette can never surface
objects the caller cannot access.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
129. STOP FRONTEND SERVICES FROM TURNING ERRORS INTO EMPTY SUCCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not transform:

HTTP failure
timeout
backend offline

into:

[]
null
"no data"

Expose:

loading
failed
empty
offline

as distinct states.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
130. REMOVE FRONTEND FAKE SUCCESS FROM DECISION CONTRADICTION CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the contradiction API fails, do not return:

has_conflict = false

Instead return:

CHECK_FAILED
or throw a typed service error.

Failure must never look like "no conflict."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
131. FIX FRONTEND ARCHITECTURE "STAGED SCAN" SEMANTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A staged-file scan must actually inspect staged files.

Do not use:

empty code
prebuilt invariant fixtures
hard-coded execution time
hard-coded breach count

and call it a staged scan.

The UI should show the real files, findings and runtime.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
132. FIX FRONTEND REFACTOR SUCCESS STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Refactor UI should only change state after the backend confirms:

actual refactor applied
target exists
rule resolved
verification passed

On failure:

rollback UI state
show failure
preserve violation


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
133. FIX FRONTEND CALL UPLOAD FAILURE HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If transcription times out or fails:

do not display:

"Audio transcribed locally"

do not invent:

pain points
feature requests
commitments

Use the actual backend state.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
134. STOP SYNTHETIC CALL PLAYBACK FROM LOOKING LIKE REAL AUDIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Playback UI should distinguish:

real audio available
audio unavailable
preview simulation

Do not display playback progress as if a real recording is playing when the file
cannot actually be loaded.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
135. UNIFY FRONTEND SESSION STORAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current frontend code uses multiple localStorage keys for identity/company state.

Create one canonical session store.

Every service should read from the same source.

Avoid divergence between:

tars_session_storage
tars_current_user_profile
role storage
domain storage
auth storage


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
136. REMOVE CLIENT-SIDE AUTH AS THE SECURITY AUTHORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

localStorage can remain for UI persistence if useful.

It must not determine actual security.

The frontend should receive the current authenticated session from the backend.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
137. STOP GET-LIST SERVICES FROM HIDING OUTAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These methods must distinguish:

success with zero records
from:

backend unavailable

Apply to:

getCalls
getCall
getLakeDocuments
getDecisions
getDecision
getRecommendations
action retrieval
chat retrieval


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
138. MOVE DIRECT FETCHES INTO THE SHARED SERVICE LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspaces should not bypass the API abstraction with arbitrary:

fetch(...)

Create canonical service methods for:

documents
settings
decisions
architecture
actions
calls
Think Tank
chat
MCP


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
139. KEEP FRONTEND CONTRACTS EXACTLY ALIGNED WITH BACKEND DTOs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For every object compare:

frontend field
backend field
type
nullability
enum
status
timestamp format

Automate schema/contract validation where possible.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
140. FIX API STATUS / TIMESTAMP CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Standardise timestamps to a documented format.

Avoid inconsistent use of:

Unix seconds
Unix milliseconds
CURRENT_TIMESTAMP strings
JavaScript Date strings

Document one canonical representation per API.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
141. MAKE DOCUMENT METADATA TENANT/SECURITY AWARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documents currently expose metadata such as:

department
clearance
demo state

but need:

organisation_id
owner
version
visibility
lifecycle
effective dates
provenance


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
142. SEPARATE DEMO DOCUMENTS FROM REAL DOCUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Demo state should be represented by explicit metadata.

Do not infer demo state only from:

filename
ID prefix
company name
source string


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
143. FIX DEMO-SEED POLLUTION IN MAIN DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fresh installations currently receive seeded demo personas, channels and demo
memory.

Make startup modes explicit:

EMPTY
DEMO
TEST

A production/clean installation should not unknowingly begin populated with
AetherFlow demo records.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
144. MAKE RESET PRESERVE USER DATA BY EXPLICIT POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reset must explicitly state whether it removes:

knowledge
documents
actions
decisions
chat
users
company profile
audit
graph

Do not silently delete unrelated user/company information.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
145. ADD BACKGROUND JOB DURABILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Queue state should survive:

process restart
temporary model failure
machine sleep
worker crash

Use durable job records for important ingestion/transcription/extraction work.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
146. ADD RETRIES WITH IDEMPOTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retries must not duplicate:

documents
memory
graph nodes
graph edges
actions
emails
external actions

Use idempotency keys and stable operation IDs.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
147. HANDLE PARTIAL PIPELINE FAILURE EXPLICITLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example:

transcription = SUCCESS
extraction = SUCCESS
graph sync = FAILED
action persistence = SUCCESS

Store the exact state:

TRANSCRIPTION_COMPLETED
EXTRACTION_COMPLETED
GRAPH_SYNC_FAILED
ACTION_PERSISTED

Never collapse everything into:

COMPLETED


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
148. ADD RECONCILIATION WORKERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Background jobs should periodically repair:

graph drift
missing embeddings
orphaned actions
missing audit links
failed document indexing
partial call extraction


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
149. ADD DATA-INTEGRITY HASHES FOR IMPORTANT RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For important data store hashes of:

original file
normalized content
evidence
action request
execution result
snapshot

This helps detect silent modification.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
150. MAKE EXTERNAL ACTIONS FULLY RECEIPT-BASED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After execution produce:

action_id
actor
tool
arguments hash
approval reference
execution timestamp
result
rollback status
audit reference

This becomes the canonical execution receipt.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
151. ADD ACTION EXPIRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A proposal or approval should not remain valid forever.

Support:

created_at
expires_at
approved_at
approval_expired

Expired approvals require reapproval.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
152. ADD APPROVAL SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

An approval should specify exactly what was approved:

tool
arguments
resource
action type
target
amount/scope
time window

Do not let one approval implicitly authorise unrelated future actions.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
153. ADD POLICY-VERSION AWARE ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every governed action should record:

policy_id
policy_version
policy_evaluation_result

If policy changes before execution, re-evaluate before acting.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
154. ADD CURRENT-VS-HISTORICAL REASONING MODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Users should be able to ask:

CURRENT:
"What is our current enterprise policy?"

HISTORICAL:
"What was the policy in June?"

The answer engine must select the appropriate validity window.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
155. BUILD POLICY IMPACT PROPAGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a policy changes:

policy v2
→ affected decisions
→ affected actions
→ affected projects
→ affected architecture
→ affected commitments

TARS should surface the downstream impact automatically.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
156. BUILD DECISION IMPACT PROPAGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a decision changes:

decision
→ projects
→ customers
→ commitments
→ actions
→ architecture
→ invariants

Identify impacted entities and require review when appropriate.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
157. ADD POLICY / DECISION EFFECTIVE-DATE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not allow:

effective_to < effective_from

or contradictory simultaneous policies without explicit resolution.

Validate temporal consistency at write time.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
158. ADD CLAIM SUPPORT / CONTRADICTION STATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claims should support:

SUPPORTED
PARTIALLY_SUPPORTED
UNSUPPORTED
CONTRADICTED
OUTDATED
UNVERIFIED

This status should be derivable from source evidence and temporal state.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
159. ADD KNOWLEDGE MATURITY LEVELS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example:

RAW
EXTRACTED
REVIEWED
CONFIRMED
INSTITUTIONAL
ARCHIVED

Reasoning should prefer mature knowledge over raw/unverified material.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
160. FINAL TARS ARCHITECTURE TARGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                              TARS
                               │
                  ┌────────────┴────────────┐
                  │                         │
              USER / IDE                 EVENTS
                  │                         │
                  └────────────┬────────────┘
                               ↓
                       AUTHENTICATION
                               │
                               ↓
                        AUTHORIZATION
                               │
                               ↓
                         POLICY ENGINE
                               │
               ┌───────────────┴────────────────┐
               │                                │
               ↓                                ↓
          RETRIEVAL                          ACTIONS
               │                                │
       ┌───────┼────────┐                    PROPOSAL
       │       │        │                       │
      BM25   VECTOR    GRAPH                     ↓
       │       │        │                    APPROVAL
       └───────┼────────┘                       │
               ↓                                ↓
         TEMPORAL FILTER                     EXECUTOR
               │                                │
               ↓                                ↓
           EVIDENCE                          SANDBOX
               │                                │
               ↓                                ↓
        LOCAL REASONING                      RESULT
               │                                │
        ┌──────┴──────┐                         ↓
        ↓             ↓                       AUDIT
     DECISION     SPECIFICATION
        │             │
        ↓             ↓
    SIMULATION      REVIEW
        │             │
        └──────┬──────┘
               ↓
       INSTITUTIONAL MEMORY
               │
       ┌───────┴────────┐
       │                │
       ↓                ↓
      DB               GRAPH
       │                │
       └───────┬────────┘
               ↓
          ARCHITECTURE
               │
               ↓
          TREE-SITTER
               │
               ↓
           INVARIANTS
               │
               ↓
           GIT BLOCK
               │
               ↓
          ADR / MADR
               │
               ↓
        INSTITUTIONAL MEMORY


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE OPERATING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TEMPORAL TRUTH
   TARS knows what was true, when it was true, and what replaced it.

2. EVIDENCE FIRST
   Important claims must have provenance.

3. AUTHORITATIVE ACCESS CONTROL
   Permissions are enforced by the backend before retrieval/reasoning.

4. DETERMINISTIC GOVERNANCE
   Policy, authorization, audit, validation and architecture enforcement do
   not depend on LLM judgement.

5. HONEST FAILURE
   Failed means failed.
   Unavailable means unavailable.
   Unknown means unknown.
   Synthetic means synthetic.

6. VERIFIED MEMORY
   AI extraction is not automatically institutional truth.

7. SAFE ACTION
   Models propose.
   Policies decide.
   Humans approve where required.
   Executors act.
   Audit records everything.

8. CLOSED-LOOP INSTITUTIONAL MEMORY

DATA
 ↓
KNOWLEDGE
 ↓
MEMORY
 ↓
REASONING
 ↓
DECISION
 ↓
ACTION
 ↓
CODE
 ↓
INVARIANT
 ↓
AUDIT / ADR
 ↓
NEW MEMORY


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ULTIMATE TARS LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPANY DATA
      ↓
INGEST
      ↓
VALIDATE
      ↓
EXTRACT
      ↓
REVIEW
      ↓
CONFIRM
      ↓
STORE
      ↓
GRAPH
      ↓
HYBRID RETRIEVAL
      ↓
TEMPORAL + ACCESS FILTERING
      ↓
EVIDENCE
      ↓
LOCAL REASONING
      ↓
DECISION
      ↓
SIMULATION
      ↓
POLICY
      ↓
ACTION PROPOSAL
      ↓
APPROVAL
      ↓
SANDBOXED EXECUTION
      ↓
AUDIT
      ↓
ARCHITECTURE ENFORCEMENT
      ↓
ADR / MADR
      ↓
INSTITUTIONAL MEMORY
      ↓
CONTINUOUSLY STRONGER TARS