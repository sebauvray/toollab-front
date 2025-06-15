<script setup>
import NotebookTLB from "~/components/Icons/Notebook-TLB.vue";
import ClockTLB from "~/components/Icons/Clock-TLB.vue";
import StudentTLB from "~/components/Icons/Student-TLB.vue";
import { ref, computed, onMounted } from 'vue';
import Valid from "~/components/Icons/Valid.vue";
import { useRouter, useRoute } from '#imports';
import ConfirmationClasseModal from "~/components/modals/ConfirmationClasseModal.vue";
import familyService from "~/services/family.js";
import classeService from "~/services/classe.js";
import studentClassroomService from "~/services/studentClassroom.js";

const router = useRouter();
const route = useRoute();
const isModalOpen = ref(false);
const selectedStudent = ref(null);
const selectedClasses = ref(new Set());
const isLoading = ref(true);
const error = ref(null);
const isSaving = ref(false);

const family = ref(null);
const students = ref([]);
const classes = ref([]);
const studentClasses = ref({});
const studentEnrollments = ref({});

const currentSchoolId = computed(() => {
  return localStorage.getItem('current_school_id') || 1;
});

const fetchFamilyData = async () => {
  try {
    isLoading.value = true;
    const response = await familyService.getFamilyById(route.params.id);

    if (response.status === 'success') {
      family.value = response.data;
      students.value = response.data.students || [];

      if (students.value.length > 0 && !selectedStudent.value) {
        selectedStudent.value = students.value[0];
      }

      students.value.forEach(student => {
        studentClasses.value[student.id] = new Set();
      });
    }
  } catch (err) {
    console.error('Erreur lors de la récupération de la famille:', err);
    error.value = 'Erreur lors du chargement des données de la famille';
  }
};

const fetchClasses = async () => {
  try {
    const response = await classeService.getClasses({
      school_id: currentSchoolId.value,
      available_only: true,
      per_page: 100
    });

    if (response.status === 'success') {
      classes.value = response.data.items;
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des classes:', err);
    error.value = 'Erreur lors du chargement des classes';
  }
};

const fetchEnrollments = async () => {
  try {
    const response = await studentClassroomService.getFamilyEnrollments(route.params.id);

    if (response.status === 'success') {
      studentEnrollments.value = response.data;

      Object.entries(response.data).forEach(([studentId, enrollments]) => {
        if (studentClasses.value[studentId]) {
          enrollments.forEach(enrollment => {
            const classIndex = classes.value.findIndex(c => c.id === enrollment.classroom_id);
            if (classIndex !== -1) {
              studentClasses.value[studentId].add(classIndex);
            }
          });
        }
      });
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des inscriptions:', err);
  }
};

const allStudentsHaveClasses = computed(() => {
  return students.value.every(student =>
      studentClasses.value[student.id] && studentClasses.value[student.id].size > 0
  );
});

const hasClassOfType = (studentId, type) => {
  const studentClassSet = studentClasses.value[studentId];
  if (!studentClassSet) return false;

  return Array.from(studentClassSet).some(classIndex =>
      classes.value[classIndex] && classes.value[classIndex].type === type
  );
};

const isClassSelectable = (index) => {
  if (!selectedStudent.value || !classes.value[index]) return false;

  if (studentClasses.value[selectedStudent.value.id].has(index)) {
    return true;
  }

  const classType = classes.value[index].type;
  return !hasClassOfType(selectedStudent.value.id, classType);
};

const toggleClass = async (index) => {
  if (!selectedStudent.value || !classes.value[index] || isSaving.value) return;

  const classroom = classes.value[index];
  const studentId = selectedStudent.value.id;
  const currentStudentClasses = studentClasses.value[studentId];

  if (!isClassSelectable(index)) return;

  isSaving.value = true;

  try {
    if (currentStudentClasses.has(index)) {
      await studentClassroomService.unenrollStudent(studentId, classroom.id);
      currentStudentClasses.delete(index);

      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: 'Inscription supprimée'
      });
    } else {
      await studentClassroomService.enrollStudent(studentId, classroom.id, route.params.id);
      currentStudentClasses.add(index);

      const { setFlashMessage } = useFlashMessage();
      setFlashMessage({
        type: 'success',
        message: 'Élève inscrit avec succès'
      });
    }

    studentClasses.value = {...studentClasses.value};
  } catch (err) {
    console.error('Erreur lors de la modification de l\'inscription:', err);
    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'error',
      message: err.response?.data?.message || 'Erreur lors de la modification'
    });
  } finally {
    isSaving.value = false;
  }
};

const selectStudent = (student) => {
  selectedStudent.value = student;
};

const hasSelectedClasses = (studentId) => {
  return studentClasses.value[studentId] && studentClasses.value[studentId].size > 0;
};

const handlePaymentNavigation = () => {
  if (allStudentsHaveClasses.value) {
    navigateToPayment();
  } else {
    isModalOpen.value = true;
  }
};

