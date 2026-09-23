# xr/ — WebXR (DVXR)

| file | what |
|---|---|
| `probe.js` | `DVXR.probe()` → `Promise<{ webgpu, vr, ar }>` — every answer is **asked** (`requestAdapter()`, `isSessionSupported()`), never inferred from the presence of `navigator.gpu` / `navigator.xr`; a throw counts as "no"; memoised (`probe.reset()`). After DeltaVerse `nGn/cycle.html`. |
| `teleport.js` | `DVXR.teleport(space, { floor, color, rayLength })` — controller rays + a floor marker while the trigger is held, release offsets the XR reference space so the participant stands on the marker; the camera rides a DOLLY group. `DVXR.button(space)` returns the three/addons VRButton when `window.VRButton` is set, else `null` and nothing else changes. |

The verse asks `DVXR.probe()` on enter (`xr:true`) and mounts the button only when `vr` is true; WebGL is the floor, WebXR/WebGPU are capability-gated mounts — the DeltaVerse posture.
