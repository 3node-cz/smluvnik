export type ContractCategory =
  | 'energie'
  | 'plyn'
  | 'internet'
  | 'tv'
  | 'mobilni_tarif'
  | 'pojisteni_auto'
  | 'pojisteni_domacnost'
  | 'pojisteni_zivot'
  | 'pojisteni_zdravi'
  | 'hypoteka'
  | 'spotrebitelsky_uver'
  | 'leasing'
  | 'najemni'
  | 'prace'
  | 'sluzby'
  | 'dodavatelska'
  | 'nda'
  | 'kupni'
  | 'darovaci'
  | 'ostatni'
  | 'vlastni'

export const CONTRACT_CATEGORIES: { value: ContractCategory; label: string; icon: string; color: string }[] = [
  { value: 'energie', label: 'Elektřina', icon: '⚡', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'plyn', label: 'Plyn', icon: '🔥', color: 'bg-orange-100 text-orange-800' },
  { value: 'internet', label: 'Internet & TV', icon: '📡', color: 'bg-blue-100 text-blue-800' },
  { value: 'tv', label: 'TV/Streaming', icon: '📺', color: 'bg-purple-100 text-purple-800' },
  { value: 'mobilni_tarif', label: 'Mobilní tarif', icon: '📱', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'pojisteni_auto', label: 'Pojištění auta', icon: '🚗', color: 'bg-green-100 text-green-800' },
  { value: 'pojisteni_domacnost', label: 'Pojištění domácnosti', icon: '🏠', color: 'bg-teal-100 text-teal-800' },
  { value: 'pojisteni_zivot', label: 'Životní pojištění', icon: '❤️', color: 'bg-red-100 text-red-800' },
  { value: 'pojisteni_zdravi', label: 'Zdravotní pojištění', icon: '🏥', color: 'bg-pink-100 text-pink-800' },
  { value: 'hypoteka', label: 'Hypotéka', icon: '🏦', color: 'bg-navy-100 text-navy-800' },
  { value: 'spotrebitelsky_uver', label: 'Spotřebitelský úvěr', icon: '💳', color: 'bg-rose-100 text-rose-800' },
  { value: 'leasing', label: 'Leasing', icon: '🔑', color: 'bg-amber-100 text-amber-800' },
  { value: 'najemni', label: 'Nájemní smlouva', icon: '🏡', color: 'bg-lime-100 text-lime-800' },
  { value: 'prace', label: 'Pracovní smlouva', icon: '👔', color: 'bg-slate-100 text-slate-800' },
  { value: 'sluzby', label: 'Smlouva o dílo/službách', icon: '🔧', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'dodavatelska', label: 'Dodavatelská smlouva', icon: '📦', color: 'bg-sky-100 text-sky-800' },
  { value: 'nda', label: 'NDA / Mlčenlivost', icon: '🔒', color: 'bg-gray-100 text-gray-800' },
  { value: 'kupni', label: 'Kupní smlouva', icon: '🛒', color: 'bg-violet-100 text-violet-800' },
  { value: 'darovaci', label: 'Darovací smlouva', icon: '🎁', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'ostatni', label: 'Ostatní', icon: '📄', color: 'bg-navy-100 text-navy-800' },
  { value: 'vlastni', label: 'Vlastní', icon: '✏️', color: 'bg-emerald-100 text-emerald-800' },
]

export interface Contract {
  id: string
  user_id: string
  category: ContractCategory
  custom_category?: string
  provider: string
  contract_number?: string
  monthly_payment?: number
  payment_frequency?: 'monthly' | 'quarterly' | 'yearly'
  unit_price_low?: number
  unit_price_high?: number
  fixed_fee?: number
  valid_from?: string
  valid_until?: string
  notification_days_before: number
  notification_email?: string
  auto_renewal: boolean
  contact_phone?: string
  contact_email?: string
  notes?: string
  file_path?: string
  file_name?: string
  file_size?: number
  file_type?: string
  gemini_extracted?: boolean
  created_at: string
  updated_at: string
}

export type PaymentFrequency = 'monthly' | 'quarterly' | 'yearly'

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'měs',
  quarterly: 'čtvrt',
  yearly: 'rok',
}

export function getPaymentLabel(contract: Pick<Contract, 'monthly_payment' | 'payment_frequency'>): string | null {
  if (!contract.monthly_payment) return null
  const freq = contract.payment_frequency || 'monthly'
  return `${contract.monthly_payment.toLocaleString('cs-CZ')} Kč/${FREQUENCY_LABELS[freq]}`
}

export function toMonthlyPayment(contract: Pick<Contract, 'monthly_payment' | 'payment_frequency'>): number {
  if (!contract.monthly_payment) return 0
  switch (contract.payment_frequency) {
    case 'quarterly': return contract.monthly_payment / 3
    case 'yearly': return contract.monthly_payment / 12
    default: return contract.monthly_payment
  }
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  notification_email: string
  default_notification_days: number
  role: string
  plan: string
  ai_until?: string | null
  addon_ai?: boolean
  addon_storage_contracts?: boolean
  subscription_type?: string | null
  subscription_expires_at?: string | null
  custom_contract_limit?: number | null
  custom_storage_mb?: number | null
  created_at: string
}
