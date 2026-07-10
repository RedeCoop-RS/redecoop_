import { apiFetch } from '@/lib/api'
import type { ContactForm, TakePartForm } from '@/types'

export const publicService = {
  sendContact(data: ContactForm) {
    return apiFetch<{ message: string }>('/public/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  createRequest(data: TakePartForm) {
    return apiFetch('/request/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  sendBudgetEmail(formData: FormData) {
    return apiFetch('/visitant/send-budget-email', {
      method: 'POST',
      body: formData,
    })
  },
}
