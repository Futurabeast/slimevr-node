import {
  AssignTrackerRequestT,
  DataFeedConfigT,
  DataFeedMessage,
  DataFeedUpdateT,
  PollDataFeedT,
  RpcMessage,
  StartDataFeedT,
  StartWifiProvisioningRequestT,
  StopWifiProvisioningRquestT
} from 'solarxr-protocol';
import { EventEmitter } from 'stream';
import StrictEventEmitter from 'strict-event-emitter-types/types/src/index';
import WebSocket from 'ws';
import { RootContextContext } from '../../context';
import { Context, ContextReducer, createContext } from '../../events';
import { StartDataFeedSolarXRModule } from './datafeed/start-datafeed';
import { RpcAssignTrackerReqXRModule } from './rpc/assign-tracker-request';

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

export type RpcMessageMapping = {
  [RpcMessage.AssignTrackerRequest]: AssignTrackerRequestT;
  [RpcMessage.StartWifiProvisioningRequest]: StartWifiProvisioningRequestT;
  [RpcMessage.StopWifiProvisioningRquest]: StopWifiProvisioningRquestT;
};

export type SolarXRConnectionEvents = {
  'solarxr-connection:update': (context: SolarXRConnectionState) => void;
};

type EnumUnionMappingEvents<T> = { [K in keyof T]: (packet: T[K]) => void };

export type SolarXRConnectionContext = Context<
  SolarXRConnectionState,
  SolarXRConnectionActions,
  SolarXRConnectionEvents
> & {
  datafeedEvents: StrictEventEmitter<EventEmitter, EnumUnionMappingEvents<DataFeedMessageMapping>>;
  rpcEvents: StrictEventEmitter<EventEmitter, EnumUnionMappingEvents<RpcMessageMapping>>;
  sendPacket: (buff: Uint8Array) => void;
};

export type SolarXRConnectionModule = {
  observe?: (props: { solarXRContext: SolarXRConnectionContext; rootContext: RootContextContext }) => void;
  reduce?: ContextReducer<SolarXRConnectionState, SolarXRConnectionActions>;
};

const modules: SolarXRConnectionModule[] = [StartDataFeedSolarXRModule, RpcAssignTrackerReqXRModule];

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
    stateReducer: (state, action) =>
      modules.reduce<SolarXRConnectionState>(
        (intermediate, { reduce }) => (reduce ? reduce(intermediate, action) : intermediate),
        state
      )
  });

  const udpContext: SolarXRConnectionContext = {
    ...context,
    datafeedEvents: new EventEmitter(),
    rpcEvents: new EventEmitter(),
    sendPacket: (buff) => {
      conn.send(buff);
    }
  };

  modules.forEach(({ observe }) => {
    if (observe) observe({ solarXRContext: udpContext, rootContext });
  });

  return udpContext;
}
