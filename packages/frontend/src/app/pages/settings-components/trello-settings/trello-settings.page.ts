import { Component, inject } from "@angular/core";
import {
  AlertController,
  ToastController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { checkboxOutline, openOutline, checkmarkCircleOutline } from "ionicons/icons";
import { addIcons } from "ionicons";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "../../../services/loading.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";

@Component({
  standalone: true,
  selector: "page-trello-settings",
  templateUrl: "trello-settings.page.html",
  styleUrls: ["trello-settings.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    InfoBlockComponent,
    TextInputComponent,
  ],
})
export class TrelloSettingsPage {
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  loaded = false;
  saving = false;

  configured = false;
  connectedCardName: string | null = null;
  connectedCardUrl: string | null = null;

  cardUrl = "";
  apiKey = "";
  token = "";

  cardUrlInvalid = false;
  apiKeyInvalid = false;
  tokenInvalid = false;

  constructor() {
    addIcons({ checkboxOutline, openOutline, checkmarkCircleOutline });
  }

  async ionViewWillEnter() {
    const settings =
      await this.serverActionsService.trello.getTrelloSettings();
    this.loaded = true;
    if (!settings) return;

    this.configured = settings.configured;
    this.connectedCardName = settings.cardName;
    this.connectedCardUrl = settings.cardUrl;
    this.cardUrl = settings.cardUrl ?? "";
    this.apiKey = settings.apiKey ?? "";
  }

  get authorizeUrl(): string | null {
    const apiKey = this.apiKey.trim();
    if (!apiKey) return null;

    const params = new URLSearchParams({
      expiration: "never",
      scope: "read,write",
      response_type: "token",
      name: "RecipeSage",
      key: apiKey,
    });
    return `https://trello.com/1/authorize?${params.toString()}`;
  }

  private async showError(message: string) {
    const header = await this.translate
      .get("pages.trelloSettings.error.header")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [{ text: okay }],
    });
    await alert.present();
  }

  async save() {
    if (this.saving) return;

    this.cardUrlInvalid = !this.cardUrl.trim();
    this.apiKeyInvalid = !this.apiKey.trim();
    // The stored token is reused when the field is left empty
    this.tokenInvalid = !this.configured && !this.token.trim();
    if (this.cardUrlInvalid || this.apiKeyInvalid || this.tokenInvalid) return;

    this.saving = true;
    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.trello.updateTrelloSettings(
        {
          cardUrl: this.cardUrl.trim(),
          apiKey: this.apiKey.trim(),
          token: this.token.trim() || undefined,
        },
        {
          400: (error) => this.showError(error.message),
        },
      );

    this.saving = false;
    loading.dismiss();
    if (!response) return;

    this.configured = true;
    this.connectedCardName = response.cardName;
    this.connectedCardUrl = response.cardUrl;
    this.cardUrl = response.cardUrl;
    this.token = "";

    const message = await this.translate
      .get("pages.trelloSettings.saved", { cardName: response.cardName })
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
    });
    toast.present();
  }

  async remove() {
    const header = await this.translate
      .get("pages.trelloSettings.remove.header")
      .toPromise();
    const message = await this.translate
      .get("pages.trelloSettings.remove.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("pages.trelloSettings.remove.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          role: "destructive",
          handler: async () => {
            const loading = this.loadingService.start();
            const response =
              await this.serverActionsService.trello.deleteTrelloSettings();
            loading.dismiss();
            if (!response) return;

            this.configured = false;
            this.connectedCardName = null;
            this.connectedCardUrl = null;
            this.cardUrl = "";
            this.apiKey = "";
            this.token = "";
          },
        },
      ],
    });

    await alert.present();
  }
}
