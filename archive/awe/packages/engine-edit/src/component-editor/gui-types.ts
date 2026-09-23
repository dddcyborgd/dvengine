/**
 * Type definitions for the editor GUI description language.
 *
 * Each component editor declares a `gui` property (returned by `getGUI()`)
 * that describes the UI controls rendered in the studio inspector panel.
 * The GUI is a tree of descriptors: containers (group, folder) hold children,
 * and leaf descriptors represent individual controls (number, checkbox, etc.).
 *
 * The renderer lives in apps/studio render-gui.tsx.
 */

// ---------------------------------------------------------------------------
// Value binding
// ---------------------------------------------------------------------------

/**
 * A tuple that binds a control to a data property.
 * The first element is the source object; the remaining elements form a
 * property path into that object.
 *
 * Examples:
 *   [this.data, "opacity"]                          // simple
 *   [this.data, "options", "color"]                 // nested
 *   [this.data, "options", "skyOpts", "turbidity"]  // deeply nested
 *   [this, "currentTab"]                            // getter/setter on editor
 */
export type GuiValueBinding = [source: object, ...path: string[]];

/**
 * Bidirectional value transformer.
 * `format` converts the data value to the display value.
 * `parse` converts the display value back to the data value.
 * The second argument to `parse` is the previous (raw) data value.
 */
export interface GuiValueFormat<TData = any, TDisplay = any> {
    format: (value: TData) => TDisplay;
    parse: (value: TDisplay, prev?: TData) => TData;
}

/**
 * A lens-based value binding used for complex data transformations,
 * typically when the target path alone is insufficient (e.g. updating a
 * nested key inside an object stored at a single path).
 */
export interface GuiLensBinding<TData = any, TDisplay = any> {
    value: GuiValueBinding;
    format: GuiValueFormat<TData, TDisplay>;
}

/**
 * An object-based lens with `get()`/`set()` methods.
 * Used by `AbstractLens` and similar value adapters.
 */
export interface GuiObjectLens<T = any> {
    get(): T;
    set?(value: T, opts?: { isProgress: boolean }): unknown;
}

/**
 * Union of all value-binding shapes accepted by controls.
 * Includes tuple paths, lens bindings, and object-based lenses.
 *
 * Note: `unknown[]` is included because TypeScript often widens
 * `[this.data, "prop"]` tuples to plain arrays in object literals.
 */
export type GuiValue = GuiValueBinding | GuiLensBinding | GuiObjectLens | unknown[];

// ---------------------------------------------------------------------------
// Select items
// ---------------------------------------------------------------------------

/** An option in a select / icongroup / list control. */
export interface GuiSelectItem {
    id: string | number;
    label?: string;
    name?: string;
    image?: string;
    count?: string | number;
}

/**
 * Items can be a static array, a plain string/number array, or a function
 * that returns any of those (for dynamic item lists).
 * The renderer also accepts `options` as an alias for `items` on select.
 */
export type GuiItems =
    | GuiSelectItem[]
    | string[]
    | number[]
    | (() => GuiSelectItem[] | string[] | number[]);

// ---------------------------------------------------------------------------
// Preset items
// ---------------------------------------------------------------------------

/** An entry in a `presets` control. */
export interface GuiPresetItem {
    name: string;
    image: string;
    data: any;
}

// ---------------------------------------------------------------------------
// Shared optional properties
// ---------------------------------------------------------------------------

/** Properties shared by most (but not all) GUI descriptors. */
export interface GuiCommonProps {
    /** Display label. Can be a string, null (hidden), or a function. */
    label?: string | null | (() => string);
    /**
     * Alternative to `label` used in some editors.
     * The renderer falls back to `name` when `label` is absent.
     */
    name?: string;
    /**
     * Conditional visibility.
     * Can be a boolean, a function returning boolean, or a string expression
     * evaluated against the editor's data context.
     */
    visible?: boolean | string | (() => boolean);
    /** Identifier used for section state persistence. */
    slug?: string;
    /** Hide the label entirely. Equivalent to `skipLabel`. */
    noLabel?: boolean;
    /** Hide the label entirely. Equivalent to `noLabel`. */
    skipLabel?: boolean;
    /** Form-item layout mode. Defaults to "stacked" for some types. */
    layout?: "stacked" | string;
    /** Informational text / tooltip shown alongside the control. */
    info?: string;
}

