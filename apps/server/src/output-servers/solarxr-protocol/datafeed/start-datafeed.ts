import { Builder } from 'flatbuffers';
import { aiter } from 'iterator-helper';
import {
  DataFeedConfigT,
  DataFeedMessage,
  DataFeedMessageHeaderT,
  DataFeedUpdateT,
  MessageBundleT
} from 'solarxr-protocol';
import { RootContextContext } from '../../../context';
import { DeviceState } from '../../../device/device';
import { eventStream } from '../../../event-utils';
import { DeepReadonly } from '../../../events';
import { TrackerState } from '../../../tracker/tracker';
import { SolarXRConnectionModule } from '../solarxr-connection';
import { createDatafeedDevice } from './device';

function constructDatafeed({
  config,
  devicesState,
  trackersState
}: {
  config: DataFeedConfigT;
  devicesState: DeepReadonly<DeviceState>[];
  trackersState: DeepReadonly<TrackerState>[];
  rootContext: RootContextContext;
}) {
  const datafeedHeader = new DataFeedMessageHeaderT();
  datafeedHeader.messageType = DataFeedMessage.DataFeedUpdate;

  const update = new DataFeedUpdateT();
  update.bones = []; // TODO: need to send skeleton data
  if (config.dataMask?.deviceData || config.dataMask?.trackerData)
    update.devices = devicesState.map((device) =>
      createDatafeedDevice(
        device,
        trackersState.filter(({ deviceId }) => deviceId === device.id),
        config
      )
    );

  datafeedHeader.message = update;

  return datafeedHeader;
}

export const StartDataFeedSolarXRModule: SolarXRConnectionModule = {
  reduce(state, action) {
    if (action.type === 'solarxr/datafeed/set-config') {
      return {
        ...state,
        datafeedConfigs: action.configs
      };
    }
    return state;
  },
  observe({ solarXRContext, rootContext }) {
    solarXRContext.datafeedEvents.on(DataFeedMessage.StartDataFeed, ({ dataFeeds }) => {
      console.log(dataFeeds);
    });

    aiter(
      eventStream(solarXRContext.datafeedEvents, DataFeedMessage.StartDataFeed, { signal: solarXRContext.signal })
    ).forEach(([{ dataFeeds }]) => {
      const fbb = new Builder(1024);
      const { datafeedTimers } = solarXRContext.getState();
      datafeedTimers.forEach((id) => clearInterval(id));

      solarXRContext.dispatch({
        type: 'solarxr/datafeed/set-config',
        configs: dataFeeds,
        timers: dataFeeds.map((config, index) =>
          setInterval(() => {
            const { devices, trackers } = rootContext.getState();

            performance.mark('construct_datafeed_start', { detail: `timer_${index}` });
            fbb.clear();
            const message = new MessageBundleT();
            const header = constructDatafeed({
              config,
              devicesState: Object.values(devices).map((deviceContext) => deviceContext.getState()),
              trackersState: Object.values(trackers).map((trackerContext) => trackerContext.getState()),
              rootContext
            });
            message.dataFeedMsgs = [header];
            fbb.finish(message.pack(fbb));
            solarXRContext.sendPacket(fbb.asUint8Array());
            performance.mark('construct_datafeed_end', { detail: `timer_${index}` });
            performance.measure('construct_datafeed', {
              start: 'construct_datafeed_start',
              end: 'construct_datafeed_end',
              detail: `timer_${index}`
            });
          }, config.minimumTimeSinceLast).unref()
        )
      });
    });
  }
};
