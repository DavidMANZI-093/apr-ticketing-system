import { z } from "zod";
import { t } from "../controllers/trpc";

export const testRouter = t.router({
	getHello: t.procedure.query(() => {
		return {
			message: `Hello World`,
		};
	}),
	postHello: t.procedure
		.input(
			z.object({
				name: z.string().optional(),
			}),
		)
		.mutation(({ input }) => {
			return {
				message: `Hello ${input.name}`,
			};
		}),
});
