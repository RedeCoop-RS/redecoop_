import toast, { type ToastOptions } from 'react-hot-toast'

const baseOptions: ToastOptions = {
  duration: 4200,
}

export const notify = {
  success(message: string, options?: ToastOptions) {
    return toast.success(message, { ...baseOptions, ...options })
  },

  error(message: string, options?: ToastOptions) {
    return toast.error(message, { ...baseOptions, duration: 5000, ...options })
  },

  loading(message: string, options?: ToastOptions) {
    return toast.loading(message, { ...options })
  },

  dismiss(id?: string) {
    toast.dismiss(id)
  },
}

export { toast }
