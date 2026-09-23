import type { GuiGroupDescriptor } from "../gui-types";
import {
    ClampToEdgeWrapping,
    LinearFilter,
    LinearMipMapLinearFilter,
    LinearMipmapLinearFilter,
    LinearMipMapNearestFilter,
    LinearSRGBColorSpace,
    MirroredRepeatWrapping,
    NearestFilter,
    NearestMipMapLinearFilter,
    NearestMipMapNearestFilter,
    NoColorSpace,
    RepeatWrapping,
    SRGBColorSpace,
} from "three";

const textureMinFilters = [
    { id: NearestFilter, label: "NearestFilter" },
    {
        id: NearestMipMapNearestFilter,
        label: "NearestMipMapNearestFilter",
    },
    {
        id: NearestMipMapLinearFilter,
        label: "NearestMipMapLinearFilter",
    },
    { id: LinearFilter, label: "LinearFilter" },
    {
        id: LinearMipMapNearestFilter,
        label: "LinearMipMapNearestFilter",
    },
    {
        id: LinearMipmapLinearFilter,
        label: "LinearMipMapLinearFilter",
    },
];

const textureMagFilters = [
    { id: NearestFilter, label: "NearestFilter" },
    {
        id: LinearFilter,
        label: "LinearFilter",
    },
];

const textureWrapModes = [
    { id: ClampToEdgeWrapping, label: "ClampToEdgeWrapping" },
    { id: RepeatWrapping, label: "RepeatWrapping" },
    { id: MirroredRepeatWrapping, label: "MirroredRepeatWrapping" },
];

const colorSpaces = [
    { id: NoColorSpace, label: "None" },
    { id: SRGBColorSpace, label: "SRGB" },
    { id: LinearSRGBColorSpace, label: "Linear" },
];

export function getTextureGui(opts): GuiGroupDescriptor {
    //

    return {
        type: "group",
        ...opts,
        children: {
            image: {
                type: "resource",
                typeof: "image",
                info: "Upload, or drag & drop here a resource from the assets panel",
                value: [...opts.path, "image"],
            },
            colorSpace: {
                type: "select",
                value: [...opts.path, "colorSpace"],
                items: colorSpaces,
            },
            mimpaps: {
                type: "checkbox",
                value: [...opts.path, "useMipMap"],
                label: "Use MipMaps",
            },
            minFilter: {
                type: "select",
                value: [...opts.path, "minFilter"],
                items: textureMinFilters,
            },
            magFilter: {
                type: "select",
                value: [...opts.path, "magFilter"],
                items: textureMagFilters,
            },
            wrapS: {
                type: "select",
                value: [...opts.path, "wrapS"],
                items: textureWrapModes,
            },
            wrapT: {
                type: "select",
                value: [...opts.path, "wrapT"],
                items: textureWrapModes,
            },
            repeat: {
                type: "xyz",
                value: [...opts.path, "repeat"],
                min: 1,
                max: 100,
            },
            ...(opts.children ?? {}),
        },
    };
}

export function getDefTextureData() {
    return {
        image: null,
        colorSpace: NoColorSpace,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        useMipMap: true,
        minFilter: LinearMipMapLinearFilter,
        magFilter: LinearFilter,
        repeat: { x: 1, y: 1 },
    };
}
