# Adding Custom Media (Image, Audio, Video)

When the user provides an image, audio, or video file, upload it then add the component to the scene.

## Usage

```bash
pnpm upload-asset <path-to-file>
```

Supports: `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp3`, `.wav`, `.mp4`, `.webm`

Returns JSON:
```json
{
  "hash": "a1b2c3d4...",
  "url": "/assets/uploaded-assets-a1b2c3d4.png",
  "name": "my-image.png",
  "mimeType": "image/png",
  "createdAt": 1768923704464
}
```

## Add to static-scene.json

Use the returned `url` in the appropriate component type:

### Image

```json
{
  "my-image": {
    "id": "my-image",
    "name": "My Image",
    "type": "image",
    "url": "/assets/uploaded-assets-a1b2c3d4.png",
    "position": { "x": 0, "y": 2, "z": 0 },
    "opacity": 1
  }
}
```

### Audio

```json
{
  "my-audio": {
    "id": "my-audio",
    "name": "Background Music",
    "type": "audio",
    "url": "/assets/uploaded-assets-a1b2c3d4.mp3",
    "audioType": "ambient",
    "volume": 0.5,
    "autoPlay": true,
    "loop": true
  }
}
```

`audioType`: `"ambient"` (constant volume) or `"spatial"` (attenuates with distance, configure `audioRange` 1–40).

### Video

```json
{
  "my-video": {
    "id": "my-video",
    "name": "My Video",
    "type": "video",
    "url": "/assets/uploaded-assets-a1b2c3d4.mp4",
    "position": { "x": 0, "y": 2, "z": 0 },
    "autoPlay": true,
    "volume": 1,
    "audioType": "spatial",
    "audioRange": 10
  }
}
```
