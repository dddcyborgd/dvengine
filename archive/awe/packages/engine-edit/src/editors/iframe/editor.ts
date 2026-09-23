import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { IframeComponent } from "@oncyberio/engine/space/components/iframe/iframe-component";
import { getAudioOpts, getAudioOptsUI } from "../../component-editor/ui/audio-opts-ui";

/** @internal */
export class IframeEditor extends Component3DEditor<IframeComponent> {
    //
    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            preset: {
                type: "folder",
                label: "Parameters",
                children: {
                    url: {
                        type: "text",
                        label: "URL",
                        value: [this.data, "url"],
                    },
                    display: {
                        type: "checkbox",
                        label: "Display in Live Mode",
                        value: [this.data, "display"],
                    },
                },
            },
            border: {
                type: "folder",
                label: "Border",
                children: {
                    hasBorder: {
                        type: "checkbox",
                        value: [this.data, "hasBorder"],
                        label: "Has Border",
                    },
                    borderSize: {
                        visible: () => this.data.hasBorder,
                        type: "number",
                        value: [this.data, "borderSize"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                    borderDepth: {
                        visible: () => this.data.hasBorder,
                        type: "number",
                        value: [this.data, "borderDepth"],
                        min: 0.01,
                        max: 1,
                        step: 0.01,
                    },
                    borderColor: {
                        visible: () => this.data.hasBorder,
                        type: "color",
                        value: [this.data, "borderColor"],
                    },
                    borderOpacity: {
                        visible: () => this.data.hasBorder,
                        type: "number",
                        value: [this.data, "borderOpacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                },
            },
            youtubeOpts: {
                type: "folder",
                label: "YouTube",
                visible: () =>
                    this.component._getUrlData(this.data.url)?.type ===
                    "YOUTUBE",
                children: {
                    autoPlay: {
                        type: "checkbox",
                        label: "Auto Play",
                        value: [this.data, "youtubeOpts", "autoPlay"],
                    },
                    playAudioOpts: getAudioOptsUI([
                        this.data,
                        "youtubeOpts",
                        "audioType",
                    ]),
                    audioRange: {
                        type: "number",
                        visible: () =>
                            this.data.youtubeOpts.audioType == "spatial",
                        label: "Audio Range",
                        value: [this.data, "youtubeOpts", "audioRange"],
                        min: 1,
                        max: 40,
                        step: 0.1,
                    },
                },
            },
            transform: getTransformUI(this),
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
