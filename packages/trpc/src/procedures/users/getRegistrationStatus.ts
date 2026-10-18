import { publicProcedure } from "../../trpc";
import { z } from "zod";

export const getRegistrationStatus = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getRegistrationStatus",
      tags: ["users"],
      summary: "Check whether new accounts can be registered on this server",
      protect: false,
    },
  })
  .output(
    z.object({
      enabled: z.boolean(),
    }),
  )
  .query(() => {
    return {
      enabled: process.env.DISABLE_REGISTRATION !== "true",
    };
  });
