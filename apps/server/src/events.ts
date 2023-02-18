import { aiter } from 'iterator-helper';
import { EventEmitter, PassThrough } from 'stream';
import StrictEventEmitter from 'strict-event-emitter-types';

/**
 * Returns the last value of an event
 * Should be only used in the createContext function
 */
function lastEventValue<S>(emitter: EventEmitter, event: string) {
  let value: DeepReadonly<S>;
  emitter.on(event, (newValue) => (value = newValue));
  return () => value;
}

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, unknown> ? DeepReadonly<T[P]> : T[P];
};

export type Context<S, A, E> = {
  /**
   * Event emitter that can be used to watch changes in the state
   */
  events: StrictEventEmitter<EventEmitter, E>;

  /**
   * Allows to cancel all actions or events
   */
  signal: AbortSignal;

  /**
   * Gives the current state value
   */
  getState: () => DeepReadonly<S>;

  /**
   * A way of triggering actions
   * An action is an object telling the context reducer how to mutate the current state
   */
  dispatch: (action: A, callback?: () => void) => void;

  /**
   * Cancel all abortable events and actions
   * Should be use when you stop using a context to stop all events that are related to it to trigger
   */
  destroy: () => void;
};

/**
 * A function that mutate the state based on the action you provide
 * This function should return the mutated state, or the same state if it didnt change
 */
export type ContextReducer<S, A> = (state: DeepReadonly<S>, action: A) => Promise<S>;

export type ContextProps<S, A, E> = {
  /**
   * Defines the name of the event that should be called when the state changes
   */
  stateEvent: keyof E;

  /**
   * Value of the initial state of the context
   */
  initialState: DeepReadonly<S>;

  /**
   * A function that mutate the state based on the action you provide
   * This function should return the mutated state, or the same state if it didnt change
   */
  stateReducer: ContextReducer<S, A>;
};

/**
 * Create a context
 * A context provides a state (a state can be defined as arbitrary data, that you might want to hold),
 * and the functions to interact with it
 *
 * Like getting the current state
 * dispaching an action to modify the state
 * and an event emitter, that you can use to make your own events or get an event every time the state change
 *
 * This use most of the core principles of Redux of Vuex where you have only one flow to mutate and watch data
 */
export function createContext<S, A, E>({
  stateEvent,
  initialState,
  stateReducer
}: ContextProps<S, A, E>): Context<S, A, E> {
  const controller = new AbortController();
  const actions = new PassThrough({ objectMode: true, signal: controller.signal });
  const events = new EventEmitter();
  events.setMaxListeners(Infinity);

  aiter(actions).reduce(async (lastState, action) => {
    performance.mark('context_reduce_start', { detail: action.type });
    const state = await stateReducer(lastState, action);
    performance.mark('context_reduce_end', { detail: action.type });
    performance.measure('context_reduce', {
      detail: action.type,
      start: 'context_reduce_start',
      end: 'context_reduce_end'
    });
    events.emit(stateEvent as string, state);
    return state;
  }, initialState);

  setImmediate(() => events.emit(stateEvent as string, initialState));

  const getState = lastEventValue<S>(events, stateEvent as string);

  return {
    events: events as StrictEventEmitter<EventEmitter, E>,
    signal: controller.signal,
    getState,
    dispatch(action: A, cb) {
      if (!actions.write(action)) {
        actions.once('drain', () => cb && cb());
      } else {
        process.nextTick(() => cb && cb());
      }
    },
    destroy() {
      actions.end();
      controller.abort();
    }
  };
}
