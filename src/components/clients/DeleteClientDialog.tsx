import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteClientDialog({ open, onOpenChange, onConfirm, isLoading }: DeleteClientDialogProps) {
  // Prevent scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80"
      style={{
        zIndex: 2147483647, // Max z-index value
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onOpenChange(false);
        }
      }}
    >
      {/* Modal Content */}
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Tem certeza?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente o cliente e
              todos os dados associados.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
