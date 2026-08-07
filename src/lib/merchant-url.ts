export function getMerchantBase(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  if (origin.includes('admin')) return origin.replace('admin', 'merchant')
  return process.env.NEXT_PUBLIC_MERCHANT_URL ?? origin
}
