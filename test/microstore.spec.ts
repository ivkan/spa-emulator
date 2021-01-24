import { createStore } from '../src/spa-emulator';

test('Microstore', () =>
{
  const store = createStore({ count: 0 });

  store.update({ count: 1 });

  store
    .select<number>({
      mapTo   : state => state.count,
      filterBy: count => count > 0,
      once    : true
    })
    .subscribe(value => console.log(`Value: ${value}`));
});

