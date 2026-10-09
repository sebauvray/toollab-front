import test from 'node:test'
import assert from 'node:assert/strict'
import {
    can,
    clearCurrentSchoolRoles,
    getSchoolRoles,
    groupSchoolRoles,
    isTeacherOnly,
    isTeachingOnlyView,
    readActivePermissions,
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

const schoolRolesWithPermissions = () => getSchoolRoles([
    { role: 'Professeur', role_slug: 'teacher', context: { id: 1 }, permissions: ['teaching.access'] },
    { role: 'Directeur', role_slug: 'director', context: { id: 1 }, permissions: ['cursus.manage', 'roles.manage'] }
], 1)

test('permissions follow the active role, not the union of roles', () => {
    const storage = memoryStorage()
    writeCurrentSchoolRoles(schoolRolesWithPermissions(), storage)

    setActiveSchoolRole('director', storage)
    assert.equal(can('cursus.manage', storage), true)
    assert.equal(can('teaching.access', storage), false)
    assert.equal(isTeachingOnlyView(storage), false)

    setActiveSchoolRole('teacher', storage)
    assert.deepEqual(readActivePermissions(storage), ['teaching.access'])
    assert.equal(can('cursus.manage', storage), false)
    assert.equal(can(['cursus.manage', 'teaching.access'], storage), true)
    assert.equal(isTeachingOnlyView(storage), true)
})

test('writing plain slugs keeps the known permissions', () => {
    const storage = memoryStorage()
    writeCurrentSchoolRoles(schoolRolesWithPermissions(), storage)
    writeCurrentSchoolRoles(['director', 'teacher'], storage)
    setActiveSchoolRole('director', storage)

    assert.equal(can('cursus.manage', storage), true)
})

test('a super-admin can everything', () => {
    const storage = memoryStorage()
    storage.setItem('auth.user', JSON.stringify({ is_super_admin: true }))

    assert.equal(can('statistics.view', storage), true)
})

test('without a permission map, the teacher view falls back on the slug', () => {
    const storage = memoryStorage()
    writeCurrentSchoolRoles(['teacher'], storage)

    assert.equal(isTeachingOnlyView(storage), true)
    assert.equal(can('teaching.access', storage), false)
})

test('clearing roles also clears permissions', () => {
    const storage = memoryStorage()
    writeCurrentSchoolRoles(schoolRolesWithPermissions(), storage)
    setActiveSchoolRole('director', storage)
    clearCurrentSchoolRoles(storage)

    assert.deepEqual(readActivePermissions(storage), [])
})
