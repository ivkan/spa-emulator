export function removeElement<T extends Element>(el: T): T
{
  if (el && el.parentNode && el.parentNode.removeChild)
  {
    el.parentNode.removeChild(el);
  }
  return el;
}
