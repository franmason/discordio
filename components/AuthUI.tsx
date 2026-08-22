"use client";

import { useState } from "react";

export const buttonClass =
  "mt-4 w-full rounded-xl bg-white py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50";

export const linkButtonClass =
  "mt-2 w-full rounded-xl py-2 text-sm text-neutral-400 transition hover:text-white";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-black p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          Chico Cine
        </p>
        <div className="rounded-2xl bg-neutral-900/80 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-white">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: "info" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`mb-2 mt-2 text-xs ${
        kind === "error" ? "text-red-400" : "text-emerald-400"
      }`}
    >
      {children}
    </p>
  );
}

function IconInput({
  icon,
  rightSlot,
  ...props
}: {
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative mb-4">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
        {icon}
      </span>
      <input
        {...props}
        className={`w-full rounded-xl border-none bg-black/40 py-3 pl-10 text-sm text-white outline-none ring-1 ring-white/10 transition placeholder:text-neutral-500 focus:ring-2 focus:ring-white/40 ${
          rightSlot ? "pr-10" : "pr-3.5"
        }`}
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightSlot}
        </span>
      )}
    </div>
  );
}

export function EmailInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <IconInput icon={<MailIcon />} type="email" {...props} />;
}

export function PasswordInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      icon={<LockIcon />}
      type={visible ? "text" : "password"}
      rightSlot={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Esconder senha" : "Mostrar senha"}
          aria-label={visible ? "Esconder senha" : "Mostrar senha"}
          className="text-neutral-500 transition hover:text-white"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...props}
    />
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className="mb-4 w-full rounded-xl border-none bg-black/40 px-3.5 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition placeholder:text-neutral-500 focus:ring-2 focus:ring-white/40"
    />
  );
}

export function InlineLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold text-white underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 1 12s4 7 11 7a10.44 10.44 0 0 0 5.39-1.61" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
