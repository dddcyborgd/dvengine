import { GraphEdge } from '../../../property-graph/property-graph.modern.js';
import { isPlainObject } from './is-plain-object.js';
export function isRefList(value) {
    return Array.isArray(value) && value[0] instanceof GraphEdge;
}
export function isRefMap(value) {
    return isPlainObject(value) && Object.values(value)[0] instanceof GraphEdge;
}
