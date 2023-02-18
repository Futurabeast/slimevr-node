import { BodyPart, ImuType, TrackerStatus } from 'solarxr-protocol';
import { ConfigContext } from '../config/config';
import { ID, RootContextContext } from '../context';
import { Context, ContextReducer, createContext } from '../events';
import { TrackerInfosModule } from './infos';
import { TrackerLinkDeviceModule } from './link-device';
import { TrackerRotationModule } from './rotation';
import { TrackerSettingsModule } from './tracker-settings';

export type TrackerIdNum = { id: ID; trackerNum: number };
export type TrackerInfos = {
  sensorType: ImuType;
  status: TrackerStatus;
};

export type Rotation = { x: number; y: number; z: number; w: number };

export type TrackerState = {
  id: TrackerIdNum;
  hardwareId: string;
  name: string;
  infos?: Partial<TrackerInfos>;
  rotation: Rotation;
  bodyPart: BodyPart;
  deviceId?: ID;
};

export type TrackerActions =
  | { type: 'tracker/link-device'; deviceId: ID }
  | { type: 'tracker/set-infos'; infos: Partial<TrackerInfos> }
  | { type: 'tracker/set-rotation'; rotation: Rotation }
  | {
      type: 'tracker/change-settings';
      bodyPart: BodyPart | BodyPart.NONE;
      displayName?: string;
      allowDriftCompensation?: boolean;
    };

export type TrackerEvents = {
  'tracker:update': (state: TrackerState) => void;
};

export type TrackerContext = Context<TrackerState, TrackerActions, TrackerEvents> & {
  saveTracker: () => void;
};

export type TrackerModule = {
  observe?: (props: { trackerContext: TrackerContext; rootContext: RootContextContext }) => void;
  reduce?: ContextReducer<TrackerState, TrackerActions>;
};

const modules: TrackerModule[] = [
  TrackerInfosModule,
  TrackerRotationModule,
  TrackerLinkDeviceModule,
  TrackerSettingsModule
];

function loadTrackerConfig(configContext: ConfigContext, id: TrackerIdNum, hardwareId: string): TrackerState {
  const { trackers } = configContext.getState();

  const trackerConfig = trackers[hardwareId];

  console.log('hello', trackerConfig);

  return {
    id,
    hardwareId,
    name: `Tracker #${id.id}`, // use a mock library to give tracker funny names
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    bodyPart: trackerConfig?.bodyPart || BodyPart.NONE
  };
}

export async function createTrackerContext({
  id,
  hardwareId,
  rootContext,
  configContext
}: {
  id: TrackerIdNum;
  hardwareId: string;
  rootContext: RootContextContext;
  configContext: ConfigContext;
}): Promise<TrackerContext> {
  const context = createContext<TrackerState, TrackerActions, TrackerEvents>({
    initialState: loadTrackerConfig(configContext, id, hardwareId),
    stateEvent: 'tracker:update',
    stateReducer: async (state, action) =>
      modules.reduce<Promise<TrackerState>>(
        async (intermediate, { reduce }) => (reduce ? reduce(await intermediate, action) : intermediate),
        new Promise((res) => res(state))
      )
  });

  const trackerContext: TrackerContext = {
    ...context,
    saveTracker: () => {
      const state = context.getState();

      const config = {
        name: state.name,
        bodyPart: state.bodyPart
      };

      configContext.dispatch({
        type: 'config/set-tracker-config',
        id: state.hardwareId,
        config
      });
    }
  };

  modules.forEach(({ observe }) => {
    if (observe) observe({ trackerContext, rootContext });
  });

  return trackerContext;
}
