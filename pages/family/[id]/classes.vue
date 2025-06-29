<script setup>
import NotebookTLB from "~/components/Icons/Notebook-TLB.vue";
import ClockTLB from "~/components/Icons/Clock-TLB.vue";
import StudentTLB from "~/components/Icons/Student-TLB.vue";
import { ref, computed, onMounted } from 'vue';
import Valid from "~/components/Icons/Valid.vue";
import {useRouter, useRoute, usePageTitle} from '#imports';
import ConfirmationClasseModal from "~/components/modals/ConfirmationClasseModal.vue";
import familyService from "~/services/family.js";
import classeService from "~/services/classe.js";
import studentClassroomService from "~/services/studentClassroom.js";
import userService from "~/services/user.js";
import schoolService from "~/services/school.js";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";

usePageTitle('Famille')
const router = useRouter();
const route = useRoute();
const breadcrumbItems = computed(() => [
    { name: 'Familles', path: '/family' },
    { name: family.value.responsibles[0].first_name + ' ' + family.value.responsibles[0].last_name || 'Chargement...', path: `/family/${family.value.id}` },
    { name: 'Classes', path: null },
]);
const isModalOpen = ref(false);
const selectedStudent = ref(null);
const selectedClasses = ref(new Set());
const isLoading = ref(true);
const error = ref(null);
const isSaving = ref(false);
const loadingClassIndex = ref(null);

const family = ref(null);
const students = ref([]);
const classes = ref([]);
const studentClasses = ref({});
const studentEnrollments = ref({});
const hasAdminAccess = ref(false);
const schools = ref([]);
const selectedSchool = ref(null);
const user = ref(null);

const currentSchoolId = computed(() => {
    return localStorage.getItem('current_school_id') || 1;
});

const groupedClasses = computed(() => {
    const groups = {};

    classes.value.forEach(classe => {
        if (!shouldShowClass(classe)) return;

        if (!groups[classe.cursus]) {
            groups[classe.cursus] = [];
        }
        groups[classe.cursus].push(classe);
    });

    return groups;
});

const checkAdminAccess = () => {
    if (selectedSchool.value && schools.value.length > 0) {
        const currentSchoolRole = schools.value.find(s => s.id === selectedSchool.value.id);
        hasAdminAccess.value = currentSchoolRole?.role === 'Directeur' || currentSchoolRole?.role === 'Administrateur';
    }
};

