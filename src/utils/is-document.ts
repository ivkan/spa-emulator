export function isDocument(x: any): x is Document
{
    return !!x && x.nodeType === 9;
}
