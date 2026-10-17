import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT } from "@recipesage/util/shared";
import { z } from "zod";
import {
  TrelloApiError,
  createTrelloCheckItem,
  createTrelloChecklist,
} from "./trelloClient";

const CHECKLIST_NAME_LENGTH_LIMIT = 255;

export const addRecipesToTrello = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/trello/addRecipesToTrello",
      tags: ["trello"],
      summary:
        "Add one checklist per recipe, with its ingredients, to the configured Trello card",
      protect: true,
    },
  })
  .input(
    z.object({
      recipes: z
        .array(
          z.object({
            title: z.string().trim().min(1),
            items: z
              .array(
                z
                  .string()
                  .trim()
                  .min(1)
                  .max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
              )
              .min(1)
              .max(200),
          }),
        )
        .min(1)
        .max(50),
    }),
  )
  .output(
    z.object({
      checklistCount: z.number(),
      itemCount: z.number(),
      cardUrl: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const settings = await prisma.userTrelloSettings.findUnique({
      where: {
        userId: ctx.session.userId,
      },
    });

    if (!settings) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Trello is not configured. Set it up under Settings → Trello.",
      });
    }

    const credentials = { apiKey: settings.apiKey, token: settings.token };

    let checklistCount = 0;
    let itemCount = 0;

    for (const recipe of input.recipes) {
      const checklistName = recipe.title.slice(0, CHECKLIST_NAME_LENGTH_LIMIT);
      try {
        const checklist = await createTrelloChecklist(
          credentials,
          settings.cardId,
          checklistName,
        );
        checklistCount++;

        // Sequential on purpose: keeps item order and stays far below
        // Trello's per-token rate limit (100 requests / 10 seconds)
        for (const item of recipe.items) {
          await createTrelloCheckItem(credentials, checklist.id, item);
          itemCount++;
        }
      } catch (e) {
        if (e instanceof TrelloApiError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Trello request failed for "${checklistName}" after ${itemCount} item(s) were added (${e.status}): ${e.message}`,
          });
        }
        throw e;
      }
    }

    return {
      checklistCount,
      itemCount,
      cardUrl: settings.cardUrl,
    };
  });
