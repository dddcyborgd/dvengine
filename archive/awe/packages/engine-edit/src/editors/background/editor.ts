import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { presetImages } from "@oncyberio/engine/space/components/background/data";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";

const imagesOpts = Object.values(presetImages);

const backgroundPresets = [
    {
        name: "Space",
        image: presetImages.space.image,
        data: {
            options: { type: "image", imageId: "space" },
        },
    },
    {
        name: "Day",
        image: presetImages.day.image,
        data: {
            options: { type: "image", imageId: "day" },
        },
    },
    {
        name: "Day 2",
        image: presetImages.day2.image,
        data: {
            options: { type: "image", imageId: "day2" },
        },
    },
    {
        name: "Orbit",
        image: presetImages.orbit.image,
        data: {
            options: { type: "image", imageId: "orbit" },
        },
    },
    {
        name: "Orbit 2",
        image: presetImages.orbit2.image,
        data: {
            options: { type: "image", imageId: "orbit2" },
        },
    },
    {
        name: "Mountains",
        image: presetImages.moutains.image,
        data: {
            options: { type: "image", imageId: "mountains" },
        },
    },
    {
        name: "Mud Road",
        image: presetImages.mud_road.image,
        data: {
            options: { type: "image", imageId: "mud_road" },
        },
    },
    {
        name: "Night",
        image: presetImages.night.image,
        data: {
            options: { type: "image", imageId: "night" },
        },
    },
    {
        name: "Morning",
        image: "https://cyber.mypinata.cloud/ipfs/QmfAauFSAcR3nXoNMKCuJoyTVLyPeNBZPnyVsuzQTatuBj",
        data: {
            options: {
                type: "sky",
                skyOpts: {
                    turbidity: 4,
                    rayleigh: 3,
                    mieCoefficient: 0.005,
                    mieDirectionalG: 0.07,
                    azimuth: 180,
                    elevation: 2,
                },
            },
        },
    },
    // {
    //     name: "Black",
    //     image: "https://cyber.mypinata.cloud/ipfs/QmRcoNnV7aRZdstD2wi2MJCYmGGwUwd125BNf4WBCLy88W",
    //     data: {
    //         options: {
    //             type: "color",
    //             color: "#000000",
    //         },
    //     },
    // },
];

type BackgroundOpt = "Color" | "Image" | "Shader";

/** @internal */
export class BackgroundEditor extends Component3DEditor<Component3D<any>> {
    //
    _currentTab: BackgroundOpt = "Image";

    get currentTab() {
        return this._currentTab;
    }

    set currentTab(value) {
        this._currentTab = value;
        if (value === "Color") {
            this.data.options.type = "color";
            this.data.options.color ??= "#000000";
        } else if (value === "Shader") {
            this.data.options.type = "sky";
            this.data.options.skyOpts ??= {
                turbidity: 10,
                rayleigh: 3,
                mieCoefficient: 0.005,
                mieDirectionalG: 0.7,
                azimuth: 180,
                elevation: 2,
            };
        } else if (value === "Image") {
            this.data.options.type = "image";
            this.data.options.imageId ??= "day2";
        }
    }

    get customUpload() {
        if (
            this.data.options.type === "image" &&
            this.data.options.imageId === "custom"
        ) {
            return {
                path: this.data.options.imagePath,
                format: this.data.options.imageFormat,
            };
        }

        return null;
    }

    set customUpload(value) {
        //
        if (value?.path) {
            //
            this.data.options.type = "image";
            this.data.options.imageId = "custom";
            this.data.options.imagePath = value.path;
            this.data.options.imageFormat = value.format;
        } else {
            this.data.options.type = "image";
            this.data.options.imageId = "day2";
            this.data.options.imagePath = undefined;
            this.data.options.imageFormat = undefined;
        }
    }

    gui: GuiGroupDescriptor = {
        type: "group",
        children: {
            type: {
                type: "folder",
                label: "Style",
                defaultOpen: true,
                children: {
                    type: {
                        type: "select",
                        items: ["Image", "Color", "Shader"],
                        skipLabel: true,
                        mode: "buttons",
                        value: [this, "currentTab"],
                    },
                    imagePresets: {
                        type: "presets",
                        label: "Image Presets",
                        items: backgroundPresets,
                        objectFit: "cover",
                        source: [this, "data"],
                        visible: () => this.currentTab === "Image",
                    },
                    colorOpts: {
                        type: "group",
                        visible: () => this.currentTab === "Color",
                        children: {
                            color: {
                                type: "color",
                                value: [this.data, "options", "color"],
                            },
                        },
                    },
                    textureOpts: {
                        type: "group",
                        visible: () => this.currentTab == "Shader",
                        children: {
                            turbidity: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "turbidity",
                                ],
                                min: 0,
                                max: 12,
                                step: 1,
                            },
                            rayleigh: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "rayleigh",
                                ],
                                min: 0,
                                max: 4,
                                step: 0.01,
                            },
                            mieCoefficient: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "mieCoefficient",
                                ],
                                min: 0,
                                max: 0.1,
                                step: 0.01,
                            },
                            mieDirectionalG: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "mieDirectionalG",
                                ],
                                min: 0,
                                max: 0.1,
                                step: 0.001,
                            },
                            azimuth: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "azimuth",
                                ],
                                min: -180,
                                max: 180,
                                step: 1,
                            },
                            elevation: {
                                type: "number",
                                value: [
                                    this.data,
                                    "options",
                                    "skyOpts",
                                    "elevation",
                                ],
                                min: 0,
                                max: 90,
                                step: 1,
                            },
                        },
                    },
                },
            },

            customUpload: {
                type: "folder",
                label: "Custom Upload",
                defaultOpen: this.data.options.imageId === "custom",
                visible: () => this.currentTab === "Image",
                children: {
                    textureOpts: {
                        type: "group",
                        children: {
                            customImage: {
                                type: "image",
                                label: "Custom Upload",
                                value: [this, "customUpload"],
                                action: "upload",
                                accept: "image/png, image/jpeg, image/jpg, .hdr",
                                acceptLabel: ".png .jpg .hdr",
                            },
                        },
                    },
                },
            },
        },
    };

    getGUI(): GuiGroupDescriptor {
        return this.gui;
    }
}
