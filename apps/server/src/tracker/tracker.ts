import { BodyPart, ImuType, TrackerStatus } from 'solarxr-protocol';
import { ConfigContext } from '../config/config';
import { ID, RootContextContext } from '../context';
import { Context, ContextReducer, createContext } from '../events';
import { TrackerInfosModule } from './infos';
import { TrackerLinkDeviceModule } from './link-device';
import { TrackerPositionModule } from './position';
import { TrackerRotationModule } from './rotation';
import { TrackerSettingsModule } from './tracker-settings';

export type TrackerIdNum = { id: ID; trackerNum: number };
export type Rotation = { x: number; y: number; z: number; w: number };
export type Position = { x: number; y: number; z: number };

export type TrackerState = {
  id: ID;
  hardwareId: string;
  name: string;
  sensorType?: ImuType;
  status: TrackerStatus;
  rotation: Rotation;
  position?: Position;
  bodyPart: BodyPart;
  customeName?: string;
  deviceId?: ID;
  origin: 'driver' | 'feeder' | 'udp';
};

export type TrackerActions =
  | { type: 'tracker/link-device'; deviceId: ID }
  | { type: 'tracker/set-infos'; status?: TrackerStatus; sensorType?: ImuType }
  | { type: 'tracker/set-rotation'; rotation: Rotation }
  | { type: 'tracker/set-position'; position: Position }
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
  TrackerPositionModule,
  TrackerLinkDeviceModule,
  TrackerSettingsModule
];

function loadTrackerConfig(
  configContext: ConfigContext,
  id: TrackerState['id'],
  hardwareId: TrackerState['hardwareId'],
  origin: TrackerState['origin']
): TrackerState {
  const { trackers } = configContext.getState();

  const trackerConfig = trackers[hardwareId];

  return {
    id,
    hardwareId,
    name: `Tracker #${id}`, // use a mock library to give tracker funny names
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    status: TrackerStatus.NONE,
    bodyPart: trackerConfig?.bodyPart || BodyPart.NONE,
    origin
  };
}

export async function createTrackerContext({
  id,
  hardwareId,
  origin,
  rootContext,
  configContext
}: {
  id: TrackerState['id'];
  hardwareId: TrackerState['hardwareId'];
  origin: TrackerState['origin'];
  rootContext: RootContextContext;
  configContext: ConfigContext;
}): Promise<TrackerContext> {
  const context = createContext<TrackerState, TrackerActions, TrackerEvents>({
    initialState: loadTrackerConfig(configContext, id, hardwareId, origin),
    stateEvent: 'tracker:update',
    stateReducer: (state, action) =>
      modules.reduce<TrackerState>(
        (intermediate, { reduce }) => (reduce ? reduce(intermediate, action) : intermediate),
        state
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
