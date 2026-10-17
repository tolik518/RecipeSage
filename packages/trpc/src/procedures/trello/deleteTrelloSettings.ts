import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const deleteTrelloSettings = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/trello/deleteTrelloSettings",
      tags: ["trello"],
      summary: "Remove the caller's Trello shopping list settings",
      protect: true,
    },
  })
  .output(z.string())
  .mutation(async ({ ctx }) => {
    await prisma.userTrelloSettings.deleteMany({
      where: {
        userId: ctx.session.userId,
      },
    });

    return "Ok";
  });
