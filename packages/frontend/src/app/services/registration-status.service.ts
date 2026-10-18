import { Injectable, inject } from "@angular/core";
import { ServerActionsService } from "./server-actions.service";

const REGISTRATION_ENABLED_STORAGE_KEY = "registrationEnabled";

/**
 * Whether this server accepts new accounts (the api's DISABLE_REGISTRATION).
 * The last known answer is cached so the UI can render before the request returns.
 */
@Injectable({
  providedIn: "root",
})
export class RegistrationStatusService {
  private serverActionsService = inject(ServerActionsService);

  enabled = this.readCached() ?? true;
  private loadPromise?: Promise<boolean>;

  load(): Promise<boolean> {
    this.loadPromise ||= this.fetch();
    return this.loadPromise;
  }

  private async fetch(): Promise<boolean> {
    const response =
      await this.serverActionsService.users.getRegistrationStatus({
        "*": () => {},
      });

    if (response) {
      this.enabled = response.enabled;
      try {
        localStorage.setItem(
          REGISTRATION_ENABLED_STORAGE_KEY,
          String(response.enabled),
        );
      } catch (e) {
        // Storage unavailable; the in-memory value is still correct
      }
    } else {
      // Offline or failed, so allow a retry next time
      this.loadPromise = undefined;
    }

    return this.enabled;
  }

  private readCached(): boolean | undefined {
    try {
      const cached = localStorage.getItem(REGISTRATION_ENABLED_STORAGE_KEY);
      if (cached === "true") return true;
      if (cached === "false") return false;
    } catch (e) {
      // Storage unavailable
    }
    return undefined;
  }
}
