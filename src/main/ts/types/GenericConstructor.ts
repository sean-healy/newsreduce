export abstract class GenericConstructor<T extends GenericConstructor<T>> {
    constructor(src?: { [key in keyof T]?: T[key] }) {
        if (src) {
            const dst = this as GenericConstructor<T> as T;
            for (const property in src) {
                dst[property] = src[property];
            }
        }
    }
}
