import { describe, expect, it } from 'vitest'
import { canTransitionApplication, canTransitionHiringRequest } from './workflow.js'

describe('application workflow', () => {
  it('allows only the documented forward transitions', () => {
    expect(canTransitionApplication('SUBMITTED', 'UNDER_REVIEW')).toBe(true)
    expect(canTransitionApplication('UNDER_REVIEW', 'APPROVED')).toBe(true)
    expect(canTransitionApplication('UNDER_REVIEW', 'REJECTED')).toBe(true)
    expect(canTransitionApplication('APPROVED', 'IN_TRAINING')).toBe(true)
    expect(canTransitionApplication('IN_TRAINING', 'ASSESSMENT')).toBe(true)
    expect(canTransitionApplication('ASSESSMENT', 'READY_FOR_MATCHING')).toBe(true)
    expect(canTransitionApplication('READY_FOR_MATCHING', 'PLACED')).toBe(true)
  })

  it('rejects skipped, reversed, and terminal transitions', () => {
    expect(canTransitionApplication('SUBMITTED', 'APPROVED')).toBe(false)
    expect(canTransitionApplication('ASSESSMENT', 'IN_TRAINING')).toBe(false)
    expect(canTransitionApplication('REJECTED', 'UNDER_REVIEW')).toBe(false)
    expect(canTransitionApplication('PLACED', 'READY_FOR_MATCHING')).toBe(false)
  })
})

describe('hiring request workflow', () => {
  it('allows only review, open, fill, and close transitions', () => {
    expect(canTransitionHiringRequest('SUBMITTED', 'UNDER_REVIEW')).toBe(true)
    expect(canTransitionHiringRequest('UNDER_REVIEW', 'IN_PROGRESS')).toBe(true)
    expect(canTransitionHiringRequest('UNDER_REVIEW', 'CLOSED')).toBe(true)
    expect(canTransitionHiringRequest('IN_PROGRESS', 'FILLED')).toBe(true)
    expect(canTransitionHiringRequest('IN_PROGRESS', 'CLOSED')).toBe(true)
  })

  it('rejects invalid and terminal transitions', () => {
    expect(canTransitionHiringRequest('SUBMITTED', 'IN_PROGRESS')).toBe(false)
    expect(canTransitionHiringRequest('FILLED', 'IN_PROGRESS')).toBe(false)
    expect(canTransitionHiringRequest('CLOSED', 'UNDER_REVIEW')).toBe(false)
  })
})
