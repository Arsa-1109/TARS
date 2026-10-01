import { useState, useEffect } from 'react';
import { UserProfile, UserRole, WorkspaceId } from '../types/contracts';

export type WorkspaceDomain = 'executive' | 'engineering' | 'product' | 'talent';

export interface WorkspaceDomainConfig {
  id: WorkspaceDomain;
  name: string;
  tagline: string;
  allowedRoles: UserRole[];
  allowedWorkspaces: WorkspaceId[];
  requiredClearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY';
}

export const WORKSPACE_DOMAINS: Record<WorkspaceDomain, WorkspaceDomainConfig> = {
  executive: {
    id: 'executive',
    name: 'Executive & Strategy Domain',
    tagline: 'Strategic decisions, runway simulations & executive synthesis',
    allowedRoles: ['FOUNDER'],
    allowedWorkspaces: ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'],
    requiredClearance: 'EXECUTIVE_ONLY',
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering & Architecture Domain',
    tagline: 'Code invariants, Git pre-commit tests & architectural topology',
    allowedRoles: ['FOUNDER', 'ENGINEER'],
    allowedWorkspaces: ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'],
    requiredClearance: 'ALL_TEAM',
  },
  product: {
    id: 'product',
    name: 'Product & Customer Intelligence Domain',
    tagline: 'Customer call studio, voice-to-spec & product synthesis',
    allowedRoles: ['FOUNDER', 'PRODUCT', 'SALES'],
    allowedWorkspaces: ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'],
    requiredClearance: 'ALL_TEAM',
  },
  talent: {
    id: 'talent',
    name: 'Talent & Operations Domain',
    tagline: 'Team onboarding, company knowledge & culture flight plans',
    allowedRoles: ['FOUNDER', 'NEW_HIRE', 'ENGINEER', 'PRODUCT', 'SALES'],
    allowedWorkspaces: ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'],
    requiredClearance: 'ALL_TEAM',
  },
};

export const ROLE_WORKSPACES: Record<UserRole, WorkspaceId[]> = {
  FOUNDER: ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'],
  PRODUCT: ['knowledge', 'calls', 'thinktank', 'onboarding'],
  SALES: ['knowledge', 'calls', 'thinktank', 'onboarding'],
  ENGINEER: ['knowledge', 'architecture', 'thinktank', 'onboarding'],
  NEW_HIRE: ['knowledge', 'thinktank', 'onboarding'],
};

export const DEMO_ROLES: Record<UserRole, UserProfile> = {
  FOUNDER: {
    name: 'Alex Vance',
    role: 'FOUNDER',
    department: 'Executive',
    clearance: 'EXECUTIVE_ONLY',
    company_name: 'AetherFlow Technologies, Inc.',
    company_id: 'CMP-GENESIS-01',
  },
  PRODUCT: {
    name: 'Marcus Chen',
    role: 'PRODUCT',
    department: 'Product',
    clearance: 'ALL_TEAM',
    company_name: 'AetherFlow Technologies, Inc.',
    company_id: 'CMP-GENESIS-01',
  },
  SALES: {
    name: 'Sarah Jenkins',
    role: 'SALES',
    department: 'Sales & Growth',
    clearance: 'ALL_TEAM',
    company_name: 'AetherFlow Technologies, Inc.',
    company_id: 'CMP-GENESIS-01',
  },
  ENGINEER: {
    name: 'Dr. Elena Rostova',
    role: 'ENGINEER',
    department: 'Engineering',
    clearance: 'ALL_TEAM',
    company_name: 'AetherFlow Technologies, Inc.',
    company_id: 'CMP-GENESIS-01',
  },
  NEW_HIRE: {
    name: 'Chloe Dubois',
    role: 'NEW_HIRE',
    department: 'Engineering',
    clearance: 'ALL_TEAM',
    company_name: 'AetherFlow Technologies, Inc.',
    company_id: 'CMP-GENESIS-01',
  },
};

export const ROLES = DEMO_ROLES;

