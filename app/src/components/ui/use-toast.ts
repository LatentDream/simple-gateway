import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
    description: string;
    duration?: number;
}

export function useToast() {
    const toast = (options: ToastOptions) => {
        sonnerToast(options.description, {
            duration: options.duration || 2000,
        });
    };

    return { toast };
} 