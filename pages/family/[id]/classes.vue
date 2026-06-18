<script setup>
import ClockTLB from "~/components/Icons/Clock-TLB.vue";
import { ref, computed, onMounted } from 'vue';
import {useRouter, useRoute, usePageTitle} from '#imports';
import ConfirmationClasseModal from "~/components/modals/ConfirmationClasseModal.vue";
import familyService from "~/services/family.js";
import classeService from "~/services/classe.js";
import studentClassroomService from "~/services/studentClassroom.js";
import userService from "~/services/user.js";
import schoolService from "~/services/school.js";
import paiementService from "~/services/paiement.js";
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import { useSchoolYear } from "~/composables/useSchoolYear";
import { getCurrentSchoolId } from "~/utils/schoolContext";

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
const isLoading = ref(true);
const error = ref(null);
const isSaving = ref(false);
const loadingClassIndex = ref(null);
const totalEstime = ref(null);

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
    return getCurrentSchoolId();
});

const GENDER_COLORS = { M: '#93C5FD', F: '#FDA4AF' };
const CLASS_GENDER_COLORS = {
    Hommes: '#93C5FD',
    Femmes: '#FDA4AF',
    Enfants: '#FCD34D',
    Mixte: '#86EFAC'
};
const CLASS_GENDER_LEGEND = Object.entries(CLASS_GENDER_COLORS).map(([label, color]) => ({ label, color }));

const studentInitials = (student) => {
    return ((student.first_name?.[0] || '') + (student.last_name?.[0] || '')).toUpperCase();
};

const studentColor = (student) => GENDER_COLORS[student.gender] || '#9CA3AF';

const studentClassCount = (studentId) => studentClasses.value[studentId]?.size || 0;

const enrolledStudentsCount = computed(() =>
    students.value.filter(s => studentClassCount(s.id) > 0).length
);

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

        if (classGender === 'Enfants' || classGender === 'Mixte') return true;
        if (studentGender === 'M') return classGender === 'Hommes';
        if (studentGender === 'F') return classGender === 'Femmes';

        return false;
    } else {
        return true
    }
};

const fillRatio = (classe) => {
    const size = parseInt(classe.size) || 0;
    if (!size) return 0;
    return Math.min(1, (size - classe.available_spots) / size);
};

const capacityBarColor = (classe) => {
    if (classe.available_spots <= 0) return 'bg-red-400';
    if (classe.available_spots <= 5) return 'bg-amber-400';
    return 'bg-green-500';
};

const canClickClass = (classe) => {
    const classIndex = classes.value.findIndex(c => c.id === classe.id);
    const studentId = selectedStudent.value?.id;
    const alreadyIn = studentClasses.value[studentId]?.has(classIndex);

    return classe.available_spots > 0 || alreadyIn;
};

