export interface SpaEmulatorIgnoreElement
{
    tagName: string;
    innerHTMLIncludes?: string;
    srcIncludes?: string;
}

export interface SpaEmulatorOptions
{
    ignoreElements?: SpaEmulatorIgnoreElement[];
    ignoreOutsideUrls?: RegExp[];
    catchLinksOutsideOf?: string;
    openImageInNewWindow?: boolean;
}
