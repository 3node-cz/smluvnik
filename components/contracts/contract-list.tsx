'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpDown, Download, LayoutGrid, List, FileText, Calendar, RefreshCw, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useApp } from '@/lib/context'
import { deleteContract } from '@/lib/actions/contracts'
import { ContractCard } from '@/components/contracts/contract-card'
import { ContractForm } from '@/components/contracts/contract-form'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import type { Contract } from '@/lib/types/database'
import { CONTRACT_CATEGORIES } from '@/lib/types/database'

interface ContractListProps {
  contracts: Contract[]
  plan: string
  totalCount?: number
}

type SortOption = 'added_desc' | 'added_asc' | 'expiry_asc' | 'expiry_desc' | 'amount_desc' | 'amount_asc' | 'name_asc'
type ExportFormat = 'csv' | 'xls' | 'pdf'
type ViewMode = 'grid' | 'list'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'added_desc', label: 'Nejnovější' },
  { value: 'added_asc', label: 'Nejstarší' },
  { value: 'expiry_asc', label: 'Končí nejdříve' },
  { value: 'expiry_desc', label: 'Končí nejpozději' },
  { value: 'amount_desc', label: 'Nejvyšší částka' },
  { value: 'amount_asc', label: 'Nejnižší částka' },
  { value: 'name_asc', label: 'Abecedně A–Z' },
]

