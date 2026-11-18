export function isUserRejection(error: unknown): boolean {
  const e = error as { code?: number; name?: string; message?: string } | undefined
  const message = (e?.message ?? '').toLowerCase()
  return e?.code === 4001 || e?.name === 'UserRejectedRequestError' || message.includes('user rejected') || message.includes('user denied')
}

export function parseOnchainError(error: unknown): string {
  const message = ((error as { shortMessage?: string; message?: string } | undefined)?.shortMessage
    ?? (error as { message?: string } | undefined)?.message
    ?? '').toLowerCase()

  if (isUserRejection(error)) return 'Transaction cancelled.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient balance. Add test USDC and try again.'
  }
  if (message.includes('reverted')) {
    const reason = /reason:\s*([^\n]+)/i.exec((error as { message?: string }).message ?? '')
    return reason ? `Transaction failed: ${reason[1]}` : 'Transaction failed. Please try again.'
  }
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return 'Network issue. Check your connection and retry.'
  }
  return 'Something went wrong. Please try again.'
}
