import { useToastContext } from "@/contexts/ToastContext"
import { cn } from "@/lib/utils"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToastContext()

  return (
    <div
      className="fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 md:max-w-[420px]"
      style={{
        top: 'env(safe-area-inset-top, 1rem)',
        right: '0',
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
      }}
    >
      {toasts.map(({ id, title, description, variant, ...props }) => {
        const isDestructive = variant === "destructive"
        const isSuccess = !variant || variant === "default"

        return (
          <div
            key={id}
            className={cn(
              "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all animate-in slide-in-from-top-full",
              isDestructive
                ? "bg-red-50 border-red-200 text-red-900"
                : isSuccess
                ? "bg-white border-[#2db4af]/20 text-gray-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            )}
            {...props}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {isDestructive ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-[#2db4af]" />
              ) : (
                <Info className="h-5 w-5 text-blue-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 grid gap-1">
              {title && (
                <div className="text-sm font-semibold leading-tight">
                  {title}
                </div>
              )}
              {description && (
                <div className="text-sm opacity-80 leading-tight">
                  {description}
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => dismiss(id)}
              className={cn(
                "flex-shrink-0 rounded-md p-1 transition-colors",
                isDestructive
                  ? "text-red-400 hover:text-red-600 hover:bg-red-100"
                  : isSuccess
                  ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  : "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
