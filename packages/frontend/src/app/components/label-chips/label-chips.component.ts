import { Component, Input } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

/** Recipe labels as small chips: the first few, then "+N" */
@Component({
  standalone: true,
  selector: "label-chips",
  templateUrl: "./label-chips.component.html",
  styleUrls: ["./label-chips.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class LabelChipsComponent {
  @Input({ required: true }) titles: string[] = [];
  @Input() max = 3;

  get visibleTitles(): string[] {
    return this.titles.slice(0, this.max);
  }

  get hiddenCount(): number {
    return Math.max(0, this.titles.length - this.max);
  }

  get allTitles(): string {
    return this.titles.join(", ");
  }
}
