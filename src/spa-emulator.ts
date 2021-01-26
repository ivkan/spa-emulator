import { getOffset } from './utils/get-offset';
import { animate } from './utils/animate';
import { removeElement } from './utils/remove-element';
import { SpaEmulatorIgnoreElement, SpaEmulatorOptions } from './options';
import { safeArray } from './utils/safe-array';
import { safeString } from './utils/safe-string';
import { isString } from './utils/is-string';
import { isElement } from './utils/is-element';
import { findElement, findElements } from './utils/find-elements';
import { isStyle } from './utils/is-style';

export class SpaEmulator
{
    private hasProtocol = new RegExp('^(http|https):', 'i');
    private isLocal     = new RegExp('^(http:|https:|)//' + window.location.host, 'i');
    private isDownload  = new RegExp('\.(iso|torrent|sig|zip)$');

    private oldHeadStyles: Element[]            = [];
    private newBodyScripts: HTMLScriptElement[] = [];
    private readonly urlParser                  = document.createElement('a');
    private readonly options: SpaEmulatorOptions;

    /**
     * Constructor
     */
    constructor(options: SpaEmulatorOptions)
    {
        this.options = options || {};
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    init(): void
    {
        this.setListener();

        if (history.state)
        {
            return;
        }
        //
        // record our first page of the session
        //
        const href = window.location.href;
        history.pushState({ href }, null, href);
    }

    destroy(): void
    {
        this.removeListener();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get head element
     */
    private getHead(html?: HTMLHtmlElement): HTMLHeadElement
    {
        return (html || document).getElementsByTagName('head')[0];
    }

    /**
     * Get body element
     */
    private getBody(html?: HTMLHtmlElement): HTMLBodyElement
    {
        return (html || document).getElementsByTagName('body')[0];
    }

    /**
     * Reposition the page on a given #tag
     */
    private scrollTop(tag: string): void
    {
        const node = document.querySelector('#' + tag);
        if (node)
        {
            const offset = getOffset(node);
            animate(this.getBody(), { scrollTop: offset.top + 'px' }, 'fast');
        }
    }

    /**
     * Reposition the page based on the current #tag and link
     */
    private setPosition(tag: string, hTag?: string): void
    {
        if (String(hTag).length)
        {
            return this.scrollTop(hTag);
        }
        if (tag === 'href')
        {
            this.getBody().scrollTop = document.documentElement.scrollTop = 0;
        }
    }

    /**
     * Check is element protected
     */
    private isProtectedElement(element: HTMLElement): boolean
    {
        for (const ignore of safeArray<SpaEmulatorIgnoreElement>(this.options.protectedElements))
        {
            if (safeString(ignore.tagName).toLowerCase() === element.tagName.toLowerCase())
            {
                if (!isString(ignore.innerHTMLHas) && !isString(ignore.srcHas))
                {
                    return true
                }
                else if (isString(ignore.innerHTMLHas) && element.innerHTML.includes(ignore.innerHTMLHas))
                {
                    return true;
                }
                else if (isString(ignore.srcHas) && safeString(element['src']).includes(ignore.srcHas))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private replaceContent(newContent: any): void
    {
        document.open();
        document.write(newContent);
        document.close();
    }

    /**
     * Add new entries to page head and remove obsoletes
     */
    private reloadHead(newHead: HTMLHeadElement): void
    {
        // Append title
        const title = findElement('title', newHead);
        if (title)
        {
            document.title = title.textContent;
        }

        const liveHeadElements = Array.from(this.getHead().querySelectorAll('*'));

        newHead.querySelectorAll('*').forEach(newElement =>
        {
            let i = liveHeadElements.length;

            while (--i >= 0)
            {
                if (newElement.isEqualNode(liveHeadElements[i]))
                {
                    liveHeadElements.splice(i, 1);
                    break;
                }
            }
            if (i < 0)
            {
                this.getHead().append(newElement);
            }
        });

        this.getHead().querySelectorAll('*').forEach(oldElement =>
        {
            liveHeadElements.forEach((liveEl) =>
            {
                if (oldElement.isEqualNode(liveEl))
                {
                    removeElement(oldElement);
                }
            });
        });
    }

    /**
     * Reload body content
     */
    private reloadBody(newBody: HTMLBodyElement): void
    {
        try
        {
            const currentBody = this.getBody();

            // Clear current body
            for (const element of Array.from(currentBody.children))
            {
                if (!this.isProtectedElement(element as HTMLElement))
                {
                    element.remove();
                }
            }

            // Remove scripts from new body
            for (const script of findElements('script', newBody))
            {
                this.newBodyScripts.push(
                    removeElement<HTMLScriptElement>(script as HTMLScriptElement)
                );
            }

            // Append new elements to body
            Array.from(newBody.children).forEach(element =>
            {
                if (!this.isProtectedElement(element as HTMLElement) && isElement(element))
                {
                    currentBody.appendChild(element);
                }
            });
        }
        catch (e)
        {
            console.error(e);
        }
    }

    /**
     * Append scripts from new body to current
     */
    private appendBodyScripts(): void
    {
        try
        {
            for (const element of this.newBodyScripts)
            {
                if (!this.isProtectedElement(element as HTMLElement))
                {
                    this.getBody().appendChild(element);
                }
            }

            this.newBodyScripts = [];
        }
        catch (e)
        {
            console.error(e);
        }
    }

    private reloadProtectedElement(newNode: HTMLHtmlElement): void
    {
        for (const ignore of safeArray<SpaEmulatorIgnoreElement>(this.options.protectedElements))
        {
            if (isString(ignore.selector))
            {
                const elements = newNode.querySelectorAll(ignore.selector);
            }
        }
    }

    /**
     * Bulk of the work, replace the current page with a new one
     */
    private loadPage(tag: string, href: string, data: any, navigate: boolean): void
    {
        let target, url, htag;

        const openInNewWindow = () =>
        {
            const win = window.open(href, '_blank');
            win.focus();
            return false;
        };

        const replacePage = (xhr: XMLHttpRequest) =>
        {
            const data                 = xhr.responseText;
            const content_type: string = xhr.getResponseHeader('Content-Type').split(';')[0];
            const [mtype]              = content_type.split('/');

            this.log('Content-Type', mtype);

            switch (mtype)
            {
                case 'text':
                    window.onload = null;   // make sure this is clear for things like SMF

                    const newNode     = document.createElement('html');
                    newNode.innerHTML = data;

                    this.reloadProtectedElement(newNode);
                    this.replaceContent(newNode.innerHTML);

                    // const widget = this.getBody().querySelector('immerss-widget');

                    // const newHead = this.getHead(newNode);
                    // const newBody = this.getBody(newNode);
                    //
                    // this.reloadBody(newBody);
                    // this.reloadHead(newHead);
                    // this.appendBodyScripts();

                    [url, htag] = href.split('#');
                    this.setPosition(tag, htag);
                    setTimeout(() => this.triggerLoad(), 100);
                    break;

                case 'application':
                    return openInNewWindow();

                case 'image':
                    if (this.options.openImageInNewWindow)
                    {
                        return openInNewWindow();
                    }
                    else
                    {
                        break;
                    }

                default:
                    console.warn(`Not configured handle file type: ${content_type}`)
            }

            if (navigate)
            {
                history.pushState({ href }, null, href);
            }
        };

        switch (tag)
        {
            case 'action':
            {
                target = href;
                href   = window.location.href;

                const request = new XMLHttpRequest();
                request.open('POST', href, true);
                request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                request.send(data);
                request.onload = () => replacePage(request);
                break;
            }

            case 'href':
            {
                const request = new XMLHttpRequest();
                request.open('GET', href, true);
                request.onload  = () =>
                {
                    if (request.status >= 200 && request.status < 400)
                    {
                        replacePage(request);
                    }
                    else
                    {
                        alert('Unable to locate url ' + href);
                    }
                };
                request.onerror = () =>
                {
                    alert('Unable to locate url ' + href);
                };
                request.send();
                // base        = window.location.href.split('#')[0];
                // [url, htag] = href.split('#');
                // if (htag && (!url || url === base))
                // {
                //     return this.scrollTop(htag);
                // }
                // if (!htag || (url && (url !== base)))
                // {
                //     const request = new XMLHttpRequest();
                //     request.open('GET', href, true);
                //     request.onload  = () =>
                //     {
                //         if (request.status >= 200 && request.status < 400)
                //         {
                //             replacePage(request);
                //         }
                //         else
                //         {
                //             alert('Unable to locate url ' + href);
                //         }
                //     };
                //     request.onerror = () =>
                //     {
                //         alert('Unable to locate url ' + href);
                //     };
                //     request.send();
                // }
            }
        }
    }

    /**
     * Work out if a given URL is going to cause us to leave site
     */
    private outside(href: string): boolean
    {
        if (this.hasProtocol.test(href) && !this.isLocal.test(href))
        {
            return true;
        }
        else if (this.isDownload.test(href))
        {
            return true;
        }

        for (const ignore of safeArray<RegExp>(this.options.ignoreOutsideUrls))
        {
            if (ignore.test(href))
            {
                return true;
            }
        }

        return false;
    }

    private log(value: any, ...rest: any[]): void
    {
        if (this.options.debug)
        {
            console.log('%c[Log]', `color: #439a00`, value, ...rest);
        }
    }

    /**
     * Set listeners
     */
    private setListener(): void
    {
        document.addEventListener('click', ev => this.onClick(ev));
        document.addEventListener('submit', ev => this.onFormSubmit(ev));
        // wrap the browser's 'BACK' button
        window.addEventListener('popstate', () => this.backButton());

        this.log('Set listeners');
    }

    /**
     * Remove class listeners
     */
    private removeListener(): void
    {
        document.removeEventListener('click', ev => this.onClick(ev));
        document.removeEventListener('submit', ev => this.onFormSubmit(ev));
        window.removeEventListener('popstate', () => this.backButton());

        this.log('Remove listeners');
    }

    /**
     * Handle form submit event
     */
    private onFormSubmit(event: any): boolean
    {
        if (event.defaultPrevented)
        {
            return;
        }
        if (document && document.activeElement && document.activeElement['form'])
        {
            const self = document.activeElement['form'] as HTMLFormElement;

            //
            //  for POST requests we're going to use the results from
            //  FormData, and add the name/value of the submit button
            //
            const data   = new FormData(self);
            const button = document.activeElement as HTMLButtonElement;
            if (button.name)
            {
                data.append(button.name, button.value);

                event.preventDefault();

                const href = self.getAttribute('action');
                this.loadPage('action', href, data, true);
            }
        }
    }

    /**
     * Handle click event
     */
    private onClick(event: MouseEvent): void
    {
        if (event.defaultPrevented)
        {
            return;
        }

        const { button, ctrlKey, metaKey } = event;
        let target                         = event.target as HTMLElement;

        if (isString(this.options.ignoreLinkInside) && target.closest(this.options.ignoreLinkInside))
        {
            return;
        }

        while (target && !(target instanceof HTMLAnchorElement))
        {
            target = target.parentElement;
        }
        if (target instanceof HTMLAnchorElement)
        {
            this.log('Anchor:', target);
            event.preventDefault();
            this.handleAnchorClick(target, button, ctrlKey, metaKey);
        }
    }

    /**
     * Handle user's anchor click
     */
    private handleAnchorClick(anchor: HTMLAnchorElement, button = 0, ctrlKey = false, metaKey = false): boolean
    {
        // Check for modifier keys and non-left-button, which indicate the user wants to control navigation
        if (button !== 0 || ctrlKey || metaKey)
        {
            return true;
        }

        const anchorTarget = anchor.target;
        if (anchorTarget && anchorTarget !== '_self')
        {
            return true;
        }

        if (anchor.getAttribute('download') != null)
        {
            return true; // let the download happen
        }

        const { pathname, search, hash } = anchor;
        const relativeUrl                = pathname + search + hash;
        this.urlParser.href              = relativeUrl;

        // don't navigate if external link or has extension
        if (location.hostname !== this.urlParser.hostname)
        {
            return true;
        }

        // approved for navigation
        // event.preventDefault();
        this.loadPage('href', relativeUrl, null, true);
        return false;
    }

    /**
     * Handle page event
     */
    private handle(event: Event, self: HTMLElement, tag: string, href?: string): boolean
    {
        this.log('Handle page event', { href, tag });

        let not_supported = false, data = null, button = null;
        //
        //  make sure we've not been beaten to the punch
        //
        if (event.defaultPrevented)
        {
            return false;
        }
        switch (tag)
        {
            case 'action':
                //
                //  for POST requests we're going to use the results from
                //  FormData, and add the name/value of the submit button
                //
                data   = new FormData(self as HTMLFormElement);
                button = document.activeElement as HTMLButtonElement;
                if (button.name)
                {
                    data.append(button.name, button.value);
                }
                break;
            case 'href':
                break;
            default:
                not_supported = true;
                break;
        }
        if (not_supported)
        {
            return;
        }
        event.preventDefault();
        this.loadPage(tag, href, data, true);
    }

    /**
     * Retask the back button to do a soft back if within site
     */
    private backButton(): void
    {
        //
        //  If we're run out of history, exit the site
        //
        if (!history.state)
        {
            return window.history.back();
        }
        //
        //  Otherwise, implement our own version of back
        //
        this.loadPage('href', history.state.href, null, false);
    }

    /**
     * Run window load manually
     */
    private triggerLoad(): void
    {
        // const windowEvent = document.createEvent('Event');
        // windowEvent.initEvent('load', false, false);
        // window.dispatchEvent(windowEvent);

        const docEvent = document.createEvent('HTMLEvents');
        docEvent.initEvent('load', true, true);
        window.document.dispatchEvent(docEvent);
    }
}
