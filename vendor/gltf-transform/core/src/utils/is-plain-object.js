function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}
export function isPlainObject(o) {
    if (isObject(o) === false) return false;
    const ctor = o.constructor;
    if (ctor === undefined) return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false) return false;
    if (Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf') === false) {
        return false;
    }
    return true;
}