const loadUserSchools = async () => {
    try {
        if (user.value) {
            const response = await userService.getUserRoles(user.value.id);
            const userRoles = response.roles;

            if (userRoles.schools && userRoles.schools.length > 0) {
                const schoolPromises = userRoles.schools.map(async (schoolRole) => {
                    const schoolData = await schoolService.getSchool(schoolRole.context.id);
                    return {
                        id: schoolData.id,
                        name: schoolData.name,
                        role: schoolRole.role
                    };
                });

                schools.value = await Promise.all(schoolPromises);

                if (schools.value.length > 0) {
                    const savedSchoolId = localStorage.getItem('current_school_id');

                    if (savedSchoolId) {
                        const savedSchool = schools.value.find(s => s.id === parseInt(savedSchoolId));
                        if (savedSchool) {
                            selectedSchool.value = savedSchool;
                        } else {
                            selectedSchool.value = schools.value[0];
                            localStorage.setItem('current_school_id', schools.value[0].id);
                        }
                    } else {
                        selectedSchool.value = schools.value[0];
                        localStorage.setItem('current_school_id', schools.value[0].id);
                    }

                    checkAdminAccess();
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des écoles:', error);
    }
};

const shouldShowClass = (classe) => {
    if (!hasAdminAccess.value) {
        if (!selectedStudent.value) return false;

        const studentGender = selectedStudent.value.gender;
        const classGender = classe.gender;

        if (classGender === 'Enfants') return true;
        if (studentGender === 'M') return classGender === 'Hommes';
        if (studentGender === 'F') return classGender === 'Femmes';

        return false;
    } else {
        return true
    }
};

const getAvailableSpotsColor = (spots) => {
    if (spots >= 11) return 'text-green-500';
    if (spots >= 6 && spots <= 10) return 'text-orange-500';
    return 'text-red-500';
};

const canClickClass = (classe) => {
    const classIndex = classes.value.findIndex(c => c.id === classe.id);
    const studentId = selectedStudent.value?.id;
    const alreadyIn = studentClasses.value[studentId]?.has(classIndex);

    return classe.available_spots > 0 || alreadyIn;
};

const fetchFamilyData = async () => {
    try {
        isLoading.value = true;
        const response = await familyService.getFamily(route.params.id);

        if (response.status === 'success') {
            family.value = response.data.family;
            students.value = response.data.family.students || [];

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
    return !!selectedStudent.value && !!classes.value[index];
};

const toggleClass = async (index, classe) => {
    if (!selectedStudent.value || !classes.value[index] || isSaving.value) return;

    const classroom = classes.value[index];
    const studentId = selectedStudent.value.id;
    const currentStudentClasses = studentClasses.value[studentId];

    if (!isClassSelectable(index)) return;

    isSaving.value = true;
    loadingClassIndex.value = index;

    try {
        if (currentStudentClasses.has(index)) {
            await studentClassroomService.unenrollStudent(studentId, classroom.id);
            currentStudentClasses.delete(index);

            const {setFlashMessage} = useFlashMessage();
            setFlashMessage({
                type: 'success',
                message: 'Inscription supprimée'
            });
        } else {
            const newCursus = classroom.cursus;
            const previousClassIndexes = Array.from(currentStudentClasses);
            for (const previousIndex of previousClassIndexes) {
                const previousClassroom = classes.value[previousIndex];
                if (previousClassroom.cursus === newCursus) {
                    await studentClassroomService.unenrollStudent(studentId, previousClassroom.id);
                    currentStudentClasses.delete(previousIndex);
                }
            }
            await studentClassroomService.enrollStudent(studentId, classroom.id, route.params.id);
            currentStudentClasses.add(index);

            const {setFlashMessage} = useFlashMessage();
            setFlashMessage({
                type: 'success',
                message: 'Élève inscrit avec succès'
            });
        }

        studentClasses.value = {...studentClasses.value};

        await fetchClasses();

    } catch (err) {
        console.error('Erreur lors de la modification de l\'inscription:', err);
        const {setFlashMessage} = useFlashMessage();
        setFlashMessage({
            type: 'error',
            message: err.response?.data?.message || 'Erreur lors de la modification'
        });
    } finally {
        isSaving.value = false;
        loadingClassIndex.value = null;
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
        params: {id: route.params.id}
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

onMounted(async () => {
    if (process.client) {
        const userJson = localStorage.getItem('auth.user');
        if (userJson) {
            try {
                user.value = JSON.parse(userJson);
                await loadUserSchools();
            } catch (e) {
                console.error('Erreur lors de la récupération des données utilisateur', e);
            }
        }
    }
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
        <BreadCrumb :custom-items="breadcrumbItems" />

        <section class="bg-white col-span-3 rounded-xl border px-6 py-2">
            <div class="flex justify-between mt-2 mb-6">
                <h2 class="font-bold text-2xl ">{{ selectedStudent?.first_name }} {{ selectedStudent?.last_name }}</h2>
                <div>
                    <div class="flex items-center text-xs justify-center">
                        <div>Classe précédente :</div>
                        <div class="ml-2 font-bold">{{ selectedStudent?.year_infos?.classe_precedente || 'Non définie' }}</div>
                    </div>
                    <div class="text-xs rounded-lg w-fit py-2 px-4"
                         :class="{
                        'bg-lime-100': selectedStudent.year_infos?.decision === 'passe',
                        'bg-orange-100': selectedStudent.year_infos?.decision === 'redouble',
                        'bg-red-100': selectedStudent.year_infos?.decision === 'renvoi',
                        'bg-gray-100': selectedStudent.year_infos?.decision === 'abandon' || selectedStudent.year_infos?.decision === 'autre'
                    }">
                        <div class="flex">
                            <div>Décision :</div>
                            <div class="ml-2">{{ selectedStudent?.year_infos.decision }}</div>
                        </div>
                        <div class="flex">
                            <div>Commentaire :</div>
                            <div class="ml-2">{{ selectedStudent?.year_infos.commentaires || 'aucun' }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-for="(classGroup, cursus) in groupedClasses" :key="cursus" class="mb-8">
                <div class="h-px bg-gray-100 w-full mb-6"></div>
                <h3 class="text-xl font-bold mb-3 flex items-center"><span class="text-xs uppercase bg-gray-700 text-white px-2 py-1 rounded-lg mr-2">Cursus</span> {{ cursus }}</h3>
                <div class="inline-flex items-center gap-x-3">
                    <span class="size-3 rounded-full bg-green-tlb"></span>
                    <span class="font-semibold text-sm">Classes disponibles ({{ classGroup.filter(c => c.available_spots > 0 && shouldShowClass(c)).length }})</span>
                </div>
                <div class="grid grid-cols-3 gap-4 mt-6 font-nunito">
                    <div
                        v-for="(classe, index) in classGroup"
                        :key="classe.id"
                        @click="canClickClass(classe) && toggleClass(classes.findIndex(c => c.id === classe.id), classe)"
                        class="flex flex-col rounded-xl select-none bg-gray-50 p-4 transition-all duration-200 relative"
                        :class="[
                          'border-4',
                          {
                            'border-green-600': studentClasses[selectedStudent?.id]?.has(classes.findIndex(c => c.id === classe.id)),
                            'border-transparent': !studentClasses[selectedStudent?.id]?.has(classes.findIndex(c => c.id === classe.id)),
                            'cursor-pointer': canClickClass(classe) && !isSaving,
                            'opacity-50 cursor-not-allowed': !canClickClass(classe),
                            'opacity-75': isSaving
                          }
                        ]">
                        <div v-if="loadingClassIndex === index"
                             class="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl z-10">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>

                        <div class="flex items-center gap-x-5">
                            <div class="bg-[#A2A1A8]/5 p-2 rounded-lg">
                                <NotebookTLB
                                    :class="{
                                  'text-[#93C5FD]': classe.gender === 'Hommes',
                                  'text-[#FDA4AF]': classe.gender === 'Femmes',
                                  'text-[#FCD34D]': classe.gender === 'Enfants'
                                }"
                                    class="size-7"
                                />
                            </div>

                            <div class="flex flex-col">
                                <div class="font-black uppercase text-black text-lg">{{ classe.name }}</div>
                                <div class="text-gray-tlb text-base">{{ classe.cursus }} - {{ classe.level?.name || 'Sans niveau' }}</div>
                            </div>
                        </div>

                      <div v-if="classe.schedules && classe.schedules.length > 0" class="mt-4 space-y-2">
                        <div v-for="(schedule, scheduleIndex) in classe.schedules" :key="scheduleIndex" class="flex flex-col pl-4 mb-1">
                          <div class="inline-flex items-center gap-x-2 font-light text-sm">
                            <ClockTLB class="size-4 text-gray-600" />
                            <div class="text-gray-700">{{ schedule.day }}</div>
                            <div class="text-gray-600">{{ schedule.formatted_time }}</div>
                          </div>
                          <div v-if="schedule.teacher_name" class="inline-flex items-center gap-x-2 mt-1 font-light text-sm">
                            <StudentTLB class="size-4 text-gray-600" />
                            <div class="text-gray-600">{{ schedule.teacher_name }}</div>
                          </div>
                        </div>
                      </div>

                        <div class="font-black inline-flex items-center justify-center mt-auto mb-3"
                             :class="getAvailableSpotsColor(classe.available_spots)">
                            {{ classe.available_spots }} places dispos
                        </div>
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
                            <Valid v-if="hasSelectedClasses(student.id)" class="text-green-600" />
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
                                <div class="text-sm">{{ classes[classIndex]?.name }} - {{ classes[classIndex].cursus }}</div>
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