import emitter from "@oncyberio/engine/internal/engine-emitter";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { VRMAnimsComponent } from "@oncyberio/engine/space/components/vrmanims/vrm-anims-component";
import { fbxToJSON } from "@oncyberio/engine/space/components/vrmanims/fbxtojson";
import { VRMAnimationData } from "@oncyberio/engine/space/components/vrmanims/vrm-anim-data";
import { hash, stableStringify } from "@oncyberio/engine/internal/utils/js";

const defaultAnims = {
  idle: true,
  walk: true,
  jump: true,
  run: true,
  fly: true,
  sitting: true,
};

const defaultOptions = [
  {
    id: "idle",
    name: "Idle",
    data: {
      defaultPreset: "idle",
    },
  },
  {
    id: "walk",
    name: "Walk",
    data: {
      defaultPreset: "walk",
    },
  },
  {
    id: "jump",
    name: "Jump",
    data: {
      defaultPreset: "jump",
    },
  },
  {
    id: "run",
    name: "Run",
    data: {
      defaultPreset: "run",
    },
  },
  {
    id: "fly",
    name: "Fly",
    data: {
      defaultPreset: "fly",
    },
  },
  {
    id: "sitting",
    name: "Sitting",
    data: {
      defaultPreset: "sitting",
    },
  },
];

const defaultAnimNames = Object.keys(defaultAnims);

/** @internal */
export class VRMAnimComponentEditor extends Component3DEditor<VRMAnimsComponent> {
  //
  // _currentSelection = null;

  // get currentSelection() {
  //     return this._currentSelection;
  // }

  // set currentSelection(value) {
  //     // console.trace("set currentSelection", value);
  //     this._currentSelection = value?.id || value;
  // }

  _currentTab: "official" | "uploaded" = "official";

  isCustomAnim(name: string) {
    //
    return defaultAnims[name?.toLowerCase()] == null;
  }

  getAnimByName(name: string) {
    //
    const id = Object.keys(this.data.anims).find((key) => {
      //
      return this.data.anims[key].name.toLowerCase() === name.toLowerCase();
    });

    if (id == null) return null;

    return {
      id,
      data: this.data.anims[id],
    };
  }

  async getAnimExports(anims: Record<string, any>) {
    //
    let exports = {};

    await Promise.all(
      Object.keys(anims).map(async (key) => {
        //
        let anim = anims[key];

        if (!anim.url) {
          //
          let bake = this.component._json[key];

          let hash = anim.hash;

          if (!hash) {
            //
            hash = await this._hashBake(bake);
          }

          // upload the unpacked bake
          let url = await this.uploadJSON({
            id: hash,
            json: bake,
            isUnique: true,
            overwrite: false,
          });

          anim = {
            ...anim,
            url,
            hash,
          };
        }

        exports[key] = anim;
      }),
    );

    return exports;
  }

  private _hashBake(bake) {
    //
    if (bake == null) return null;

    let { name, uuid, ...rest } = bake;

    return hash(rest);
  }

  async mergeData(
    srcData: { anims: Record<string, VRMAnimationData> },
    select: Record<string, { animName: string; curName: string }>,
  ) {
    //
    const selectKeys = Object.keys(srcData.anims).filter(
      (key) => select == null || select[key],
    );

    let customIdx = this._genNextCustomKeyIdx();

    let newAnims = {
      ...this.component.data.anims,
    };

    // ensure all current anims have hashes
    let curAnims: Record<string, VRMAnimationData> = {};

    console.time("merge anims/ensure hashes");
    await Promise.all(
      Object.keys(this.component.data.anims).map(async (key) => {
        //
        let anim = this.component.data.anims[key];

        if (!anim.hash) {
          //
          let bake = this.component._json[key];

          let hash = await this._hashBake(bake);

          anim = {
            ...anim,
            hash,
          };
        }

        curAnims[key] = anim;
      }),
    );
    console.timeEnd("merge anims/ensure hashes");

    selectKeys.map((srcKey) => {
      //
      // Plan
      // If the incoming anime exists in the current data:
      //     - If the names are the same, do nothing
      //     - If the names are different, update the incoming name to the existing name
      // If the incoming anime does not exist in the current data
      //     - If the incoming anim uses an existing name, generate a new name (eg hiphop -> hiphop-1)
      //     - Create an incremental key (custom-1, custom-2, etc) and add the incoming anim to the data

      const srcAnim = srcData.anims[srcKey];

      let existingKey = Object.keys(curAnims).find((key) => {
        //
        const dstAnim = curAnims[key];

        return this._isSameAnim(srcAnim, dstAnim);
      });

      if (existingKey) {
        //
        const existingAnim = this.data.anims[existingKey];

        if (existingAnim.name !== srcAnim.name) {
          //
          srcAnim.name = existingAnim.name;
        }
      } else {
        //
        let newKey = `custom-${customIdx++}`;

        // check if the incoming anim uses an existing name
        let matchAnim = Object.values(this.data.anims).find((it) => {
          //
          return it.name.toLowerCase() === srcAnim.name.toLowerCase();
        });

        let idx = 0;

        while (matchAnim) {
          // generate a new name
          srcAnim.name = `${srcAnim.name}-${++idx}`;

          matchAnim = Object.values(this.data.anims).find((it) => {
            //
            return it.name.toLowerCase() === srcAnim.name.toLowerCase();
          });
        }

        newAnims[newKey] = srcAnim;
      }
    });

    return {
      anims: newAnims,
    };
  }

