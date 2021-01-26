export interface SpaEmulatorIgnoreElement
{
    tagName: string;
    innerHTMLHas?: string;
    srcHas?: string;
    selector?: string;
    hasInnerHtml?: string;
}

export interface SpaEmulatorOptions
{
    protectedElements?: SpaEmulatorIgnoreElement[];
    ignoreOutsideUrls?: RegExp[];
    ignoreLinkInside?: string;
    openImageInNewWindow?: boolean;
    debug?: boolean;
}
