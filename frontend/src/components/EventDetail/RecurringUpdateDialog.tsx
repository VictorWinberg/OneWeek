import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';

export type RecurringUpdateMode = 'this' | 'all' | 'future';

interface RecurringUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: RecurringUpdateMode) => void;
  isLoading?: boolean;
}

export function RecurringUpdateDialog({ isOpen, onClose, onConfirm, isLoading = false }: RecurringUpdateDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full bg-[var(--color-bg-secondary)] rounded-lg shadow-2xl border border-[var(--color-bg-tertiary)]">
          <div className="p-6 pb-4">
            <DialogTitle className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
              <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Ändra återkommande händelse
            </DialogTitle>
            <Description className="mt-3 text-[var(--color-text-secondary)]">
              Detta är en återkommande händelse. Vill du ändra endast denna händelse eller alla i serien?
            </Description>
          </div>

          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={() => onConfirm('this')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-medium">Endast denna händelse</div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Ändringarna påverkar endast denna förekomst
              </div>
            </button>

            <button
              onClick={() => onConfirm('all')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-medium">Alla händelser</div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Ändringarna påverkar alla förekomster i serien
              </div>
            </button>

            <button
              onClick={() => onConfirm('future')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-medium">Denna och framtida händelser</div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Ändringarna påverkar denna och alla framtida förekomster
              </div>
            </button>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full mt-4 py-2 px-4 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors disabled:opacity-50"
            >
              Avbryt
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
