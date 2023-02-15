import logger from '../logger';
import { TrackerModule } from './tracker';

const log = logger(__filename);

export const TrackerInfosModule: TrackerModule = {
  async reduce(state, action) {
    if (action.type === 'tracker/set-infos') {
      return {
        ...state,
        infos: {
          ...state.infos,
          sensorType: action.infos.sensorType || state.infos?.sensorType,
          status: action.infos.status || state.infos?.status
        }
      };
    }
    return state;
  },

  observe({ trackerContext }) {
    trackerContext.events.on('tracker:update', (tracker) => {
      // log.info({ tracker }, 'tracker state update');
    });
  }
};
