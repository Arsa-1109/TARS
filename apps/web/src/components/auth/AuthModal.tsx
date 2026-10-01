import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, UserProfile, UserDTO } from '../../types/contracts';
import { ROLES } from '../../state/useSessionStore';
import { api } from '../../services/client';
import { X, Lock, ArrowRight, User, Mail, ChevronRight, Shield, AlertCircle, Building2 } from 'lucide-react';
import { Spinner } from '../primitives/Spinner';
import { CustomSelect, SelectOption } from '../primitives/CustomSelect';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (roleOrProfile: UserRole | UserProfile, isNewUser?: boolean) => void;
  initialMode?: 'signin' | 'signup';
}

const DEFAULT_TEAM_MEMBERS: { role: UserRole; title: string; initial: string }[] = [
  { role: 'FOUNDER',  title: 'Founder & CEO',        initial: 'A' },
  { role: 'ENGINEER', title: 'Lead Architect',        initial: 'E' },
  { role: 'PRODUCT',  title: 'Head of Product',       initial: 'M' },
  { role: 'NEW_HIRE', title: 'Software Engineer',     initial: 'M' },
];

export const AuthModal: React.FC<AuthModalProps> = ({

  isOpen,
  onClose,
  onLogin,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<UserRole>('FOUNDER');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [password, setPassword] = useState('');
  const [usersList, setUsersList] = useState<UserDTO[]>([]);

  // Sign up fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ENGINEER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auth flow state
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Fetch registered users on open
  useEffect(() => {
    if (isOpen) {
      api.getUsers().then((users) => {
        if (users && users.length > 0) {
          setUsersList(users);
        }
      }).catch((err) => {
        console.warn('Could not load user list:', err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode, isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsAuthenticating(false);
        setPassword('');
        setErrorMsg(null);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerAuthFlow = (profile: UserProfile, isNewUser = false) => {
    setIsAuthenticating(true);
    setErrorMsg(null);

    // Native macOS/iOS instantaneous feedback — smooth 180ms sheet dissolve
    setTimeout(() => {
      onLogin(profile, isNewUser);
      onClose();
      setIsAuthenticating(false);
    }, 180);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      triggerAuthFlow({
        id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        department: selectedUser.department,
        clearance: selectedUser.clearance,
        company_id: selectedUser.company_id,
        company_name: selectedUser.company_name,
      });
    } else if (showDemoAccounts && selectedPersona) {
      const p = ROLES[selectedPersona];
      triggerAuthFlow({
        name: p.name,
        role: p.role,
        department: p.department,
        clearance: p.clearance,
        company_name: p.company_name,
        company_id: p.company_id,
      });
    } else {
      setErrorMsg('Please select an account or switch to Create Account.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setErrorMsg('Please enter both name and email.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg(null);

    try {
      const createdUser = await api.createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        company_name: newCompany.trim() || undefined,
      });

      // Update local list
      setUsersList((prev) => [...prev, createdUser]);

      triggerAuthFlow({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        department: createdUser.department,
        clearance: createdUser.clearance,
        company_id: createdUser.company_id,
        company_name: createdUser.company_name,
      }, true);
    } catch (err: any) {
      setIsAuthenticating(false);
      setErrorMsg(err.message || 'Failed to create profile. Check your details.');
    }
  };

  const roleOptions: SelectOption<UserRole>[] = [
    {
      value: 'FOUNDER',
      label: 'Founder & CEO',
      description: 'Executive Strategy & Governance',
      badge: 'Level 3',
    },
    {
      value: 'ENGINEER',
      label: 'Engineering & Architecture Lead',
      description: 'Code Invariants & Systems Architecture',
      badge: 'Level 2',
    },
    {
      value: 'PRODUCT',
      label: 'Product & Intelligence Lead',
      description: 'Customer Call Studio & Spec Synthesis',
      badge: 'Level 2',
    },
    {
      value: 'SALES',
      label: 'Sales & Growth Lead',
      description: 'Client Commitments & Growth Pipeline',
      badge: 'Level 2',
    },
    {
      value: 'NEW_HIRE',
      label: 'Software Engineer',
      description: 'Team Onboarding & Institutional Knowledge',
      badge: 'Level 1',
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Scrim — full screen high-contrast blur */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[20px] transition-opacity duration-300" aria-hidden="true" />

      {/* Modal card */}
      <div
        className="relative w-full max-w-[380px] z-10 animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-[24px] overflow-hidden bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.12] shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.85)] transition-all">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.10] dark:hover:bg-white/[0.15] text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-all flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Content */}
          <div className="p-6 pt-7 space-y-5">

            {/* Brand header */}
            <div className="text-center">
              <img
                src="/tars-logo.jpg"
                alt="TARS Logo"
                className="w-12 h-12 rounded-[14px] object-cover mx-auto mb-3.5 shadow-sm border border-black/10 dark:border-white/10"
              />
              <h2 className="text-[20px] font-bold tracking-tight text-black dark:text-white leading-tight">
                {mode === 'signin' ? 'Sign in to TARS' : 'Create Workspace Account'}
              </h2>
              <p className="text-[13px] text-[#86868B] dark:text-[#8E8E93] mt-1 font-normal">
                {mode === 'signin'
                  ? 'Select an account to access sovereign memory.'
                  : 'Establish a new institutional identity profile.'}
              </p>
            </div>

            {/* Mode toggle — native Apple segmented control */}
            <div className="flex p-0.5 rounded-[12px] bg-black/[0.05] dark:bg-white/[0.08]">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    'flex-1 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-150',
                    mode === m
                      ? 'bg-white dark:bg-[#323236] text-black dark:text-white shadow-xs font-semibold'
                      : 'text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white',
                  ].join(' ')}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* ─── SIGN IN FORM ─── */}
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Account list */}
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-[#86868B] dark:text-[#8E8E93] uppercase tracking-wider px-1 mb-1">
                    Select Account
                  </div>
                  <div className="space-y-1">
                    {usersList.length > 0 ? (
                      usersList.map((u) => {
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedPersona(u.role);
                            }}
                            className={[
                              'w-full px-3 py-2 rounded-[12px] text-left transition-all duration-150 flex items-center justify-between group cursor-pointer',
                              isSelected
                                ? 'bg-black/[0.06] dark:bg-white/[0.09] border border-black/[0.10] dark:border-white/[0.14]'
                                : 'border border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-black dark:text-white leading-tight truncate">
                                  {u.name}
                                </div>
                                <div className="text-[11px] text-[#86868B] dark:text-[#8E8E93] truncate">
                                  {u.role} • {u.department}{u.company_name ? ` • ${u.company_name}` : ''}
                                </div>
                              </div>
                            </div>
                            <div
                              className={[
                                'w-2 h-2 rounded-full transition-transform duration-150 shrink-0',
                                isSelected ? 'bg-black dark:bg-white scale-100' : 'bg-transparent scale-0',
                              ].join(' ')}
                            />
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3.5 text-center rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
                        <p className="text-[12px] text-[#86868B] dark:text-[#8E8E93]">
                          No registered accounts found yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="mt-1.5 text-[12px] font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                        >
                          Create your company workspace account →
                        </button>
                      </div>
                    )}

                    {/* Expandable Demo Personas (isolated to sandbox testing) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                        className="text-[11px] text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showDemoAccounts ? 'Hide Demo Personas' : 'Explore with Aetherflow Demo Personas'}</span>
                        <ChevronRight className={`w-3 h-3 transition-transform ${showDemoAccounts ? 'rotate-90' : ''}`} />
                      </button>
                      {showDemoAccounts && (
                        <div className="mt-2 space-y-1 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                          {DEFAULT_TEAM_MEMBERS.map((m) => {
                            const p = ROLES[m.role];
                            const isSelected = !selectedUser && selectedPersona === m.role;
                            return (
                              <button
                                key={m.role}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(null);
                                  setSelectedPersona(m.role);
                                }}
                                className={[
                                  'w-full px-3 py-1.5 rounded-[10px] text-left transition-all duration-150 flex items-center justify-between group cursor-pointer',
                                  isSelected
                                    ? 'bg-black/[0.06] dark:bg-white/[0.09] border border-black/[0.10] dark:border-white/[0.14]'
                                    : 'border border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                                ].join(' ')}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center justify-center text-[10px] font-bold">
                                    {m.initial}
                                  </div>
                                  <div>
                                    <div className="text-[12px] font-medium text-black dark:text-white leading-tight">
                                      {p.name}
                                    </div>
                                    <div className="text-[10px] text-[#86868B] dark:text-[#8E8E93]">
                                      {m.title} (Demo)
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={[
                                    'w-1.5 h-1.5 rounded-full transition-transform duration-150',
                                    isSelected ? 'bg-black dark:bg-white scale-100' : 'bg-transparent scale-0',
                                  ].join(' ')}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div className="relative flex items-center">
                    <Lock className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passphrase"
                      className="w-full pl-9 pr-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.09] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.04] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all font-normal"
                    />
                  </div>
                </div>

                {/* Sign in CTA */}
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full h-10 rounded-[12px] bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[13px] font-medium active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isAuthenticating ? (
                    <Spinner size="xs" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ─── SIGN UP FORM ─── */
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#86868B] dark:text-[#8E8E93] mb-1 px-1 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Name"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.09] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.04] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#86868B] dark:text-[#8E8E93] mb-1 px-1 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="name@company.internal"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.09] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.04] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#86868B] dark:text-[#8E8E93] mb-1 px-1 uppercase tracking-wider">
                    Company / Startup Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="e.g. Sovereign Labs, Inc."
                      className="w-full pl-9 pr-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.09] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.04] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all font-normal"
                    />
                  </div>
                </div>

                <CustomSelect
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  options={roleOptions}
                  label="Role & Clearance Level"
                />

                {errorMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] dark:text-[#FF453A] text-[12px]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Create account CTA */}
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full h-10 rounded-[12px] bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[13px] font-medium active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1"
                >
                  {isAuthenticating ? (
                    <Spinner size="xs" />
                  ) : (
                    <>
                      <span>Establish Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer notice */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.07] flex items-center justify-between text-[11px] text-[#86868B] dark:text-[#8E8E93] font-mono">
              <span>On-Device Security Invariant</span>
              <span>Zero WAN Egress</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
