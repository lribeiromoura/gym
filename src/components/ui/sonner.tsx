'use client';

import * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ theme = 'dark', ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      position="top-center"
      richColors
      closeButton
      duration={3200}
      toastOptions={{
        classNames: {
          toast:
            'rounded-2xl border border-border bg-card text-card-foreground shadow-xl font-semibold text-sm',
          title: 'font-bold text-foreground',
          description: 'text-xs text-muted-foreground',
          actionButton:
            'min-h-11 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground',
          cancelButton:
            'min-h-11 rounded-lg bg-secondary px-3 text-xs font-bold text-secondary-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
