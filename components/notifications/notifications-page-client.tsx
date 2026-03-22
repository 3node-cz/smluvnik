'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationList } from './notification-list'
import { ContractForm } from '@/components/contracts/contract-form'
import type { Contract } from '@/lib/types/database'

interface NotificationsPageClientProps {
  contracts: Contract[]
}

export function NotificationsPageClient({ contracts }: NotificationsPageClientProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)

  const handleContractClick = (contract: Contract) => {
    setEditingContract(contract)
    setShowForm(true)
  }

  const handleFormSaved = () => {
    setShowForm(false)
    setEditingContract(null)
    router.refresh()
  }

  return (
    <>
      <NotificationList contracts={contracts} onContractClick={handleContractClick} />
      <ContractForm
        open={showForm}
        onOpenChange={setShowForm}
        initial={editingContract}
        onSaved={handleFormSaved}
      />
    </>
  )
}
