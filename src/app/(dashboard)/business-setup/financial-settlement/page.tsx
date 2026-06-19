'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function FinancialSettlementPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/business-setup/financial-settlement/expense-type') }, [router])
  return null
}
