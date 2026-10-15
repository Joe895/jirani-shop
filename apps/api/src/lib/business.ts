/** Money values are whole Kenyan shillings. Never trust client-side totals. */
export function deliveryFee(subtotal: number, county: string, method: string): number {
  if (method === 'pickup') return 0;
  if (subtotal >= 5000) return 0;
  return county.trim().toLowerCase() === 'nairobi' ? 250 : 450;
}

/** Accept 07/01, +2547/+2541, 2547/2541, or 7/1 prefixes. */
export function normalizeKenyanPhone(input: string): string {
  const sanitized = input.replace(/[\s()-]/g, '');
  const normalized = sanitized.startsWith('+254') ? sanitized.slice(1)
    : sanitized.startsWith('0') ? `254${sanitized.slice(1)}`
    : /^[17]\d{8}$/.test(sanitized) ? `254${sanitized}` : sanitized;
  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new Error('Enter a valid Kenyan mobile number, e.g. 0712 345 678.');
  }
  return normalized;
}

export function makeSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
