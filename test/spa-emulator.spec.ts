import { SpaEmulator } from '../src/spa-emulator';

test('SpaEmulator', () =>
{
    const spaEmulator = new SpaEmulator({});

    spaEmulator.init();
    spaEmulator.destroy();
});