export const ROLE_DEFAULTS_MAP: Record<UserRole, { department: string; clearance: 'ALL_TEAM' | 'EXECUTIVE_ONLY' }> = {
  FOUNDER: { department: 'Executive', clearance: 'EXECUTIVE_ONLY' },
  PRODUCT: { department: 'Product', clearance: 'ALL_TEAM' },
  SALES: { department: 'Sales & Growth', clearance: 'ALL_TEAM' },
  ENGINEER: { department: 'Engineering', clearance: 'ALL_TEAM' },
  NEW_HIRE: { department: 'Engineering', clearance: 'ALL_TEAM' },
};

export const DEFAULT_CLEAN_PROFILE: UserProfile = {
  id: '',
  name: 'Workspace User',
  role: 'FOUNDER',
  department: 'Executive',
  clearance: 'EXECUTIVE_ONLY',
  company_name: '',
  company_id: '',
};

const STORAGE_CANONICAL_KEY = 'tars_session_storage';
const STORAGE_ROLE_KEY = 'tars_current_role';
const STORAGE_DOMAIN_KEY = 'tars_current_domain';
const STORAGE_AUTH_KEY = 'tars_is_authenticated';
const STORAGE_USER_KEY = 'tars_current_user_profile';
const STORAGE_ONBOARDING_KEY = 'tars_onboarding_completed';

function _loadCanonicalState(): any {
  try {
    const raw = localStorage.getItem(STORAGE_CANONICAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.state || parsed;
    }
  } catch {}
  return null;
}

