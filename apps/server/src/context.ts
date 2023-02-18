import { TrackerIdT } from 'solarxr-protocol';
import { DeviceContext } from './device/device';
import { Context, ContextReducer, createContext, DeepReadonly } from './events';
import { UDPConnectionContext } from './input-servers/udp-tracker-server/udp-connection';
import { SolarXRConnectionContext } from './output-servers/solarxr-protocol/solarxr-connection';
import { SerialConnectionContext } from './serial/serial-context';
import { TrackerContext } from './tracker/tracker';

export type ID = number;

export type RootContextState = {
  udpConnections: Record<string, UDPConnectionContext>;
  trackers: Record<ID, TrackerContext>;
  devices: Record<ID, DeviceContext>;
  solarXRConnections: Record<number, SolarXRConnectionContext>;
  serialConnections: Record<string, SerialConnectionContext>;
  handleId: ID;
};

export type RootContextActions =
  | { type: 'udp/new-connection'; id: string; context: UDPConnectionContext }
  | { type: 'udp/remove-connection'; id: string }
  | { type: 'solarxr/new-connection'; id: number; context: SolarXRConnectionContext }
  | { type: 'solarxr/remove-connection'; id: number }
  | { type: 'serial/new-device'; port: string; context: SerialConnectionContext }
  | { type: 'serial/remove-device'; port: string }
  | { type: 'server/new-tracker'; id: ID; context: TrackerContext }
  | { type: 'server/new-device'; id: ID; context: DeviceContext };

export type RootContextEvents = {
  'context:update': (context: RootContextState) => void;
};

export type RootContextContext = Context<RootContextState, RootContextActions, RootContextEvents> & {
  nextHandleId: () => ID;
  getTrackerContext: (trackerId: TrackerIdT | null) => DeepReadonly<TrackerContext> | null;
};

const contextReducer: ContextReducer<RootContextState, RootContextActions> = async (state, action) => {
  if (action.type === 'udp/new-connection') {
    return {
      ...state,
      udpConnections: {
        ...state.udpConnections,
        [action.id]: action.context
      }
    };
  }
  if (action.type === 'udp/remove-connection') {
    const { [action.id]: _, ...connections } = state.udpConnections;

    return {
      ...state,
      udpConnections: connections
    };
  }
  if (action.type === 'server/new-tracker') {
    return {
      ...state,
      trackers: {
        ...state.trackers,
        [action.id]: action.context
      },
      handleId: action.id
    };
  }
  if (action.type === 'server/new-device') {
    return {
      ...state,
      devices: {
        ...state.devices,
        [action.id]: action.context
      },
      handleId: action.id
    };
  }
  if (action.type === 'solarxr/new-connection') {
    return {
      ...state,
      solarXRConnections: {
        ...state.solarXRConnections,
        [action.id]: action.context
      }
    };
  }
  if (action.type === 'solarxr/remove-connection') {
    const { [action.id]: _, ...connections } = state.solarXRConnections;
    return {
      ...state,
      solarXRConnections: connections
    };
  }
  return state;
};

/**
 * Creates the Root context of the app
 * We defines Root context as the Global state of the server
 * it holds references to other context
 *
 * like udp connections states, tracker state, and device state
 *
 * NOTE on this section
 * the more we add code the more i think this might need to change
 * because it creates uncessary complexity
 * also i realized that root context does not require any event emitter
 * and all the actions aside of the handle only handle creation of new state
 * having a list of context event tho it does not use the immuatable pattern might be
 * better and allow to pick what context you need for what input/output server
 * kinda like the config context is rn
 *
 */
export function createRootContext(): RootContextContext {
  const state = createContext<RootContextState, RootContextActions, RootContextEvents>({
    stateEvent: 'context:update',
    initialState: {
      udpConnections: {},
      trackers: {},
      devices: {},
      solarXRConnections: {},
      serialConnections: {},
      handleId: 0
    },
    stateReducer: contextReducer
  });

  return {
    ...state,
    nextHandleId: () => {
      const { handleId } = state.getState();

      return handleId + 1;
    },
    getTrackerContext: (trackerId) => {
      if (!trackerId?.deviceId) return null;

      const { trackers } = state.getState();

      const tracker = trackers[trackerId.trackerNum];
      if (!tracker) return null;

      return tracker;
    }
  };
}
