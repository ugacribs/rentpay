import { validateMTNPhoneNumber, formatMTNPhoneNumber } from '@/lib/payments/mtn'

describe('MTN Phone Number Validation', () => {
  describe('validateMTNPhoneNumber', () => {
    it('should validate correct MTN numbers', () => {
      expect(validateMTNPhoneNumber('256771234567')).toBe(true)
      expect(validateMTNPhoneNumber('256781234567')).toBe(true)
      expect(validateMTNPhoneNumber('256761234567')).toBe(true)
    })

    it('should reject non-MTN prefixes', () => {
      expect(validateMTNPhoneNumber('256701234567')).toBe(false) // Airtel
      expect(validateMTNPhoneNumber('256751234567')).toBe(false) // Airtel
    })

    it('should reject invalid lengths', () => {
      expect(validateMTNPhoneNumber('25677123456')).toBe(false) // Too short
      expect(validateMTNPhoneNumber('2567712345678')).toBe(false) // Too long
    })

    it('should reject numbers without country code', () => {
      expect(validateMTNPhoneNumber('0771234567')).toBe(false)
    })
  })

  describe('formatMTNPhoneNumber', () => {
    it('should format number starting with 0', () => {
      expect(formatMTNPhoneNumber('0771234567')).toBe('256771234567')
    })

    it('should keep correctly formatted number', () => {
      expect(formatMTNPhoneNumber('256771234567')).toBe('256771234567')
    })

    it('should format number with +', () => {
      expect(formatMTNPhoneNumber('+256771234567')).toBe('256771234567')
    })

    it('should add 256 if missing', () => {
      expect(formatMTNPhoneNumber('771234567')).toBe('256771234567')
    })

    it('should handle numbers with spaces', () => {
      expect(formatMTNPhoneNumber('077 123 4567')).toBe('256771234567')
    })
  })
})
