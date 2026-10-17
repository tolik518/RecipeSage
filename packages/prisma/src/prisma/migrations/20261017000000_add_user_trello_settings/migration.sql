CREATE TABLE "UserTrelloSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardId" VARCHAR(255) NOT NULL,
    "cardUrl" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "apiKey" VARCHAR(255) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserTrelloSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserTrelloSettings_userId_key" ON "UserTrelloSettings"("userId");

ALTER TABLE "UserTrelloSettings" ADD CONSTRAINT "UserTrelloSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
