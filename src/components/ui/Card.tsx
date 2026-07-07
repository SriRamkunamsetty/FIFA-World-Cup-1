import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section';
  'aria-labelledby'?: string;
}

export function Card({ children, className, as: Component = 'div', ...rest }: CardProps) {
  return (
    <Component
      className={cn('rounded-lg border border-pitch-line bg-pitch-surface p-4 sm:p-5', className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
