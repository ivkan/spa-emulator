export function getOffset(el): {top: number, left: number}
{
  const box = el.getBoundingClientRect();

  return {
    top : box.top + window.pageYOffset - document.documentElement.clientTop,
    left: box.left + window.pageXOffset - document.documentElement.clientLeft
  };
}
