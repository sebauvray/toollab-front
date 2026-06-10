<script setup>
import {ref, onMounted, computed} from 'vue'
import {useAuth} from '~/composables/useAuth'
import InputText from "~/components/form/InputText.vue"
import InputSelect from "~/components/form/InputSelect.vue"
import SaveButton from "~/components/form/SaveButton.vue"
import {usePageTitle} from "~/composables/usePageTitle.js"
import UserList from "~/components/settings/UserList.vue"
import userService from '~/services/user'
import schoolService from '~/services/school'
import staffService from '~/services/staff'

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
  role: 'registar'
})

const roles = [
  {value: 'admin', label: 'Administrateur'},
  {value: 'registar', label: 'Responsable des inscriptions'}
]

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

    const currentSchoolRole = userRoles.schools?.find(
        (r) => r.context?.id === currentSchoolId
    );

    const isSuperAdmin = !!user.value?.is_super_admin;
    const roleName = currentSchoolRole?.role?.toLowerCase();
    const isDirectorHere = roleName === 'director' || roleName === 'directeur';
    const isAdminHere = roleName === 'admin' || roleName === 'administrateur';

    if (isDirectorHere || isSuperAdmin) {
      isDirector.value = true;
      const schoolResponse = await schoolService.getSchool(currentSchoolId);
      school.value = schoolResponse;
      populateSchoolForm();
    } else if (isAdminHere) {
      isAdmin.value = true;
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
      text:  'Une erreur est survenue lors de la mise à jour'
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
      text:  'Une erreur est survenue lors de la mise à jour du mot de passe'
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
      text: error.response?.data?.message || error.response?.data?.error || 'Une erreur est survenue lors de la mise à jour de l\'école'
    }
  }
}

const userListRef = ref(null)

const handleCreateUser = async () => {
  try {
    message.value = {type: '', text: ''}

    if (!newUserForm.value.first_name || !newUserForm.value.last_name || !newUserForm.value.email) {
      message.value = {type: 'error', text: 'Tous les champs sont obligatoires'}
      return
    }

    const response = await staffService.createStaffUser({
      first_name: newUserForm.value.first_name,
      last_name: newUserForm.value.last_name,
      email: newUserForm.value.email,
      role: newUserForm.value.role,
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
      role: 'admin'
    }

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    message.value = {
      type: 'error',
      text:  'Une erreur est survenue lors de la création de l\'utilisateur'
    }
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
  <div class="container mx-auto px-5 py-6 font-nunito">
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>

    <template v-else>
      <h1 class="text-base font-bold text-default font-montserrat mb-4">Paramètres</h1>

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
            v-if="isDirector"
            @click="activeTab = 'users'"
            :class="['px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors whitespace-nowrap font-montserrat', activeTab === 'users' ? 'border-default text-default' : 'border-transparent text-placeholder hover:text-default']"
        >Utilisateurs</button>
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

      <div v-if="activeTab === 'users' && isDirector && school" class="space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-default font-montserrat mb-3">Liste des membres du personnel</h2>
          <UserList :school-id="school.id" ref="userListRef" @update="checkUserRoles" />
        </div>

        <div class="bg-white rounded-2xl border p-5">
          <h2 class="text-sm font-semibold text-default font-montserrat mb-1.5">Ajouter un utilisateur</h2>
          <p class="text-xs text-placeholder mb-4 max-w-3xl">
            Créez un compte administrateur ou un responsable des inscriptions pour votre établissement.
            Un email d'invitation sera envoyé à l'utilisateur pour définir son mot de passe. Pour les professeurs, utilisez l'onglet dédié.
          </p>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
            <InputText v-model="newUserForm.last_name" placeholder="Nom" required />
            <InputText v-model="newUserForm.first_name" placeholder="Prénom" required />
            <InputText v-model="newUserForm.email" placeholder="Email" type="email" required />
            <div class="relative">
              <select
                  v-model="newUserForm.role"
                  class="w-full pl-2 pr-8 py-1.5 text-sm border border-input-stroke rounded-lg bg-white transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default appearance-none"
              >
                <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
              </select>
              <svg class="size-4 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <div class="flex justify-end mt-5">
            <SaveButton @click="handleCreateUser">Ajouter l'utilisateur</SaveButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>