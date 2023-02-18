import { TrackerModule } from './tracker';

export const TrackerInfosModule: TrackerModule = {
  reduce(state, action) {
    if (action.type === 'tracker/set-infos') {
      return {
        ...state,
        sensorType: action.sensorType || state.sensorType,
        status: action.status || state.status
      };
    }
    return state;
  }
};
