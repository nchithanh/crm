import type { VerticalId } from "@/lib/vertical";

import nhay_settings from "@/data/nhay/settings.json";
import nhay_users from "@/data/nhay/users.json";
import nhay_subscriptionPlans from "@/data/nhay/subscription-plans.json";
import nhay_students from "@/data/nhay/students.json";
import nhay_leads from "@/data/nhay/leads.json";
import nhay_subscriptions from "@/data/nhay/subscriptions.json";
import nhay_payments from "@/data/nhay/payments.json";
import nhay_installments from "@/data/nhay/installments.json";
import nhay_tasks from "@/data/nhay/tasks.json";
import nhay_taskParents from "@/data/nhay/task-parents.json";
import nhay_attendance from "@/data/nhay/attendance.json";
import nhay_courses from "@/data/nhay/courses.json";
import nhay_courseTeachers from "@/data/nhay/course-teachers.json";
import nhay_courseRooms from "@/data/nhay/course-rooms.json";
import nhay_legacyClassMap from "@/data/nhay/legacy-class-map.json";
import nhay_rooms from "@/data/nhay/rooms.json";
import nhay_promotions from "@/data/nhay/promotions.json";
import nhay_holds from "@/data/nhay/holds.json";
import nhay_bookings from "@/data/nhay/bookings.json";
import nhay_branches from "@/data/nhay/branches.json";
import nhay_teacherAbsences from "@/data/nhay/teacher-absences.json";
import nhay_classOverrides from "@/data/nhay/class-overrides.json";

import anh_settings from "@/data/anh/settings.json";
import anh_users from "@/data/anh/users.json";
import anh_subscriptionPlans from "@/data/anh/subscription-plans.json";
import anh_students from "@/data/anh/students.json";
import anh_leads from "@/data/anh/leads.json";
import anh_subscriptions from "@/data/anh/subscriptions.json";
import anh_payments from "@/data/anh/payments.json";
import anh_installments from "@/data/anh/installments.json";
import anh_tasks from "@/data/anh/tasks.json";
import anh_taskParents from "@/data/anh/task-parents.json";
import anh_attendance from "@/data/anh/attendance.json";
import anh_courses from "@/data/anh/courses.json";
import anh_courseTeachers from "@/data/anh/course-teachers.json";
import anh_courseRooms from "@/data/anh/course-rooms.json";
import anh_legacyClassMap from "@/data/anh/legacy-class-map.json";
import anh_rooms from "@/data/anh/rooms.json";
import anh_promotions from "@/data/anh/promotions.json";
import anh_holds from "@/data/anh/holds.json";
import anh_bookings from "@/data/anh/bookings.json";
import anh_branches from "@/data/anh/branches.json";
import anh_teacherAbsences from "@/data/anh/teacher-absences.json";

import nhac_settings from "@/data/nhac/settings.json";
import nhac_users from "@/data/nhac/users.json";
import nhac_subscriptionPlans from "@/data/nhac/subscription-plans.json";
import nhac_students from "@/data/nhac/students.json";
import nhac_leads from "@/data/nhac/leads.json";
import nhac_subscriptions from "@/data/nhac/subscriptions.json";
import nhac_payments from "@/data/nhac/payments.json";
import nhac_installments from "@/data/nhac/installments.json";
import nhac_tasks from "@/data/nhac/tasks.json";
import nhac_taskParents from "@/data/nhac/task-parents.json";
import nhac_attendance from "@/data/nhac/attendance.json";
import nhac_courses from "@/data/nhac/courses.json";
import nhac_courseTeachers from "@/data/nhac/course-teachers.json";
import nhac_courseRooms from "@/data/nhac/course-rooms.json";
import nhac_legacyClassMap from "@/data/nhac/legacy-class-map.json";
import nhac_rooms from "@/data/nhac/rooms.json";
import nhac_promotions from "@/data/nhac/promotions.json";
import nhac_holds from "@/data/nhac/holds.json";
import nhac_bookings from "@/data/nhac/bookings.json";
import nhac_branches from "@/data/nhac/branches.json";
import nhac_teacherAbsences from "@/data/nhac/teacher-absences.json";

