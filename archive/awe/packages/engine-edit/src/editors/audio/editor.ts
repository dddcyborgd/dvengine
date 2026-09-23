import PipeLineMesh from "@oncyberio/engine/internal/pipeline/pipeline-mesh";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { disposeMesh } from "@oncyberio/engine/internal/utils/dispose";
import {
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { AudioComponent } from "@oncyberio/engine/space/components/audio/audio-component";
import { Formats } from "@oncyberio/engine/space/formats";
import { getAudioOpts } from "../../component-editor/ui/audio-opts-ui";

const AUDIO_PREVIEW_URL =
  "https://cyber.mypinata.cloud/ipfs/QmbDnBLeDaUUxw25hqq3Q2eLmfr8a2qKuw3snsnLzBMnUt";

/** @internal */
export class AudioEditor extends Component3DEditor<AudioComponent> {
  //
  _loader = new TextureLoader();

  gui: GuiGroupDescriptor = {
    type: "group",
    children: {
      controls: {
        type: "folder",
        label: "Controls",
        children: {
          autoPlay: {
            type: "checkbox",
            label: "Auto Play",
            value: [this.data, "autoPlay"],
          },
          volume: {
            type: "number",
            label: "Volume",
            value: [this.data, "volume"],
            min: 0,
            max: 100,
            step: 1,
            format: Formats.pct,
          },
          audioType: {
            type: "select",
            label: "Play Sound Options",
            value: [this.data, "audioType"],
            items: getAudioOpts({ spatial: true, ambient: true }),
          },
          audioRange: {
            type: "number",
            label: "Audio Range",
            value: [this.data, "audioRange"],
            min: 1,
            max: 40,
            step: 0.1,
            visible: () => this.data.audioType === "spatial",
          },
          loop: {
            type: "checkbox",
            label: "Loop",
            value: [this.data, "loop"],
          },
          playbackRate: {
            type: "number",
            label: "Playback Rate",
            value: [this.data, "playbackRate"],
            min: 0.5,
            max: 2,
            step: 0.1,
          },
        },
      },
      transform: getTransformUI(this),
    },
  };

  selectionMesh = null;

  init() {
    const map = this._loader.load(AUDIO_PREVIEW_URL);
    map.colorSpace = SRGBColorSpace;

    const material = new MeshBasicMaterial({
      map,
      side: 2,
    });

    this.selectionMesh = new PipeLineMesh(new PlaneGeometry(1, 1), material);

    // @ts-ignore
    this.component.stop();

    this.component.add(this.selectionMesh);

    const audio = this.component.audio;
    if (audio) {
      audio.addEventListener("play", () => this.updateUI());
      audio.addEventListener("pause", () => this.updateUI());
      audio.addEventListener("ended", () => this.updateUI());
    }
  }

  getSelectionMesh() {
    return this.selectionMesh;
  }

  onSelectedChanged(isSelected: boolean) {
    this.component._posAudio?.toggleRangeDebug(isSelected);
  }

  getGUI(): GuiGroupDescriptor {
    return this.gui;
  }

  dispose(): void {
    this.component.remove(this.selectionMesh);

    disposeMesh(this.selectionMesh);
  }
}
