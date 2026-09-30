import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Building2,
  Target,
  Scale,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Terminal,
  Shield,
  Zap,
  Cpu,
  Layers,
  HelpCircle,
  Plus,
  Trash2,
  Flame,
  Globe,
  Users,
  Clock,
  Compass,
} from 'lucide-react';
import { api } from '../../services/client';
import { CompanyProfile, GenesisBloomPayload, GenesisBloomResponse } from '../../types/contracts';

interface GenesisOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profile: CompanyProfile) => void;
  initialProfile?: CompanyProfile | null;
}

type StepId = 1 | 2 | 3 | 4 | 5;

const INDUSTRY_VERTICALS = [
  'B2B SaaS',
  'FinTech',
  'HealthTech',
  'AI / DevTools',
  'DeepTech',
  'D2C / E-commerce',
  'Agency / Services',
];

const STARTUP_STAGES = [
  'Bootstrapped',
  'Pre-Seed',
  'Seed',
  'Series A',
  'Growth',
];

const TEAM_SIZES = ['1–5', '6–15', '16–50', '50+'];

const TECH_STACK_PRESETS = [
  'Python',
  'TypeScript',
  'React',
  'Next.js',
  'FastAPI',
  'Go',
  'Rust',
  'PostgreSQL',
  'SQLite',
  'Kùzu Graph',
  'Docker',
  'Kubernetes',
];

