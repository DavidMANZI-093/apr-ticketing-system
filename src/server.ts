import express from "express";
import { createContext, t } from "./controllers/trpc";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { testRouter } from "./routes/test-router";
import { eventRouter } from "./routes/event-router";
import { prisma } from "./controllers/prisma";
import cron from "node-cron";

const appRouter = t.router({
	test: testRouter,
	event: eventRouter,
});

export type AppRouter = typeof appRouter;

const app = express();

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});

cron.schedule("* * * * *", async () => {
	try {
		await prisma.$transaction(async (tx) => {
			const result = await tx.event.updateMany({
				where: {
					active: true,
					startsAt: {
						lte: new Date(Date.now() - 5 * 60 * 1000), // lte: less than 5 minutes before new date
					},
				},
				data: {
					active: false,
				},
			});

			if (result.count > 0) {
				console.log(`Updated ${result.count} events`);
			}
		});
	} catch (error) {
		console.error("Failed to update events:", error);
	}
});
