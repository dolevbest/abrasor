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
});

export type AppRouter = typeof appRouter;