const navigateToPayment = () => {
  router.push({
    name: 'family-id-paiement',
    params: { id: route.params.id }
  });
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleModalSave = () => {
  closeModal();
  navigateToPayment();
};

onMounted(async () => {
  await fetchFamilyData();
  await fetchClasses();
  await fetchEnrollments();
  isLoading.value = false;
});

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Famille - Choix des classes'
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center items-center h-96">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
  </div>

  <div v-else-if="error" class="p-6 bg-red-100 text-red-700 rounded-lg m-10">
    {{ error }}
  </div>

  <div v-else class="grid grid-cols-4 mt-6 px-6 font-montserrat w-full gap-x-4">
    <section class="bg-white col-span-3 rounded-xl border px-6 py-2">
      <h2 class="font-bold text-2xl mb-6">{{ selectedStudent?.first_name }} {{ selectedStudent?.last_name }}</h2>
      <div class="inline-flex items-center gap-x-3">
        <span class="size-3 rounded-full bg-green-tlb"></span>
        <span class="font-semibold text-sm">Classes disponibles ({{ classes.filter(c => c.available_spots > 0).length }})</span>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-6 font-nunito">
        <div v-for="(classe, index) in classes"
             :key="classe.id"
             @click="toggleClass(index)"
             class="flex flex-col rounded-xl select-none bg-gray-50 p-4 transition-all duration-200 relative"
             :class="[
               'border-4',
               {
                 'border-green-600': studentClasses[selectedStudent?.id]?.has(index),
                 'border-transparent': !studentClasses[selectedStudent?.id]?.has(index),
                 'cursor-pointer': isClassSelectable(index) && !isSaving,
                 'opacity-50 cursor-not-allowed': !isClassSelectable(index) || classe.available_spots === 0,
                 'opacity-75': isSaving
               }
             ]">
          <div v-if="isSaving && studentClasses[selectedStudent?.id]?.has(index)"
               class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-xl">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>

          <div class="flex items-center gap-x-5">
            <div class="bg-[#A2A1A8]/5 p-2 rounded-lg">
              <NotebookTLB class="text-yellow-500 size-7"/>
            </div>

            <div class="flex flex-col">
              <div class="font-black uppercase text-black text-lg">{{ classe.level?.name || classe.name }}</div>
              <div class="text-gray-tlb text-base">{{ classe.type }} - Niveau {{ classe.level?.order || 1 }}</div>
            </div>
          </div>

          <div v-if="classe.schedule" class="inline-flex items-center gap-x-2 pl-4 mt-4 font-light text-sm">
            <ClockTLB class="size-4"/>
            <div>{{ classe.schedule.day }}</div>
            <div> - {{ classe.schedule.time }}</div>
          </div>

          <div v-if="classe.schedule?.teacher" class="inline-flex items-center gap-x-2 pl-4 mt-1 font-light text-sm">
            <StudentTLB class="size-4"/>
            <div>{{ classe.schedule.teacher.name }}</div>
          </div>

          <div class="text-red-500 font-black inline-flex items-center justify-center my-3">
            {{ classe.available_spots }} places dispos
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-y-6 w-full sticky top-6 h-fit">
      <div class="bg-white rounded-lg w-full border p-4">
        <h2 class="font-bold text-2xl mb-6">Liste d'élèves</h2>
        <div class="flex flex-col gap-2">
          <div
              v-for="student in students"
              :key="student.id"
              @click="selectStudent(student)"
              class="p-2 border rounded-lg inline-flex items-center justify-between cursor-pointer hover:bg-gray-50"
              :class="selectedStudent?.id === student.id ? 'border-black' : 'border-transparent'"
          >
            <span>{{ student.first_name }} {{ student.last_name }}</span>
            <div class="size-7 flex items-center justify-center">
              <Valid v-if="hasSelectedClasses(student.id)" class="text-green-600"/>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg w-full border p-4 font-nunito h-full flex flex-col justify-between min-h-80">
        <div>
          <h2 class="font-bold text-2xl mb-6 font-montserrat">Récapitulatif</h2>
          <div class="flex flex-col gap-2">
            <template v-for="student in students" :key="student.id">
              <div
                  v-for="classIndex in Array.from(studentClasses[student.id] || [])"
                  :key="`${student.id}-${classIndex}`"
                  class="pb-1.5 border-b border-gray-300 flex justify-between items-center"
              >
                <div>{{ student.first_name }} {{ student.last_name }}</div>
                <div class="text-sm">{{ classes[classIndex]?.type }} - {{ classes[classIndex]?.level?.name || classes[classIndex]?.name }}</div>
              </div>
            </template>
          </div>
        </div>

        <div class="w-full inline-flex items-center justify-center">
          <button
              @click="handlePaymentNavigation"
              class="bg-yellow-tlb text-default py-3 w-full text-center rounded-lg hover:opacity-90 mx-auto font-bold text-lg mt-6"
              :disabled="isSaving"
          >
            Paiement
          </button>
        </div>
      </div>
    </section>

    <ConfirmationClasseModal
        :is-open="isModalOpen"
        @close="closeModal"
        @save="handleModalSave"
    />
  </div>
</template>