  private _isSameAnim(anim1: VRMAnimationData, anim2: VRMAnimationData) {
    //
    return (
      anim1.name === anim2.name &&
      anim1.loop === anim2.loop &&
      anim1.timeScale === anim2.timeScale &&
      anim1.hash &&
      anim2.hash &&
      anim1.hash === anim2.hash
    );
  }

  private _genNextCustomKeyIdx() {
    //
    const keys = Object.keys(this.data.anims);

    let max = 0;

    for (let i = 0; i < keys.length; i++) {
      //
      const key = keys[i];

      if (key.startsWith("custom-")) {
        //
        const num = parseInt(key.split("-")[1]);

        if (num > max) {
          max = num;
        }
      }
    }

    return max + 1;
  }

  async setAnimData(data: { anims: any }) {
    //
    this.data.anims = data.anims;
  }

  get currentTab() {
    return this._currentTab;
  }

  set currentTab(value) {
    this._currentTab = value;
  }

  _visibleParams = {};

  getAnimUpload(id: string = null) {
    //
    const meta = {};

    const isNewUpload = id == null;

    let anim: Partial<VRMAnimationData> = this.data.anims[id] ?? {};

    const isCustom = defaultAnims[id] == null;

    const hasUpload = anim.fileName;

    const key = isNewUpload ? "add-upload" : id;

    meta[key] = {
      type: "file",
      label: isCustom || isNewUpload ? () => anim.name || id : null,
      noLabel: !isCustom && !isNewUpload,
      value: () => {
        return { path: anim.fileName };
      },
      prompt: isCustom || isNewUpload ? "Upload FBX" : "Override with FBX",
      note:
        hasUpload && !isCustom
          ? "Delete this .fbx to revert to the original"
          : "",
      action: "buffer",
      accept: ".fbx",
      maxSize: 60,
      display: "s",
      acceptLabel: ".fbx (60MB max)",
      onChange: async (val) => {
        //
        if (!val && !isNewUpload) {
          await new Promise((resolve) => {
            setTimeout(resolve, 10);
          });

          await this.deleteAnim(id);
        } else {
          //
          this.updateUI();

          let name = id;

          if (isNewUpload) {
            //
            id = `custom-${this._genNextCustomKeyIdx()}`;
            name =
              val.name?.replace(".fbx", "").replace(/_/g, " ").trim() || id;
            //
          } else if (isCustom) {
            //
            name = anim.name;
          }

          await this.addAnim(id, name, val);
        }
      },
    };

    return meta;
  }

  _propAt = (id, prop) => {
    //
    return {
      value: [this.data, "anims"],
      format: {
        format: (v) => v[id][prop],
        parse: (val, anims) => {
          return {
            ...anims,
            [id]: {
              ...anims[id],
              [prop]: val,
            },
          };
        },
      },
    };
  };

