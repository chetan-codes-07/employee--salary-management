import assert from 'node:assert/strict'
import test from 'node:test'
import { detailsCanSave, salaryCanSave } from '../src/employee-forms'

test('salary save stays off until the amount is valid and different', () => {
  const current = 74_418_400
  assert.equal(salaryCanSave('744184', current), false)
  assert.equal(salaryCanSave(' 744184 ', current), false)
  assert.equal(salaryCanSave('744184.00', current), false)
  assert.equal(salaryCanSave('744185', current), true)
  assert.equal(salaryCanSave('744,185', current), false)
  assert.equal(salaryCanSave('', current), false)
})

test('details save stays off until a trimmed valid field changes', () => {
  const current = { jobTitle: 'Staff Engineer', email: 'alex@acme.example', level: 'L2' }
  assert.equal(detailsCanSave(current, current), false)
  assert.equal(detailsCanSave({ ...current, jobTitle: 'Staff Engineer ' }, current), false)
  assert.equal(detailsCanSave({ ...current, email: ' alex@acme.example ' }, current), false)
  assert.equal(detailsCanSave({ ...current, jobTitle: 'Principal Engineer' }, current), true)
  assert.equal(detailsCanSave({ ...current, email: 'not-an-email' }, current), false)
  assert.equal(detailsCanSave({ ...current, level: 'L3' }, current), true)
})
