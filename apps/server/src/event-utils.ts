import { on } from 'stream';
import { NoUndefined, TypeRecord } from 'strict-event-emitter-types';

interface StaticEventEmitterOptions {
  signal?: AbortSignal | undefined;
}
type GetEventMapping<T extends TypeRecord<any, any, any>> = NoUndefined<T[' _eventsType']>;

export function eventStream<Em extends TypeRecord<any, any, any>, K extends keyof GetEventMapping<Em>>(
  emitter: Em,
  event: K,
  options?: StaticEventEmitterOptions
): AsyncIterableIterator<Parameters<GetEventMapping<Em>[K]>> {
  return on(emitter as any, event as string, options);
}
