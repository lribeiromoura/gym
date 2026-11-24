import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        info: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400',
        success:
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        warning:
          'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400',
        destructive:
          'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400',
        purple:
          'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
