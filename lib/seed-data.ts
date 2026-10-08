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
import nhay_classOverrides from "@/data/nhay/class-overrides.json";
import nhay_rooms from "@/data/nhay/rooms.json";
import nhay_promotions from "@/data/nhay/promotions.json";
import nhay_holds from "@/data/nhay/holds.json";
import nhay_bookings from "@/data/nhay/bookings.json";
import nhay_branches from "@/data/nhay/branches.json";
import nhay_teacherAbsences from "@/data/nhay/teacher-absences.json";

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
      classOverrides: nhay_classOverrides as { classId: string; teacherId?: string; roomId?: string; note?: string }[],
      rooms: nhay_rooms,
      promotions: nhay_promotions,
      holds: nhay_holds,
      bookings: nhay_bookings,
      branches: nhay_branches,
      teacherAbsences: nhay_teacherAbsences,
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
  };
  return table[id];
}
