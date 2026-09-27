import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../../types/contracts';
import { ROLES } from '../../state/useSessionStore';
import {
  Shield,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  User,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { Spinner } from '../primitives/Spinner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (role: UserRole) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [selectedPersona, setSelectedPersona] = useState<UserRole>('FOUNDER');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ENGINEER');

  // Auth flow state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode, isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsAuthenticating(false);
        setAuthSuccess(false);
        setAuthStep('');
        setProgress(0);
        setPassword('');
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerAuthFlow = (role: UserRole) => {
    setIsAuthenticating(true);
    setAuthSuccess(false);
    setProgress(0);

    // Animate progress bar
    let p = 0;
    progressRef.current = setInterval(() => {
      p += 4;
      setProgress(Math.min(p, 90));
      if (p >= 90) clearInterval(progressRef.current!);
    }, 20);

    setAuthStep('Verifying credentials...');
    setTimeout(() => {
      setAuthStep('Loading workspace...');
      setProgress(95);
      setTimeout(() => {
        clearInterval(progressRef.current!);
        setProgress(100);
        setAuthStep('Welcome, ' + ROLES[role].name);
        setAuthSuccess(true);
        setIsAuthenticating(false);

        setTimeout(() => {
          onLogin(role);
          onClose();
        }, 600);
      }, 350);
    }, 500);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAuthFlow(selectedPersona);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAuthFlow(newRole);
  };

  const teamMembers: { role: UserRole; title: string; initial: string; bg: string }[] = [
    { role: 'FOUNDER',  title: 'Founder & CEO',        initial: 'A', bg: 'bg-[#FF9500]' },
    { role: 'ENGINEER', title: 'Lead Architect',        initial: 'E', bg: 'bg-[#0071E3]' },
    { role: 'PRODUCT',  title: 'Head of Product',       initial: 'M', bg: 'bg-[#34C759]' },
    { role: 'NEW_HIRE', title: 'Software Engineer',     initial: 'M', bg: 'bg-[#AF52DE]' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Scrim — rich blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[12px]" aria-hidden="true" />

      {/* Modal card */}
      <div
        className="relative w-full max-w-[400px] z-10 animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card with premium shadow */}
        <div className="relative rounded-[28px] overflow-hidden bg-white dark:bg-[#1C1C1E] border border-black/[0.10] dark:border-white/[0.16] shadow-[0_32px_80px_rgba(0,0,0,0.26),0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.90)]">

          {/* Animated progress bar — top edge */}
          <div className="absolute inset-x-0 top-0 h-[2px] z-20">
            {isAuthenticating || authSuccess ? (
              <div
                className="h-full bg-gradient-to-r from-[#0071E3] via-[#34C759] to-[#0071E3] transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, backgroundSize: '200%', animation: authSuccess ? 'none' : undefined }}
              />
            ) : (
              <div className="h-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
            )}
          </div>

          {/* Specular top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent pointer-events-none z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] hover:bg-black/[0.12] dark:hover:bg-white/[0.18] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-all flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Content */}
          <div className="p-7 pt-8 space-y-6">

            {/* Brand header */}
            <div className="text-center">
              <div className="w-[52px] h-[52px] rounded-[16px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto mb-4 font-black text-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.20)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.60)]">
                T
              </div>
              <h2 className="text-[22px] font-bold tracking-tight text-black dark:text-white leading-[1.1]">
                {mode === 'signin' ? 'Sign in to TARS' : 'Create Account'}
              </h2>
              <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-1.5">
                {mode === 'signin'
                  ? 'Select your account to continue.'
                  : 'Set up your local workspace profile.'}
              </p>
            </div>

            {/* Mode toggle — pill capsule */}
            <div className="flex p-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    'flex-1 py-1.5 rounded-full text-[13px] font-semibold transition-all',
                    mode === m
                      ? 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.40)]'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white',
                  ].join(' ')}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* ─── SIGN IN FORM ─── */}
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Account picker */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider mb-2">
                    Select Account
                  </div>
                  <div className="space-y-1.5">
                    {teamMembers.map((m) => {
                      const p = ROLES[m.role];
                      const isSelected = selectedPersona === m.role;
                      return (
                        <button
                          key={m.role}
                          type="button"
                          onClick={() => setSelectedPersona(m.role)}
                          className={[
                            'w-full px-3 py-2.5 rounded-[14px] text-left transition-all flex items-center justify-between group',
                            isSelected
                              ? 'bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.12] dark:border-white/[0.18]'
                              : 'border border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${m.bg} text-white flex items-center justify-center text-[12px] font-bold shadow-sm`}>
                              {m.initial}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-black dark:text-white leading-tight">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                                {m.title}
                              </div>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full transition-all ${isSelected ? 'bg-[#0071E3] dark:bg-[#0A84FF] scale-100' : 'bg-transparent scale-50'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full pl-9 pr-3.5 py-3 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0071E3]/15 dark:focus:ring-[#0A84FF]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Success state */}
                {authSuccess && (
                  <div className="p-3 rounded-[12px] bg-[#34C759]/[0.10] dark:bg-[#30D158]/[0.12] border border-[#34C759]/[0.20] dark:border-[#30D158]/[0.22] text-[#1D8348] dark:text-[#30D158] text-[13px] flex items-center justify-center gap-2 font-medium animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 animate-success-bounce" />
                    <span>{authStep}</span>
                  </div>
                )}

                {/* Sign in CTA */}
                <button
                  type="submit"
                  disabled={isAuthenticating || authSuccess}
                  className="w-full h-12 rounded-[14px] bg-black dark:bg-white text-white dark:text-black text-[14px] font-bold tracking-tight hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-70 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.24)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.60)] flex items-center justify-center gap-2"
                >
                  {isAuthenticating ? (
                    <>
                      <Spinner size="sm" />
                      <span className="text-[13px]">{authStep}</span>
                    </>
                  ) : authSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Opening Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ─── SIGN UP FORM ─── */
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Aryan"
                      required
                      className="w-full pl-9 pr-3.5 py-3 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0071E3]/15 dark:focus:ring-[#0A84FF]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="aryan@company.local"
                      required
                      className="w-full pl-9 pr-3.5 py-3 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0071E3]/15 dark:focus:ring-[#0A84FF]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
                    Role & Clearance
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-3 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0071E3]/15 dark:focus:ring-[#0A84FF]/15 transition-all appearance-none"
                  >
                    <option value="FOUNDER">Aryan — Founder & CEO (Executive)</option>
                    <option value="ENGINEER">Engineering & Architecture Lead</option>
                    <option value="PRODUCT">Product & Intelligence Lead</option>
                    <option value="NEW_HIRE">Software Engineer (Team)</option>
                  </select>
                </div>

                {/* Success state */}
                {authSuccess && (
                  <div className="p-3 rounded-[12px] bg-[#34C759]/[0.10] dark:bg-[#30D158]/[0.12] border border-[#34C759]/[0.20] dark:border-[#30D158]/[0.22] text-[#1D8348] dark:text-[#30D158] text-[13px] flex items-center justify-center gap-2 font-medium animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 animate-success-bounce" />
                    <span>{authStep}</span>
                  </div>
                )}

                {/* Create account CTA */}
                <button
                  type="submit"
                  disabled={isAuthenticating || authSuccess}
                  className="w-full h-12 rounded-[14px] bg-black dark:bg-white text-white dark:text-black text-[14px] font-bold tracking-tight hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-70 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.24)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.60)] flex items-center justify-center gap-2 mt-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Spinner size="sm" />
                      <span className="text-[13px]">{authStep}</span>
                    </>
                  ) : authSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Opening Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#8E8E93] font-mono">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#1D8348] dark:text-[#30D158]" />
                <span>Air-Gapped · 0.00 KB Egress</span>
              </div>
              <span className="text-[#AEAEB2] dark:text-[#48484A]">TARS 1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
