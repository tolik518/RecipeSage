import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getTrelloSettings = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/trello/getTrelloSettings",
      tags: ["trello"],
      summary: "Get the caller's Trello shopping list settings",
      protect: true,
    },
  })
  .output(
    z.object({
      configured: z.boolean(),
      cardUrl: z.string().nullable(),
      cardName: z.string().nullable(),
      apiKey: z.string().nullable(),
    }),
  )
  .query(async ({ ctx }) => {
    const settings = await prisma.userTrelloSettings.findUnique({
      where: {
        userId: ctx.session.userId,
      },
      select: {
        cardUrl: true,
        cardName: true,
        apiKey: true,
      },
    });

    // The token is never sent back to the client
    return {
      configured: !!settings,
      cardUrl: settings?.cardUrl ?? null,
      cardName: settings?.cardName ?? null,
      apiKey: settings?.apiKey ?? null,
    };
  });
