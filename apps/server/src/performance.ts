import { PerformanceEntry, PerformanceObserver } from 'perf_hooks';
import { Logger, LoggerOptions } from 'pino';
import logger from './logger';

function createDebouncedObserver({ log }: { log: Logger<LoggerOptions> }) {
  let groupedEntries: Record<string, PerformanceEntry[]> = {};

  setInterval(() => {
    const averagedEntries = Object.keys(groupedEntries).reduce(
      (curr, group) => ({
        ...curr,
        [group]: groupedEntries[group]
          ? groupedEntries[group].reduce((curr, { duration }) => curr + duration, 0) / groupedEntries[group].length
          : 0
      }),
      {}
    );
    log.info({ averagedEntries }, 'Monitoring');

    groupedEntries = {};
  }, 5000).unref();

  return (entries: PerformanceEntry[]) => {
    if (entries.length !== 0) {
      for (const entry of entries) {
        if (!entry.detail) continue;
        // log.info({ entry }, 'perf entry');
        groupedEntries[entry.detail as string] = [...(groupedEntries[entry.detail as string] || []), entry];
      }
    }
  };
}

export function observePerformances() {
  const observeContextReduce = createDebouncedObserver({
    log: logger('perf/context/reduce', false)
  });

  const observeDataFeedBuilder = createDebouncedObserver({
    log: logger('perf/datafeeds', false)
  });

  const observer = new PerformanceObserver((list) => {
    observeContextReduce(list.getEntriesByName('context_reduce'));
    observeDataFeedBuilder(list.getEntriesByName('construct_datafeed'));
  });

  observer.observe({
    entryTypes: ['measure', 'mark']
  });
}
