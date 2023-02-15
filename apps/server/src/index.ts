import { createConfigContext } from './config/config.js';
import { createRootContext } from './context.js';
import { init as initUDPTrackerInputServer } from './input-servers/udp-tracker-server/server';
import { init as initSolarXROutputServer } from './output-servers/solarxr-protocol/server';
import { observePerformances } from './performance.js';

(async function init() {
  const configContext = await createConfigContext(); // Should the config context be inside the root context ?
  const rootContext = createRootContext();

  initUDPTrackerInputServer({ rootContext, configContext });
  initSolarXROutputServer({ rootContext, configContext });
  observePerformances();

  process.on('unhandledRejection', (error) => {
    if (!(error instanceof Error && error.name === 'AbortError')) throw error;
  });
})();
