import { initTRPC } from "@trpc/server";
import { prisma } from "./prisma";

export const createContext = () => ({
	prisma,
});

export const t = initTRPC.context<typeof createContext>().create();
