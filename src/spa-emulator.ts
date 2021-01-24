import { getOffset } from './utils/get-offset';
import { animate } from './utils/animate';
import { removeElement } from './utils/remove-element';
import { SpaEmulatorIgnoreElement, SpaEmulatorOptions } from './options';
import { safeArray } from './utils/safe-array';
import { safeString } from './utils/safe-string';
import { isString } from './utils/is-string';
import { isElement } from './utils/is-element';
import { findElements } from './utils/find-elements';
import { isLink } from './utils/is-link';

export class SpaEmulator
{
  hasProtocol = new RegExp('^(http|https):', 'i');
  isLocal     = new RegExp('^(http:|https:|)//' + window.location.host, 'i');
  isDownload  = new RegExp('\.(iso|torrent|sig|zip)$');

  private newBodyScripts: HTMLScriptElement[] = [];
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
    for (const ignore of safeArray<SpaEmulatorIgnoreElement>(this.options.ignoreElements))
    {
      if (safeString(ignore.tagName).toLowerCase() === element.tagName.toLowerCase())
      {
        if (!isString(ignore.innerHTMLIncludes) && !isString(ignore.srcIncludes))
        {
          return true
        }
        else if (isString(ignore.innerHTMLIncludes) && element.innerHTML.includes(ignore.innerHTMLIncludes))
        {
          return true;
        }
        else if (isString(ignore.srcIncludes) && safeString(element['src']).includes(ignore.srcIncludes))
        {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Add new entries to page head and remove obsoletes
   */
  private reloadHead(newHead: HTMLHeadElement): void
  {
    this.getHead().innerHTML = newHead.innerHTML;

    // Append title
    // const title = findElement('title', newHead);
    // if (title)
    // {
    //   document.title = title.textContent;
    // }

    // Clear current header

    // const liveHeadElements = Array.from(this.getHead().querySelectorAll('*'));
    //
    // newHead.querySelectorAll('*').forEach(newElement =>
    // {
    //   let i = liveHeadElements.length;
    //
    //   while (--i >= 0)
    //   {
    //     if (newElement.isEqualNode(liveHeadElements[i]))
    //     {
    //       liveHeadElements.splice(i, 1);
    //       break;
    //     }
    //   }
    //   if (i < 0)
    //   {
    //     this.getHead().append(newElement);
    //   }
    // });
    //
    // this.getHead().querySelectorAll('*').forEach(old =>
    // {
    //   liveHeadElements.forEach((liveEl) =>
    //   {
    //     if (old.isEqualNode(liveEl))
    //     {
    //       removeElement(old);
    //     }
    //   });
    // });
  }

  /**
   * Reload body content
   */
  private reloadBody(newBody: HTMLBodyElement): void
  {
    try
    {
      // Clear current body
      for (const element of Array.from(this.getBody().children))
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

      // Remove scripts from new body
      // for (const element of Array.from(newBody.querySelectorAll('*')))
      // {
      //   if (isScript(element))
      //   {
      //     this.newBodyScripts.push(
      //       removeElement<HTMLScriptElement>(element as HTMLScriptElement)
      //     );
      //   }
      // }

      // Append new elements to body
      Array.from(newBody.children).forEach(element =>
      {
        if (!this.isProtectedElement(element as HTMLElement) && isElement(element))
        {
          this.getBody().appendChild(element);
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

  /**
   * Bulk of the work, replace the current page with a new one
   */
  private loadPage(tag: string, href: string, data: any, navigate: boolean): void
  {
    let target, base, url, htag;

    const replace_page = (xhr: XMLHttpRequest) =>
    {
      const data                 = xhr.responseText;
      const content_type: string = xhr.getResponseHeader('Content-Type').split(';')[0];
      const [mtype]              = content_type.split('/');

      switch (mtype)
      {
        case 'text':
        {
          window.onload = null;   // make sure this is clear for things like SMF

          const newNode     = document.createElement('html');
          newNode.innerHTML = data;

          const newHead = this.getHead(newNode);
          const newBody = this.getBody(newNode);

          this.reloadBody(newBody);
          this.reloadHead(newHead);
          this.appendBodyScripts();

          [url, htag] = href.split('#');
          this.setPosition(tag, htag);
          setTimeout(() => this.triggerLoad(), 100);
          break;
        }
        case 'application':
        case 'image':
          const win = window.open(href, '_blank');
          win.focus();
          return false;

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
        request.onload = () => replace_page(request);
        break;
      }

      case 'href':
      {
        base        = window.location.href.split('#')[0];
        [url, htag] = href.split('#');
        if (htag && (!url || url === base))
        {
          return this.scrollTop(htag);
        }
        if (!htag || (url && (url !== base)))
        {
          const request = new XMLHttpRequest();
          request.open('GET', href, true);
          request.onload  = () =>
          {
            if (request.status >= 200 && request.status < 400)
            {
              replace_page(request);
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
        }
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

  /**
   * Set class listeners
   */
  private setListener(): void
  {
    document.addEventListener('click', ev => this.handleLinkClick(ev));
    document.addEventListener('submit', ev => this.handleFormSubmit(ev));
    // wrap the browser's 'BACK' button
    window.addEventListener('popstate', () => this.backButton());
  }

  /**
   * Remove class listeners
   */
  private removeListener(): void
  {
    document.removeEventListener('click', ev => this.handleLinkClick(ev));
    document.removeEventListener('submit', ev => this.handleFormSubmit(ev));
    window.removeEventListener('popstate', () => this.backButton());
  }

  private handleFormSubmit(ev): void
  {
    if (document && document.activeElement && document.activeElement['form'])
    {
      this.handle(ev, document.activeElement['form'], 'action');
    }
  }

  private handleLinkClick(ev: MouseEvent): void
  {
    if (isString(this.options.catchLinksOutsideOf) && !(ev.target as HTMLElement).closest(this.options.catchLinksOutsideOf))
    {
      let target = ev.target as HTMLElement;
      while (target && !isLink(target))
      {
        target = target.parentElement;
      }
      if (isLink(target))
      {
        this.handle(ev, target, 'href');
      }
    }
  }

  private handle(event: Event, self: HTMLElement, tag: string): boolean
  {
    //  if we have no url, or the url is outside the site ...
    const href = self.getAttribute(tag);
    if (!href || (href === '#') || this.outside(href))
    {
      return false;
    }
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
        button = document.activeElement;
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
