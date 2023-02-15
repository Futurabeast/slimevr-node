import { DataFeedConfigT, DataFeedMessage, DataFeedUpdateT, PollDataFeedT, StartDataFeedT } from 'solarxr-protocol';
import { EventEmitter } from 'stream';
import StrictEventEmitter from 'strict-event-emitter-types/types/src/index';
import WebSocket from 'ws';
import { RootContextContext } from '../../context';
import { Context, ContextReducer, createContext } from '../../events';
import { StartDataFeedSolarXRModule } from './datafeed/start-datafeed';

export type SolarXRConnectionState = {
  id: number;
  datafeedConfigs: DataFeedConfigT[];
  datafeedTimers: NodeJS.Timer[];
};

export type SolarXRConnectionActions = {
  type: 'solarxr/datafeed/set-config';
  configs: DataFeedConfigT[];
  timers: NodeJS.Timer[];
};

export type DataFeedMessageMapping = {
  [DataFeedMessage.DataFeedConfig]: DataFeedConfigT;
  [DataFeedMessage.PollDataFeed]: PollDataFeedT;
  [DataFeedMessage.StartDataFeed]: StartDataFeedT;
  [DataFeedMessage.DataFeedUpdate]: DataFeedUpdateT;
};

export type SolarXRConnectionEvents = {
  'solarxr-connection:update': (context: SolarXRConnectionState) => void;
};

export type SolarXRConnectionContext = Context<
  SolarXRConnectionState,
  SolarXRConnectionActions,
  SolarXRConnectionEvents
> & {
  datafeedEvents: StrictEventEmitter<
    EventEmitter,
    { [K in keyof DataFeedMessageMapping]: (packet: DataFeedMessageMapping[K]) => void }
  >;
  sendPacket: (buff: Uint8Array) => void;
};

export type SolarXRConnectionModule = {
  observe: (props: { solarXRContext: SolarXRConnectionContext; rootContext: RootContextContext }) => void;
  reduce: ContextReducer<SolarXRConnectionState, SolarXRConnectionActions>;
};

const modules: SolarXRConnectionModule[] = [StartDataFeedSolarXRModule];

export function createSolarXRConnectionContext({
  id,
  conn,
  rootContext
}: {
  id: number;
  conn: WebSocket.WebSocket;
  rootContext: RootContextContext;
}): SolarXRConnectionContext {
  const context = createContext<SolarXRConnectionState, SolarXRConnectionActions, SolarXRConnectionEvents>({
    initialState: {
      id,
      datafeedConfigs: [],
      datafeedTimers: []
    },
    stateEvent: 'solarxr-connection:update',
    stateReducer: async (state, action) =>
      modules.reduce<Promise<SolarXRConnectionState>>(
        async (intermediate, { reduce }) => reduce(await intermediate, action),
        new Promise((res) => res(state))
      )
  });

  const udpContext: SolarXRConnectionContext = {
    ...context,
    datafeedEvents: new EventEmitter(),
    sendPacket: (buff) => {
      conn.send(buff);
    }
  };

  modules.forEach(({ observe }) => observe({ solarXRContext: udpContext, rootContext }));

  return udpContext;
}
