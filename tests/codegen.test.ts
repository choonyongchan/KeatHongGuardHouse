import { describe, it, expect } from 'vitest'
import { generateCode, WORD_LIST } from '../src/utils/codegen.js'

describe('generateCode', () => {
  it('matches pattern — single uppercase word, no digits or hyphens', () => {
    expect(generateCode()).toMatch(/^[A-Z]+$/)
  })
  it('returns a word from WORD_LIST', () => {
    expect(WORD_LIST).toContain(generateCode())
  })
  it('generates different codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 50 }, generateCode))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('WORD_LIST', () => {
  it('has exactly 150 entries', () => expect(WORD_LIST).toHaveLength(150))
  it('has no duplicates', () => expect(new Set(WORD_LIST).size).toBe(150))
  it('all entries are uppercase', () => {
    WORD_LIST.forEach(w => expect(w).toBe(w.toUpperCase()))
  })
  it('all entries are letters only (no digits or hyphens)', () => {
    WORD_LIST.forEach(w => expect(w).toMatch(/^[A-Z]+$/))
  })
})
