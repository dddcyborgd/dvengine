import { Component3DEditor } from "../../component-editor/ui-editor";
import { QuarksComponent } from "@oncyberio/engine/space/components/quarks/quarks-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class QuarksComponentEditor extends Component3DEditor<QuarksComponent> {
    //
    getGUI(): GuiGroupDescriptor {
        return {
            type: "group",
            children: {
                effect: {
                    type: "folder",
                    label: "Effect",
                    children: {
                        url: {
                            type: "file",
                            label: "Effect File",
                            value: [this.data, "url"],
                            accept: ".json",
                            acceptLabel: ".json",
                            prompt: "Upload JSON",
                            action: "upload",
                            format: {
                                format: (url: string) =>
                                    url ? { path: url } : null,
                                parse: (val: any) => val?.path ?? null,
                            },
                        },
                        autoPlay: {
                            type: "checkbox",
                            label: "Auto Play",
                            value: [this.data, "autoPlay"],
                        },
                        looping: {
                            type: "checkbox",
                            label: "Looping",
                            value: [this.data, "looping"],
                        },
                        speed: {
                            type: "number",
                            label: "Speed",
                            value: [this.data, "speed"],
                            min: 0.1,
                            max: 10,
                            step: 0.1,
                        },
                    },
                },
                playback: {
                    type: "folder",
                    label: "Playback",
                    children: {
                        play: {
                            type: "button",
                            label: "Play",
                            onAction: () => {
                                this.component.play();
                            },
                        },
                        pause: {
                            type: "button",
                            label: "Pause",
                            onAction: () => {
                                this.component.pause();
                            },
                        },
                        restart: {
                            type: "button",
                            label: "Restart",
                            onAction: () => {
                                this.component.restart();
                            },
                        },
                    },
                },
                transform: getTransformUI(this),
            },
        };
    }
}
