import { createTRPCRouter } from "@/backend/trpc/create-context";
import hiRoute from "@/backend/trpc/routes/example/hi/route";
import { loginProcedure } from "@/backend/trpc/routes/auth/login/route";
import { requestAccessProcedure } from "@/backend/trpc/routes/auth/request-access/route";
import { upgradeGuestProcedure } from "@/backend/trpc/routes/auth/upgrade-guest/route";
import { 
  getUsersProcedure, 
  getAccessRequestsProcedure, 
  approveRequestProcedure, 
  rejectRequestProcedure,
  updateUserProcedure 
} from "@/backend/trpc/routes/users/management/route";
import {
  getCalculatorsProcedure,
  getCalculatorByIdProcedure,
  trackUsageProcedure,
  createCalculatorProcedure,
  updateCalculatorProcedure,
  deleteCalculatorProcedure,
  getAllCalculatorsProcedure,
  resetCalculatorsProcedure,
  clearCorruptedCalculatorsProcedure
} from "@/backend/trpc/routes/calculators/management/route";
import {
  getSavedCalculationsProcedure,
  saveCalculationProcedure,
  deleteCalculationProcedure,
  clearAllCalculationsProcedure,
  getCalculationsByDateProcedure
} from "@/backend/trpc/routes/calculations/saved/route";
import {
  getNotificationsProcedure,
  markNotificationReadProcedure,
  deleteNotificationProcedure,
  clearNotificationsProcedure,
  createNotificationProcedure
} from "@/backend/trpc/routes/settings/notifications/route";
import {
  getUserSettingsProcedure,
  updateUserSettingsProcedure
} from "@/backend/trpc/routes/settings/user-settings/route";
import {
  createVisitorSessionProcedure,
  getVisitorSessionProcedure,
  saveVisitorCalculationProcedure,
  getVisitorCalculationsProcedure,
  clearVisitorCalculationsProcedure,
  getVisitorSettingsProcedure,
  cleanupOldVisitorSessionsProcedure
} from "@/backend/trpc/routes/visitors/management/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    requestAccess: requestAccessProcedure,
    upgradeGuest: upgradeGuestProcedure,
  }),
  users: createTRPCRouter({
    getAll: getUsersProcedure,
    getAccessRequests: getAccessRequestsProcedure,
    approveRequest: approveRequestProcedure,
    rejectRequest: rejectRequestProcedure,
    update: updateUserProcedure,
  }),
  calculators: createTRPCRouter({
    getAll: getCalculatorsProcedure,
    getById: getCalculatorByIdProcedure,
    trackUsage: trackUsageProcedure,
    create: createCalculatorProcedure,
    update: updateCalculatorProcedure,
    delete: deleteCalculatorProcedure,
    getAllAdmin: getAllCalculatorsProcedure,
    reset: resetCalculatorsProcedure,
    clearCorrupted: clearCorruptedCalculatorsProcedure,
  }),
  calculations: createTRPCRouter({
    getSaved: getSavedCalculationsProcedure,
    save: saveCalculationProcedure,
    delete: deleteCalculationProcedure,
    clearAll: clearAllCalculationsProcedure,
    getByDate: getCalculationsByDateProcedure,
  }),
  settings: createTRPCRouter({
    notifications: createTRPCRouter({
      getAll: getNotificationsProcedure,
      markRead: markNotificationReadProcedure,
      delete: deleteNotificationProcedure,
      clearAll: clearNotificationsProcedure,
      create: createNotificationProcedure,
    }),
    userSettings: createTRPCRouter({
      get: getUserSettingsProcedure,
      update: updateUserSettingsProcedure,
    }),
  }),
  visitors: createTRPCRouter({
    createSession: createVisitorSessionProcedure,
    getSession: getVisitorSessionProcedure,
    saveCalculation: saveVisitorCalculationProcedure,
    getCalculations: getVisitorCalculationsProcedure,
    clearCalculations: clearVisitorCalculationsProcedure,
    getSettings: getVisitorSettingsProcedure,
    cleanupOldSessions: cleanupOldVisitorSessionsProcedure,
  }),
});

export type AppRouter = typeof appRouter;