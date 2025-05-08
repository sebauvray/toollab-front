<script setup>
import {ref, onMounted, computed} from 'vue'
import {useAuth} from '~/composables/useAuth'
import InputText from "~/components/form/InputText.vue"
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
  country: ''
})

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
    const response = await userService.getUserRoles(user.value.id);
    const userRoles = response.roles;

    if (userRoles.schools && userRoles.schools.length) {
      const directorRole = userRoles.schools.find(role =>
          role.role.toLowerCase() === 'director' ||
          role.role.toLowerCase() === 'directeur'
      );

      const adminRole = userRoles.schools.find(role =>
          role.role.toLowerCase() === 'admin' ||
          role.role.toLowerCase() === 'administrateur'
      );

      if (directorRole) {
        isDirector.value = true;
        const schoolResponse = await schoolService.getSchool(directorRole.context.id);
        school.value = schoolResponse;
        populateSchoolForm();
      } else if (adminRole) {
        isAdmin.value = true;
        const schoolResponse = await schoolService.getSchool(adminRole.context.id);
        school.value = schoolResponse;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle:', error);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
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
      text:  'Une erreur est survenue lors de la mise à jour de l\'école'
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
  <div class="container mx-auto px-6 py-8">
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else class="bg-white shadow rounded-lg">
      <div class="flex border-b overflow-x-auto">
        <button
            @click="activeTab = 'profile'"
            :class="[
            'px-6 py-3 font-medium text-sm focus:outline-none transition-colors whitespace-nowrap',
            activeTab === 'profile'
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-black'
          ]"
        >
          Profil
        </button>

        <button
            @click="activeTab = 'password'"
            :class="[
            'px-6 py-3 font-medium text-sm focus:outline-none transition-colors whitespace-nowrap',
            activeTab === 'password'
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-black'
          ]"
        >
          Mot de passe
        </button>

        <button
            v-if="isDirector"
            @click="activeTab = 'school'"
            :class="[
            'px-6 py-3 font-medium text-sm focus:outline-none transition-colors whitespace-nowrap',
            activeTab === 'school'
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-black'
          ]"
        >
          Mon établissement
        </button>

        <button
            v-if="isDirector"
            @click="activeTab = 'users'"
            :class="[
            'px-6 py-3 font-medium text-sm focus:outline-none transition-colors whitespace-nowrap',
            activeTab === 'users'
              ? 'border-b-2 border-black text-black font-semibold'
              : 'text-gray-500 hover:text-black'
          ]"
        >
          Utilisateurs
        </button>
      </div>

      <div class="p-6">
        <div
            v-if="message.text"
            :class="[
            'p-4 mb-6 rounded text-white',
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          ]"
        >
          {{ message.text }}
        </div>

        <div v-if="activeTab === 'profile'">
          <h2 class="text-lg font-semibold mb-6">Informations personnelles</h2>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <InputText
                  v-model="userForm.first_name"
                  placeholder="Prénom"
              />
            </div>

            <div>
              <InputText
                  v-model="userForm.last_name"
                  placeholder="Nom"
              />
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <SaveButton @click="handleUpdateUser">
              Enregistrer
            </SaveButton>
          </div>
        </div>

        <div v-if="activeTab === 'password'">
          <h2 class="text-lg font-semibold mb-6">Changer de mot de passe</h2>

          <div class="grid grid-cols-1 gap-6">
            <div>
              <InputText
                  v-model="passwordForm.current_password"
                  placeholder="Mot de passe actuel"
                  type="password"
              />
            </div>

            <div>
              <InputText
                  v-model="passwordForm.password"
                  placeholder="Nouveau mot de passe"
                  type="password"
              />
            </div>

            <div>
              <InputText
                  v-model="passwordForm.password_confirmation"
                  placeholder="Confirmer le nouveau mot de passe"
                  type="password"
              />
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <SaveButton @click="handleUpdatePassword">
              Mettre à jour
            </SaveButton>
          </div>
        </div>

        <div v-if="activeTab === 'school' && isDirector">
          <h2 class="text-lg font-semibold mb-6">Informations de l'établissement</h2>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Logo de l'établissement
            </label>

            <div class="flex items-center space-x-6">
              <div
                  v-if="logoPreview"
                  class="w-24 h-24 rounded-full overflow-hidden border"
              >
                <img
                    :src="logoPreview"
                    alt="Logo de l'école"
                    class="w-full h-full object-cover"
                />
              </div>

              <div
                  v-else
                  class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border"
              >
                <span class="text-gray-400">Aucun logo</span>
              </div>

              <label class="cursor-pointer bg-gray-50 px-4 py-2 border rounded hover:bg-gray-100 transition-colors">
                <span>{{ logoPreview ? 'Changer le logo' : 'Ajouter un logo' }}</span>
                <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleFileChange"
                />
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <InputText
                  v-model="schoolForm.name"
                  placeholder="Nom de l'établissement"
              />
            </div>

            <div>
              <InputText
                  v-model="schoolForm.email"
                  placeholder="Email de l'établissement"
                  type="email"
              />
            </div>

            <div>
              <InputText
                  v-model="schoolForm.phone"
                  placeholder="Téléphone"
              />
            </div>

            <div class="md:col-span-2">
              <InputText
                  v-model="schoolForm.address"
                  placeholder="Adresse"
              />
            </div>

            <div>
              <InputText
                  v-model="schoolForm.zipcode"
                  placeholder="Code postal"
              />
            </div>

            <div>
              <InputText
                  v-model="schoolForm.city"
                  placeholder="Ville"
              />
            </div>

            <div>
              <InputText
                  v-model="schoolForm.country"
                  placeholder="Pays"
              />
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <SaveButton @click="handleUpdateSchool">
              Enregistrer
            </SaveButton>
          </div>
        </div>

        <div v-if="activeTab === 'users' && (isDirector) && school">
          <div class="mb-8">
            <h2 class="text-lg font-semibold mb-6">Liste des membres du personnel</h2>
            <UserList
                :school-id="school.id"
                ref="userListRef"
                @update="checkUserRoles"
            />
          </div>

          <div class="w-full border-t border-gray-200 my-8"></div>

          <h2 class="text-lg font-semibold mb-6">Ajouter un utilisateur</h2>
          <p class="text-sm text-gray-600 mb-6">
            Créez un compte administrateur ou un responsable des inscriptions pour votre établissement.
            Un email d'invitation sera envoyé à l'utilisateur pour définir son mot de passe.
          </p>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-4">

            <InputText
                v-model="newUserForm.last_name"
                placeholder="Nom"
                required
            />

            <InputText
                v-model="newUserForm.first_name"
                placeholder="Prénom"
                required
            />


            <InputText
                v-model="newUserForm.email"
                placeholder="Email"
                type="email"
                required
            />

            <div>
              <div class="relative">
                <select
                    v-model="newUserForm.role"
                    class="w-full px-3 py-3 border border-input-stroke rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default appearance-none bg-white"
                >
                  <option v-for="role in roles" :key="role.value" :value="role.value">
                    {{ role.label }}
                  </option>
                </select>
                <div class="absolute right-4 top-4 mt-1 pointer-events-none">
                  <svg class="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <SaveButton @click="handleCreateUser">
              Ajouter l'utilisateur
            </SaveButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>