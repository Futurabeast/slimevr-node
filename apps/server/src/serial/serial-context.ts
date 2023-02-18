import { SerialPort } from 'serialport';
import { RootContextContext } from '../context';
import { Context, ContextReducer, createContext } from '../events';

export type SerialConnectionState = {
  port: string;
};

export type SerialConnectionActions = { type: 'serial/AAAA' };

export type SerialConnectionEvents = {
  'serial:update': (state: SerialConnectionState) => void;
};

export type SerialConnectionContext = Context<
  SerialConnectionState,
  SerialConnectionActions,
  SerialConnectionEvents
> & {
  serial: SerialPort;
};

export type SerialConnectionModule = {
  observe?: (props: { serialContext: SerialConnectionContext; rootContext: RootContextContext }) => void;
  reduce?: ContextReducer<SerialConnectionState, SerialConnectionActions>;
};

const modules: SerialConnectionModule[] = [];

export async function createSerialConnectionContext({
  port,
  rootContext
}: {
  port: string;
  rootContext: RootContextContext;
}): Promise<SerialConnectionContext> {
  const context = createContext<SerialConnectionState, SerialConnectionActions, SerialConnectionEvents>({
    initialState: {
      port
    },
    stateEvent: 'serial:update',
    stateReducer: async (state, action) =>
      modules.reduce<Promise<SerialConnectionState>>(
        async (intermediate, { reduce }) => (reduce ? reduce(await intermediate, action) : intermediate),
        new Promise((res) => res(state))
      )
  });

  const serialContext = { ...context, serial: new SerialPort({ path: port, baudRate: 115200, autoOpen: false }) };

  modules.forEach(({ observe }) => {
    if (observe) observe({ serialContext, rootContext });
  });

  return serialContext;
}
