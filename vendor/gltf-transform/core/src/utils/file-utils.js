import { ImageUtils } from './image-utils.js';
export class FileUtils {
    static basename(uri) {
        const fileName = uri.split(/[\\/]/).pop();
        return fileName.substring(0, fileName.lastIndexOf('.'));
    }
    static extension(uri) {
        if (uri.startsWith('data:image/')) {
            const mimeType = uri.match(/data:(image\/\w+)/)[1];
            return ImageUtils.mimeTypeToExtension(mimeType);
        } else if (uri.startsWith('data:model/gltf+json')) {
            return 'gltf';
        } else if (uri.startsWith('data:model/gltf-binary')) {
            return 'glb';
        } else if (uri.startsWith('data:application/')) {
            return 'bin';
        }
        return uri.split(/[\\/]/).pop().split(/[.]/).pop();
    }
}
