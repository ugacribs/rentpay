import { formatCurrency, formatDate } from '@/lib/utils'

describe('formatCurrency', () => {
  it('should format currency correctly', () => {
    const result = formatCurrency(500000)
    expect(result).toContain('500')
    expect(result).toContain('000')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should handle negative numbers', () => {
    const result = formatCurrency(-50000)
    expect(result).toContain('50')
    expect(result).toContain('000')
  })

  it('should handle large numbers', () => {
    const result = formatCurrency(1500000)
    expect(result).toContain('1')
    expect(result).toContain('500')
    expect(result).toContain('000')
  })
})

describe('formatDate', () => {
  it('should format date from Date object', () => {
    const date = new Date('2026-01-15')
    const formatted = formatDate(date)
    expect(formatted).toContain('January')
    expect(formatted).toContain('2026')
  })

  it('should format date from string', () => {
    const formatted = formatDate('2026-01-15')
    expect(formatted).toContain('January')
    expect(formatted).toContain('2026')
  })
})
