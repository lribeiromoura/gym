'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

type ResponsiveDialogMode = 'desktop' | 'mobile' | 'ssr';

interface ResponsiveDialogContextValue {
  mode: ResponsiveDialogMode;
  onOpenChange?: (open: boolean) => void;
}

const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue>({
    mode: 'desktop',
  });

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Unified overlay component for IronPulse:
 * - Mobile (< 640px): Vaul swipe-to-dismiss bottom Drawer with iOS safe-area padding
 * - Desktop (>= 640px): Centered Radix Dialog with focus trap and Escape handling
 * - SSR (Node / renderToStaticMarkup): Inline accessible dialog container when `open` is true
 */
function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const isServer = typeof window === 'undefined';

  if (isServer) {
    if (!open) return null;
    return (
      <ResponsiveDialogContext.Provider value={{ mode: 'ssr', onOpenChange }}>
        <div
          data-slot="responsive-dialog-ssr"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-2 sm:items-center sm:p-4"
        >
          {children}
        </div>
      </ResponsiveDialogContext.Provider>
    );
  }

  if (isDesktop) {
    return (
      <ResponsiveDialogContext.Provider
        value={{ mode: 'desktop', onOpenChange }}
      >
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      </ResponsiveDialogContext.Provider>
    );
  }

  return (
    <ResponsiveDialogContext.Provider value={{ mode: 'mobile', onOpenChange }}>
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    </ResponsiveDialogContext.Provider>
  );
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}) {
  const { mode, onOpenChange } = React.useContext(ResponsiveDialogContext);

  if (mode === 'ssr') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl',
          className
        )}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            aria-label="Fechar"
            className="absolute right-3.5 top-3.5 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
    );
  }

  if (mode === 'desktop') {
    return (
      <DialogContent
        className={className}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent className={className}>
      {showCloseButton && (
        <DrawerClose
          aria-label="Fechar"
          className="absolute right-3.5 top-3.5 z-10 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <X className="size-5" />
        </DrawerClose>
      )}
      {children}
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { mode } = React.useContext(ResponsiveDialogContext);
  if (mode === 'desktop') {
    return <DialogHeader className={className} {...props} />;
  }
  if (mode === 'mobile') {
    return <DrawerHeader className={cn('pr-16', className)} {...props} />;
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-border px-5 py-4 pr-16 text-left',
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { mode } = React.useContext(ResponsiveDialogContext);
  if (mode === 'desktop') {
    return <DialogFooter className={className} {...props} />;
  }
  if (mode === 'mobile') {
    return <DrawerFooter className={className} {...props} />;
  }
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<'h2'>) {
  const { mode } = React.useContext(ResponsiveDialogContext);
  if (mode === 'desktop') {
    return <DialogTitle className={className} {...props} />;
  }
  if (mode === 'mobile') {
    return <DrawerTitle className={className} {...props} />;
  }
  return (
    <h2
      className={cn(
        'text-base font-extrabold leading-tight tracking-tight text-foreground',
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  const { mode } = React.useContext(ResponsiveDialogContext);
  if (mode === 'desktop') {
    return <DialogDescription className={className} {...props} />;
  }
  if (mode === 'mobile') {
    return <DrawerDescription className={className} {...props} />;
  }
  return (
    <p
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function ResponsiveDialogClose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { mode, onOpenChange } = React.useContext(ResponsiveDialogContext);
  if (mode === 'desktop') {
    return (
      <DialogClose asChild className={className}>
        {children}
      </DialogClose>
    );
  }
  if (mode === 'mobile') {
    return (
      <DrawerClose asChild className={className}>
        {children}
      </DrawerClose>
    );
  }
  return (
    <span className={className} onClick={() => onOpenChange?.(false)}>
      {children}
    </span>
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
};
