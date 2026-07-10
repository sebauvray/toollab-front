<script setup>
import {ref, onMounted, computed, nextTick} from 'vue'
import {useAuth} from '~/composables/useAuth'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import InputText from "~/components/form/InputText.vue"
import InputSelect from "~/components/form/InputSelect.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import CancelButton from "~/components/form/CancelButton.vue"
import {usePageTitle} from "~/composables/usePageTitle.js"
import UserList from "~/components/settings/UserList.vue"
import StudentImport from "~/components/settings/StudentImport.vue"
import RoleCard from "~/components/settings/RoleCard.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue"
import { STAFF_ROLE_CARDS } from "~/utils/staffRoleCards"
import userService from '~/services/user'
import schoolService from '~/services/school'
import staffService from '~/services/staff'
import { getErrorMessage } from '~/utils/errors'
import {
  getSchoolRoles,
  hasAnyRole,
  readActiveSchoolRole,
  SCHOOL_ROLES_UPDATED_EVENT,
  writeCurrentSchoolRoles
} from '~/utils/schoolRoles'

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Paramètres'
  }
})

usePageTitle('Paramètres')

const {setFlashMessage} = useFlashMessage()
const isDirector = ref(false)
const isAdmin = ref(false)
const activeTab = ref('profile')
const isLoading = ref(true)
const message = ref({type: '', text: ''})
const school = ref(null)
const logoFile = ref(null)
const logoPreview = ref('')

const { user, initAuth } = useAuth()

const userForm = ref({
  first_name: '',
  last_name: ''
})

const passwordForm = ref({
  current_password: '',
  password: '',
  password_confirmation: ''
})

const schoolForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  zipcode: '',
  city: '',
  country: '',
  siret: '',
  vat_mode: '',
  vat_number: ''
})

const vatModes = [
  {value: '', label: 'Non renseigné'},
  {value: 'association', label: 'Association exonérée — art. 261, 7-1° du CGI'},
  {value: 'enseignement', label: 'Enseignement exonéré — art. 261, 4-4° du CGI'},
  {value: 'franchise', label: 'Franchise en base — art. 293 B du CGI'},
  {value: 'assujetti', label: 'Assujetti à la TVA (20 %)'}
]

const newUserForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  roles: []
})

const roles = STAFF_ROLE_CARDS

const canManageUsers = computed(() => isDirector.value || isAdmin.value)
const availableRoles = computed(() => {
  if (isDirector.value) return roles
  if (isAdmin.value) return roles.filter(role => ['registar', 'teacher'].includes(role.value))
  return []
})

const toggleNewUserRole = (roleValue) => {
  const selected = newUserForm.value.roles
  if (selected.includes(roleValue)) {
    newUserForm.value.roles = selected.filter(role => role !== roleValue)
  } else {
    // On conserve l'ordre de availableRoles pour un comportement déterministe.
    const order = availableRoles.value.map(role => role.value)
    newUserForm.value.roles = order.filter(role => selected.includes(role) || role === roleValue)
  }
}

