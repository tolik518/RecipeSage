import { router } from "../../trpc";
import { addRecipesToTrello } from "./addRecipesToTrello";
import { deleteTrelloSettings } from "./deleteTrelloSettings";
import { getTrelloSettings } from "./getTrelloSettings";
import { updateTrelloSettings } from "./updateTrelloSettings";

export const trelloRouter = router({
  addRecipesToTrello,
  deleteTrelloSettings,
  getTrelloSettings,
  updateTrelloSettings,
});