import boi_settings from "@/data/boi/settings.json";
import boi_users from "@/data/boi/users.json";
import boi_subscriptionPlans from "@/data/boi/subscription-plans.json";
import boi_students from "@/data/boi/students.json";
import boi_leads from "@/data/boi/leads.json";
import boi_subscriptions from "@/data/boi/subscriptions.json";
import boi_payments from "@/data/boi/payments.json";
import boi_installments from "@/data/boi/installments.json";
import boi_tasks from "@/data/boi/tasks.json";
import boi_taskParents from "@/data/boi/task-parents.json";
import boi_attendance from "@/data/boi/attendance.json";
import boi_courses from "@/data/boi/courses.json";
import boi_courseTeachers from "@/data/boi/course-teachers.json";
import boi_courseRooms from "@/data/boi/course-rooms.json";
import boi_legacyClassMap from "@/data/boi/legacy-class-map.json";
import boi_rooms from "@/data/boi/rooms.json";
import boi_promotions from "@/data/boi/promotions.json";
import boi_holds from "@/data/boi/holds.json";
import boi_bookings from "@/data/boi/bookings.json";
import boi_branches from "@/data/boi/branches.json";
import boi_teacherAbsences from "@/data/boi/teacher-absences.json";

import spa_settings from "@/data/spa/settings.json";
import spa_users from "@/data/spa/users.json";
import spa_subscriptionPlans from "@/data/spa/subscription-plans.json";
import spa_students from "@/data/spa/students.json";
import spa_leads from "@/data/spa/leads.json";
import spa_subscriptions from "@/data/spa/subscriptions.json";
import spa_payments from "@/data/spa/payments.json";
import spa_installments from "@/data/spa/installments.json";
import spa_tasks from "@/data/spa/tasks.json";
import spa_taskParents from "@/data/spa/task-parents.json";
import spa_attendance from "@/data/spa/attendance.json";
import spa_courses from "@/data/spa/courses.json";
import spa_courseTeachers from "@/data/spa/course-teachers.json";
import spa_courseRooms from "@/data/spa/course-rooms.json";
import spa_legacyClassMap from "@/data/spa/legacy-class-map.json";
import spa_rooms from "@/data/spa/rooms.json";
import spa_promotions from "@/data/spa/promotions.json";
import spa_holds from "@/data/spa/holds.json";
import spa_bookings from "@/data/spa/bookings.json";
import spa_branches from "@/data/spa/branches.json";
import spa_teacherAbsences from "@/data/spa/teacher-absences.json";

import nails_settings from "@/data/nails/settings.json";
import nails_users from "@/data/nails/users.json";
import nails_subscriptionPlans from "@/data/nails/subscription-plans.json";
import nails_students from "@/data/nails/students.json";
import nails_leads from "@/data/nails/leads.json";
import nails_subscriptions from "@/data/nails/subscriptions.json";
import nails_payments from "@/data/nails/payments.json";
import nails_installments from "@/data/nails/installments.json";
import nails_tasks from "@/data/nails/tasks.json";
import nails_taskParents from "@/data/nails/task-parents.json";
import nails_attendance from "@/data/nails/attendance.json";
import nails_courses from "@/data/nails/courses.json";
import nails_courseTeachers from "@/data/nails/course-teachers.json";
import nails_courseRooms from "@/data/nails/course-rooms.json";
import nails_legacyClassMap from "@/data/nails/legacy-class-map.json";
import nails_rooms from "@/data/nails/rooms.json";
import nails_promotions from "@/data/nails/promotions.json";
import nails_holds from "@/data/nails/holds.json";
import nails_bookings from "@/data/nails/bookings.json";
import nails_branches from "@/data/nails/branches.json";
import nails_teacherAbsences from "@/data/nails/teacher-absences.json";