const checkUserRoles = async () => {
  try {
    const currentSchoolId = process.client
        ? parseInt(localStorage.getItem('current_school_id') || '0', 10)
        : 0;
    if (!currentSchoolId) {
      return;
    }

    const response = await userService.getUserRoles(user.value.id);
    const userRoles = response.roles;

    const isSuperAdmin = !!user.value?.is_super_admin;
    const currentRoles = getSchoolRoles(userRoles.schools || [], currentSchoolId);
    // On met à jour la liste disponible, puis on raisonne sur le rôle ACTIF seul.
    writeCurrentSchoolRoles(currentRoles);
    if (process.client) {
      window.dispatchEvent(new CustomEvent(SCHOOL_ROLES_UPDATED_EVENT, {
        detail: {schoolId: currentSchoolId, roles: currentRoles}
      }));
    }

    const activeRoles = [readActiveSchoolRole()].filter(Boolean);
    const isDirectorHere = hasAnyRole(activeRoles, ['director']);
    const isAdminHere = hasAnyRole(activeRoles, ['admin']);

    isDirector.value = isDirectorHere || isSuperAdmin;
    isAdmin.value = !isDirector.value && isAdminHere;

    if (isDirectorHere || isSuperAdmin) {
      const schoolResponse = await schoolService.getSchool(currentSchoolId);
      school.value = schoolResponse;
      populateSchoolForm();
    } else if (isAdminHere) {
      const schoolResponse = await schoolService.getSchool(currentSchoolId);
      school.value = schoolResponse;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle:', error);
  } finally {
    isLoading.value = false;
  }
}

const populateUserForm = () => {
  if (user.value) {
    userForm.value.first_name = user.value.first_name || ''
    userForm.value.last_name = user.value.last_name || ''
  }
}

const populateSchoolForm = () => {
  if (school.value) {
    schoolForm.value.name = school.value.name || ''
    schoolForm.value.email = school.value.email || ''
    schoolForm.value.phone = school.value.phone || ''
    schoolForm.value.address = school.value.address || ''
    schoolForm.value.zipcode = school.value.zipcode || ''
    schoolForm.value.city = school.value.city || ''
    schoolForm.value.country = school.value.country || ''
    schoolForm.value.siret = school.value.siret || ''
    schoolForm.value.vat_mode = school.value.vat_mode || ''
    schoolForm.value.vat_number = school.value.vat_number || ''

    if (school.value.logo) {
      logoPreview.value = `${useRuntimeConfig().public.apiUrl}/storage/${school.value.logo}`
    }
  }
}

const handleUpdateUser = async () => {
  try {
    message.value = {type: '', text: ''}

    const response = await userService.updateUser(user.value.id, {
      first_name: userForm.value.first_name,
      last_name: userForm.value.last_name,
      email: user.value.email
    });

    const userData = JSON.parse(localStorage.getItem('auth.user'))
    userData.first_name = userForm.value.first_name
    userData.last_name = userForm.value.last_name
    localStorage.setItem('auth.user', JSON.stringify(userData))

    setFlashMessage({
      type: 'success',
      message: 'Informations mises à jour avec succès'
    })

    user.value = userData

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    message.value = {
      type: 'error',
      text: getErrorMessage(error, 'Une erreur est survenue lors de la mise à jour')
    }
  }
}

const handleUpdatePassword = async () => {
  try {
    message.value = {type: '', text: ''}

    if (passwordForm.value.password !== passwordForm.value.password_confirmation) {
      message.value = {type: 'error', text: 'Les mots de passe ne correspondent pas'}
      return
    }

    await userService.changePassword({
      current_password: passwordForm.value.current_password,
      password: passwordForm.value.password,
      password_confirmation: passwordForm.value.password_confirmation
    });

    setFlashMessage({
      type: 'success',
      message: 'Mot de passe mis à jour avec succès'
    })

    passwordForm.value = {
      current_password: '',
      password: '',
      password_confirmation: ''
    }

  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error)
    message.value = {
      type: 'error',
      text: getErrorMessage(error, 'Une erreur est survenue lors de la mise à jour du mot de passe')
    }
  }
}

