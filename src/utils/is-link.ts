import { safeString } from './safe-string';

export function isLink(el: HTMLElement): boolean
{
    return safeString(el.tagName).toUpperCase() === 'A';
}