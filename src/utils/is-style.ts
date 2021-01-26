export function isStyle(element: Element): boolean
{
    if (element instanceof HTMLLinkElement && element.rel === 'stylesheet')
    {
        return true;
    }
    else if (element instanceof HTMLStyleElement)
    {
        return true;
    }
    return false;
}