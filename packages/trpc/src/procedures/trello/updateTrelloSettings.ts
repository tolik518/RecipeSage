import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  TrelloApiError,
  getTrelloCard,
  parseTrelloCardShortLink,
} from "./trelloClient";

export const updateTrelloSettings = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/trello/updateTrelloSettings",
      tags: ["trello"],
      summary: "Set the Trello card and credentials used for shopping lists",
      protect: true,
    },
  })
  .input(
    z.object({
      cardUrl: z.string().trim().min(1).max(2048),
      apiKey: z.string().trim().min(1).max(255),
      /**
       * Optional so the card can be changed without re-entering the token.
       * Required when no token has been stored yet.
       */
      token: z.string().trim().min(1).max(1024).optional(),
    }),
  )
  .output(
    z.object({
      cardUrl: z.string(),
      cardName: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const shortLink = parseTrelloCardShortLink(input.cardUrl);
    if (!shortLink) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not a valid Trello card link",
      });
    }

    const existing = await prisma.userTrelloSettings.findUnique({
      where: {
        userId: ctx.session.userId,
      },
      select: {
        token: true,
      },
    });

    const token = input.token ?? existing?.token;
    if (!token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A Trello token is required",
      });
    }

    const credentials = { apiKey: input.apiKey, token };

    let card: Awaited<ReturnType<typeof getTrelloCard>>;
    try {
      card = await getTrelloCard(credentials, shortLink);
    } catch (e) {
      if (e instanceof TrelloApiError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Trello rejected the card or credentials (${e.status}): ${e.message}`,
        });
      }
      throw e;
    }

    const data = {
      cardId: card.id,
      cardUrl: card.shortUrl,
      cardName: card.name,
      apiKey: input.apiKey,
      token,
    };

    await prisma.userTrelloSettings.upsert({
      where: {
        userId: ctx.session.userId,
      },
      create: {
        userId: ctx.session.userId,
        ...data,
      },
      update: data,
    });

    return {
      cardUrl: card.shortUrl,
      cardName: card.name,
    };
  });