  getAnimProperties(id: string) {
    //

    const isCustom = defaultAnims[id] == null;

    const meta = {};

    meta[`${id}-params`] = {
      type: "group",
      label: "",
      children: {
        loop: {
          type: "checkbox",
          label: "Loop",
          ...this._propAt(id, "loop"),
        },
        timeScale: {
          type: "number",
          label: "Speed",
          ...this._propAt(id, "timeScale"),
          min: 0.01,
          max: 4,
          step: 0.01,
        },
      },
    };

    if (isCustom) {
      const name = {
        type: "text",
        label: "Name",
        ...this._propAt(id, "name"),
        disabled: () => defaultAnims[id],
        onValidate: (val) => {
          this.validateName(val, id);
        },
      };

      meta[`${id}-params`].children["name"] = name;
    }

    return meta;
  }

  // async promptName() {
  //     //
  //     const name = await this.showPrompt({
  //         message: "Enter animation name",
  //         onSubmit: (name) => {
  //             //
  //             this.validateName(name);
  //         },
  //     });

  //     return name;
  // }

  validateName(name: string, id?: string) {
    // must not be empty
    // must contain only letters, number, underscore, dashes, and not start with number
    // must be unique

    const regex = /^[a-zA-Z_][a-zA-Z0-9_-]*/;

    if (!name) {
      throw new Error("Name is required");
    } else if (!regex.test(name)) {
      throw new Error(
        "Name must contain only letters, numbers, underscore and dashes",
      );
    } else if (
      defaultAnims[name] ||
      Object.keys(this.data.anims ?? {}).find((key) => {
        // except current
        return key !== id && this.data.anims[key]?.name === name;
      })
    ) {
      throw new Error("Name " + name + " already exists");
    }
  }

  isPackedAnim(id: string) {
    //
    return this.component._json?.[id] != null;
  }

  getPackedUploadId() {
    //
    return `${this.component.space.options.game.id}-${this.data.id}-default`;
  }

  addAnim(id, name, upload) {
    //
    if (this.isPackedAnim(id)) {
      return this.addPackedAnim(id, name, upload);
    } else {
      return this.addUnpackedAnim(id, name, upload);
    }
  }

  async addPackedAnim(id, name, upload) {
    //
    if (!upload?.buffer) return;

    try {
      let res = await this._getAnimBake(id, name, upload.buffer);

      if (res == null) return;

      let { bake, hash } = res;

      const newJson = {
        ...this.component._json,
        [id]: bake,
      };

      let url = await this.uploadJSON({
        id: this.getPackedUploadId(),
        json: newJson,
        isUnique: true,
        overwrite: true,
      });

      const anim = {
        fileName: upload.name,
        name,
        loop: true,
        timeScale: 1,
        hash,
      };

      this.dispatchDataChange({
        url,
        anims: {
          ...this.data.anims,
          [id]: anim,
        },
      });

      this._visibleParams[id] = true;

      this.component._json = newJson;
    } catch (err) {
      console.error(err);

      alert("Error uploading animation " + err.message);
    }
  }

  async addUnpackedAnim(id, name, upload) {
    //
    if (!upload?.buffer) return;

    try {
      let res = await this._getAnimBake(id, name, upload.buffer);

      if (res == null) return;

      let url = await this.uploadJSON({
        id: res.hash,
        json: res.bake,
        isUnique: true,
        overwrite: false,
      });

      const anim = {
        fileName: upload.name,
        name,
        loop: true,
        timeScale: 1,
        url,
        hash: res.hash,
      };

      this.dispatchDataChange({
        anims: {
          ...this.data.anims,
          [id]: anim,
        },
      });

      this._visibleParams[id] = true;
      //
    } catch (err) {
      //
      console.error(err);

      alert("Error uploading animation " + err.message);
    }
  }

  private async _getAnimBake(id, name, buffer) {
    //
    let bake = fbxToJSON(buffer);

    bake.name = name;

    const hash = await this._hashBake(bake);

    return {
      bake,
      hash,
    };
  }

  async deleteAnim(id: string) {
    //
    if (this.isPackedAnim(id)) {
      return this.deletePackedAnim(id);
    } else {
      return this.deleteUnpackedAnim(id);
    }
  }