import salon_settings from "@/data/salon/settings.json";
import salon_users from "@/data/salon/users.json";
import salon_subscriptionPlans from "@/data/salon/subscription-plans.json";
import salon_students from "@/data/salon/students.json";
import salon_leads from "@/data/salon/leads.json";
import salon_subscriptions from "@/data/salon/subscriptions.json";
import salon_payments from "@/data/salon/payments.json";
import salon_installments from "@/data/salon/installments.json";
import salon_tasks from "@/data/salon/tasks.json";
import salon_taskParents from "@/data/salon/task-parents.json";
import salon_attendance from "@/data/salon/attendance.json";
import salon_courses from "@/data/salon/courses.json";
import salon_courseTeachers from "@/data/salon/course-teachers.json";
import salon_courseRooms from "@/data/salon/course-rooms.json";
import salon_legacyClassMap from "@/data/salon/legacy-class-map.json";
import salon_rooms from "@/data/salon/rooms.json";
import salon_promotions from "@/data/salon/promotions.json";
import salon_holds from "@/data/salon/holds.json";
import salon_bookings from "@/data/salon/bookings.json";
import salon_branches from "@/data/salon/branches.json";
import salon_teacherAbsences from "@/data/salon/teacher-absences.json";

import massage_settings from "@/data/massage/settings.json";
import massage_users from "@/data/massage/users.json";
import massage_subscriptionPlans from "@/data/massage/subscription-plans.json";
import massage_students from "@/data/massage/students.json";
import massage_leads from "@/data/massage/leads.json";
import massage_subscriptions from "@/data/massage/subscriptions.json";
import massage_payments from "@/data/massage/payments.json";
import massage_installments from "@/data/massage/installments.json";
import massage_tasks from "@/data/massage/tasks.json";
import massage_taskParents from "@/data/massage/task-parents.json";
import massage_attendance from "@/data/massage/attendance.json";
import massage_courses from "@/data/massage/courses.json";
import massage_courseTeachers from "@/data/massage/course-teachers.json";
import massage_courseRooms from "@/data/massage/course-rooms.json";
import massage_legacyClassMap from "@/data/massage/legacy-class-map.json";
import massage_rooms from "@/data/massage/rooms.json";
import massage_promotions from "@/data/massage/promotions.json";
import massage_holds from "@/data/massage/holds.json";
import massage_bookings from "@/data/massage/bookings.json";
import massage_branches from "@/data/massage/branches.json";
import massage_teacherAbsences from "@/data/massage/teacher-absences.json";