// ---------------------------------------------------------------------------
// Shared input properties
// ---------------------------------------------------------------------------

/**
 * Properties shared by controls that read/write a value (most leaf controls).
 * Not used by containers or purely visual descriptors.
 */
export interface GuiInputProps {
    /** Data binding for the control value. */
    value: GuiValue;
    /** Called when the value changes (in addition to the binding write). */
    onChange?: (value: any, isProgress?: boolean) => void;
    /** Function returning whether editing is locked. */
    locked?: () => boolean;
    /** Additional options forwarded to the useInput hook. */
    opts?: any;
    /** Value transformer between data model and display. */
    format?: GuiValueFormat;
}

// ---------------------------------------------------------------------------
// Container descriptors
// ---------------------------------------------------------------------------

/**
 * Invisible container. Used as the root of every GUI tree and for
 * conditional grouping.
 * Children values can also be functions returning a descriptor (lazy eval).
 */
export interface GuiGroupDescriptor extends GuiCommonProps {
    type: "group";
    children: Record<string, GuiDescriptor | (() => GuiDescriptor)>;
    /** Inline CSS style applied to the container element. */
    style?: Record<string, string | number>;
}

/** Collapsible folder section. */
export interface GuiFolderDescriptor extends GuiCommonProps {
    type: "folder";
    children: Record<string, GuiDescriptor | (() => GuiDescriptor)>;
    /** Inline CSS style applied to the container element. */
    style?: Record<string, string | number>;
    /** Whether the folder starts expanded. Defaults to false. */
    defaultOpen?: boolean;
    /** @deprecated Use `defaultOpen`. Some editors use `expanded` instead. */
    expanded?: boolean;
    /** Called when the folder is toggled open/closed. */
    onToggle?: (collapsed: boolean) => void;
    /** Optional color variant applied to the folder container (maps to a CSS class). */
    color?: string;
}

// ---------------------------------------------------------------------------
// Leaf control descriptors
// ---------------------------------------------------------------------------

/** Numeric input with optional range constraints. */
export interface GuiNumberDescriptor extends GuiCommonProps {
    type: "number";
    value: GuiValue;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat<number, number> | object;
}

/** Boolean toggle. Alias type `"boolean"` is also accepted by the renderer. */
export interface GuiCheckboxDescriptor extends GuiCommonProps {
    type: "checkbox" | "boolean";
    value: GuiValue;
    format?: GuiValueFormat<any, boolean>;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    /** Layout mode. "row" renders the checkbox inline. */
    display?: "row";
    /** Alternative label rendered by FormItem when both label and info exist. */
    mainLabel?: string;
}