export function useSessionStore() {
  const canonical = _loadCanonicalState();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (canonical && typeof canonical.isAuthenticated === 'boolean') {
      return canonical.isAuthenticated;
    }
    const saved = localStorage.getItem(STORAGE_AUTH_KEY);
    return saved === 'true';
  });

  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(() => {
    if (canonical && typeof canonical.onboardingCompleted === 'boolean') {
      return canonical.onboardingCompleted;
    }
    const saved = localStorage.getItem(STORAGE_ONBOARDING_KEY);
    return saved === 'true';
  });

  const setOnboardingCompleted = (completed: boolean) => {
    localStorage.setItem(STORAGE_ONBOARDING_KEY, completed ? 'true' : 'false');
    setOnboardingCompletedState(completed);
  };

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (canonical && canonical.currentRole && ROLE_WORKSPACES[canonical.currentRole as UserRole]) {
      return canonical.currentRole as UserRole;
    }
    const saved = localStorage.getItem(STORAGE_ROLE_KEY) as UserRole;
    return saved && ROLE_WORKSPACES[saved] ? saved : 'FOUNDER';
  });

  const [customProfile, setCustomProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeDomain, setActiveDomain] = useState<WorkspaceDomain>(() => {
    const saved = localStorage.getItem(STORAGE_DOMAIN_KEY) as WorkspaceDomain;
    return saved && WORKSPACE_DOMAINS[saved] ? saved : 'executive';
  });

  const setRole = (role: UserRole) => {
    localStorage.setItem(STORAGE_ROLE_KEY, role);
    setCurrentRole(role);
    // If user has a custom profile, update its role rather than discarding company details
    if (customProfile) {
      const roleMeta = ROLE_DEFAULTS_MAP[role] || { department: 'General', clearance: 'ALL_TEAM' };
      const updatedProfile: UserProfile = {
        ...customProfile,
        role,
        department: customProfile.department || roleMeta.department,
        clearance: role === 'FOUNDER' ? 'EXECUTIVE_ONLY' : roleMeta.clearance,
      };
      setCustomProfile(updatedProfile);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedProfile));
    }

    // Auto-adjust default domain if role doesn't belong to current domain
    if (role === 'FOUNDER') {
      setActiveDomain('executive');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'executive');
    } else if (role === 'ENGINEER') {
      setActiveDomain('engineering');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'engineering');
    } else if (role === 'PRODUCT' || role === 'SALES') {
      setActiveDomain('product');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'product');
    } else if (role === 'NEW_HIRE') {
      setActiveDomain('talent');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'talent');
    }
  };

  const setUserProfile = (user: UserProfile) => {
    setCustomProfile(user);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_ROLE_KEY, user.role);
    setCurrentRole(user.role);

    // Auto-adjust default domain if role doesn't belong to current domain
    if (user.role === 'FOUNDER') {
      setActiveDomain('executive');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'executive');
    } else if (user.role === 'ENGINEER') {
      setActiveDomain('engineering');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'engineering');
    } else if (user.role === 'PRODUCT' || user.role === 'SALES') {
      setActiveDomain('product');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'product');
    } else if (user.role === 'NEW_HIRE') {
      setActiveDomain('talent');
      localStorage.setItem(STORAGE_DOMAIN_KEY, 'talent');
    }
  };

  const switchDomain = (domain: WorkspaceDomain) => {
    localStorage.setItem(STORAGE_DOMAIN_KEY, domain);
    setActiveDomain(domain);
  };

  const login = (roleOrProfile: UserRole | UserProfile = 'FOUNDER', isDemo = false) => {
    localStorage.setItem(STORAGE_AUTH_KEY, 'true');
    setIsAuthenticated(true);
    if (typeof roleOrProfile === 'string') {
      if (isDemo) {
        const demoProf = DEMO_ROLES[roleOrProfile] || DEMO_ROLES.FOUNDER;
        setUserProfile(demoProf);
      } else {
        setRole(roleOrProfile);
      }
    } else {
      setUserProfile(roleOrProfile);
    }
  };

  const logout = () => {
    localStorage.setItem(STORAGE_AUTH_KEY, 'false');
    localStorage.removeItem(STORAGE_USER_KEY);
    setCustomProfile(null);
    setIsAuthenticated(false);
  };

  const profile: UserProfile = customProfile || {
    ...DEFAULT_CLEAN_PROFILE,
    role: currentRole,
    department: ROLE_DEFAULTS_MAP[currentRole]?.department || 'Executive',
    clearance: currentRole === 'FOUNDER' ? 'EXECUTIVE_ONLY' : 'ALL_TEAM',
  };

  const currentDomainConfig = WORKSPACE_DOMAINS[activeDomain];

  // Item 135: Unify session state into canonical storage key
  // Item 136: Role selection in Cockpit acts as a persona preview filter,
  // while server-side session tokens govern true authorization.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CANONICAL_KEY, JSON.stringify({
        state: {
          isAuthenticated,
          onboardingCompleted,
          currentRole,
          profile,
          activeDomain,
        },
        profile,
        role: currentRole,
      }));
    } catch {}
  }, [isAuthenticated, onboardingCompleted, currentRole, profile, activeDomain]);

  // Check if current user role has clearance for a given workspace
  const canAccessWorkspace = (ws: WorkspaceId): { allowed: boolean; reason?: string } => {
    // Founder has sovereign root clearance across all workspaces
    if (profile.role === 'FOUNDER') {
      return { allowed: true };
    }

    const allowed = ROLE_WORKSPACES[currentRole] || [];
    if (!allowed.includes(ws)) {
      if (ws === 'decisions') {
        return {
          allowed: false,
          reason: 'Executive Clearance Level 3 required. Strategic Decision Registry & What-If Runway Simulations are isolated to Founders and Sovereign Admins.',
        };
      }
      if (ws === 'architecture') {
        return {
          allowed: false,
          reason: 'Technical Clearance required. Architecture Cortex & AST Invariant analysis is isolated to Technical Founders and Software Engineers.',
        };
      }
      if (ws === 'calls') {
        return {
          allowed: false,
          reason: 'Commercial Clearance required. Customer Call Studio & Audio Intelligence is isolated to Founders, Product Leads, and Sales Leads.',
        };
      }
      return {
        allowed: false,
        reason: `Access restricted. Your current clearance role (${currentRole}) does not have permission for the ${ws} workspace.`,
      };
    }

    return { allowed: true };
  };

  return {
    isAuthenticated,
    login,
    logout,
    profile,
    currentRole,
    setRole,
    setUserProfile,
    activeDomain,
    switchDomain,
    currentDomainConfig,
    availableRoles: Object.keys(ROLES) as UserRole[],
    availableDomains: Object.keys(WORKSPACE_DOMAINS) as WorkspaceDomain[],
    allowedWorkspaces: ROLE_WORKSPACES[currentRole] || [],
    getProfileForRole: (r: UserRole) => ROLES[r],
    canAccessWorkspace,
    onboarding_completed: onboardingCompleted,
    setOnboardingCompleted,
  };
}

