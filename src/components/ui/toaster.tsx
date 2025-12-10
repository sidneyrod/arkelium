import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Auto-detect success toasts by title content
        const isSuccess = !variant && title && typeof title === 'string' && 
          (title.toLowerCase().includes('success') || title.toLowerCase().includes('sucesso'));
        const toastVariant = variant || (isSuccess ? 'success' : 'default');
        
        return (
          <Toast key={id} variant={toastVariant as any} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
