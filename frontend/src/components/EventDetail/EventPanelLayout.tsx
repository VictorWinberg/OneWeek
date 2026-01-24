import type { ReactNode } from 'react';

interface EventPanelLayoutProps {
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  borderColor?: string;
}

export function EventPanelLayout({ onClose, header, children, footer, borderColor }: EventPanelLayoutProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <header
          className="p-4 border-b border-[var(--color-bg-tertiary)]"
          style={borderColor ? { borderLeftColor: borderColor, borderLeftWidth: '4px' } : undefined}
        >
          {header}
        </header>

        {/* Content */}
        {children}

        {/* Footer */}
        {footer}
      </div>
    </>
  );
}

