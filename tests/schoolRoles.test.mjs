import test from 'node:test'
import assert from 'node:assert/strict'
import {
    clearCurrentSchoolRoles,
    getSchoolRoles,
    groupSchoolRoles,
    isTeacherOnly,
    readActiveSchoolRole,
    readActiveSchoolRoles,
    readCurrentSchoolRoles,
    setActiveSchoolRole,
    writeCurrentSchoolRoles
} from '../utils/schoolRoles.js'

const roles = [
    { role: 'Professeur', role_slug: 'teacher', context: { id: 1 } },
    { role: 'Directeur', role_slug: 'director', context: { id: 1 } },
    { role: 'Responsable des inscriptions', role_slug: 'registar', context: { id: 2 } }
]

const memoryStorage = () => {
    const values = new Map()
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    }
}

test('groups every role by school without depending on API order', () => {
    const directOrder = getSchoolRoles(roles, 1).map(role => role.slug)
    const reverseOrder = getSchoolRoles([...roles].reverse(), 1).map(role => role.slug)

    assert.deepEqual(directOrder, ['director', 'teacher'])
    assert.deepEqual(reverseOrder, directOrder)
    assert.deepEqual(groupSchoolRoles(roles)[2].map(role => role.slug), ['registar'])
})

test('redirects only users whose sole school role is teacher', () => {
    assert.equal(isTeacherOnly(['teacher']), true)
    assert.equal(isTeacherOnly(['director', 'teacher']), false)
    assert.equal(isTeacherOnly(['registar', 'teacher']), false)
    assert.equal(isTeacherOnly(['director']), false)
    assert.equal(isTeacherOnly([]), false)
})

test('writes, reads and clears the current school role list', () => {
    const storage = memoryStorage()

    writeCurrentSchoolRoles(['teacher', 'director'], storage)
    assert.deepEqual(readCurrentSchoolRoles(storage), ['director', 'teacher'])

    clearCurrentSchoolRoles(storage)
    assert.deepEqual(readCurrentSchoolRoles(storage), [])
})

test('reads the legacy single-role cache during transition', () => {
    const storage = memoryStorage()
    storage.setItem('current_school_role', 'Professeur')

    assert.deepEqual(readCurrentSchoolRoles(storage), ['teacher'])
})

test('defaults the active role to the highest priority available role', () => {
    const storage = memoryStorage()

    writeCurrentSchoolRoles(['teacher', 'director'], storage)
    assert.equal(readActiveSchoolRole(storage), 'director')
    assert.deepEqual(readActiveSchoolRoles(storage), ['director'])
})

test('keeps a valid active role across role-list reconciliation', () => {
    const storage = memoryStorage()

    writeCurrentSchoolRoles(['teacher', 'director'], storage)
    setActiveSchoolRole('teacher', storage)
    assert.equal(readActiveSchoolRole(storage), 'teacher')

    // Reconciliation with the same available roles must preserve the active one.
    writeCurrentSchoolRoles(['director', 'teacher'], storage)
    assert.equal(readActiveSchoolRole(storage), 'teacher')
})

test('resets the active role when it is no longer available', () => {
    const storage = memoryStorage()

    writeCurrentSchoolRoles(['teacher', 'director'], storage)
    setActiveSchoolRole('teacher', storage)

    // The school now only exposes the director role.
    writeCurrentSchoolRoles(['director'], storage)
    assert.equal(readActiveSchoolRole(storage), 'director')
})

test('clearing roles also clears the active role', () => {
    const storage = memoryStorage()

    writeCurrentSchoolRoles(['director'], storage)
    setActiveSchoolRole('director', storage)
    clearCurrentSchoolRoles(storage)

    assert.equal(readActiveSchoolRole(storage), '')
    assert.deepEqual(readActiveSchoolRoles(storage), [])
})