const handleUpdateSchool = async () => {
  try {
    message.value = {type: '', text: ''}

    const schoolData = {...schoolForm.value};

    if (logoFile.value) {
      schoolData.logo = logoFile.value;
    }

    const response = await schoolService.updateSchool(school.value.id, schoolData);

    school.value = response;

    if (response.logo) {
      logoPreview.value = `${useRuntimeConfig().public.apiUrl}/storage/${response.logo}`
    }

    setFlashMessage({
      type: 'success',
      message: 'Informations de l\'école mises à jour avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'école:', error)
    message.value = {
      type: 'error',
      text: getErrorMessage(error, 'Une erreur est survenue lors de la mise à jour de l\'école')
    }
  }
}

const userListRef = ref(null)

const handleCreateUser = async () => {
  try {
    message.value = {type: '', text: ''}

    if (!newUserForm.value.email) {
      message.value = {type: 'error', text: 'L\'email est obligatoire'}
      return
    }

    const assignableValues = availableRoles.value.map(role => role.value)
    const selectedRoles = newUserForm.value.roles.filter(role => assignableValues.includes(role))

    if (!selectedRoles.length) {
      message.value = {type: 'error', text: 'Sélectionnez au moins un rôle'}
      return
    }

    if (selectedRoles.length !== newUserForm.value.roles.length) {
      message.value = {type: 'error', text: 'Vous ne pouvez pas attribuer ce rôle'}
      return
    }

    const [firstRole] = selectedRoles

    await staffService.createStaffUser({
      first_name: newUserForm.value.first_name,
      last_name: newUserForm.value.last_name,
      email: newUserForm.value.email,
      role: firstRole,
      roles: selectedRoles,
      school_id: school.value.id
    });

    setFlashMessage({
      type: 'success',
      message: 'L\'utilisateur a été créé avec succès.'
    })

    if (userListRef.value) {
      userListRef.value.refreshUsers()
    }

    newUserForm.value = {
      first_name: '',
      last_name: '',
      email: '',
      roles: []
    }

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    message.value = {
      type: 'error',
      text: getErrorMessage(error, 'Une erreur est survenue lors de la création de l\'utilisateur')
    }
  }
}

// ---- Gestion des rôles d'un utilisateur existant (dans le même panneau) ----
const managingUser = ref(null)
const managePanel = ref(null)
const showRemoveFromSchoolModal = ref(false)

const manageMode = computed(() => !!managingUser.value)
const isManagingSelf = computed(() =>
    manageMode.value && managingUser.value.user.id === user.value?.id)
const panelTitle = computed(() => {
  if (!manageMode.value) return 'Ajouter un utilisateur'
  const u = managingUser.value.user
  if (u.pending || !u.first_name || !u.last_name) return 'Invitation en attente'
  return `Gérer les rôles de ${u.first_name} ${u.last_name}`
})

// On ne peut pas retirer ses propres rôles : les cartes correspondantes sont verrouillées.
const isRoleLockedForManage = (roleValue) =>
    isManagingSelf.value && (managingUser.value?.roles || []).includes(roleValue)

const resetNewUserForm = () => {
  newUserForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    roles: availableRoles.value.length ? [availableRoles.value[0].value] : ['registar']
  }
}

const handleManage = (entry) => {
  message.value = {type: '', text: ''}
  managingUser.value = entry
  const assignableValues = availableRoles.value.map(role => role.value)
  newUserForm.value = {
    first_name: entry.user.first_name || '',
    last_name: entry.user.last_name || '',
    email: entry.user.email || '',
    roles: entry.roles.filter(role => assignableValues.includes(role))
  }
  nextTick(() => managePanel.value?.scrollIntoView({behavior: 'smooth', block: 'start'}))
}

const cancelManage = () => {
  managingUser.value = null
  resetNewUserForm()
  message.value = {type: '', text: ''}
}

const handleUpdateRoles = async () => {
  if (!managingUser.value) return
  try {
    message.value = {type: '', text: ''}
    const userId = managingUser.value.user.id
    const assignableValues = availableRoles.value.map(role => role.value)
    const original = managingUser.value.roles.filter(role => assignableValues.includes(role))
    const selected = newUserForm.value.roles.filter(role => assignableValues.includes(role))

    const toAdd = selected.filter(role => !original.includes(role))
    // On ne retire jamais ses propres rôles.
    const toRemove = isManagingSelf.value ? [] : original.filter(role => !selected.includes(role))

    if (!toAdd.length && !toRemove.length) {
      message.value = {type: 'error', text: 'Aucune modification à enregistrer'}
      return
    }

    for (const role of toRemove) {
      await staffService.removeUserRole({user_id: userId, school_id: school.value.id, role_name: role})
    }
    if (toAdd.length) {
      await staffService.createStaffUser({
        first_name: managingUser.value.user.first_name,
        last_name: managingUser.value.user.last_name,
        email: managingUser.value.user.email,
        role: toAdd[0],
        roles: toAdd,
        school_id: school.value.id
      })
    }

    setFlashMessage({type: 'success', message: 'Les rôles ont été mis à jour.'})
    if (userListRef.value) userListRef.value.refreshUsers()
    await checkUserRoles()
    cancelManage()
  } catch (error) {
    console.error('Erreur lors de la mise à jour des rôles:', error)
    message.value = {type: 'error', text: getErrorMessage(error, 'Une erreur est survenue lors de la mise à jour des rôles')}
  }
}

const handlePrimaryAction = () => manageMode.value ? handleUpdateRoles() : handleCreateUser()

const removeFromSchool = async () => {
  if (!managingUser.value) return
  try {
    await staffService.removeUserFromSchool({user_id: managingUser.value.user.id, school_id: school.value.id})
    setFlashMessage({type: 'success', message: 'L\'utilisateur a été retiré de l\'établissement'})
    if (userListRef.value) userListRef.value.refreshUsers()
    await checkUserRoles()
    cancelManage()
  } catch (error) {
    console.error('Erreur lors du retrait de l\'utilisateur:', error)
    message.value = {type: 'error', text: getErrorMessage(error, 'Une erreur est survenue lors du retrait de l\'utilisateur')}
  } finally {
    showRemoveFromSchoolModal.value = false
  }
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    logoFile.value = file
    logoPreview.value = URL.createObjectURL(file)
  }
}

