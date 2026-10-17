import { capabilitiesForSubscription } from "./capabilitiesForSubscription";
import { SubscriptionModelName } from "./constants";
import { subscriptionsForUser } from "./subscriptionsForUser";
import { Capabilities } from "@recipesage/util/shared";

/**
 * Self-hosted instances have no subscriptions, but uploads there should still
 * be stored at full resolution instead of the 200x200 free-tier thumbnail.
 */
const SELFHOST_CAPABILITIES: Capabilities[] = [Capabilities.HighResImages];

export const capabilitiesForUser = async (userId: string) => {
  const activeSubscriptions = await subscriptionsForUser(userId);

  const capabilities = activeSubscriptions.reduce<Capabilities[]>(
    (acc, activeSubscription) => {
      const capabilities = capabilitiesForSubscription(
        activeSubscription.name as SubscriptionModelName,
      );
      return [...acc, ...capabilities];
    },
    [],
  );

  if (process.env.NODE_ENV === "selfhost") {
    return [...new Set([...capabilities, ...SELFHOST_CAPABILITIES])];
  }

  return capabilities;
};
