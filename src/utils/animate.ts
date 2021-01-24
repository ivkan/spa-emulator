export function animate(element: HTMLElement, params: any, speed: string): void
{
  element.style.transition = 'all ' + speed;
  Object.keys(params).forEach((key) =>
  {
    element.style[key] = params[key];
  });
}