/** Dropdown, button group, slider, or list selection. */
export interface GuiSelectDescriptor extends GuiCommonProps {
    type: "select";
    value: GuiValue;
    items?: GuiItems;
    /** Alias for `items`, also accepted by the renderer. */
    options?: GuiItems;
    /** Rendering style. Default is dropdown (combo). */
    mode?: "buttons" | "slider" | "list";
    /** Allow null / empty selection. */
    nullable?: boolean;
    /** UI variant string (e.g. "big-white"). */
    ui?: string;
    /** Image sizing when items have images. */
    objectFit?: "cover" | "scale-down";
    /** Aspect ratio for image items. */
    aspectRatio?: string;
    /** Custom validation. Should throw on invalid values. */
    validate?: (value: any) => void;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/**
 * Animation selector. Rendered using the same select component as `"select"`.
 */
export interface GuiAnimationDescriptor extends GuiCommonProps {
    type: "animation";
    value: GuiValue;
    items?: GuiItems;
    options?: GuiItems;
    mode?: "buttons" | "slider" | "list";
    nullable?: boolean;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Color picker. */
export interface GuiColorDescriptor extends GuiCommonProps {
    type: "color";
    value: GuiValue;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/**
 * Single-line text input. Alias type `"string"` is also accepted.
 * When `isSecret` is true, renders a secret/password input instead.
 */
export interface GuiTextDescriptor extends GuiCommonProps {
    type: "text" | "string";
    value: GuiValue;
    /** Conditional or static disabled state. */
    disabled?: boolean | (() => boolean);
    /** Custom validation. Should throw on invalid values. */
    validate?: (value: string) => void;
    /** @deprecated Use `validate`. Some editors use `onValidate`. */
    onValidate?: (value: string) => void;
    /** When true, renders as a masked secret input. */
    isSecret?: boolean;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Multi-line text input. */
export interface GuiTextareaDescriptor extends GuiCommonProps {
    type: "textarea";
    value: GuiValue;
    disabled?: boolean | (() => boolean);
    validate?: (value: string) => void;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/**
 * 3D vector (x, y, z) input. Used for position, rotation, scale.
 * Alias type `"vec3"` is also accepted by the renderer.
 */
export interface GuiXYZDescriptor extends GuiCommonProps {
    type: "xyz" | "vec3";
    value: GuiValue;
    min?: number;
    max?: number;
    step?: number;
    /** When false, renders each axis on its own row. Default is true. */
    inline?: boolean;
    /** Function returning whether the axes are locked. */
    locked?: () => boolean;
    onChange?: (value: any, isProgress?: boolean) => void;
    opts?: any;
    format?: GuiValueFormat;
}

/** Action button. */
export interface GuiButtonDescriptor extends GuiCommonProps {
    type: "button";
    /** Click handler. Receives the DOM event object. */
    onAction: (event?: any) => void | Promise<void>;
    /** Conditional or static disabled state. */
    disabled?: boolean | (() => boolean);
    /** Whether the button acts as a form submit. */
    form?: boolean;
}

/** Image / HDR file upload. */
export interface GuiImageDescriptor extends GuiCommonProps {
    type: "image";
    value: GuiValue;
    /** Upload action type. */
    action?: "upload";
    /** Accepted MIME types and extensions. */
    accept?: string;
    /** User-friendly string describing accepted formats. */
    acceptLabel?: string;
    /** Display mode. When "s", a compact layout is used. */
    display?: string;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Generic file upload (e.g. .fbx for animations). */
export interface GuiFileDescriptor extends GuiCommonProps {
    type: "file";
    value: GuiValue | (() => any);
    /** Upload action type. */
    action?: "buffer" | "upload" | "upload-optimize";
    /** Accepted file extensions. */
    accept?: string;
    /** User-friendly string describing accepted formats. */
    acceptLabel?: string;
    /** Max file size in megabytes. */
    maxSize?: number;
    /** Text shown on the upload button. */
    prompt?: string;
    /** Helper text shown below the control. */
    note?: string;
    /** Display mode. */
    display?: string;
    /** Conditional or static disabled state. */
    disabled?: boolean | (() => boolean);
    onChange?: (value: any) => void | Promise<void>;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Visual preset selector with thumbnail images. */
export interface GuiPresetsDescriptor extends GuiCommonProps {
    type: "presets";
    items: GuiPresetItem[];
    /** Data-binding target that receives the selected preset data. */
    source: GuiValueBinding;
    /** Image sizing mode. */
    objectFit?: "cover" | "scale-down";
    /** Called when a preset is selected. */
    onChange?: (value: any) => void;
}

/** Resource reference selector (model, image, avatar, etc.). */
export interface GuiResourceDescriptor extends GuiCommonProps {
    type: "resource";
    value: GuiValue;
    /** The kind of resource. */
    typeof: "image" | "avatar" | string;
    /** Whether a resource must be provided. */
    required?: boolean;
    /** Available resource items (when a fixed set). */
    items?: GuiItems;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Component reference selector. */
export interface GuiComponentDescriptor extends GuiCommonProps {
    type: "component";
    value: GuiValue;
    /** The kind of component to filter by. */
    typeof?: string;
    /** Whether a component must be provided. */
    required?: boolean;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Array / list control with dynamic items. */
export interface GuiListDescriptor extends GuiCommonProps {
    type: "list";
    value: GuiValue;
    items: GuiItems;
    format?: GuiValueFormat;
    /** Label shown when the list is empty. */
    emptyLabel?: string;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
}

/** Icon-based button group (e.g. text alignment). */
export interface GuiIconGroupDescriptor extends GuiCommonProps {
    type: "icongroup";
    value: GuiValue;
    items: GuiSelectItem[];
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
    format?: GuiValueFormat;
}

/** Event / method receiver for inter-component communication. */
export interface GuiReceiverDescriptor extends GuiCommonProps {
    type: "receiver";
    value: GuiValue;
    defaultValue?: any;
    dataKey?: string;
    methodKey?: string;
    onChange?: (value: any, isProgress?: boolean) => void;
    locked?: () => boolean;
    opts?: any;
}

/** Signal indicator (read-only display of signal state). */
export interface GuiSignalDescriptor extends GuiCommonProps {
    type: "signal";
}

/** Static image display (non-interactive). */
export interface GuiStaticImageDescriptor extends GuiCommonProps {
    type: "staticimage";
    image: string;
    backgroundColor?: string;
    disabled?: boolean | (() => boolean);
}

// ---------------------------------------------------------------------------
// Collection descriptors
// ---------------------------------------------------------------------------

/** Dynamic array editor. Each item is rendered from `itemGui`. */
export interface GuiArrayDescriptor extends GuiCommonProps {
    type: "array";
    value: GuiValue;
    /** Function returning the GUI descriptor for item at index. */
    itemGui: (index: number) => GuiDescriptor;
    /** Display type for items. */
    itemType?: string;
}

/** Key-value map editor. */
export interface GuiMapDescriptor extends GuiCommonProps {
    type: "map";
    value: GuiValue;
    /** Function returning the GUI descriptor for an entry. */
    itemGui: (key: string, index: number) => GuiDescriptor;
    /** Display type for items. */
    itemType?: string;
    /** When true, keys cannot be edited. */
    readonly?: boolean;
    /** Validate a key at the given index. Should throw on invalid. */
    validateKey?: (key: string, index: number) => void;
}

// ---------------------------------------------------------------------------
// Layout descriptors
// ---------------------------------------------------------------------------

/**
 * Horizontal/vertical layout container.
 * Unlike group/folder, children is an ordered array, not a keyed record.
 */
export interface GuiLayoutDescriptor extends GuiCommonProps {
    type: "layout";
    children: GuiDescriptor[];
    /** Gap between children in pixels. */
    gap?: number;
}

/** Toolbar with a list of action buttons. */
export interface GuiToolbarDescriptor extends GuiCommonProps {
    type: "toolbar";
    actions: Array<{
        label?: string;
        icon?: string;
        onAction: () => void | Promise<void>;
        disabled?: boolean | (() => boolean);
    }>;
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

/** Any GUI descriptor node. */
export type GuiDescriptor =
    // containers
    | GuiGroupDescriptor
    | GuiFolderDescriptor
    | GuiLayoutDescriptor
    // numeric / boolean
    | GuiNumberDescriptor
    | GuiCheckboxDescriptor
    // selection
    | GuiSelectDescriptor
    | GuiIconGroupDescriptor
    // text
    | GuiColorDescriptor
    | GuiTextDescriptor
    | GuiTextareaDescriptor
    // spatial
    | GuiXYZDescriptor
    // actions
    | GuiButtonDescriptor
    | GuiToolbarDescriptor
    // media
    | GuiImageDescriptor
    | GuiFileDescriptor
    | GuiPresetsDescriptor
    | GuiStaticImageDescriptor
    // collections
    | GuiArrayDescriptor
    | GuiMapDescriptor
    // domain-specific
    | GuiResourceDescriptor
    | GuiComponentDescriptor
    | GuiListDescriptor
    | GuiAnimationDescriptor
    | GuiReceiverDescriptor
    | GuiSignalDescriptor;

/** The root of every editor GUI tree. Always a group. */
export type GuiRoot = GuiGroupDescriptor;