  async deletePackedAnim(id) {
    const newJson = {
      ...this.component._json,
    };

    delete newJson[id];

    if (Object.keys(newJson).length === 0) {
      this.dispatchDataChange({
        url: null,
        anims: {},
      });

      this.component._json = newJson;

      return;
    }

    try {
      const url = await this.uploadJSON({
        id: this.getPackedUploadId(),
        json: newJson,
        isUnique: true,
        overwrite: true,
      });

      const anims = {
        ...this.component.data.anims,
      };

      delete anims[id];

      this.dispatchDataChange({
        url,
        anims,
      });

      this.component._json = newJson;
    } catch (err) {
      console.error(err);

      alert("Error uploading animation " + err.message);
    }
  }

  async deleteUnpackedAnim(id: string) {
    //
    const anims = {
      ...this.component.data.anims,
    };

    delete anims[id];

    this.dispatchDataChange({
      anims,
    });
  }

  async uploadJSON(opts: {
    id: string;
    json: any;
    isUnique?: boolean;
    overwrite?: boolean;
  }) {
    //
    console.log("uploadJSON", opts.id);

    const blob = new Blob([stableStringify(opts.json)], {
      type: "application/octet-stream",
    });

    const result = await this.uploadFile({
      file: blob,
      id: `${opts.id}.json`,
      mimeType: "application/octet-stream",
      isUnique: opts.isUnique,
      overwrite: opts.overwrite,
    });

    return result.url;
  }

  getGUI(): GuiGroupDescriptor {
    // console.log("THIS", this.data.anims);
    const customAnimationsKeys = Object.keys(this.data.anims).filter(
      (key) => defaultAnims[key] == null,
    );

    const customAnims = [];

    for (let i = 0; i < customAnimationsKeys.length; i++) {
      const key = customAnimationsKeys[i];

      const matchAnim = this.data.anims[key];

      if (matchAnim) {
        const anim = {
          id: key,
          name: matchAnim?.name,
          image:
            "https://cyber.mypinata.cloud/ipfs/QmcF3FeJhEBLUJYbWRYRbCsS9vXWUfMZGaMM8vc6dNBCeP",
          data: {
            defaultPreset: key,
          },
        };

        customAnims.push(anim);
      }
    }

    const gui: GuiGroupDescriptor = {
      type: "group",
      children: {
        type: {
          type: "group",
          style: { marginBottom: 10, marginTop: 10 },
          children: {
            type: {
              type: "select",
              items: [
                {
                  label: "Default",
                  id: "official",
                  count: "6",
                },
                {
                  label: `Uploaded`,
                  id: "uploaded",
                  count: customAnimationsKeys.length,
                },
              ],
              mode: "buttons",
              ui: "big-white",
              skipLabel: true,
              value: [this, "currentTab"],
            },
          },
        },

        // empty group for spacing
        emptygroup: {
          type: "group",
          children: {},
        },
      },
    };

    for (let i = 0; i < defaultOptions.length; i++) {
      //
      const defaultOption = defaultOptions[i];

      const anim = this.data.anims?.[defaultOption.id];

      const hasCustumUpload = anim?.fileName;

      const animUpload = this.getAnimUpload(defaultOption.id);

      const animProps = hasCustumUpload
        ? this.getAnimProperties(defaultOption.id)
        : {};

      const option = {
        type: "folder" as const,
        label: defaultOption.name,
        children: {
          ...animUpload,
          ...animProps,
        },
        visible: () => this.currentTab === "official",
      };

      gui.children[defaultOption.id] = option;
    }

    let hasAnims = false;

    for (let i = 0; i < customAnimationsKeys.length; i++) {
      //
      const key = customAnimationsKeys[i];

      const customAnim = this.data.anims[customAnimationsKeys[i]];

      if (customAnim) {
        //
        hasAnims = true;

        const animUpload = this.getAnimUpload(key);

        const animProps = this.getAnimProperties(key);

        // console.log("customAnimcustomAnim", customAnim);

        gui.children[key] = {
          type: "folder",
          label: customAnim?.name,
          name: key,
          children: {
            ...animUpload,
            ...animProps,
          },
          visible: () => this.currentTab === "uploaded",
        };
      }
      //
    }

    gui.children["addCustom"] = {
      type: "folder",
      label: "Add Upload",
      defaultOpen: !hasAnims,
      children: this.getAnimUpload(null),
      visible: () => this.currentTab === "uploaded",
    };

    return gui;
  }
}