onMounted(async () => {
    await initAuth()
  populateUserForm()
  await checkUserRoles()
})
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="[{ name: 'Paramètres', path: '/settings' }]" />

    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>

    <div v-else class="font-nunito">
      <div class="flex items-center gap-1 border-b border-[#E6EFF5] mb-5">
        <button
            @click="activeTab = 'profile'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'profile' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Profil</button>
        <button
            @click="activeTab = 'password'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'password' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Mot de passe</button>
        <button
            v-if="isDirector"
            @click="activeTab = 'school'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'school' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Mon établissement</button>
        <button
            v-if="canManageUsers"
            @click="activeTab = 'users'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'users' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Utilisateurs</button>
        <button
            v-if="canManageUsers"
            @click="activeTab = 'import'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'import' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Import élèves</button>
      </div>

      <div
          v-if="message.text"
          :class="['text-xs rounded-lg px-3 py-2 mb-4 ring-1', message.type === 'success' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200']"
      >
        {{ message.text }}
      </div>

      <div v-if="activeTab === 'profile'" class="bg-white rounded-2xl border p-5">
        <h2 class="text-sm font-semibold text-default font-montserrat mb-4">Informations personnelles</h2>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputText v-model="userForm.first_name" placeholder="Prénom" />
          <InputText v-model="userForm.last_name" placeholder="Nom" />
        </div>
        <div class="flex justify-end mt-5">
          <SaveButton @click="handleUpdateUser">Enregistrer</SaveButton>
        </div>
      </div>

      <div v-if="activeTab === 'password'" class="bg-white rounded-2xl border p-5">
        <h2 class="text-sm font-semibold text-default font-montserrat mb-4">Changer de mot de passe</h2>
        <div class="grid grid-cols-1 gap-5 max-w-lg">
          <InputText v-model="passwordForm.current_password" placeholder="Mot de passe actuel" type="password" />
          <InputText v-model="passwordForm.password" placeholder="Nouveau mot de passe" type="password" />
          <InputText v-model="passwordForm.password_confirmation" placeholder="Confirmer le nouveau mot de passe" type="password" />
        </div>
        <div class="flex justify-end mt-5">
          <SaveButton @click="handleUpdatePassword">Mettre à jour</SaveButton>
        </div>
      </div>

      <div v-if="activeTab === 'school' && isDirector" class="bg-white rounded-2xl border p-5">
        <h2 class="text-sm font-semibold text-default font-montserrat mb-4">Informations de l'établissement</h2>

        <div class="flex items-center gap-4 mb-5">
          <div v-if="logoPreview" class="w-20 h-20 rounded-2xl overflow-hidden border border-[#E6EFF5] shrink-0">
            <img :src="logoPreview" alt="Logo de l'école" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center border border-[#E6EFF5] shrink-0 text-[11px] text-placeholder text-center px-1">
            Aucun logo
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wide text-placeholder mb-1.5 font-montserrat">Logo de l'établissement</div>
            <label class="inline-flex items-center cursor-pointer px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <span>{{ logoPreview ? 'Changer le logo' : 'Ajouter un logo' }}</span>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif" class="hidden" @change="handleFileChange" />
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputText v-model="schoolForm.name" placeholder="Nom de l'établissement" />
          <InputText v-model="schoolForm.email" placeholder="Email de l'établissement" type="email" />
          <InputText v-model="schoolForm.phone" placeholder="Téléphone" />
          <div class="md:col-span-2">
            <InputText v-model="schoolForm.address" placeholder="Adresse" />
          </div>
          <InputText v-model="schoolForm.zipcode" placeholder="Code postal" />
          <InputText v-model="schoolForm.city" placeholder="Ville" />
          <InputText v-model="schoolForm.country" placeholder="Pays" />
          <InputText v-model="schoolForm.siret" placeholder="SIRET (ou n° RNA)" />
          <InputSelect v-model="schoolForm.vat_mode" placeholder="Régime TVA" :options="vatModes" />
          <InputText v-if="schoolForm.vat_mode === 'assujetti'" v-model="schoolForm.vat_number" placeholder="N° TVA intracommunautaire" />
          <p class="text-[11px] text-placeholder md:col-span-2">
            Le SIRET et la mention du régime TVA sélectionné apparaissent sur les factures remises aux familles.
            En cas de doute sur le régime applicable, rapprochez-vous de votre expert-comptable.
          </p>
        </div>

        <div class="flex justify-end mt-5">
          <SaveButton @click="handleUpdateSchool">Enregistrer</SaveButton>
        </div>
      </div>

      <div v-if="activeTab === 'import' && canManageUsers && school">
        <StudentImport />
      </div>

      <div v-if="activeTab === 'users' && canManageUsers && school">
        <div class="mb-5">
          <h2 class="text-sm font-semibold text-default font-montserrat mb-3">Rôles disponibles dans l'établissement</h2>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <RoleCard
                v-for="role in availableRoles"
                :key="`legend-${role.value}`"
                :role="role"
                indicator="none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div>
          <h2 class="text-sm font-semibold text-default font-montserrat mb-3">Liste des membres du personnel</h2>
          <UserList
              :school-id="school.id"
              :selected-user-id="managingUser?.user.id"
              ref="userListRef"
              @manage="handleManage"
          />
        </div>

        <div>
          <h2 class="text-sm font-semibold text-default font-montserrat mb-1.5">{{ panelTitle }}</h2>
          <p class="text-xs text-placeholder mb-3 max-w-3xl">
            <template v-if="manageMode">
              Activez ou désactivez les rôles de cet utilisateur, puis validez.
            </template>
            <template v-else>
              Ajoutez un membre du personnel à votre établissement.
              Un email d'invitation sera envoyé à l'utilisateur pour compléter son profil et définir son mot de passe.
            </template>
          </p>

          <div ref="managePanel" class="bg-white rounded-2xl border p-5" :class="manageMode ? 'ring-1 ring-blue-200 border-transparent' : ''">
          <div class="grid grid-cols-1 gap-4" :class="manageMode ? 'md:grid-cols-3' : 'md:grid-cols-1'">
            <InputText v-if="manageMode" v-model="newUserForm.last_name" placeholder="Nom" disabled required />
            <InputText v-if="manageMode" v-model="newUserForm.first_name" placeholder="Prénom" disabled required />
            <InputText v-model="newUserForm.email" placeholder="Email" type="email" :disabled="manageMode" required />
          </div>

          <div class="mt-6">
            <div class="text-[11px] uppercase tracking-wide text-placeholder mb-2.5 font-montserrat">Rôles attribués</div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RoleCard
                  v-for="role in availableRoles"
                  :key="role.value"
                  :role="role"
                  :selected="newUserForm.roles.includes(role.value)"
                  indicator="check"
                  compact
                  :disabled="isRoleLockedForManage(role.value)"
                  @select="toggleNewUserRole(role.value)"
              />
            </div>
          </div>

          <div class="flex items-center mt-5" :class="(manageMode && !isManagingSelf) ? 'justify-between' : 'justify-end'">
            <button
                v-if="manageMode && !isManagingSelf"
                type="button"
                @click="showRemoveFromSchoolModal = true"
                class="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Retirer de l'établissement
            </button>
            <div class="flex items-center gap-x-1.5">
              <CancelButton v-if="manageMode" @click="cancelManage">Annuler</CancelButton>
              <SaveButton @click="handlePrimaryAction">
                {{ manageMode ? 'Valider' : 'Ajouter l\'utilisateur' }}
              </SaveButton>
            </div>
          </div>
          </div>
        </div>
        </div>

        <ConfirmationModal
            :is-open="showRemoveFromSchoolModal"
            title="Retirer de l'établissement"
            message="Retirer cet utilisateur de l'établissement ? Il perdra tous ses rôles ici, mais son compte ne sera pas supprimé."
            confirm-button-text="Retirer"
            @confirm="removeFromSchool"
            @cancel="showRemoveFromSchoolModal = false"
        />
      </div>
    </div>
  </PageContainer>
</template>
