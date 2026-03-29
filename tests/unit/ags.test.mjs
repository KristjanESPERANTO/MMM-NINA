import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { normalizeAgs, toDashboardAgs } from '../../src/backend/Ags.ts'

describe('normalizeAgs', () => {
  it('accepts a valid 12-digit ags', () => {
    assert.equal(normalizeAgs('150820440440'), '150820440440')
  })

  it('accepts valid 12-digit ags with surrounding whitespace', () => {
    assert.equal(normalizeAgs(' 150820440440 '), '150820440440')
  })

  it('rejects legacy 8-digit ags', () => {
    assert.equal(normalizeAgs('15082440'), null)
  })

  it('rejects non-numeric ags', () => {
    assert.equal(normalizeAgs('15082A440440'), null)
  })
})

describe('toDashboardAgs', () => {
  it('maps a 12-digit ags to dashboard query form', () => {
    assert.equal(toDashboardAgs('150820440440'), '150820000000')
  })
})