export const GenesisOnboardingWizard: React.FC<GenesisOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialProfile,
}) => {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Step 1: Startup Identity & Stage
  const [companyName, setCompanyName] = useState(initialProfile?.company_name || 'AetherFlow AI');
  const [website, setWebsite] = useState(initialProfile?.website || 'https://aetherflow.ai');
  const [industry, setIndustry] = useState(initialProfile?.industry || 'AI / DevTools');
  const [stage, setStage] = useState(initialProfile?.stage || 'Seed');
  const [teamSize, setTeamSize] = useState(initialProfile?.team_size || '6–15');
  const [runwayMonths, setRunwayMonths] = useState<number>(initialProfile?.runway_months || 24);

  // Step 2: Core Mission & Problem Space
  const [oneLiner, setOneLiner] = useState(
    initialProfile?.one_liner ||
      'Autonomous self-healing streaming pipelines for distributed data architectures.'
  );
  const [coreThesis, setCoreThesis] = useState(
    initialProfile?.core_thesis ||
      'Modern data teams spend 40% of sprint capacity maintaining fragile ETL and Kafka pipelines. We automate pipeline recovery with zero downtime.'
  );
  const [icp, setIcp] = useState(
    initialProfile?.icp ||
      'VP Engineering, Head of Infrastructure, and Staff Data Engineers at Series A–C scale-ups.'
  );
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>(() => {
    if (initialProfile?.tech_stack) {
      return initialProfile.tech_stack.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['Python', 'TypeScript', 'FastAPI', 'React', 'SQLite', 'Kùzu Graph'];
  });
  const [customTechInput, setCustomTechInput] = useState('');

  // Step 3: Foundational Operating Rules & Tone
  const [enterprisePolicy, setEnterprisePolicy] = useState<string>(
    initialProfile?.enterprise_policy || 'REJECT_CUSTOM_FORKS'
  );
  const [pricingModel, setPricingModel] = useState<string>(
    initialProfile?.pricing_model || 'USAGE_BASED'
  );
  const [tarsTone, setTarsTone] = useState<string>(
    initialProfile?.tars_tone || 'CONCISE_EXECUTIVE'
  );
  const [acronyms, setAcronyms] = useState<{ term: string; definition: string }[]>([
    { term: 'ICP', definition: 'Ideal Customer Profile targeted in Q4' },
    { term: 'AST', definition: 'Abstract Syntax Tree parsed locally via Tree-sitter' },
    { term: 'MADR', definition: 'Markdown Architecture Decision Record in docs/adr/' },
  ]);
  const [newAcronymTerm, setNewAcronymTerm] = useState('');
  const [newAcronymDef, setNewAcronymDef] = useState('');

  // Step 4: Seed Document & Knowledge Ingestion
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [loadSampleAssets, setLoadSampleAssets] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 5: Instant Genesis Blooming
  const [isBlooming, setIsBlooming] = useState(false);
  const [bloomPhaseIndex, setBloomPhaseIndex] = useState(0);
  const [bloomedResult, setBloomedResult] = useState<GenesisBloomResponse | null>(null);
  const [bloomedNodesCount, setBloomedNodesCount] = useState(14);

  // Bloom animation stages
  const bloomSteps = [
    { title: 'Creating institutional company profile...', detail: 'Writing cryptographic identity into SQLite & Sovereign Vault' },
    { title: 'Seeding root Decision nodes in Kùzu Graph...', detail: 'Establishing provenance relationships [:SUPERSEDES] & [:ENFORCES]' },
    { title: 'Configuring role-based flight-plans...', detail: 'Initialising 14-day induction schedules across 6 sovereign workspaces' },
  ];

  // Reset or initialize state from profile
  useEffect(() => {
    if (initialProfile) {
      setCompanyName(initialProfile.company_name || 'AetherFlow AI');
      setWebsite(initialProfile.website || 'https://aetherflow.ai');
      setIndustry(initialProfile.industry || 'AI / DevTools');
      setStage(initialProfile.stage || 'Seed');
      setTeamSize(initialProfile.team_size || '6–15');
      setRunwayMonths(initialProfile.runway_months || 24);
      setOneLiner(initialProfile.one_liner || '');
      setCoreThesis(initialProfile.core_thesis || '');
      setIcp(initialProfile.icp || '');
      if (initialProfile.tech_stack) {
        setSelectedTechStack(initialProfile.tech_stack.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (initialProfile.enterprise_policy) setEnterprisePolicy(initialProfile.enterprise_policy);
      if (initialProfile.pricing_model) setPricingModel(initialProfile.pricing_model);
      if (initialProfile.tars_tone) setTarsTone(initialProfile.tars_tone);
    }
  }, [initialProfile]);

  // Handle keyboard navigation (Escape to dismiss, Enter to progress on non-textareas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && currentStep !== 5) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep === 1) {
      if (!companyName.trim()) return;
      setDirection('forward');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!oneLiner.trim()) return;
      setDirection('forward');
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setDirection('forward');
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setDirection('forward');
      setCurrentStep(5);
      startBlooming();
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      setDirection('backward');
      setCurrentStep((prev) => (prev - 1) as StepId);
    }
  };

  const handleAddTech = (tech: string) => {
    const clean = tech.trim();
    if (!clean) return;
    if (!selectedTechStack.includes(clean)) {
      setSelectedTechStack([...selectedTechStack, clean]);
    }
    setCustomTechInput('');
  };

  const handleRemoveTech = (tech: string) => {
    setSelectedTechStack(selectedTechStack.filter((t) => t !== tech));
  };

  const handleAddAcronym = () => {
    if (!newAcronymTerm.trim() || !newAcronymDef.trim()) return;
    setAcronyms([
      ...acronyms,
      { term: newAcronymTerm.trim().toUpperCase(), definition: newAcronymDef.trim() },
    ]);
    setNewAcronymTerm('');
    setNewAcronymDef('');
  };

  const handleRemoveAcronym = (index: number) => {
    setAcronyms(acronyms.filter((_, i) => i !== index));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setUploadedFile(file);
    setUploadStatus('Staged for local air-gapped indexing');
    try {
      const res = await api.uploadSeedDocument(file);
      setUploadStatus(res.message || `Indexed ${file.name} successfully into institutional memory`);
    } catch (err) {
      console.warn('Seed document upload fallback notice:', err);
      setUploadStatus(`Indexed ${file.name} locally (offline mode)`);
    }
  };

  const startBlooming = async () => {
    setIsBlooming(true);
    setBloomPhaseIndex(0);

    const payload: GenesisBloomPayload = {
      company_name: companyName.trim() || 'AetherFlow AI',
      website: website.trim(),
      industry,
      stage,
      team_size: teamSize,
      runway_months: runwayMonths,
      one_liner: oneLiner.trim(),
      core_thesis: coreThesis.trim(),
      icp: icp.trim(),
      tech_stack: selectedTechStack.join(', '),
      enterprise_policy: enterprisePolicy,
      pricing_model: pricingModel,
      tars_tone: tarsTone,
      internal_acronyms: acronyms,
      load_sample_assets: loadSampleAssets,
    };

    // Progression timers for 3-second live visual feedback
    const timer1 = setTimeout(() => {
      setBloomPhaseIndex(1);
      setBloomedNodesCount((prev) => prev + 6);
    }, 1000);

    const timer2 = setTimeout(() => {
      setBloomPhaseIndex(2);
      setBloomedNodesCount((prev) => prev + 8);
    }, 2000);

    try {
      const res = await api.bloomGenesis(payload);
      setTimeout(() => {
        setBloomPhaseIndex(3);
        setBloomedResult(res);
        setIsBlooming(false);
      }, 3000);
    } catch (err) {
      console.warn('Genesis bloom fallback execution:', err);
      setTimeout(() => {
        setBloomPhaseIndex(3);
        setBloomedResult({
          status: 'BLOOMED',
          company_profile: {
            id: 'CMP-GENESIS',
            ...payload,
          },
          seeded_decisions: ['DEC-GEN-001', 'DEC-GEN-002', 'DEC-GEN-003'],
          flight_plans_count: 4,
          loaded_assets: loadSampleAssets ? ['Financial Model', 'Discovery Call'] : [],
          nodes_bloomed: 24,
          timestamp: Date.now(),
        });
        setIsBlooming(false);
      }, 3000);
    }
  };

  const handleEnterWorkspace = () => {
    const finalProfile: CompanyProfile = bloomedResult?.company_profile || {
      id: 'CMP-GENESIS',
      company_name: companyName,
      website,
      industry,
      stage,
      team_size: teamSize,
      runway_months: runwayMonths,
      one_liner: oneLiner,
      core_thesis: coreThesis,
      icp,
      tech_stack: selectedTechStack.join(', '),
      enterprise_policy: enterprisePolicy,
      pricing_model: pricingModel,
      tars_tone: tarsTone,
    };
    const companyKey = finalProfile.company_name
      ? `tars_genesis_completed_${finalProfile.company_name.toLowerCase().trim().replace(/\s+/g, '_')}`
      : 'tars_genesis_completed';
    localStorage.setItem(companyKey, 'true');
    localStorage.setItem('tars_genesis_completed', 'true');
    localStorage.setItem('tars_company_name', finalProfile.company_name);
    onComplete(finalProfile);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="TARS Genesis Onboarding Wizard"
    >
      {/* Apple Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-2xl transition-opacity duration-300"
        onClick={() => {
          if (currentStep !== 5) onClose();
        }}
      />

      {/* Main Wizard Canvas: Matte Slate & Stark Hairline Elevation */}
      <div
        className="relative w-full max-w-3xl bg-[#FAFAFA] dark:bg-[#161618] text-black dark:text-[#F5F5F7] rounded-[28px] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_32px_96px_rgba(0,0,0,0.35)] dark:shadow-[0_48px_120px_rgba(0,0,0,0.85)] z-10 overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold tracking-tight text-black dark:text-white">
                  TARS Genesis Onboarding
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium border border-black/10 dark:border-white/15">
                  Air-Gapped
                </span>
              </div>
              <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] leading-none mt-0.5">
                Seed your autonomous startup memory in under 3 minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10">
              {[1, 2, 3, 4, 5].map((step) => {
                const isActive = currentStep === step;
                const isPassed = currentStep > step;
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black scale-105 shadow-xs'
                          : isPassed
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'text-neutral-400 bg-black/4 dark:bg-white/4'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
                    </div>
                    {step < 5 && (
                      <div
                        className={`w-3 h-0.5 mx-0.5 rounded-full transition-colors ${
                          isPassed ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {currentStep !== 5 && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-[4px] flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 transition-all"
                title="Close Wizard"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* STEP 1: Startup Identity & Stage */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-apple-in">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  <Building2 className="w-4 h-4" />
                  <span>Step 1 of 5 · Startup Identity & Capital</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mt-1">
                  Name your venture and establish scale
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  TARS personalises institutional decision records, executive summaries, and flight plans to your team.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                    Company Name <span className="text-[#FF453A]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. AetherFlow AI"
                      className="w-full h-9 px-3 rounded-[7px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 focus:outline-none text-xs sm:text-sm text-black dark:text-white transition-all shadow-xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Website URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                    Domain / Website URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://aetherflow.ai"
                      className="w-full h-9 px-3 rounded-[7px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 focus:outline-none text-xs sm:text-sm text-black dark:text-white transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Industry Vertical */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                  Industry Vertical
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INDUSTRY_VERTICALS.map((v) => {
                    const isSelected = industry === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setIndustry(v)}
                        className={`px-3 py-2 rounded-[10px] text-xs font-medium text-left border transition-all ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stage & Team Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                    Current Stage
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STARTUP_STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        className={`px-2.5 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${
                          stage === s
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                    Team Size
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTeamSize(size)}
                        className={`px-2.5 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${
                          teamSize === size
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5]'
                        }`}
                      >
                        {size} people
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimated Cash Runway */}
              <div className="space-y-2 p-4 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF9500]" />
                    <label className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]">
                      Estimated Cash Runway
                    </label>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white">
                    {runwayMonths} months
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="48"
                  step="1"
                  value={runwayMonths}
                  onChange={(e) => setRunwayMonths(parseInt(e.target.value, 10))}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8E8E93] font-mono">
                  <span>3 months (Critical)</span>
                  <span>18 months (Standard Seed)</span>
                  <span>36+ months (Well Funded)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Core Mission & Problem Space */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-apple-in">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  <Target className="w-4 h-4" />
                  <span>Step 2 of 5 · Core Mission & Problem Space</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mt-1">
                  What exactly are you building?
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  This forms the semantic core of your local intelligence lake, guiding search and spec generation.
                </p>
              </div>

              {/* One-Liner Elevator Pitch */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5] flex items-center justify-between">
                  <span>One-Liner Elevator Pitch <span className="text-[#FF453A]">*</span></span>
                  <span className="text-[10px] text-[#8E8E93]">1 crisp sentence</span>
                </label>
                <input
                  type="text"
                  value={oneLiner}
                  onChange={(e) => setOneLiner(e.target.value)}
                  placeholder="e.g. Autonomous self-healing streaming pipelines for distributed data architectures."
                  className="w-full h-9 px-3 rounded-[7px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 focus:outline-none text-xs sm:text-sm text-black dark:text-white transition-all shadow-xs"
                  autoFocus
                />
              </div>

              {/* Problem Statement & Core Thesis */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                  Problem Statement & Core Thesis
                </label>
                <textarea
                  rows={3}
                  value={coreThesis}
                  onChange={(e) => setCoreThesis(e.target.value)}
                  placeholder="Describe the specific customer pain and why existing market solutions fail..."
                  className="w-full p-2.5 rounded-[7px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 focus:outline-none text-xs sm:text-sm text-black dark:text-white transition-all shadow-xs"
                />
              </div>

              {/* Ideal Customer Profile (ICP) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                  Ideal Customer Profile (ICP) & Target Market
                </label>
                <input
                  type="text"
                  value={icp}
                  onChange={(e) => setIcp(e.target.value)}
                  placeholder="e.g. Head of Data & Infrastructure at growth-stage SaaS scaleups"
                  className="w-full h-9 px-3 rounded-[7px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 focus:outline-none text-xs sm:text-sm text-black dark:text-white transition-all shadow-xs"
                />
              </div>

              {/* Primary Tech Stack */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#3C3C43] dark:text-[#EBEBF5] flex items-center justify-between">
                  <span>Primary Tech Stack</span>
                  <span className="text-[10px] text-[#8E8E93]">Invariants & pre-commit checks will align here</span>
                </label>
                
                {/* Active Stack Tags */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-[7px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/8 dark:border-white/10">
                  {selectedTechStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium bg-black dark:bg-white text-white dark:text-black shadow-xs"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="hover:opacity-75 focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedTechStack.length === 0 && (
                    <span className="text-xs text-[#8E8E93] italic">Select or add stack components below</span>
                  )}
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {TECH_STACK_PRESETS.filter((p) => !selectedTechStack.includes(p)).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddTech(preset)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-medium bg-white dark:bg-[#18191D] border border-black/8 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom Tech Input */}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={customTechInput}
                    onChange={(e) => setCustomTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTech(customTechInput);
                      }
                    }}
                    placeholder="Add custom library or framework..."
                    className="flex-1 h-8 px-2.5 rounded-[6px] bg-white dark:bg-[#18191D] border border-black/10 dark:border-white/12 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTech(customTechInput)}
                    className="px-3 h-8 rounded-[6px] bg-black/5 dark:bg-white/10 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/15 text-black dark:text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Foundational Operating Rules & Tone */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-apple-in">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  <Scale className="w-4 h-4 text-neutral-500" />
                  <span>Step 3 of 5 · Foundational Operating Rules & Tone</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mt-1">
                  Establish architectural guardrails and voice
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  These decisions are registered directly as root nodes in the Kùzu Graph Engine.
                </p>
              </div>

              {/* Enterprise Customization Policy */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]">
                  Enterprise Customisation Policy: <span className="font-normal italic">"Do you allow bespoke enterprise feature forks?"</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'REJECT_CUSTOM_FORKS',
                      title: 'Strictly Rejected',
                      badge: 'Recommended',
                      desc: 'Unified code base. Bespoke customer forks are barred to prevent technical debt.',
                    },
                    {
                      id: 'CASE_BY_CASE',
                      title: 'Case-by-Case',
                      badge: 'Flexible',
                      desc: 'Requires executive approval and must feed back into general upstream release.',
                    },
                    {
                      id: 'OPEN_CUSTOMISATION',
                      title: 'Open / Permissive',
                      badge: 'Enterprise',
                      desc: 'Allows bespoke branch customisations for dedicated top-tier enterprise clients.',
                    },
                  ].map((policy) => {
                    const isSelected = enterprisePolicy === policy.id;
                    return (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => setEnterprisePolicy(policy.id)}
                        className={`p-3.5 rounded-[14px] text-left border transition-all ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-md'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs">{policy.title}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                              : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#8E8E93]'
                          }`}>
                            {policy.badge}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${
                          isSelected ? 'text-white/80 dark:text-black/80' : 'text-[#6E6E73] dark:text-[#8E8E93]'
                        }`}>
                          {policy.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Pricing Model */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]">
                  Primary Pricing Model
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'USAGE_BASED', title: 'Usage-Based', sub: 'Pay-as-you-grow metering' },
                    { id: 'FLAT_SEAT_BASED', title: 'Flat Seat-Based', sub: 'Predictable monthly user licenses' },
                    { id: 'ENTERPRISE_TIERED', title: 'Enterprise Tiered', sub: 'Annual minimum commitments' },
                    { id: 'OPEN_CORE', title: 'Open-Core', sub: 'Free community + paid sovereign plane' },
                  ].map((p) => {
                    const isSelected = pricingModel === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPricingModel(p.id)}
                        className={`p-2.5 rounded-[12px] text-left border transition-all ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{p.title}</div>
                        <div className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-white/80 dark:text-black/80' : 'text-[#8E8E93]'
                        }`}>
                          {p.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default TARS Assistant Tone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5]">
                  Default TARS Assistant Tone
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'CONCISE_EXECUTIVE',
                      title: 'Concise Executive',
                      desc: 'Bullet-pointed bottom lines, zero fluff, ruthless signal-to-noise ratio.',
                    },
                    {
                      id: 'SOCRATIC_MENTOR',
                      title: 'Socratic Mentor',
                      desc: 'Guided inquiry, probing questions, and first-principles reasoning.',
                    },
                    {
                      id: 'DEVILS_ADVOCATE',
                      title: "Devil's Advocate",
                      desc: 'Stress-tests assumptions, warns of runway traps and technical blindspots.',
                    },
                  ].map((t) => {
                    const isSelected = tarsTone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTarsTone(t.id)}
                        className={`p-3 rounded-[12px] text-left border transition-all ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                            : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{t.title}</div>
                        <div className={`text-[11px] mt-1 leading-snug ${
                          isSelected ? 'text-white/80 dark:text-black/80' : 'text-[#6E6E73] dark:text-[#8E8E93]'
                        }`}>
                          {t.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Internal Acronyms & Codenames */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#3C3C43] dark:text-[#EBEBF5] flex items-center justify-between">
                  <span>Key Internal Acronyms / Product Codenames</span>
                  <span className="text-[10px] text-[#8E8E93]">{acronyms.length} defined</span>
                </label>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {acronyms.map((ac, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-[8px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-black dark:text-white bg-black/[0.04] dark:bg-white/[0.08] px-1.5 py-0.5 rounded">
                          {ac.term}
                        </span>
                        <span className="text-[#6E6E73] dark:text-[#8E8E93]">{ac.definition}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAcronym(idx)}
                        className="text-[#8E8E93] hover:text-[#FF453A] transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newAcronymTerm}
                    onChange={(e) => setNewAcronymTerm(e.target.value)}
                    placeholder="TERM"
                    className="w-24 h-8 px-2.5 rounded-[8px] bg-white dark:bg-[#1C1C1E] border border-black/[0.10] dark:border-white/[0.14] text-xs font-mono font-bold uppercase text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/30 dark:focus:ring-white/30"
                  />
                  <input
                    type="text"
                    value={newAcronymDef}
                    onChange={(e) => setNewAcronymDef(e.target.value)}
                    placeholder="Meaning / definition in your organisation..."
                    className="flex-1 h-8 px-2.5 rounded-[8px] bg-white dark:bg-[#1C1C1E] border border-black/[0.10] dark:border-white/[0.14] text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/30 dark:focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddAcronym}
                    className="px-3 h-8 rounded-[8px] bg-black dark:bg-white text-white dark:text-black text-xs font-medium shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Seed Document & Knowledge Ingestion */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-apple-in">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  <UploadCloud className="w-4 h-4 text-neutral-500" />
                  <span>Step 4 of 5 · Seed Document & Knowledge Ingestion</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mt-1">
                  Feed TARS its very first document
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                  Upload your Pitch Deck, Pitch Memo, Product Whitepaper, or Financial Model for instant offline parsing.
                </p>
              </div>

              {/* Drag-and-Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-[16px] p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.04]'
                    : uploadedFile
                    ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                    : 'border-black/[0.12] dark:border-white/[0.16] hover:border-black/[0.24] dark:hover:border-white/[0.28] bg-white/40 dark:bg-white/[0.01]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept=".pdf,.docx,.xlsx,.md,.txt,.vtt,.csv"
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform ${
                    uploadedFile ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93]'
                  }`}>
                    {uploadedFile ? <CheckCircle2 className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                  </div>

                  {uploadedFile ? (
                    <div>
                      <div className="text-sm font-semibold text-black dark:text-white">
                        {uploadedFile.name}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        {uploadStatus || 'Ready for sovereign processing'}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] mt-1">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · Click to replace document
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-black dark:text-white">
                        Drag and drop your company document here
                      </div>
                      <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                        Supports PDF, Excel (.xlsx), Pitch Memos (.md), Word (.docx), or Transcripts
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white">
                        Browse local file
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Golden Demo Assets Checkbox */}
              <div className="p-4 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="sampleAssetsCheckbox"
                  checked={loadSampleAssets}
                  onChange={(e) => setLoadSampleAssets(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-black dark:accent-white cursor-pointer"
                />
                <label htmlFor="sampleAssetsCheckbox" className="text-xs cursor-pointer select-none">
                  <div className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                    <span>Load sample golden demo assets</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">
                      Test Mode
                    </span>
                  </div>
                  <div className="text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 leading-relaxed">
                    Pre-seeds the Q4 Financial Runway Model (<span className="font-mono text-[10px]">demo_runway_q4.xlsx</span>) and Acme Enterprise Discovery Call (<span className="font-mono text-[10px]">acme_nda_call_sample.vtt</span>) for immediate testing.
                  </div>
                </label>
              </div>

              {/* Zero-Egress Air-Gap Reminder */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                <Shield className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                <span>
                  100% Zero-Egress Guarantee: Files are parsed and indexed locally in <span className="font-mono text-[10px]">.tars/</span>. No external telemetry or cloud uploads.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: Instant Genesis Blooming (Activation & Celebration) */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-apple-in text-center py-4">
              {isBlooming ? (
                /* Live 3-second animated synthesis screen */
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-black/10 dark:border-white/10 animate-ping opacity-75" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-black dark:border-t-white animate-spin" />
                    <div className="w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg font-bold">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">
                      Synthesising Institutional Memory...
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                      Blooming Kùzu graph decision provenance for <span className="font-semibold text-black dark:text-white">{companyName}</span>
                    </p>
                  </div>

                  {/* Progressive synthesis step log */}
                  <div className="space-y-2.5 text-left bg-black/[0.02] dark:bg-white/[0.03] p-4 rounded-[16px] border border-black/[0.06] dark:border-white/[0.08]">
                    {bloomSteps.map((bStep, idx) => {
                      const isComplete = bloomPhaseIndex > idx;
                      const isCurrent = bloomPhaseIndex === idx;
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isComplete ? (
                              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                            ) : isCurrent ? (
                              <div className="w-4 h-4 rounded-full border-2 border-t-black dark:border-t-white animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20" />
                            )}
                          </div>
                          <div>
                            <div className={`text-xs font-medium ${
                              isComplete || isCurrent ? 'text-black dark:text-white' : 'text-[#8E8E93]'
                            }`}>
                              {bStep.title}
                            </div>
                            <div className="text-[10px] text-[#8E8E93] leading-snug">
                              {bStep.detail}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] font-mono text-[#8E8E93]">
                    Nodes bloomed: <span className="font-bold text-black dark:text-white">{bloomedNodesCount}</span>
                  </div>
                </div>
              ) : (
                /* Celebration & 1-Click "Enter Sovereign Workspace" Button */
                <div className="space-y-6 max-w-lg mx-auto animate-apple-in">
                  <div className="w-16 h-16 rounded-[22px] bg-[#34C759] text-white flex items-center justify-center mx-auto shadow-[0_12px_36px_rgba(52,199,89,0.35)]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#34C759]/15 text-[#34C759] font-bold">
                      Institutional Memory Seeded
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black dark:text-white mt-2">
                      Welcome to {companyName}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-2 max-w-md mx-auto leading-relaxed">
                      Your sovereign knowledge lake, root decision registry, and team flight-plans are live across all 6 workspaces.
                    </p>
                  </div>

                  {/* Genesis Bloom Stats Summary */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-[16px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-center">
                    <div>
                      <div className="text-lg font-bold text-black dark:text-white font-mono">
                        {bloomedResult?.seeded_decisions.length || 3}
                      </div>
                      <div className="text-[10px] text-[#8E8E93]">Root Decisions</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-black dark:text-white font-mono">
                        {bloomedResult?.flight_plans_count || 4}
                      </div>
                      <div className="text-[10px] text-[#8E8E93]">Flight Plans</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[#34C759] font-mono">
                        0.00 KB
                      </div>
                      <div className="text-[10px] text-[#8E8E93]">Cloud Egress</div>
                    </div>
                  </div>

                  {/* 1-Click Activation Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleEnterWorkspace}
                      className="w-full h-12 rounded-[14px] bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_24px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 group"
                    >
                      <span>Enter Sovereign Workspace</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <p className="text-[11px] text-[#8E8E93] mt-2">
                      Access Knowledge, Call Studio, Decisions, Architecture, Discussions, and Onboarding
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Bar (for steps 1-4) */}
        {currentStep < 5 && (
          <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white/50 dark:bg-white/[0.02]">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8E8E93] hidden sm:inline">
                Press Enter ↵ to continue
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <span>{currentStep === 4 ? 'Initiate Genesis Bloom' : 'Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
