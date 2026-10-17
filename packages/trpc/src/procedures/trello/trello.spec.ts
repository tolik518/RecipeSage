import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";
import { parseTrelloCardShortLink } from "./trelloClient";

const CARD = {
  id: "5f0c1b2a3d4e5f6a7b8c9d0e",
  name: "Einkaufsliste",
  shortUrl: "https://trello.com/c/KtgTTfPB",
};

type FetchCall = { url: URL; init: RequestInit };

const mockTrello = (
  handler: (call: FetchCall) => { status?: number; body: unknown },
) => {
  const calls: FetchCall[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const call = { url: new URL(input.toString()), init: init ?? {} };
    calls.push(call);
    const { status = 200, body } = handler(call);
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body),
      { status },
    );
  });
  return calls;
};

const trelloOk = (call: FetchCall) => {
  const path = call.url.pathname;
  if (path.startsWith("/1/cards/") && path.endsWith("/checklists")) {
    return { body: { id: `checklist-${call.url.searchParams.get("name")}` } };
  }
  if (path.includes("/checkItems")) return { body: { id: "item" } };
  if (path.startsWith("/1/cards/")) return { body: CARD };
  return { status: 404, body: "not found" };
};

const configure = (userId: string) =>
  prisma.userTrelloSettings.create({
    data: {
      userId,
      cardId: CARD.id,
      cardUrl: CARD.shortUrl,
      cardName: CARD.name,
      apiKey: "key123",
      token: "secret-token",
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseTrelloCardShortLink", () => {
  it("parses full card URLs", () => {
    expect(
      parseTrelloCardShortLink("https://trello.com/c/KtgTTfPB/8-einkaufsliste"),
    ).toEqual("KtgTTfPB");
    expect(parseTrelloCardShortLink(" https://trello.com/c/KtgTTfPB ")).toEqual(
      "KtgTTfPB",
    );
  });

  it("accepts a bare short link", () => {
    expect(parseTrelloCardShortLink("KtgTTfPB")).toEqual("KtgTTfPB");
  });

  it("rejects board links and other URLs", () => {
    expect(parseTrelloCardShortLink("https://trello.com/b/abcd1234/board")).toBe(
      null,
    );
    expect(parseTrelloCardShortLink("https://example.com/c/KtgTTfPB")).toBe(
      null,
    );
  });
});

describe("updateTrelloSettings", () => {
  test("validates the card with Trello and stores it", async ({
    trpc,
    user,
  }) => {
    const calls = mockTrello(trelloOk);

    const result = await trpc.trello.updateTrelloSettings({
      cardUrl: "https://trello.com/c/KtgTTfPB/8-einkaufsliste",
      apiKey: "key123",
      token: "secret-token",
    });

    expect(result).toEqual({ cardUrl: CARD.shortUrl, cardName: CARD.name });
    expect(calls[0].url.pathname).toEqual("/1/cards/KtgTTfPB");
    // Credentials travel in the header, never in the URL
    expect(calls[0].url.toString()).not.toContain("secret-token");
    expect(
      (calls[0].init.headers as Record<string, string>).Authorization,
    ).toContain('oauth_token="secret-token"');

    const stored = await prisma.userTrelloSettings.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(stored.cardId).toEqual(CARD.id);
    expect(stored.token).toEqual("secret-token");
  });

  test("keeps the stored token when none is given", async ({
    trpc,
    user,
  }) => {
    await configure(user.id);
    mockTrello(trelloOk);

    await trpc.trello.updateTrelloSettings({
      cardUrl: "KtgTTfPB",
      apiKey: "key456",
    });

    const stored = await prisma.userTrelloSettings.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(stored.apiKey).toEqual("key456");
    expect(stored.token).toEqual("secret-token");
  });

  test("requires a token on first setup", async ({ trpc }) => {
    await expect(
      trpc.trello.updateTrelloSettings({
        cardUrl: "KtgTTfPB",
        apiKey: "key123",
      }),
    ).rejects.toThrow("A Trello token is required");
  });

  test("rejects links that are not Trello cards", async ({ trpc }) => {
    await expect(
      trpc.trello.updateTrelloSettings({
        cardUrl: "https://trello.com/b/abcd1234/board",
        apiKey: "key123",
        token: "secret-token",
      }),
    ).rejects.toThrow("Not a valid Trello card link");
  });

  test("surfaces Trello errors and stores nothing", async ({ trpc, user }) => {
    mockTrello(() => ({ status: 401, body: "invalid token" }));

    await expect(
      trpc.trello.updateTrelloSettings({
        cardUrl: "KtgTTfPB",
        apiKey: "key123",
        token: "wrong",
      }),
    ).rejects.toThrow("Trello rejected the card or credentials (401)");

    expect(
      await prisma.userTrelloSettings.findUnique({
        where: { userId: user.id },
      }),
    ).toBeNull();
  });
});

describe("getTrelloSettings", () => {
  test("reports unconfigured", async ({ trpc }) => {
    expect(await trpc.trello.getTrelloSettings()).toEqual({
      configured: false,
      cardUrl: null,
      cardName: null,
      apiKey: null,
    });
  });

  test("never returns the token", async ({ trpc, user }) => {
    await configure(user.id);

    const result = await trpc.trello.getTrelloSettings();

    expect(result).toEqual({
      configured: true,
      cardUrl: CARD.shortUrl,
      cardName: CARD.name,
      apiKey: "key123",
    });
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });
});

describe("deleteTrelloSettings", () => {
  test("removes only the caller's settings", async ({ trpc, trpc2, user }) => {
    await configure(user.id);

    await trpc2.trello.deleteTrelloSettings();
    expect(
      await prisma.userTrelloSettings.findUnique({
        where: { userId: user.id },
      }),
    ).not.toBeNull();

    await trpc.trello.deleteTrelloSettings();
    expect(
      await prisma.userTrelloSettings.findUnique({
        where: { userId: user.id },
      }),
    ).toBeNull();
  });
});

describe("addRecipesToTrello", () => {
  test("creates one checklist per recipe with its items in order", async ({
    trpc,
    user,
  }) => {
    await configure(user.id);
    const calls = mockTrello(trelloOk);

    const result = await trpc.trello.addRecipesToTrello({
      recipes: [
        { title: "Pancakes", items: ["2 eggs", "200 g flour"] },
        { title: "Salad", items: ["1 cucumber"] },
      ],
    });

    expect(result).toEqual({
      checklistCount: 2,
      itemCount: 3,
      cardUrl: CARD.shortUrl,
    });
    expect(
      calls.map(
        (c) => `${c.init.method} ${c.url.pathname} ${c.url.searchParams.get("name")}`,
      ),
    ).toEqual([
      `POST /1/cards/${CARD.id}/checklists Pancakes`,
      "POST /1/checklists/checklist-Pancakes/checkItems 2 eggs",
      "POST /1/checklists/checklist-Pancakes/checkItems 200 g flour",
      `POST /1/cards/${CARD.id}/checklists Salad`,
      "POST /1/checklists/checklist-Salad/checkItems 1 cucumber",
    ]);
  });

  test("fails clearly when Trello is not configured", async ({ trpc }) => {
    await expect(
      trpc.trello.addRecipesToTrello({
        recipes: [{ title: "Pancakes", items: ["2 eggs"] }],
      }),
    ).rejects.toThrow("Trello is not configured");
  });

  test("reports how far it got when Trello fails midway", async ({
    trpc,
    user,
  }) => {
    await configure(user.id);
    let itemRequests = 0;
    mockTrello((call) => {
      if (call.url.pathname.includes("/checkItems") && ++itemRequests === 2) {
        return { status: 429, body: "rate limited" };
      }
      return trelloOk(call);
    });

    await expect(
      trpc.trello.addRecipesToTrello({
        recipes: [{ title: "Pancakes", items: ["2 eggs", "200 g flour"] }],
      }),
    ).rejects.toThrow('"Pancakes" after 1 item(s) were added (429)');
  });
});
