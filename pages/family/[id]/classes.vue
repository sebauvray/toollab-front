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
import { useSchoolYear } from "~/composables/useSchoolYear";

const { isReadOnly } = useSchoolYear();

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

    <div v-else-if="error" class="p-5 bg-red-100 text-red-700 rounded-lg m-8">
        {{ error }}
    </div>

    <div v-else class="grid grid-cols-4 mt-4 px-4 font-montserrat w-full gap-x-3">
        <BreadCrumb :custom-items="breadcrumbItems" />

        <section class="bg-white col-span-3 rounded-xl border px-4 py-3">
            <div class="flex justify-between mb-4">
                <h2 class="font-bold text-base text-gray-800">{{ selectedStudent?.first_name }} {{ selectedStudent?.last_name }}</h2>
            </div>
            <div v-for="(classGroup, cursus) in groupedClasses" :key="cursus" class="mb-5">
                <div class="h-px bg-gray-100 w-full mb-3"></div>
                <h3 class="text-sm font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                    <span class="text-[10px] uppercase tracking-wide bg-gray-700 text-white px-1.5 py-0.5 rounded">Cursus</span>
                    {{ cursus }}
                </h3>
                <div class="inline-flex items-center gap-x-1.5 mb-3">
                    <span class="size-2 rounded-full bg-green-tlb"></span>
                    <span class="font-medium text-[11px] text-gray-600">
                        {{ classGroup.filter(c => c.available_spots > 0 && shouldShowClass(c)).length }} classe{{ classGroup.filter(c => c.available_spots > 0 && shouldShowClass(c)).length > 1 ? 's' : '' }} disponible{{ classGroup.filter(c => c.available_spots > 0 && shouldShowClass(c)).length > 1 ? 's' : '' }}
                    </span>
                </div>
                <div class="grid grid-cols-3 gap-2 font-nunito">
                    <div
                        v-for="(classe, index) in classGroup"
                        :key="classe.id"
                        @click="!isReadOnly && canClickClass(classe) && toggleClass(classes.findIndex(c => c.id === classe.id), classe)"
                        :title="isReadOnly ? 'Année scolaire en lecture seule' : ''"
                        class="flex flex-col rounded-lg select-none p-2.5 transition-all duration-150 relative border-2"
                        :class="{
                            'bg-green-50 border-green-500 ring-1 ring-green-200': studentClasses[selectedStudent?.id]?.has(classes.findIndex(c => c.id === classe.id)),
                            'bg-gray-50 border-gray-200 hover:border-gray-300': !studentClasses[selectedStudent?.id]?.has(classes.findIndex(c => c.id === classe.id)),
                            'cursor-pointer': !isReadOnly && canClickClass(classe) && !isSaving,
                            'opacity-50 cursor-not-allowed': isReadOnly || !canClickClass(classe),
                            'opacity-75': isSaving
                        }">
                        <div v-if="loadingClassIndex === index"
                             class="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-10">
                            <div class="animate-spin rounded-full size-5 border-b-2 border-green-600"></div>
                        </div>

                        <div
                            v-if="studentClasses[selectedStudent?.id]?.has(classes.findIndex(c => c.id === classe.id))"
                            class="absolute top-1.5 right-1.5 size-5 rounded-full bg-green-600 text-white flex items-center justify-center shadow-sm"
                        >
                            <svg class="size-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.59l7.29-7.3a1 1 0 011.41 0z" clip-rule="evenodd" />
                            </svg>
                        </div>

                        <div class="flex items-center gap-x-2">
                            <div class="bg-gray-tlb/10 p-1 rounded">
                                <NotebookTLB
                                    :class="{
                                        'text-[#93C5FD]': classe.gender === 'Hommes',
                                        'text-[#FDA4AF]': classe.gender === 'Femmes',
                                        'text-[#FCD34D]': classe.gender === 'Enfants'
                                    }"
                                    class="size-5"
                                />
                            </div>

                            <div class="flex flex-col min-w-0">
                                <div class="font-bold uppercase text-gray-900 text-sm truncate">{{ classe.name }}</div>
                                <div class="text-gray-tlb text-[11px] truncate">{{ classe.level?.name || 'Sans niveau' }}</div>
                            </div>
                        </div>

                        <div v-if="classe.schedules && classe.schedules.length > 0" class="mt-2 space-y-1">
                            <div v-for="(schedule, scheduleIndex) in classe.schedules" :key="scheduleIndex" class="pl-1.5">
                                <div class="inline-flex items-center gap-x-1 text-[11px] text-gray-700">
                                    <ClockTLB class="size-3 text-gray-500" />
                                    <span>{{ schedule.day }}</span>
                                    <span class="text-gray-500">{{ schedule.formatted_time }}</span>
                                </div>
                                <div v-if="schedule.teacher || schedule.teacher_name" class="inline-flex items-center gap-x-1 text-[11px] text-gray-600 ml-3.5">
                                    <span>{{ schedule.teacher ? `${schedule.teacher.first_name} ${schedule.teacher.last_name}` : schedule.teacher_name }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="text-[11px] font-semibold mt-auto pt-2"
                             :class="getAvailableSpotsColor(classe.available_spots)">
                            {{ classe.available_spots }} place{{ classe.available_spots > 1 ? 's' : '' }} dispo{{ classe.available_spots > 1 ? 's' : '' }}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-y-3 w-full sticky top-4 h-fit">
            <div class="bg-white rounded-lg w-full border p-3">
                <h2 class="font-semibold text-sm text-gray-800 mb-3">Liste d'élèves</h2>
                <div class="flex flex-col gap-1">
                    <button
                        v-for="student in students"
                        :key="student.id"
                        type="button"
                        @click="selectStudent(student)"
                        class="px-2 py-1.5 rounded-md flex items-center justify-between text-sm transition-colors text-left"
                        :class="selectedStudent?.id === student.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-gray-50 text-gray-700'"
                    >
                        <span class="truncate">{{ student.first_name }} {{ student.last_name }}</span>
                        <Valid v-if="hasSelectedClasses(student.id)" class="size-4 text-green-600 shrink-0" />
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg w-full border p-3 font-nunito flex flex-col justify-between min-h-72">
                <div>
                    <h2 class="font-semibold text-sm font-montserrat text-gray-800 mb-3">Récapitulatif</h2>
                    <div class="flex flex-col gap-1">
                        <template v-for="student in students" :key="student.id">
                            <div
                                v-for="classIndex in Array.from(studentClasses[student.id] || [])"
                                :key="`${student.id}-${classIndex}`"
                                class="py-1.5 border-b border-gray-100 flex justify-between items-center gap-2 text-xs last:border-b-0"
                            >
                                <div class="font-medium text-gray-800 truncate">{{ student.first_name }} {{ student.last_name }}</div>
                                <div class="text-gray-600 truncate text-right">{{ classes[classIndex]?.name }} · {{ classes[classIndex].cursus }}</div>
                            </div>
                        </template>
                        <div v-if="!students.some(s => (studentClasses[s.id] || new Set()).size > 0)" class="py-4 text-center text-xs text-gray-400">
                            Aucune classe sélectionnée
                        </div>
                    </div>
                </div>

                <button
                    @click="handlePaymentNavigation"
                    class="bg-yellow-tlb text-default py-2 w-full text-center rounded-md hover:opacity-90 font-semibold text-sm mt-4"
                    :disabled="isSaving"
                >
                    Paiement
                </button>
            </div>
        </section>

        <ConfirmationClasseModal
            :is-open="isModalOpen"
            @close="closeModal"
            @save="handleModalSave"
        />
    </div>
</template>