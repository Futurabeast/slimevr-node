import { ID, RootContextContext } from '../context';
import { Context, ContextReducer, createContext } from '../events';
import { DeviceBatteryModule } from './battery';
import { DevicePingModule } from './ping';
import { DeviceSignalStrengthModule } from './signal-strength';

export type DeviceState = {
  id: ID;
  hardwareAddress: string;
  name: string;
  battery: {
    level: number;
    voltage: number;
  };
  ping?: number;
  signalStrength?: number;
  origin: 'driver' | 'feeder' | 'udp';
};

export type DeviceActions =
  | { type: 'device/set-battery'; level: number; voltage: number }
  | { type: 'device/update-ping'; ping: number }
  | { type: 'device/set-signal-strength'; signalStrength: number };
export type DeviceEvents = {
  'device:update': (state: DeviceState) => void;
};

export type DeviceContext = Context<DeviceState, DeviceActions, DeviceEvents>;

export type DeviceModule = {
  observe?: (props: { deviceContext: DeviceContext; rootContext: RootContextContext }) => void;
  reduce?: ContextReducer<DeviceState, DeviceActions>;
};

const modules: DeviceModule[] = [DeviceBatteryModule, DevicePingModule, DeviceSignalStrengthModule];

export async function createDeviceContext({
  id,
  hardwareAddress,
  origin,
  rootContext
}: {
  id: DeviceState['id'];
  hardwareAddress: DeviceState['hardwareAddress'];
  origin: DeviceState['origin'];
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
      },
      origin
    },
    stateEvent: 'device:update',
    stateReducer: (state, action) =>
      modules.reduce<DeviceState>(
        (intermediate, { reduce }) => (reduce ? reduce(intermediate, action) : intermediate),
        state
      )
  });

  modules.forEach(({ observe }) => {
    if (observe) observe({ deviceContext: context, rootContext });
  });

  return context;
}
