'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit2, FileText, Phone, Mail, Calendar, RefreshCw, ChevronDown, ChevronUp, Download, Eye, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { deleteDocument } from '@/lib/actions/documents'
import type { Contract } from '@/lib/types/database'
import { CONTRACT_CATEGORIES, getPaymentLabel } from '@/lib/types/database'

interface ContractDocument {
  id: string
  file_path: string
  file_name: string
  file_size: number
  created_at: string
}

interface ContractCardProps {
  contract: Contract
  onEdit: (contract: Contract) => void
  onDelete: (id: string) => void
}

export function ContractCard({ contract, onEdit, onDelete }: ContractCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [documents, setDocuments] = useState<ContractDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const catDef = CONTRACT_CATEGORIES.find(c => c.value === contract.category)
  const now = new Date()
  const expiresDate = contract.valid_until ? new Date(contract.valid_until) : null
  const daysLeft = expiresDate ? Math.ceil((expiresDate.getTime() - now.getTime()) / 86400000) : null
  const isExpired = daysLeft !== null && daysLeft < 0
  const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= (contract.notification_days_before || 45)

  const statusColor = isExpired
    ? 'bg-red-100 text-red-700 border-red-200'
    : isExpiring
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : expiresDate
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-navy-100 text-navy-500 border-navy-200'

  const statusText = isExpired
    ? `Vypršela před ${Math.abs(daysLeft!)} dny`
    : isExpiring
    ? `Vyprší za ${daysLeft} dní`
    : expiresDate
    ? `Platná do ${expiresDate.toLocaleDateString('cs-CZ')}`
    : 'Bez omezení'

  const statusLabel = isExpired ? '● Expirovaná' : isExpiring ? '● Končící' : expiresDate ? '● Aktivní' : '● Bez data'

  const loadDocuments = async () => {
    setDocsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('user_id', user?.id ?? '')
      .order('created_at', { ascending: false })

    const additionalDocs = data || []

    if (contract.file_path && contract.file_name) {
      const originalDoc: ContractDocument = {
        id: 'original',
        file_path: contract.file_path,
        file_name: contract.file_name,
        file_size: contract.file_size || 0,
        created_at: contract.created_at,
      }
      setDocuments([...additionalDocs, originalDoc])
    } else {
      setDocuments(additionalDocs)
    }
    setDocsLoading(false)
  }

  useEffect(() => {
    if (expanded) loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const handleViewDocument = async (filePath: string) => {
    // Open window synchronously to avoid mobile popup blockers
    const newWindow = window.open('', '_blank')
    const supabase = createClient()
    const { data } = await supabase.storage.from('contracts').createSignedUrl(filePath, 3600)
    if (data?.signedUrl) {
      if (newWindow) {
        newWindow.location.href = data.signedUrl
      } else {
        // Fallback if popup was still blocked
        window.location.href = data.signedUrl
      }
    } else {
      newWindow?.close()
    }
  }

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    const supabase = createClient()
    const { data } = await supabase.storage.from('contracts').createSignedUrl(filePath, 3600, { download: fileName })
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    }
  }

  const handleDeleteDocument = (docId: string) => {
    if (docId === 'original') return
    setDeleteDocId(docId)
  }

  const confirmDeleteDocument = async () => {
    if (!deleteDocId) return
    await deleteDocument(deleteDocId)
    setDocuments(prev => prev.filter(d => d.id !== deleteDocId))
    setDeleteDocId(null)
    router.refresh()
  }

  const handleUploadDocument = async (file: File) => {
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      if (!userId) return
      const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx']
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error('Nepodporovaný formát. Povoleny jsou: PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX')
        setUploading(false)
        return
      }
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('contracts').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw uploadError
      const { data, error: dbError } = await supabase.from('contract_documents').insert({
        contract_id: contract.id,
        user_id: userId,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
      }).select().single()
      if (dbError) throw dbError
      setDocuments(prev => {
        const original = prev.find(d => d.id === 'original')
        const rest = prev.filter(d => d.id !== 'original')
        return original ? [data, ...rest, original] : [data, ...rest]
      })
      router.refresh()
    } catch (err) {
      toast.error('Chyba při nahrávání dokumentu.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
    <Card className={`rounded-2xl p-5 hover:shadow-md transition-all duration-200 ${isExpired ? 'ring-red-200' : isExpiring ? 'ring-orange-200' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${catDef?.color || 'bg-navy-100'}`}>
          {catDef?.icon || '📄'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-navy-900 truncate">{contract.provider}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-navy-500">{catDef?.label}</p>
                <Badge variant="secondary" className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(contract)} className="text-navy-500 hover:text-navy-800">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(contract.id)} className="text-navy-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className={`border ${statusColor}`}>
              <Calendar className="w-3 h-3 mr-1" />
              {statusText}
            </Badge>
            {contract.monthly_payment && (
              <Badge variant="secondary" className="bg-navy-100 text-navy-700">
                {getPaymentLabel(contract)}
              </Badge>
            )}
            {contract.auto_renewal && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <RefreshCw className="w-3 h-3 mr-1" />
                Auto-prodloužení
              </Badge>
            )}
            {contract.file_path && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <FileText className="w-3 h-3 mr-1" />
                Dokument
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-700 mt-4 px-2">
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Méně' : 'Více detailů'}
      </Button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-navy-100 space-y-3">
          {contract.contract_number && (
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <FileText className="w-4 h-4 text-navy-400" />
              Č. smlouvy: <span className="font-medium">{contract.contract_number}</span>
            </div>
          )}
          {contract.valid_from && (
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <Calendar className="w-4 h-4 text-navy-400" />
              Od: <span className="font-medium">{new Date(contract.valid_from).toLocaleDateString('cs-CZ')}</span>
            </div>
          )}
          {contract.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <Phone className="w-4 h-4 text-navy-400" />
              <a href={`tel:${contract.contact_phone}`} className="hover:underline">{contract.contact_phone}</a>
            </div>
          )}
          {contract.contact_email && (
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <Mail className="w-4 h-4 text-navy-400" />
              <a href={`mailto:${contract.contact_email}`} className="hover:underline">{contract.contact_email}</a>
            </div>
          )}
          {contract.notes && (
            <p className="text-sm text-navy-600 bg-navy-50 p-3 rounded-lg">{contract.notes}</p>
          )}

          {/* Sekce dokumentu */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Dokumenty</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium px-2"
              >
                {uploading ? (
                  <span className="w-3 h-3 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {uploading ? 'Nahrávám...' : 'Přidat dokument'}
              </Button>
              <input
                ref={uploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                onChange={e => e.target.files?.[0] && handleUploadDocument(e.target.files[0])}
              />
            </div>

            {docsLoading ? (
              <p className="text-xs text-navy-400">Načítám...</p>
            ) : documents.length === 0 ? (
              <p className="text-xs text-navy-400 italic">Žádné dokumenty</p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 bg-navy-50 rounded-lg p-2">
                    <FileText className="w-4 h-4 text-navy-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-navy-800 truncate">{doc.file_name}</p>
                      <p className="text-xs text-navy-400">
                        {formatSize(doc.file_size)}{doc.file_size ? ' · ' : ''}{new Date(doc.created_at).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleViewDocument(doc.file_path)} className="text-navy-400 hover:text-navy-700">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)} className="text-navy-400 hover:text-navy-700">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {doc.id !== 'original' && (
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteDocument(doc.id)} className="text-navy-400 hover:text-red-500 hover:bg-red-50">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>

    <AlertDialog open={!!deleteDocId} onOpenChange={(isOpen) => { if (!isOpen) setDeleteDocId(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat dokument?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato akce je nevratná. Dokument bude trvale smazán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteDocument} className="bg-red-600 hover:bg-red-700 text-white">
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
