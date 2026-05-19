'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function PaymentPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/business-setup/payment/pay-in-requests') }, [router])
  return null
}
