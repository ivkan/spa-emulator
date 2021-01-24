import { isElement } from './is-element';

export function isScript(node: any): boolean
{
    return isElement(node) && node.tagName.toUpperCase() === 'SCRIPT';
}