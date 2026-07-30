'use client';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

export interface SubmitButtonProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}

export function SubmitButton({ children, className, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className ?? 'btn btn-primary'}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? 'Saving...' : children}
    </button>
  );
}
