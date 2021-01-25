import { isElement } from './is-element';
import { isDocument } from './is-document';

const tagRe   = /^\w+$/;
const classRe = /^\.(?:[\w-]|\\.|[^\x00-\xa0])*$/;

export function findElements(selector: string, context: HTMLElement): Element[]
{
    const arrayLike: any = !selector || (!isDocument(context) && !isElement(context))
        ? []
        : classRe.test(selector)
            ? context.getElementsByClassName(selector.slice(1))
            : tagRe.test(selector)
                ? context.getElementsByTagName(selector)
                : context.querySelectorAll(selector);

    return Array.from(arrayLike);
}

export function findElement(selector: string, context: HTMLElement): Element
{
    return findElements(selector, context)[0];
}
