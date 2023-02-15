import { ID, RootContextContext } from '../context';
import { Context, ContextReducer, createContext } from '../events';
import { DeviceBatteryModule } from './battery';

export type DeviceState = {
  id: ID;
  hardwareAddress: string;
  name: string;
  battery: {
    level: number;
    voltage: number;
  };
};

export type DeviceActions = { type: 'device/set-battery'; level: number; voltage: number };

export type DeviceEvents = {
  'device:update': (state: DeviceState) => void;
};

export type DeviceContext = Context<DeviceState, DeviceActions, DeviceEvents>;

export type DeviceModule = {
  observe?: (props: { deviceContext: DeviceContext; rootContext: RootContextContext }) => void;
  reduce?: ContextReducer<DeviceState, DeviceActions>;
};

const modules: DeviceModule[] = [DeviceBatteryModule];

export async function createDeviceContext({
  id,
  hardwareAddress,
  rootContext
}: {
  id: ID;
  hardwareAddress: string;
  rootContext: RootContextContext;
}): Promise<DeviceContext> {
  const context = createContext<DeviceState, DeviceActions, DeviceEvents>({
    initialState: {
      id,
      hardwareAddress,
      name: `Device #${id}`, // use a mock library to give devices funny names,
      battery: {
        level: 0,
        voltage: 0
      }
    },
    stateEvent: 'device:update',
    stateReducer: async (state, action) =>
      modules.reduce<Promise<DeviceState>>(
        async (intermediate, { reduce }) => (reduce ? reduce(await intermediate, action) : intermediate),
        new Promise((res) => res(state))
      )
  });

  modules.forEach(({ observe }) => {
    if (observe) observe({ deviceContext: context, rootContext });
  });

  return context;
}