function exportContracts(contracts: Contract[], format: ExportFormat) {
  const headers = ['Poskytovatel', 'Kategorie', 'Platba měsíčně (Kč)', 'Platba ročně (Kč)', 'Platnost do', 'Číslo smlouvy', 'Poznámky']
  const rows = contracts.map(c => [
    c.provider,
    c.category,
    c.monthly_payment ?? '',
    c.monthly_payment ? c.monthly_payment * 12 : '',
    c.valid_until ?? '',
    c.contract_number ?? '',
    c.notes ?? '',
  ])

  if (format === 'csv' || format === 'xls') {
    const sep = format === 'csv' ? ',' : '\t'
    const escape = (val: unknown) => {
      const str = String(val ?? '')
      if (format === 'csv') return `"${str.replace(/"/g, '""')}"`
      return str
    }
    const content = [headers, ...rows].map(row => row.map(escape).join(sep)).join('\n')
    const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel'
    const ext = format === 'csv' ? 'csv' : 'xls'
    const blob = new Blob(['\uFEFF' + content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smluvnik-export.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  if (format === 'pdf') {
    const totalMonthly = contracts.reduce((sum, c) => sum + (c.monthly_payment || 0), 0)
    const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Smluvník – export smluv</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#1a2744;margin:40px}h1{font-size:20px;margin-bottom:4px}p.meta{color:#666;font-size:11px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#1a2744;color:white;padding:8px 10px;text-align:left;font-size:11px}td{padding:7px 10px;border-bottom:1px solid #e5e9f0;font-size:11px}tr:nth-child(even) td{background:#f5f7fa}.total{margin-top:16px;font-weight:bold;font-size:13px}</style></head><body><h1>Smluvník – přehled smluv</h1><p class="meta">Exportováno: ${new Date().toLocaleDateString('cs-CZ')} | Počet smluv: ${contracts.length}</p><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="total">Celkem měsíčně: ${totalMonthly.toLocaleString('cs-CZ')} Kč | Ročně: ${(totalMonthly * 12).toLocaleString('cs-CZ')} Kč</p></body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500) }
  }
}

function ContractRow({ contract, onDelete, onEdit }: { contract: Contract; onDelete: (id: string) => void; onEdit: (contract: Contract) => void }) {
  const catDef = CONTRACT_CATEGORIES.find(c => c.value === contract.category)
  const now = new Date()
  const expiresDate = contract.valid_until ? new Date(contract.valid_until) : null
  const daysLeft = expiresDate ? Math.ceil((expiresDate.getTime() - now.getTime()) / 86400000) : null
  const isExpired = daysLeft !== null && daysLeft < 0
  const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= (contract.notification_days_before || 45)

  const statusColor = isExpired
    ? 'bg-red-100 text-red-700'
    : isExpiring
    ? 'bg-orange-100 text-orange-700'
    : expiresDate
    ? 'bg-green-100 text-green-700'
    : 'bg-navy-100 text-navy-500'

  const statusText = isExpired
    ? 'Vypršela'
    : isExpiring
    ? `Za ${daysLeft} dní`
    : expiresDate
    ? expiresDate.toLocaleDateString('cs-CZ')
    : 'Bez omezení'

  return (
    <tr className="border-b border-navy-100 hover:bg-navy-50 transition group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${catDef?.color || 'bg-navy-100'}`}>
            {catDef?.icon || '📄'}
          </div>
          <div>
            <p className="font-semibold text-navy-900 text-sm">{contract.provider}</p>
            <p className="text-xs text-navy-400">{catDef?.label}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
          {isExpired ? '● Expirovaná' : isExpiring ? '● Končící' : expiresDate ? '● Aktivní' : '● Bez data'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-sm text-navy-600">
          <Calendar className="w-3.5 h-3.5 text-navy-400" />
          {statusText}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-navy-700 font-medium">
          {contract.monthly_payment ? `${contract.monthly_payment.toLocaleString('cs-CZ')} Kč/měs` : '\u2014'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {contract.file_path && (
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              <FileText className="w-3 h-3" /> Dok.
            </span>
          )}
          {contract.auto_renewal && (
            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3" /> Auto
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(contract)} className="text-navy-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onDelete(contract.id)} className="text-navy-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function ContractList({ contracts, plan, totalCount }: ContractListProps) {
  const router = useRouter()
  const { profile, appSettings } = useApp()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('vse')
  const [sort, setSort] = useState<SortOption>('added_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [isPending, startTransition] = useTransition()

  const canExport = plan === 'pro' || plan === 'business'

  const categoriesInUse = ['vse', ...new Set(contracts.map(c => c.category))]

  const filtered = contracts.filter(c => {
    const matchSearch = !search ||
      c.provider.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.notes?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'vse' || c.category === activeCategory
    return matchSearch && matchCategory
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'added_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'added_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'expiry_asc': {
        if (!a.valid_until && !b.valid_until) return 0
        if (!a.valid_until) return 1
        if (!b.valid_until) return -1
        return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime()
      }
      case 'expiry_desc': {
        if (!a.valid_until && !b.valid_until) return 0
        if (!a.valid_until) return 1
        if (!b.valid_until) return -1
        return new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime()
      }
      case 'amount_desc': return (b.monthly_payment || 0) - (a.monthly_payment || 0)
      case 'amount_asc':  return (a.monthly_payment || 0) - (b.monthly_payment || 0)
      case 'name_asc':    return a.provider.localeCompare(b.provider, 'cs')
      default: return 0
    }
  })

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Opravdu chcete smazat tuto smlouvu?')) return
    startTransition(async () => {
      await deleteContract(id)
      router.refresh()
    })
  }

  const handleAddNew = () => {
    setEditingContract(null)
    setShowForm(true)
  }

  const handleFormSaved = () => {
    setShowForm(false)
    setEditingContract(null)
  }

  return (
    <div className="space-y-5">
      {/* Header: title + add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 font-display">Smlouvy</h1>
          <p className="text-navy-500 text-sm mt-1">{totalCount ?? contracts.length} smluv celkem</p>
        </div>
        <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Přidat smlouvu
        </Button>
      </div>

      <DashboardStats contracts={contracts} />

      {/* Search + Export + View toggle */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <Input
            type="text"
            placeholder="Hledat podle poskytovatele, čísla smlouvy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-full border-navy-200 rounded-xl"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 border border-navy-200 rounded-xl overflow-hidden bg-white px-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-navy-800 text-white hover:bg-navy-700' : 'text-navy-500'}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-navy-800 text-white hover:bg-navy-700' : 'text-navy-500'}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Export */}
        {canExport ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="border-navy-200 text-navy-600 hover:bg-navy-50 h-full">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportContracts(sorted, 'csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportContracts(sorted, 'xls')}>Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportContracts(sorted, 'pdf')}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  disabled
                  variant="outline"
                  className="border-navy-200 bg-navy-50 text-navy-300 cursor-not-allowed h-full"
                >
                  <Lock className="w-4 h-4" />
                  Export
                </Button>
              }
            />
            <TooltipContent side="bottom">
              Export je dostupný v plánu Jistota
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Sort + Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SortOption)}
          items={Object.fromEntries(SORT_OPTIONS.map(o => [o.value, o.label]))}
        >
          <SelectTrigger size="sm" className="rounded-full text-xs font-semibold border-navy-200 bg-white text-navy-600 hover:bg-navy-50 gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-navy-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-navy-200" />

        {categoriesInUse.map(cat => {
          const catDef = CONTRACT_CATEGORIES.find(c => c.value === cat)
          return (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full text-xs font-semibold ${
                activeCategory === cat
                  ? 'bg-navy-800 text-white shadow-sm hover:bg-navy-700'
                  : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'
              }`}
            >
              {cat === 'vse' ? 'Vše' : `${catDef?.icon || ''} ${catDef?.label || cat}`}
            </Button>
          )
        })}
      </div>

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-navy-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Žádné smlouvy nenalezeny</p>
          <p className="text-sm mt-1">Zkuste jiný vyhledávací výraz</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map(c => (
            <ContractCard key={c.id} contract={c} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-navy-50 border-b border-navy-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-navy-500 uppercase tracking-wide">Poskytovatel</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-navy-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-navy-500 uppercase tracking-wide">Platnost</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-navy-500 uppercase tracking-wide">Částka</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-navy-500 uppercase tracking-wide">Přílohy</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <ContractRow key={c.id} contract={c} onDelete={handleDelete} onEdit={handleEdit} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contract Form Modal */}
      <ContractForm
        open={showForm}
        onOpenChange={setShowForm}
        initial={editingContract}
        onSaved={handleFormSaved}
      />
    </div>
  )
}
