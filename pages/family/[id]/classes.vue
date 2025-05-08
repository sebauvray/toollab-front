<script setup>
import NotebookTLB from "~/components/Icons/Notebook-TLB.vue";
import ClockTLB from "~/components/Icons/Clock-TLB.vue";
import StudentTLB from "~/components/Icons/Student-TLB.vue";
import { ref, computed } from 'vue';
import Valid from "~/components/Icons/Valid.vue";
import { useRouter, useRoute }  from '#imports'
import ConfirmationClasseModal from "~/components/modals/ConfirmationClasseModal.vue";

const router = useRouter();
const route = useRoute();
const isModalOpen = ref(false);
const selectedStudent = ref('Foulane M.');
const selectedClasses = ref(new Set());

const studentClasses = ref({
  'Foulane M.': new Set(),
  'Mehdi M.': new Set(),
  'Zayd M.': new Set(),
  'Abdourrahmane M.': new Set(),
  'Toto M.': new Set(),
  'Redha M.': new Set()
});

const classes = [
  {
    level: '2EB',
    type: 'Arabe',
    levelNumber: 'Niveau 2',
    day: 'Mardi',
    time: '19h à 22h',
    teacher: 'Mouallim Abdourrahmane',
    availableSpots: 2
  },
  ...Array(12).fill({
    level: '2EB',
    type: 'Arabe',
    levelNumber: 'Niveau 2',
    day: 'Mardi',
    time: '19h à 22h',
    teacher: 'Mouallim Abdourrahmane',
    availableSpots: 2
  })
];

const allStudentsHaveClasses = computed(() => {
  return Object.values(studentClasses.value).every(classes => classes.size > 0);
});

const hasClassOfType = (student, type) => {
  const studentClassSet = studentClasses.value[student];
  return Array.from(studentClassSet).some(classIndex =>
      classes[classIndex].type === type
  );
};

const isClassSelectable = (index) => {
  if (studentClasses.value[selectedStudent.value].has(index)) {
    return true;
  }

  const classType = classes[index].type;
  return !hasClassOfType(selectedStudent.value, classType);
};

const toggleClass = (index) => {
  const classType = classes[index].type;
  const currentStudentClasses = studentClasses.value[selectedStudent.value];

  if (currentStudentClasses.has(index)) {
    currentStudentClasses.delete(index);
  } else {
    const hasTypeAlready = hasClassOfType(selectedStudent.value, classType);

    if (!hasTypeAlready) {
      currentStudentClasses.add(index);
    }
  }

  studentClasses.value = {...studentClasses.value};
};

const selectStudent = (student) => {
  selectedStudent.value = student;
};

const hasSelectedClasses = (student) => {
  return studentClasses.value[student].size > 0;
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

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Famille'
  }
})
</script>

<template>
  <div class="grid grid-cols-4 mt-6 px-6 font-montserrat w-full gap-x-4">
    <section class="bg-white col-span-3 rounded-xl border px-6 py-2">
      <h2 class="font-bold text-2xl mb-6">{{ selectedStudent }}</h2>
      <div class="inline-flex items-center gap-x-3">
        <span class="size-3 rounded-full bg-green-tlb"></span>
        <span class="font-semibold text-sm">Classes disponibles ({{ classes.length }})</span>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-6 font-nunito">
        <div v-for="(classe, index) in classes"
             :key="index"
             @click="toggleClass(index)"
             class="flex flex-col rounded-xl select-none bg-gray-50 p-4 transition-all duration-200"
             :class="[
               'border-4',
               {
                 'border-green-600': studentClasses[selectedStudent].has(index),
                 'border-transparent': !studentClasses[selectedStudent].has(index),
                 'cursor-pointer': isClassSelectable(index),
                 'opacity-50 cursor-not-allowed': !isClassSelectable(index)
               }
             ]">
          <div class="flex items-center gap-x-5">
            <div class="bg-[#A2A1A8]/5 p-2 rounded-lg">
              <NotebookTLB class="text-yellow-500 size-7"/>
            </div>

            <div class="flex flex-col">
              <div class="font-black uppercase text-black text-lg">{{ classe.level }}</div>
              <div class="text-gray-tlb text-base">{{ classe.type }} - {{ classe.levelNumber }}</div>
            </div>
          </div>
          <div class="inline-flex items-center gap-x-2 pl-4 mt-4 font-light text-sm">
            <ClockTLB class="size-4"/>
            <div>{{ classe.day }}</div>
            <div> - {{ classe.time }}</div>
          </div>
          <div class="inline-flex items-center gap-x-2 pl-4 mt-1 font-light text-sm">
            <StudentTLB class="size-4"/>
            <div>{{ classe.teacher }}</div>
          </div>

          <div class="text-red-500 font-black inline-flex items-center justify-center my-3">
            {{ classe.availableSpots }} places dispos
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-y-6 w-full sticky top-6 h-fit">
      <div class="bg-white rounded-lg w-full border p-4">
        <h2 class="font-bold text-2xl mb-6">Liste d'élèves</h2>
        <div class="flex flex-col gap-2">
          <div
              v-for="student in Object.keys(studentClasses)"
              :key="student"
              @click="selectStudent(student)"
              class="p-2 border rounded-lg inline-flex items-center justify-between cursor-pointer hover:bg-gray-50"
              :class="selectedStudent === student ? 'border-black' : 'border-transparent'"
          >
            <span>{{ student }}</span>
            <div class="size-7 flex items-center justify-center">
              <Valid v-if="hasSelectedClasses(student)" class="text-green-600"/>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-lg w-full border p-4 font-nunito h-full flex flex-col justify-between min-h-80">
        <div>
          <h2 class="font-bold text-2xl mb-6 font-montserrat">Récapitulatif</h2>
          <div class="flex flex-col gap-2">
            <template v-for="(classSet, student) in studentClasses" :key="student" class="divide-y divide-gray-300">
              <div
                  v-for="classIndex in Array.from(classSet)"
                  :key="`${student}-${classIndex}`"
                  class="pb-1.5 border-b border-gray-300 flex justify-between items-center"
              >
                <div>{{ student }}</div>
                <div class="text-sm">{{ classes[classIndex].type }} - {{ classes[classIndex].level }}</div>
              </div>
            </template>
          </div>
        </div>

        <div class="w-full inline-flex items-center justify-center">
          <button
              @click="handlePaymentNavigation"
              class="bg-yellow-tlb text-default py-3 w-full text-center rounded-lg hover:opacity-90 mx-auto font-bold text-lg mt-6"
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