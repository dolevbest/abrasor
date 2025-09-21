import { createTRPCRouter } from "@/backend/trpc/create-context";
import hiRoute from "@/backend/trpc/routes/example/hi/route";
import { loginProcedure } from "@/backend/trpc/routes/auth/login/route";
import { requestAccessProcedure } from "@/backend/trpc/routes/auth/request-access/route";
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
  getAllCalculatorsProcedure
} from "@/backend/trpc/routes/calculators/management/route";
import {
  getSavedCalculationsProcedure,
  saveCalculationProcedure,
  deleteCalculationProcedure,
  clearAllCalculationsProcedure,
  getCalculationsByDateProcedure
} from "@/backend/trpc/routes/calculations/saved/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    requestAccess: requestAccessProcedure,
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
  }),
  calculations: createTRPCRouter({
    getSaved: getSavedCalculationsProcedure,
    save: saveCalculationProcedure,
    delete: deleteCalculationProcedure,
    clearAll: clearAllCalculationsProcedure,
    getByDate: getCalculationsByDateProcedure,
  }),
});

export type AppRouter = typeof appRouter;