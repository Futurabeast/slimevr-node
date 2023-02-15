interface StaticEventEmitterOptions {
  signal?: AbortSignal | undefined;
}

const destreamify = async <T>(stream: AsyncIterable<T>, callback: (val: T) => void): Promise<void> => {
  for await (const event of stream) {
    callback(event);
  }
};

export const debounce = async function* <T>(
  stream: AsyncIterable<T>,
  interval: number,
  options?: StaticEventEmitterOptions
): AsyncIterable<T> {
  let first = false;
  let lastEvent: T | undefined;
  let deferred: Promise<T> | undefined;
  let intervalId;
  let resolve: (val: T) => void;

  const reset = (isFirst: boolean) => {
    first = isFirst;
    lastEvent = undefined;
    deferred = new Promise((r) => (resolve = r));
  };

  const passEvent = () => {
    if (lastEvent === undefined) {
      first = true;
      return;
    }

    const event = lastEvent;
    const res = resolve;
    reset(false);
    intervalId = setTimeout(passEvent, interval).unref();
    res(event);
  };

  reset(true);
  destreamify(stream, (event: T) => {
    lastEvent = event;
    if (first) passEvent();
  });

  while (true) {
    if (options?.signal?.aborted) {
      clearInterval(intervalId);
      throw new DOMException('aborted debounce', 'AbortError');
    }
    if (deferred) yield deferred;
  }
};
