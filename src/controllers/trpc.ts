import { initTRPC } from "@trpc/server";
import { prisma } from "./prisma";
import type { Request, Response } from "express";

export const createContext = ({
	req,
	res,
}: {
	req: Request;
	res: Response;
}) => ({
	prisma,
	req,
	res,
});

export const t = initTRPC.context<typeof createContext>().create();
