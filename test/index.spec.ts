import { Store } from '../src/spa-emulator';

test("Microstore is exported", () => {
  expect(Store).toBeInstanceOf(Object);
});
