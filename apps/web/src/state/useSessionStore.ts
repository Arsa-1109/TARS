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
    allowedWorkspaces: ['decisions', 'knowledge', 'thinktank'],
    requiredClearance: 'EXECUTIVE_ONLY',
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering & Architecture Domain',
    tagline: 'Code invariants, Git pre-commit tests & architectural topology',
    allowedRoles: ['FOUNDER', 'ENGINEER'],
    allowedWorkspaces: ['architecture', 'knowledge', 'thinktank'],
    requiredClearance: 'ALL_TEAM',
  },
  product: {
    id: 'product',
    name: 'Product & Customer Intelligence Domain',
    tagline: 'Customer call studio, voice-to-spec & product synthesis',
    allowedRoles: ['FOUNDER', 'PRODUCT', 'SALES'],
    allowedWorkspaces: ['calls', 'knowledge', 'thinktank'],
    requiredClearance: 'ALL_TEAM',
  },
  talent: {
    id: 'talent',
    name: 'Talent & Operations Domain',
    tagline: 'Team onboarding, company knowledge & culture flight plans',
    allowedRoles: ['FOUNDER', 'NEW_HIRE', 'ENGINEER', 'PRODUCT', 'SALES'],
    allowedWorkspaces: ['knowledge', 'thinktank'],
    requiredClearance: 'ALL_TEAM',
  },
};

export const ROLES: Record<UserRole, UserProfile> = {
  FOUNDER: {
    name: 'Aryan',
    role: 'FOUNDER',
    department: 'Executive',
    clearance: 'EXECUTIVE_ONLY',
  },
  ENGINEER: {
    name: 'Elena Rostova',
    role: 'ENGINEER',
    department: 'Engineering',
    clearance: 'ALL_TEAM',
  },
  PRODUCT: {
    name: 'Marcus Vance',
    role: 'PRODUCT',
    department: 'Product',
    clearance: 'ALL_TEAM',
  },
  SALES: {
    name: 'Sarah Vance',
    role: 'SALES',
    department: 'Sales & Growth',
    clearance: 'ALL_TEAM',
  },
  NEW_HIRE: {
    name: 'Maya Lin',
    role: 'NEW_HIRE',
    department: 'Engineering',
    clearance: 'ALL_TEAM',
  },
};

const STORAGE_ROLE_KEY = 'tars_current_role';
const STORAGE_DOMAIN_KEY = 'tars_current_domain';
const STORAGE_AUTH_KEY = 'tars_is_authenticated';

export function useSessionStore() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_AUTH_KEY);
    return saved === 'true';
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_ROLE_KEY) as UserRole;
    return saved && ROLES[saved] ? saved : 'FOUNDER';
  });

  const [activeDomain, setActiveDomain] = useState<WorkspaceDomain>(() => {
    const saved = localStorage.getItem(STORAGE_DOMAIN_KEY) as WorkspaceDomain;
    return saved && WORKSPACE_DOMAINS[saved] ? saved : 'executive';
  });

  const setRole = (role: UserRole) => {
    localStorage.setItem(STORAGE_ROLE_KEY, role);
    setCurrentRole(role);

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

  const switchDomain = (domain: WorkspaceDomain) => {
    localStorage.setItem(STORAGE_DOMAIN_KEY, domain);
    setActiveDomain(domain);
  };

  const login = (role: UserRole = 'FOUNDER') => {
    localStorage.setItem(STORAGE_AUTH_KEY, 'true');
    setIsAuthenticated(true);
    setRole(role);
  };

  const logout = () => {
    localStorage.setItem(STORAGE_AUTH_KEY, 'false');
    setIsAuthenticated(false);
  };

  const profile = ROLES[currentRole];
  const currentDomainConfig = WORKSPACE_DOMAINS[activeDomain];

  // Check if current user role has clearance for a given workspace
  const canAccessWorkspace = (ws: WorkspaceId): { allowed: boolean; reason?: string } => {
    // RBAC: Verify workspace is within the user's active domain
    if (currentDomainConfig && !currentDomainConfig.allowedWorkspaces.includes(ws)) {
      return {
        allowed: false,
        reason: `Restricted Workspace: The ${ws} workspace is not accessible for the ${profile.role} role in ${currentDomainConfig.name}.`,
      };
    }
    if (ws === 'decisions') {
      if (profile.clearance !== 'EXECUTIVE_ONLY') {
        return {
          allowed: false,
          reason: 'Executive Clearance Level 3 required. Strategic Decision Registry & What-If Runway Simulations are isolated to Founders and Sovereign Admins.',
        };
      }
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
    activeDomain,
    switchDomain,
    currentDomainConfig,
    availableRoles: Object.keys(ROLES) as UserRole[],
    availableDomains: Object.keys(WORKSPACE_DOMAINS) as WorkspaceDomain[],
    getProfileForRole: (r: UserRole) => ROLES[r],
    canAccessWorkspace,
  };
}
