import { ExtensionProperty } from './properties/index.js';
export class Extension {
    static EXTENSION_NAME;
    extensionName = '';
    prereadTypes = [];
    prewriteTypes = [];
    readDependencies = [];
    writeDependencies = [];
    document;
    required = false;
    properties = new Set();
    _listener;
    constructor(document){
        this.document = document;
        document.getRoot()._enableExtension(this);
        this._listener = (_event)=>{
            const event = _event;
            const target = event.target;
            if (target instanceof ExtensionProperty && target.extensionName === this.extensionName) {
                if (event.type === 'node:create') this._addExtensionProperty(target);
                if (event.type === 'node:dispose') this._removeExtensionProperty(target);
            }
        };
        const graph = document.getGraph();
        graph.addEventListener('node:create', this._listener);
        graph.addEventListener('node:dispose', this._listener);
    }
    dispose() {
        this.document.getRoot()._disableExtension(this);
        const graph = this.document.getGraph();
        graph.removeEventListener('node:create', this._listener);
        graph.removeEventListener('node:dispose', this._listener);
        for (const property of this.properties){
            property.dispose();
        }
    }
    static register() {}
    isRequired() {
        return this.required;
    }
    setRequired(required) {
        this.required = required;
        return this;
    }
    listProperties() {
        return Array.from(this.properties);
    }
    _addExtensionProperty(property) {
        this.properties.add(property);
        return this;
    }
    _removeExtensionProperty(property) {
        this.properties.delete(property);
        return this;
    }
    install(key, dependency) {
        return this;
    }
    preread(_readerContext, _propertyType) {
        return this;
    }
    prewrite(_writerContext, _propertyType) {
        return this;
    }
}
