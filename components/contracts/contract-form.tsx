'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Sparkles, Loader, AlertCircle, FileText, File, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { addContract, updateContract } from '@/lib/actions/contracts'
import { useApp } from '@/lib/context'
import type { Contract, ContractCategory } from '@/lib/types/database'
import { CONTRACT_CATEGORIES } from '@/lib/types/database'

interface ContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Contract | null
  onSaved: () => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const STORAGE_LIMIT_FREE = 15 * 1024 * 1024 // 15 MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ContractForm({ open, onOpenChange, initial, onSaved }: ContractFormProps) {
  const router = useRouter()
  const { profile, appSettings } = useApp()
  const plan = profile.plan || 'free'
  const aiUntil = profile.ai_until
  const freeContractLimit = appSettings.free_contracts_limit ? parseInt(appSettings.free_contracts_limit) : 5

  const [loading, setLoading] = useState(false)
  const [geminiLoading, setGeminiLoading] = useState(false)
  const [geminiError, setGeminiError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<Partial<Contract>>({
    category: initial?.category || 'ostatni',
    custom_category: initial?.custom_category || '',
    provider: initial?.provider || '',
    contract_number: initial?.contract_number || '',
    monthly_payment: initial?.monthly_payment,
    unit_price_low: initial?.unit_price_low,
    unit_price_high: initial?.unit_price_high,
    fixed_fee: initial?.fixed_fee,
    valid_from: initial?.valid_from || '',
    valid_until: initial?.valid_until || '',
    notification_days_before: initial?.notification_days_before ?? 45,
    notification_email: initial?.notification_email || '',
    auto_renewal: initial?.auto_renewal ?? false,
    contact_phone: initial?.contact_phone || '',
    contact_email: initial?.contact_email || '',
    notes: initial?.notes || '',
  })

  const update = (key: keyof Contract, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const aiActive = plan !== 'free' || (!!aiUntil && new Date(aiUntil) > new Date())
  const isFreePlan = plan === 'free'

  // Storage calculation for free plan
  const totalStorageUsed = 0 // Will be passed differently if needed
  const usedWithoutCurrent = totalStorageUsed - (initial?.file_size || 0)
  const remainingStorage = STORAGE_LIMIT_FREE - usedWithoutCurrent
  const storagePercent = Math.min(100, Math.round((usedWithoutCurrent / STORAGE_LIMIT_FREE) * 100))

  const handleFileSelected = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Nepodporovaný formát. Povoleny jsou: PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX')
      return
    }
    if (isFreePlan && file.size > remainingStorage) {
      alert(`Nedostatek místa v úložišti. Zbývá vám ${formatFileSize(Math.max(0, remainingStorage))} z 15 MB.`)
      return
    }
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file))
    } else {
      setFilePreview(null)
    }
  }

  const handleGeminiExtract = async () => {
    if (!selectedFile) return
    setGeminiLoading(true)
    setGeminiError('')
    try {
      const supabase = createClient()
      const base64 = await fileToBase64(selectedFile)
      const mimeType = selectedFile.type || 'application/pdf'
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType, userId: session?.user?.id })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Chyba serveru')
      }
      const extracted: Partial<Contract> = await response.json()
      setFormData(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(extracted).filter(([, v]) => v !== null && v !== undefined && v !== '')),
        category: prev.category === 'vlastni' ? 'vlastni' : (extracted.category ?? prev.category),
        custom_category: prev.category === 'vlastni' ? prev.custom_category : prev.custom_category,
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chyba při zpracování dokumentu'
      setGeminiError('Chyba: ' + msg)
    } finally {
      setGeminiLoading(false)
    }
  }

  const uploadFile = async (userId: string): Promise<{ path: string; name: string; size: number; type: string } | null> => {
    if (!selectedFile) return null
    const supabase = createClient()
    const ext = selectedFile.name.split('.').pop()
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('contracts').upload(path, selectedFile, {
      contentType: selectedFile.type,
      upsert: false,
    })
    if (error) throw error
    return { path, name: selectedFile.name, size: selectedFile.size, type: selectedFile.type }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.provider?.trim()) return
    if (formData.category === 'vlastni' && !formData.custom_category?.trim()) {
      alert('Vyplňte název vlastní kategorie.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      let fileData: Record<string, unknown> = {}
      if (selectedFile) {
        const uploaded = await uploadFile(userId)
        if (uploaded) {
          fileData = {
            file_path: uploaded.path,
            file_name: uploaded.name,
            file_size: uploaded.size,
            file_type: uploaded.type,
          }
        }
      }

      const cleanData = (obj: Record<string, unknown>) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]))
      const contractData = cleanData({
        ...formData,
        ...fileData,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        gemini_extracted: !!(fileData as { file_path?: string }).file_path,
      }) as Partial<Contract>

      if (initial) {
        await updateContract(initial.id, contractData)
      } else {
        await addContract(contractData)
      }

      router.refresh()
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert('Chyba při ukládání smlouvy. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  const isVlastni = formData.category === 'vlastni'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col p-0" showCloseButton={false}>
        <DialogHeader className="px-6 py-5 border-b border-navy-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-navy-900">
              {initial ? 'Upravit smlouvu' : 'Přidat smlouvu'}
            </DialogTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5 text-navy-600" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Document upload section */}
          <div className="bg-navy-50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Dokument (volitelné)
              </h3>
              {isFreePlan && (
                <span className={`text-xs font-medium ${storagePercent >= 90 ? 'text-orange-500' : 'text-navy-400'}`}>
                  {formatFileSize(usedWithoutCurrent)} / 15 MB
                </span>
              )}
            </div>

            {isFreePlan && (
              <div className="w-full bg-navy-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${storagePercent >= 90 ? 'bg-orange-500' : 'bg-teal-500'}`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            )}

            {!selectedFile ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed border-navy-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all text-navy-500 hover:text-teal-700"
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-xs font-medium">Nahrát soubor</span>
                  <span className="text-xs text-navy-400">PDF, JPG, PNG, DOC</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed border-navy-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all text-navy-500 hover:text-teal-700"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-medium">Vyfotit</span>
                  <span className="text-xs text-navy-400">Fotoaparát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-navy-200">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-12 bg-navy-100 rounded-lg flex items-center justify-center">
                    <File className="w-6 h-6 text-navy-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-navy-400">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedFile(null); setFilePreview(null) }} className="text-navy-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />

            {selectedFile && (
              <div>
                {!aiActive ? (
                  <div className="flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-xl p-3 text-xs text-navy-500">
                    <span>Automatické čtení AI je dostupné v Pro plánu</span>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={handleGeminiExtract}
                      disabled={geminiLoading}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {geminiLoading ? (
                        <><Loader className="w-4 h-4 animate-spin" /> Analyzuji dokument...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Automaticky vyplnit pomocí AI</>
                      )}
                    </Button>
                    {isVlastni && (
                      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                        Vlastní kategorie bude zachována — AI ji nepřepíše.
                      </p>
                    )}
                    {geminiError && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {geminiError}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form fields */}
          <form id="contract-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="mb-1.5">Kategorie *</Label>
                <select
                  value={formData.category}
                  onChange={e => update('category', e.target.value as ContractCategory)}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  required
                >
                  {CONTRACT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
                {isVlastni && (
                  <Input
                    type="text"
                    value={formData.custom_category || ''}
                    onChange={e => update('custom_category', e.target.value)}
                    className="mt-2"
                    placeholder="Název vaší kategorie..."
                    maxLength={50}
                    required
                  />
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="mb-1.5">Poskytovatel *</Label>
                <Input type="text" value={formData.provider || ''} onChange={e => update('provider', e.target.value)} placeholder="ČEZ, O2, Allianz..." required />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Číslo smlouvy</Label>
              <Input type="text" value={formData.contract_number || ''} onChange={e => update('contract_number', e.target.value)} placeholder="1234567890" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5">Platnost od</Label>
                <Input type="date" value={formData.valid_from || ''} onChange={e => update('valid_from', e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Platnost do</Label>
                <Input type="date" value={formData.valid_until || ''} onChange={e => update('valid_until', e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Měsíční platba (Kč)</Label>
              <Input type="number" step="0.01" value={formData.monthly_payment || ''} onChange={e => update('monthly_payment', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="1500" />
            </div>

            {(formData.category === 'energie' || formData.category === 'plyn') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5">Cena za kWh s DPH (Kč)</Label>
                  <Input type="number" step="0.0001" value={formData.unit_price_low || ''} onChange={e => update('unit_price_low', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="3.20" />
                </div>
                <div>
                  <Label className="mb-1.5">Stálý plat s DPH (Kč/měsíc)</Label>
                  <Input type="number" step="0.01" value={formData.fixed_fee || ''} onChange={e => update('fixed_fee', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="150" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5">Kontaktní telefon</Label>
                <Input type="tel" value={formData.contact_phone || ''} onChange={e => update('contact_phone', e.target.value)} placeholder="+420 800 123 456" />
              </div>
              <div>
                <Label className="mb-1.5">Kontaktní email</Label>
                <Input type="email" value={formData.contact_email || ''} onChange={e => update('contact_email', e.target.value)} placeholder="info@firma.cz" />
              </div>
            </div>

            <div className="border border-navy-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-navy-700">Upozornění na expiraci</h3>
              <div>
                <Label className="mb-1.5">Upozornit před vypršením (dny)</Label>
                <Input type="number" value={formData.notification_days_before} onChange={e => update('notification_days_before', parseInt(e.target.value) || 45)} min={1} max={365} />
              </div>
              <div>
                <Label className="mb-1.5">Email pro upozornění</Label>
                <Input type="email" value={formData.notification_email || ''} onChange={e => update('notification_email', e.target.value)} placeholder="vas@email.cz" />
                <p className="text-xs text-navy-400 mt-1">Upozornění bude odesláno na tento email (výchozí: váš přihlašovací email)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.auto_renewal ?? false}
                onCheckedChange={(checked: boolean) => update('auto_renewal', checked)}
              />
              <Label className="cursor-pointer" onClick={() => update('auto_renewal', !formData.auto_renewal)}>
                Automatické prodloužení
              </Label>
            </div>

            <div>
              <Label className="mb-1.5">Poznámky</Label>
              <textarea
                value={formData.notes || ''}
                onChange={e => update('notes', e.target.value)}
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                rows={3}
                placeholder="Další důležité informace..."
              />
            </div>
          </form>
        </div>

        <DialogFooter className="px-6 py-5">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            Zrušit
          </Button>
          <Button type="submit" form="contract-form" disabled={loading} className="flex-1 sm:flex-none bg-navy-900 hover:bg-navy-800 text-white">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ukládám...</>
            ) : (
              initial ? 'Uložit změny' : 'Přidat smlouvu'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
