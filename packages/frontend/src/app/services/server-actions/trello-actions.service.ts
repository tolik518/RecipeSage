import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class TrelloActionsService extends ActionsBase {
  getTrelloSettings(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["trello"]["getTrelloSettings"] | undefined> {
    return this.passThrough(
      () => this.trpc.trello.getTrelloSettings.query(),
      errorHandlers,
    );
  }

  updateTrelloSettings(
    input: RouterInputs["trello"]["updateTrelloSettings"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["trello"]["updateTrelloSettings"] | undefined> {
    return this.passThrough(
      () => this.trpc.trello.updateTrelloSettings.mutate(input),
      errorHandlers,
    );
  }

  deleteTrelloSettings(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["trello"]["deleteTrelloSettings"] | undefined> {
    return this.passThrough(
      () => this.trpc.trello.deleteTrelloSettings.mutate(),
      errorHandlers,
    );
  }

  addRecipesToTrello(
    input: RouterInputs["trello"]["addRecipesToTrello"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["trello"]["addRecipesToTrello"] | undefined> {
    return this.passThrough(
      () => this.trpc.trello.addRecipesToTrello.mutate(input),
      errorHandlers,
    );
  }
}
