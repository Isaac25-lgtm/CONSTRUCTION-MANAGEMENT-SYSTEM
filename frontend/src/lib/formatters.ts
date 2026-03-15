/**
 * Formatting utilities for BuildPro.
 *
 * UGX currency formatting matches the prototype's fmtUGX() function.
 */

/**
 * Format a number as Uganda Shillings.
 * Example: 150000000 → "UGX 150,000,000"
 */
export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}