export function loadSeed(id: VerticalId) {
  const table = {
    nhay: {
      settings: nhay_settings,
      users: nhay_users,
      subscriptionPlans: nhay_subscriptionPlans,
      students: nhay_students,
      leads: nhay_leads,
      subscriptions: nhay_subscriptions,
      payments: nhay_payments,
      installments: nhay_installments,
      tasks: nhay_tasks,
      taskParents: nhay_taskParents,
      attendance: nhay_attendance,
      courses: nhay_courses,
      courseTeachers: nhay_courseTeachers,
      courseRooms: nhay_courseRooms,
      legacyClassMap: nhay_legacyClassMap as Record<string, string>,
      rooms: nhay_rooms,
      promotions: nhay_promotions,
      holds: nhay_holds,
      bookings: nhay_bookings,
      branches: nhay_branches,
      teacherAbsences: nhay_teacherAbsences,
      classOverrides: nhay_classOverrides as { classId: string; teacherId?: string; roomId?: string; note?: string }[],
    },
    anh: {
      settings: anh_settings,
      users: anh_users,
      subscriptionPlans: anh_subscriptionPlans,
      students: anh_students,
      leads: anh_leads,
      subscriptions: anh_subscriptions,
      payments: anh_payments,
      installments: anh_installments,
      tasks: anh_tasks,
      taskParents: anh_taskParents,
      attendance: anh_attendance,
      courses: anh_courses,
      courseTeachers: anh_courseTeachers,
      courseRooms: anh_courseRooms,
      legacyClassMap: anh_legacyClassMap as Record<string, string>,
      rooms: anh_rooms,
      promotions: anh_promotions,
      holds: anh_holds,
      bookings: anh_bookings,
      branches: anh_branches,
      teacherAbsences: anh_teacherAbsences,
    },
    nhac: {
      settings: nhac_settings,
      users: nhac_users,
      subscriptionPlans: nhac_subscriptionPlans,
      students: nhac_students,
      leads: nhac_leads,
      subscriptions: nhac_subscriptions,
      payments: nhac_payments,
      installments: nhac_installments,
      tasks: nhac_tasks,
      taskParents: nhac_taskParents,
      attendance: nhac_attendance,
      courses: nhac_courses,
      courseTeachers: nhac_courseTeachers,
      courseRooms: nhac_courseRooms,
      legacyClassMap: nhac_legacyClassMap as Record<string, string>,
      rooms: nhac_rooms,
      promotions: nhac_promotions,
      holds: nhac_holds,
      bookings: nhac_bookings,
      branches: nhac_branches,
      teacherAbsences: nhac_teacherAbsences,
    },
    boi: {
      settings: boi_settings,
      users: boi_users,
      subscriptionPlans: boi_subscriptionPlans,
      students: boi_students,
      leads: boi_leads,
      subscriptions: boi_subscriptions,
      payments: boi_payments,
      installments: boi_installments,
      tasks: boi_tasks,
      taskParents: boi_taskParents,
      attendance: boi_attendance,
      courses: boi_courses,
      courseTeachers: boi_courseTeachers,
      courseRooms: boi_courseRooms,
      legacyClassMap: boi_legacyClassMap as Record<string, string>,
      rooms: boi_rooms,
      promotions: boi_promotions,
      holds: boi_holds,
      bookings: boi_bookings,
      branches: boi_branches,
      teacherAbsences: boi_teacherAbsences,
    },
    spa: {
      settings: spa_settings,
      users: spa_users,
      subscriptionPlans: spa_subscriptionPlans,
      students: spa_students,
      leads: spa_leads,
      subscriptions: spa_subscriptions,
      payments: spa_payments,
      installments: spa_installments,
      tasks: spa_tasks,
      taskParents: spa_taskParents,
      attendance: spa_attendance,
      courses: spa_courses,
      courseTeachers: spa_courseTeachers,
      courseRooms: spa_courseRooms,
      legacyClassMap: spa_legacyClassMap as Record<string, string>,
      rooms: spa_rooms,
      promotions: spa_promotions,
      holds: spa_holds,
      bookings: spa_bookings,
      branches: spa_branches,
      teacherAbsences: spa_teacherAbsences,
    },
    nails: {
      settings: nails_settings,
      users: nails_users,
      subscriptionPlans: nails_subscriptionPlans,
      students: nails_students,
      leads: nails_leads,
      subscriptions: nails_subscriptions,
      payments: nails_payments,
      installments: nails_installments,
      tasks: nails_tasks,
      taskParents: nails_taskParents,
      attendance: nails_attendance,
      courses: nails_courses,
      courseTeachers: nails_courseTeachers,
      courseRooms: nails_courseRooms,
      legacyClassMap: nails_legacyClassMap as Record<string, string>,
      rooms: nails_rooms,
      promotions: nails_promotions,
      holds: nails_holds,
      bookings: nails_bookings,
      branches: nails_branches,
      teacherAbsences: nails_teacherAbsences,
    },
    salon: {
      settings: salon_settings,
      users: salon_users,
      subscriptionPlans: salon_subscriptionPlans,
      students: salon_students,
      leads: salon_leads,
      subscriptions: salon_subscriptions,
      payments: salon_payments,
      installments: salon_installments,
      tasks: salon_tasks,
      taskParents: salon_taskParents,
      attendance: salon_attendance,
      courses: salon_courses,
      courseTeachers: salon_courseTeachers,
      courseRooms: salon_courseRooms,
      legacyClassMap: salon_legacyClassMap as Record<string, string>,
      rooms: salon_rooms,
      promotions: salon_promotions,
      holds: salon_holds,
      bookings: salon_bookings,
      branches: salon_branches,
      teacherAbsences: salon_teacherAbsences,
    },
    massage: {
      settings: massage_settings,
      users: massage_users,
      subscriptionPlans: massage_subscriptionPlans,
      students: massage_students,
      leads: massage_leads,
      subscriptions: massage_subscriptions,
      payments: massage_payments,
      installments: massage_installments,
      tasks: massage_tasks,
      taskParents: massage_taskParents,
      attendance: massage_attendance,
      courses: massage_courses,
      courseTeachers: massage_courseTeachers,
      courseRooms: massage_courseRooms,
      legacyClassMap: massage_legacyClassMap as Record<string, string>,
      rooms: massage_rooms,
      promotions: massage_promotions,
      holds: massage_holds,
      bookings: massage_bookings,
      branches: massage_branches,
      teacherAbsences: massage_teacherAbsences,
    },
  };
  return table[id];
}
