import { createConfigContext } from './config/config.js';
import { createRootContext } from './context.js';
import { init as initFeederAppInputServer } from './input-servers/feeder-app/server';
import { init as initSlimeVRDriverInputServer } from './input-servers/slimevr-driver/server';
import { init as initUDPTrackerInputServer } from './input-servers/udp-tracker-server/server';
import { init as initSolarXROutputServer } from './output-servers/solarxr-protocol/server';
import { initSerialWatcher } from './serial/serial.js';

(async function init() {
  const configContext = await createConfigContext(); // Should the config context be inside the root context ?
  const rootContext = createRootContext();

  initSerialWatcher({ rootContext });
  initSlimeVRDriverInputServer({ rootContext, configContext });
  initFeederAppInputServer({ rootContext, configContext });
  initUDPTrackerInputServer({ rootContext, configContext });
  initSolarXROutputServer({ rootContext, configContext });
  // observePerformances();

  process.on('unhandledRejection', (error) => {
    if (!(error instanceof Error && error.name === 'AbortError')) throw error;
  });
})();
