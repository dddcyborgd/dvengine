import { getCurrentSpace } from "@oncyberio/engine/internal";

export interface ScreenshotOpts {
  width?: number;
  height?: number;
}

export class Capturer {
  captureFrame(opts: ScreenshotOpts = {}) {
    return getCurrentSpace().captureFrame(opts);
  }

  dispose() {}
}
