import { FileUtils } from './file-utils.js';
const NULL_DOMAIN = 'https://null.example';
export class HTTPUtils {
    static DEFAULT_INIT = {};
    static PROTOCOL_REGEXP = /^[a-zA-Z]+:\/\//;
    static dirname(path) {
        const index = path.lastIndexOf('/');
        if (index === -1) return './';
        return path.substring(0, index + 1);
    }
    static basename(uri) {
        return FileUtils.basename(new URL(uri, NULL_DOMAIN).pathname);
    }
    static extension(uri) {
        return FileUtils.extension(new URL(uri, NULL_DOMAIN).pathname);
    }
    static resolve(base, path) {
        if (!this.isRelativePath(path)) return path;
        const stack = base.split('/');
        const parts = path.split('/');
        stack.pop();
        for(let i = 0; i < parts.length; i++){
            if (parts[i] === '.') continue;
            if (parts[i] === '..') {
                stack.pop();
            } else {
                stack.push(parts[i]);
            }
        }
        return stack.join('/');
    }
    static isAbsoluteURL(path) {
        return this.PROTOCOL_REGEXP.test(path);
    }
    static isRelativePath(path) {
        return !/^(?:[a-zA-Z]+:)?\//.test(path);
    }
}
