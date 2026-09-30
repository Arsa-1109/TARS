import React from 'react';

export type Workspace = {
  id: string;
  no: string;
  kicker: string;
  name: string;
  line: string;
  body: string;
  metrics: [string, string][];
  preview: React.ReactNode;
};

const Chip = ({ children, tone = 'mute' }: { children: React.ReactNode; tone?: 'mute' | 'amber' | 'red' }) => (
  <span
    className={`tl-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
      tone === 'amber'
        ? 'border-[#F2C689]/40 text-[#F2C689]'
        : tone === 'red'
        ? 'border-[#FF8A7A]/40 text-[#FF8A7A]'
        : 'border-white/15 text-[#8C92A4]'
    }`}
  >
    {children}
  </span>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">{children}</div>
);

export const WORKSPACES: Workspace[] = [
  {
    id: 'knowledge',
    no: '01',
    kicker: 'Institutional memory',
    name: 'Universal Knowledge Base',
    line: 'Ask anything. Receive the exact line it came from.',
    body: 'Deterministic retrieval across decisions, contracts, calls and code — every answer grounded to a page and a line.',
    metrics: [['Recall', '138 ms'], ['Citations', 'Line-level'], ['Egress', '0.00 KB']],
    preview: (
      <div className="space-y-3">
        <Row>
          <div className="tl-mono text-[10px] text-[#8C92A4] mb-1.5">QUERY</div>
          <div className="text-[14px] text-[#ECEEF4]">What is our policy on enterprise customisations?</div>
        </Row>
        <Row>
          <div className="flex items-center justify-between mb-2">
            <span className="tl-mono text-[11px] text-[#ECEEF4]">[1] ADR-014-no-custom-branches.md · p.2</span>
            <Chip tone="amber">98.4% grounded</Chip>
          </div>
          <p className="tl-serif text-lg leading-snug text-[#D9DCE5]">“Zero enterprise customisations before Q4 2026. All clients consume public multi-tenant APIs.”</p>
        </Row>
      </div>
    ),
  },
  {
    id: 'calls',
    no: '02',
    kicker: 'Customer intelligence',
    name: 'Client Call Studio',
    line: 'Every promise made on a call, remembered.',
    body: 'On-device Whisper transcribes and diarizes each conversation, isolating pain points and extracting commitments into one-click tasks.',
    metrics: [['Speech', 'Whisper L-v3'], ['Diarization', 'On-device'], ['Commitments', '1-click']],
    preview: (
      <div className="space-y-3">
        <Row>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-[#ECEEF4]">
              <span className="h-2 w-2 rounded-full bg-[#FF8A7A] animate-pulse" /> Acme Corp — enterprise call
            </span>
            <span className="tl-mono text-[10px] text-[#8C92A4]">03:42 · diarized</span>
          </div>
          <div className="mt-4 flex items-end gap-[3px] h-10">
            {Array.from({ length: 48 }).map((_, i) => (
              <span key={i} className="flex-1 rounded-full bg-[#F2C689]/70" style={{ height: `${18 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.4)) * 82}%` }} />
            ))}
          </div>
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row><div className="text-[12px] text-[#ECEEF4] mb-1">Constraint</div><p className="text-[12px] text-[#8C92A4]">On-prem execution, zero cloud telemetry.</p></Row>
          <Row><div className="text-[12px] text-[#F2C689] mb-1">Commitment</div><p className="text-[12px] text-[#D9DCE5]">Deliver AST diff benchmark by Friday.</p></Row>
        </div>
      </div>
    ),
  },
  {
    id: 'onboarding',
    no: '03',
    kicker: 'Role-adaptive',
    name: 'Onboarding Flight Plans',
    line: 'New hires, mentored by the company itself.',
    body: 'Each role receives a flight plan assembled from your own ADRs, calls and decisions — so week one feels like month three.',
    metrics: [['Plans', 'Per role'], ['Sources', 'Your ADRs'], ['Ramp', 'Day 1']],
    preview: (
      <div className="space-y-2.5">
        {[
          ['Read ADR-014 — why we refuse custom forks', true],
          ['Replay Acme call — the on-prem constraint', true],
          ['Shadow INV-017 fix — transactional outbox', false],
          ['Ship first PR through the sentinel', false],
        ].map(([t, done], i) => (
          <Row key={i}>
            <div className="flex items-center gap-3 text-[13px]">
              <span className={`h-4 w-4 rounded-full border ${done ? 'bg-[#F2C689] border-[#F2C689]' : 'border-white/25'}`} />
              <span className={done ? 'text-[#8C92A4] line-through decoration-white/20' : 'text-[#ECEEF4]'}>{t as string}</span>
              <span className="ml-auto tl-mono text-[10px] text-[#8C92A4]">Day {i + 1}</span>
            </div>
          </Row>
        ))}
      </div>
    ),
  },
  {
    id: 'thinktank',
    no: '04',
    kicker: 'Collaborative',
    name: 'The Think Tank',
    line: 'Where conversations crystallise into decisions.',
    body: 'Threads with teammates and TARS side by side. When consensus forms, it is promoted to the registry with its full lineage intact.',
    metrics: [['Threads', 'Live'], ['Promotion', 'To registry'], ['Lineage', 'Preserved']],
    preview: (
      <div className="space-y-3">
        <Row><div className="text-[11px] text-[#8C92A4] mb-1">Elena · CTO</div><p className="text-[13px] text-[#ECEEF4]">Should we pause SAML until self-serve ships?</p></Row>
        <Row><div className="text-[11px] text-[#F2C689] mb-1">TARS</div><p className="text-[13px] text-[#D9DCE5]">Decision #14 already defers it. Three calls this month cite it as non-blocking.</p></Row>
        <div className="flex justify-end"><Chip tone="amber">Promoted → Decision #22</Chip></div>
      </div>
    ),
  },
  {
    id: 'decisions',
    no: '05',
    kicker: 'Strategic registry',
    name: 'Decisions & What-If',
    line: 'A contradiction radar for the founders.',
    body: 'A Git-backed ledger of every strategic call. Proposals that contradict it are intercepted — with the runway cost simulated before anyone commits.',
    metrics: [['Ledger', 'Git hashes'], ['Conflicts', 'Real-time'], ['Runway', 'Simulated']],
    preview: (
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#FF8A7A]/30 bg-[#FF8A7A]/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2"><Chip tone="red">Contradiction</Chip><span className="tl-mono text-[10px] text-[#8C92A4]">vs Decision #14</span></div>
          <p className="text-[13px] text-[#D9DCE5]">Proposed $80k custom SAML branch conflicts with the no-fork policy.</p>
        </div>
        <Row>
          <div className="flex items-end justify-between">
            <div><div className="tl-mono text-[10px] text-[#8C92A4]">RUNWAY IMPACT</div><div className="tl-serif text-4xl text-[#ECEEF4]">−1.8 mo</div></div>
            <div className="flex items-end gap-1 h-12">
              {[90, 84, 78, 70, 58, 44].map((h, i) => (<span key={i} className="w-3 rounded-sm bg-[#F2C689]/60" style={{ height: `${h}%` }} />))}
            </div>
          </div>
        </Row>
      </div>
    ),
  },
  {
    id: 'architecture',
    no: '06',
    kicker: 'Tech sentinel',
    name: 'Architecture Sentinel',
    line: 'Invariants enforced before code lands.',
    body: 'Tree-sitter parses every commit against your living ADRs. Violations are blocked at pre-commit with the refactor that fixes them.',
    metrics: [['Parser', 'Tree-sitter'], ['Check', '38.4 ms'], ['ADRs', 'Living']],
    preview: (
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 tl-mono text-[11.5px] leading-relaxed">
        <div className="text-[#8C92A4]">$ git commit -m "billing: charge on checkout"</div>
        <div className="text-[#8C92A4]">tars ▸ parsing 14 files · 38.4 ms</div>
        <div className="text-[#FF8A7A] mt-2">✕ BLOCKED  INV-017  HTTP call inside DB transaction</div>
        <div className="text-[#8C92A4] pl-4">app/services/billing.py:22</div>
        <div className="text-[#F2C689] pl-4">→ apply Transactional Outbox (ADR-017)</div>
      </div>
    ),
  },
];