const isEnrolled = (classe) => {
    const classIndex = classes.value.findIndex(c => c.id === classe.id);
    return studentClasses.value[selectedStudent.value?.id]?.has(classIndex);
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
        error.value = err.response?.data?.message || err.message || 'Erreur lors du chargement des classes';
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

const fetchTarif = async () => {
    try {
        const response = await paiementService.getDetailsPaiement(route.params.id);
        if (response.status === 'success') {
            totalEstime.value = response.data?.montant_total ?? null;
        }
    } catch (err) {
        totalEstime.value = null;
    }
};

const allStudentsHaveClasses = computed(() => {
    return students.value.every(student =>
        studentClasses.value[student.id] && studentClasses.value[student.id].size > 0
    );
});

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
        fetchTarif();

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
    fetchTarif();
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

    <div v-else class="grid grid-cols-1 lg:grid-cols-4 mt-4 px-4 pb-6 font-montserrat w-full gap-3 items-start">
        <BreadCrumb :custom-items="breadcrumbItems" />

        <section class="lg:col-span-3 bg-white rounded-2xl border p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 class="font-bold text-base text-gray-800">Choix des classes</h2>
                <p class="text-[11px] text-placeholder font-nunito">
                    Une classe par cursus — choisir une autre classe du même cursus remplace l'inscription.
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-gray-500 font-nunito">
                <span class="font-medium text-gray-600">Légende</span>
                <span
                    v-for="item in CLASS_GENDER_LEGEND"
                    :key="item.label"
                    class="inline-flex items-center gap-1.5"
                >
                    <span
                        class="w-2 h-2 rounded-full shrink-0"
                        :style="{ backgroundColor: item.color }"
                    ></span>
                    {{ item.label }}
                </span>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 mb-4">
                <button
                    v-for="student in students"
                    :key="student.id"
                    type="button"
                    @click="selectStudent(student)"
                    class="flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-xl border transition-all shrink-0"
                    :class="selectedStudent?.id === student.id
                        ? 'border-default bg-white shadow-sm'
                        : 'border-[#E6EFF5] bg-gray-blue/60 hover:border-gray-300'"
                >
                    <span
                        class="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        :style="{ backgroundColor: studentColor(student) }"
                    >{{ studentInitials(student) }}</span>
                    <span class="text-left min-w-0">
                        <span
                            class="block text-sm font-semibold leading-tight truncate max-w-[9rem]"
                            :class="selectedStudent?.id === student.id ? 'text-default' : 'text-gray-600'"
                        >{{ student.first_name }}</span>
                        <span class="flex items-center gap-1 text-[11px] font-nunito leading-tight" :class="studentClassCount(student.id) ? 'text-green-600' : 'text-placeholder'">
                            <span class="w-1.5 h-1.5 rounded-full" :class="studentClassCount(student.id) ? 'bg-green-500' : 'bg-gray-300'"></span>
                            {{ studentClassCount(student.id) ? `${studentClassCount(student.id)} classe${studentClassCount(student.id) > 1 ? 's' : ''}` : 'Non inscrit' }}
                        </span>
                    </span>
                </button>
            </div>

            <div v-for="(classGroup, cursus) in groupedClasses" :key="cursus" class="mb-5 last:mb-0">
                <div class="flex items-baseline justify-between mb-2">
                    <h3 class="text-sm font-semibold text-default">{{ cursus }}</h3>
                    <span class="text-[11px] text-placeholder font-nunito">
                        {{ classGroup.filter(c => c.available_spots > 0).length }} classe{{ classGroup.filter(c => c.available_spots > 0).length > 1 ? 's' : '' }} avec des places
                    </span>
                </div>

                <div class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito overflow-hidden">
                    <div
                        v-for="classe in classGroup"
                        :key="classe.id"
                        @click="!isReadOnly && canClickClass(classe) && toggleClass(classes.findIndex(c => c.id === classe.id), classe)"
                        class="relative flex items-center gap-3 px-3.5 py-2.5 transition-colors"
                        :class="{
                            'bg-green-50/60': isEnrolled(classe),
                            'hover:bg-gray-50': !isEnrolled(classe) && !isReadOnly && canClickClass(classe) && !isSaving,
                            'cursor-pointer': !isReadOnly && canClickClass(classe) && !isSaving,
                            'opacity-45 cursor-not-allowed': isReadOnly || !canClickClass(classe),
                        }"
                    >
                        <div
                            v-if="loadingClassIndex === classes.findIndex(c => c.id === classe.id)"
                            class="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
                        >
                            <div class="animate-spin rounded-full size-4 border-b-2 border-default"></div>
                        </div>

                        <span
                            class="w-4 h-4 rounded-full shrink-0 transition-all"
                            :class="isEnrolled(classe) ? 'border-[5px] border-green-600 bg-white' : 'border border-gray-300 bg-white'"
                        ></span>

                        <span
                            class="w-2 h-2 rounded-full shrink-0"
                            :style="{ backgroundColor: CLASS_GENDER_COLORS[classe.gender] || '#9CA3AF' }"
                            :title="classe.gender"
                        ></span>

                        <span class="w-32 shrink-0 min-w-0">
                            <span class="block font-montserrat font-bold text-sm text-default truncate">{{ classe.name }}</span>
                            <span v-if="classe.level?.name" class="block text-[11px] text-placeholder truncate">{{ classe.level.name }}</span>
                        </span>

                        <span class="flex-1 min-w-0 text-xs text-gray-600">
                            <span
                                v-for="(schedule, i) in classe.schedules"
                                :key="i"
                                class="inline-flex items-center gap-1 mr-3"
                            >
                                <ClockTLB class="size-3 text-gray-400 shrink-0" />
                                <span class="font-medium text-gray-700">{{ schedule.day }}</span>
                                <span class="text-gray-500">{{ schedule.formatted_time }}</span>
                                <span v-if="schedule.teacher || schedule.teacher_name" class="text-placeholder truncate">
                                    · {{ schedule.teacher ? `${schedule.teacher.first_name} ${schedule.teacher.last_name}` : schedule.teacher_name }}
                                </span>
                            </span>
                        </span>

                        <span v-if="isEnrolled(classe)" class="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700 ring-1 ring-green-300 font-medium">
                            Inscrit ✓
                        </span>
                        <span v-else-if="classe.available_spots <= 0" class="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-400">
                            Complète
                        </span>

                        <span class="shrink-0 flex items-center gap-2 w-24 justify-end">
                            <span class="text-[11px] text-gray-500 tabular-nums">{{ classe.student_count }}/{{ classe.size }}</span>
                            <span class="w-12 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <span
                                    class="block h-full rounded-full transition-all"
                                    :class="capacityBarColor(classe)"
                                    :style="{ width: (fillRatio(classe) * 100) + '%' }"
                                ></span>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section class="bg-white rounded-2xl border p-4 w-full sticky top-4 h-fit font-nunito">
            <h2 class="font-montserrat font-bold text-sm text-gray-800 mb-3">Récapitulatif</h2>

            <div class="space-y-3">
                <div v-for="student in students" :key="student.id">
                    <div class="flex items-center gap-2">
                        <span
                            class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            :style="{ backgroundColor: studentColor(student) }"
                        >{{ studentInitials(student) }}</span>
                        <span class="text-xs font-montserrat font-semibold text-default truncate">{{ student.first_name }} {{ student.last_name }}</span>
                    </div>
                    <div v-if="studentClassCount(student.id)" class="mt-1 space-y-0.5">
                        <div
                            v-for="classIndex in Array.from(studentClasses[student.id] || [])"
                            :key="classIndex"
                            class="flex items-center justify-between pl-7 pr-1 text-xs"
                        >
                            <span class="text-gray-600 truncate">{{ classes[classIndex]?.cursus }}</span>
                            <span class="font-semibold text-gray-800 shrink-0">{{ classes[classIndex]?.name }}</span>
                        </div>
                    </div>
                    <p v-else class="pl-7 text-[11px] text-placeholder mt-0.5">Aucune classe choisie</p>
                </div>
            </div>

            <div class="my-3 border-t border-[#E6EFF5]"></div>

            <div class="flex items-center justify-between mb-1.5 text-xs">
                <span class="text-gray-500">Élèves inscrits</span>
                <span class="font-semibold text-default tabular-nums">{{ enrolledStudentsCount }}/{{ students.length }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                    class="h-full rounded-full transition-all duration-500 ease-out"
                    :class="enrolledStudentsCount === students.length ? 'bg-green-500' : 'bg-amber-400'"
                    :style="{ width: (students.length ? (enrolledStudentsCount / students.length) * 100 : 0) + '%' }"
                ></div>
            </div>

            <div v-if="totalEstime !== null && totalEstime > 0" class="flex items-baseline justify-between mb-3">
                <span class="text-xs text-gray-500">Total annuel</span>
                <span class="font-montserrat font-bold text-base text-default tabular-nums">{{ Math.round(totalEstime) }}€</span>
            </div>

            <button
                @click="handlePaymentNavigation"
                :disabled="isSaving"
                class="w-full inline-flex items-center justify-center gap-x-1.5 bg-default text-white py-2 rounded-lg hover:opacity-90 font-montserrat font-semibold text-sm transition-opacity disabled:opacity-50"
            >
                <span>Continuer vers le paiement</span>
                <svg class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 5.5L20 12l-6.5 6.5M20 12H4"/></svg>
            </button>
            <p v-if="!allStudentsHaveClasses" class="mt-2 text-center text-[11px] text-amber-600">
                {{ students.length - enrolledStudentsCount }} élève{{ students.length - enrolledStudentsCount > 1 ? 's' : '' }} sans classe pour l'instant
            </p>
        </section>

        <ConfirmationClasseModal
            :is-open="isModalOpen"
            @close="closeModal"
            @save="handleModalSave"
        />
    </div>
</template>
