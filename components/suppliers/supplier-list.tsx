'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Contract } from '@/lib/types/database'
import { addSupplierNote, deleteSupplierNote } from '@/lib/actions/suppliers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Send,
  ArrowUpDown,
  Search,
} from 'lucide-react'

export interface SupplierNote {
  id: string
  provider: string
  note: string
  created_at: string
}

interface SupplierListProps {
  contracts: Contract[]
  initialNotes: SupplierNote[]
}

type SortOption = 'name_asc' | 'amount_desc' | 'contracts_desc'

export function SupplierList({ contracts, initialNotes }: SupplierListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newNote, setNewNote] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('amount_desc')
  const [search, setSearch] = useState('')

  const notes = initialNotes

  const allSuppliers = Object.values(
    contracts.reduce(
      (acc, c) => {
        if (!acc[c.provider]) {
          acc[c.provider] = { provider: c.provider, contracts: [], totalMonthly: 0 }
        }
        acc[c.provider].contracts.push(c)
        acc[c.provider].totalMonthly += c.monthly_payment || 0
        return acc
      },
      {} as Record<string, { provider: string; contracts: Contract[]; totalMonthly: number }>
    )
  )

  const suppliers = allSuppliers
    .filter((s) => !search || s.provider.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name_asc') return a.provider.localeCompare(b.provider, 'cs')
      if (sort === 'amount_desc') return b.totalMonthly - a.totalMonthly
      if (sort === 'contracts_desc') return b.contracts.length - a.contracts.length
      return 0
    })

  const handleAddNote = async (provider: string) => {
    const text = newNote[provider]?.trim()
    if (!text) return
    setSaving(provider)
    try {
      await addSupplierNote(provider, text)
      setNewNote((prev) => ({ ...prev, [provider]: '' }))
      startTransition(() => {
        router.refresh()
      })
    } catch {
      alert('Chyba pri ukladani poznamky.')
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteSupplierNote(id)
      startTransition(() => {
        router.refresh()
      })
    } catch {
      alert('Chyba pri mazani poznamky.')
    }
  }

  if (allSuppliers.length === 0) {
    return (
      <Card className="text-center py-20">
        <div className="flex flex-col items-center px-4">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Zadni dodavatele</h3>
          <p className="text-muted-foreground text-sm">
            Pridejte smlouvy a dodavatele se zobrazi zde.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dodavatele</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allSuppliers.length} dodavatelu celkem
        </p>
      </div>

      {/* Vyhledavani a razeni */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Hledat dodavatele..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-10 pl-8 pr-4 rounded-lg text-sm border border-input bg-transparent hover:bg-muted focus:outline-none focus:ring-3 focus:ring-ring/50 focus:border-ring appearance-none cursor-pointer"
          >
            <option value="amount_desc">Nejvyssi castka</option>
            <option value="contracts_desc">Nejvice smluv</option>
            <option value="name_asc">Abecedne A-Z</option>
          </select>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center px-4">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Zadny dodavatel nenalezen</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => {
            const isExpanded = expanded === s.provider
            const supplierNotes = notes.filter((n) => n.provider === s.provider)
            const activeContracts = s.contracts.filter(
              (c) => !c.valid_until || new Date(c.valid_until) >= new Date()
            )

            return (
              <Card key={s.provider} className="px-4">
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.provider)}
                  className="w-full flex items-center gap-4 text-left cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{s.provider}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {s.contracts.length}{' '}
                        {s.contracts.length === 1
                          ? 'smlouva'
                          : s.contracts.length < 5
                            ? 'smlouvy'
                            : 'smluv'}
                      </span>
                      {s.totalMonthly > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {s.totalMonthly.toLocaleString('cs-CZ')} Kc/mesic
                        </span>
                      )}
                      {supplierNotes.length > 0 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full dark:bg-teal-900 dark:text-teal-300">
                          {supplierNotes.length}{' '}
                          {supplierNotes.length === 1 ? 'poznamka' : 'poznamky'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeContracts.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium dark:bg-green-900 dark:text-green-300">
                        {activeContracts.length} aktivni
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Smlouvy
                      </h4>
                      <div className="space-y-1">
                        {s.contracts.map((c) => {
                          const isExpired =
                            c.valid_until && new Date(c.valid_until) < new Date()
                          return (
                            <div
                              key={c.id}
                              className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2"
                            >
                              <span className="font-medium">{c.category}</span>
                              <div className="flex items-center gap-3">
                                {c.monthly_payment && (
                                  <span className="text-muted-foreground text-xs">
                                    {c.monthly_payment.toLocaleString('cs-CZ')} Kc/mes
                                  </span>
                                )}
                                {c.valid_until && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      isExpired
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    }`}
                                  >
                                    {isExpired
                                      ? 'Expirovana'
                                      : `do ${new Date(c.valid_until).toLocaleDateString('cs-CZ')}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Poznamky
                      </h4>
                      {supplierNotes.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic mb-2">
                          Zadne poznamky
                        </p>
                      ) : (
                        <div className="space-y-2 mb-2">
                          {supplierNotes.map((n) => (
                            <div
                              key={n.id}
                              className="flex items-start gap-2 bg-muted rounded-lg p-3"
                            >
                              <p className="text-sm flex-1">{n.note}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(n.created_at).toLocaleDateString('cs-CZ')}
                                </span>
                                <button
                                  onClick={() => handleDeleteNote(n.id)}
                                  className="p-1 hover:bg-destructive/10 rounded transition text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newNote[s.provider] || ''}
                          onChange={(e) =>
                            setNewNote((prev) => ({
                              ...prev,
                              [s.provider]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAddNote(s.provider)
                          }
                          placeholder="Pridat poznamku..."
                          className="flex-1 h-9"
                        />
                        <Button
                          onClick={() => handleAddNote(s.provider)}
                          disabled={
                            saving === s.provider || !newNote[s.provider]?.trim()
                          }
                          size="default"
                          className="h-9 px-3"
                        >
                          {saving === s.provider ? (
                            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
