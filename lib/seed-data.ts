import type { VerticalId } from "@/lib/vertical";

import nhay_settings from "@/data/nhay/settings.json";
import nhay_users from "@/data/nhay/users.json";
import nhay_packages from "@/data/nhay/packages.json";
import nhay_classes from "@/data/nhay/classes.json";
import nhay_students from "@/data/nhay/students.json";
import nhay_leads from "@/data/nhay/leads.json";
import nhay_enrollments from "@/data/nhay/enrollments.json";
import nhay_payments from "@/data/nhay/payments.json";
import nhay_receivables from "@/data/nhay/receivables.json";
import nhay_tasks from "@/data/nhay/tasks.json";
import nhay_taskParents from "@/data/nhay/task-parents.json";
import nhay_attendance from "@/data/nhay/attendance.json";
import nhay_courses from "@/data/nhay/courses.json";
import nhay_rooms from "@/data/nhay/rooms.json";
import nhay_promotions from "@/data/nhay/promotions.json";
import nhay_holds from "@/data/nhay/holds.json";
import nhay_bookings from "@/data/nhay/bookings.json";
import nhay_branches from "@/data/nhay/branches.json";

import anh_settings from "@/data/anh/settings.json";
import anh_users from "@/data/anh/users.json";
import anh_packages from "@/data/anh/packages.json";
import anh_classes from "@/data/anh/classes.json";
import anh_students from "@/data/anh/students.json";
import anh_leads from "@/data/anh/leads.json";
import anh_enrollments from "@/data/anh/enrollments.json";
import anh_payments from "@/data/anh/payments.json";
import anh_receivables from "@/data/anh/receivables.json";
import anh_tasks from "@/data/anh/tasks.json";
import anh_taskParents from "@/data/anh/task-parents.json";
import anh_attendance from "@/data/anh/attendance.json";
import anh_courses from "@/data/anh/courses.json";
import anh_rooms from "@/data/anh/rooms.json";
import anh_promotions from "@/data/anh/promotions.json";
import anh_holds from "@/data/anh/holds.json";
import anh_bookings from "@/data/anh/bookings.json";
import anh_branches from "@/data/anh/branches.json";

import nhac_settings from "@/data/nhac/settings.json";
import nhac_users from "@/data/nhac/users.json";
import nhac_packages from "@/data/nhac/packages.json";
import nhac_classes from "@/data/nhac/classes.json";
import nhac_students from "@/data/nhac/students.json";
import nhac_leads from "@/data/nhac/leads.json";
import nhac_enrollments from "@/data/nhac/enrollments.json";
import nhac_payments from "@/data/nhac/payments.json";
import nhac_receivables from "@/data/nhac/receivables.json";
import nhac_tasks from "@/data/nhac/tasks.json";
import nhac_taskParents from "@/data/nhac/task-parents.json";
import nhac_attendance from "@/data/nhac/attendance.json";
import nhac_courses from "@/data/nhac/courses.json";
import nhac_rooms from "@/data/nhac/rooms.json";
import nhac_promotions from "@/data/nhac/promotions.json";
import nhac_holds from "@/data/nhac/holds.json";
import nhac_bookings from "@/data/nhac/bookings.json";
import nhac_branches from "@/data/nhac/branches.json";

import boi_settings from "@/data/boi/settings.json";
import boi_users from "@/data/boi/users.json";
import boi_packages from "@/data/boi/packages.json";
import boi_classes from "@/data/boi/classes.json";
import boi_students from "@/data/boi/students.json";
import boi_leads from "@/data/boi/leads.json";
import boi_enrollments from "@/data/boi/enrollments.json";
import boi_payments from "@/data/boi/payments.json";
import boi_receivables from "@/data/boi/receivables.json";
import boi_tasks from "@/data/boi/tasks.json";
import boi_taskParents from "@/data/boi/task-parents.json";
import boi_attendance from "@/data/boi/attendance.json";
import boi_courses from "@/data/boi/courses.json";
import boi_rooms from "@/data/boi/rooms.json";
import boi_promotions from "@/data/boi/promotions.json";
import boi_holds from "@/data/boi/holds.json";
import boi_bookings from "@/data/boi/bookings.json";
import boi_branches from "@/data/boi/branches.json";

export function loadSeed(id: VerticalId) {
  const table = {
    nhay: { settings: nhay_settings, users: nhay_users, packages: nhay_packages, classes: nhay_classes, students: nhay_students, leads: nhay_leads, enrollments: nhay_enrollments, payments: nhay_payments, receivables: nhay_receivables, tasks: nhay_tasks, taskParents: nhay_taskParents, attendance: nhay_attendance, courses: nhay_courses, rooms: nhay_rooms, promotions: nhay_promotions, holds: nhay_holds, bookings: nhay_bookings, branches: nhay_branches },
    anh: { settings: anh_settings, users: anh_users, packages: anh_packages, classes: anh_classes, students: anh_students, leads: anh_leads, enrollments: anh_enrollments, payments: anh_payments, receivables: anh_receivables, tasks: anh_tasks, taskParents: anh_taskParents, attendance: anh_attendance, courses: anh_courses, rooms: anh_rooms, promotions: anh_promotions, holds: anh_holds, bookings: anh_bookings, branches: anh_branches },
    nhac: { settings: nhac_settings, users: nhac_users, packages: nhac_packages, classes: nhac_classes, students: nhac_students, leads: nhac_leads, enrollments: nhac_enrollments, payments: nhac_payments, receivables: nhac_receivables, tasks: nhac_tasks, taskParents: nhac_taskParents, attendance: nhac_attendance, courses: nhac_courses, rooms: nhac_rooms, promotions: nhac_promotions, holds: nhac_holds, bookings: nhac_bookings, branches: nhac_branches },
    boi: { settings: boi_settings, users: boi_users, packages: boi_packages, classes: boi_classes, students: boi_students, leads: boi_leads, enrollments: boi_enrollments, payments: boi_payments, receivables: boi_receivables, tasks: boi_tasks, taskParents: boi_taskParents, attendance: boi_attendance, courses: boi_courses, rooms: boi_rooms, promotions: boi_promotions, holds: boi_holds, bookings: boi_bookings, branches: boi_branches },
  };
  return table[id];
}
