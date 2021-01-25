import { safeString } from './safe-string';

export function isLink(el: HTMLElement): el is HTMLLinkElement
{
    return safeString(el.tagName).toUpperCase() === 'A';
}