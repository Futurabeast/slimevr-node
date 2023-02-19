import { aiter } from 'iterator-helper';
import { RpcMessage } from 'solarxr-protocol';
import { eventStream } from '../../../event-utils';
import logger from '../../../logger';
import { SolarXRConnectionModule } from '../solarxr-connection';

const logs = logger(__filename);

export const RpcProvisioningXRModule: SolarXRConnectionModule = {
  observe({ solarXRContext, rootContext }) {
    aiter(eventStream(solarXRContext.rpcEvents, RpcMessage.StartWifiProvisioningRequest)).forEach(
      ([{ password, port, ssid }]) => {
        logs.info('Start provisioning');
        if (!ssid) return;

        rootContext.dispatch({
          type: 'server/set-wifi-provisioning-settings',
          port: port?.toString(),
          password: password?.toString(),
          ssid: ssid.toString()
        });
      }
    );

    aiter(eventStream(solarXRContext.rpcEvents, RpcMessage.StopWifiProvisioningRquest)).forEach(() => {
      logs.info('Stop provisioning');
    });
  }
};
