const TRELLO_API_BASE = "https://api.trello.com/1";

export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export class TrelloApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Accepts a card URL (https://trello.com/c/KtgTTfPB/8-einkaufsliste) or a bare
 * 8 character short link, and returns the short link.
 */
export const parseTrelloCardShortLink = (input: string): string | null => {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?trello\.com\/c\/([A-Za-z0-9]+)(?:[/?#].*)?$/,
  );
  if (urlMatch) return urlMatch[1];

  if (/^[A-Za-z0-9]{8}$/.test(trimmed)) return trimmed;

  return null;
};

const trelloRequest = async <T>(
  method: "GET" | "POST",
  path: string,
  credentials: TrelloCredentials,
  params: Record<string, string> = {},
): Promise<T> => {
  const url = new URL(`${TRELLO_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      // Keeps the key and token out of the request URL
      Authorization: `OAuth oauth_consumer_key="${credentials.apiKey}", oauth_token="${credentials.token}"`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new TrelloApiError(
      response.status,
      body.trim().slice(0, 300) || response.statusText,
    );
  }

  return (await response.json()) as T;
};

export const getTrelloCard = (
  credentials: TrelloCredentials,
  idOrShortLink: string,
) =>
  trelloRequest<{ id: string; name: string; shortUrl: string }>(
    "GET",
    `/cards/${encodeURIComponent(idOrShortLink)}`,
    credentials,
    { fields: "id,name,shortUrl" },
  );

export const createTrelloChecklist = (
  credentials: TrelloCredentials,
  cardId: string,
  name: string,
) =>
  trelloRequest<{ id: string }>(
    "POST",
    `/cards/${encodeURIComponent(cardId)}/checklists`,
    credentials,
    { name },
  );

export const createTrelloCheckItem = (
  credentials: TrelloCredentials,
  checklistId: string,
  name: string,
) =>
  trelloRequest<{ id: string }>(
    "POST",
    `/checklists/${encodeURIComponent(checklistId)}/checkItems`,
    credentials,
    { name, pos: "bottom" },
  );
