import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { VideoComponent } from "@oncyberio/engine/space/components/video/video-component";
import { getAudioOptsUI } from "../../component-editor/ui/audio-opts-ui";
import { LEGACY_UpgradeScale } from "../legacy";

/** @internal */
export class VideoEditor extends Component3DEditor<VideoComponent> {
    //

    init() {
        //
        LEGACY_UpgradeScale(this);
    }

    _volumeFormat = {
        format(value: number) {
            return value * 100;
        },
        parse(value: number) {
            return value / 100;
        },
    };

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            preset: {
                type: "folder",
                label: "Parameters",
                children: {
                    displayMode: {
                        type: "select",
                        value: [this.data, "displayMode"],
                        items: ["flat", "curved"],
                    },
                    curvedAngle: {
                        visible: () => this.data.displayMode === "curved",
                        type: "number",
                        value: [this.data, "curvedAngle"],
                        min: 0,
                        max: Math.PI / 4,
                        step: 0.001,
                    },
                },
            },
            transform: getTransformUI(this),

            opacity: {
                type: "folder",
                label: "Opacity",
                children: {
                    opacity: {
                        type: "number",
                        value: [this.data, "opacity"],
                        min: 0,
                        max: 1,
                        step: 0.01,
                    },
                },
            },
            controls: {
                type: "folder",
                label: "Controls",
                children: {
                    autoPlay: {
                        type: "checkbox",
                        value: [this.data, "autoPlay"],
                        label: "Auto Play",
                    },
                    playAudioOpts: getAudioOptsUI([this.data, "audioType"]),
                    audioRange: {
                        visible: () => this.data.audioType === "spatial",
                        type: "number",
                        value: [this.data, "audioRange"],
                        min: 1,
                        max: 40,
                        step: 0.1,
                    },
                    volume: {
                        type: "number",
                        value: [this.data, "volume"],
                        format: this._volumeFormat,
                        min: 0,
                        max: 100,
                        step: 1,
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
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
