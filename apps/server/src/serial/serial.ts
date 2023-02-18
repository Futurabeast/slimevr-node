import { PortInfo } from '@serialport/bindings-interface';
import * as arraydiff from 'fast-array-diff';
import { aiter } from 'iterator-helper';
import { SerialPort } from 'serialport';
import { setInterval } from 'timers/promises';
import { RootContextContext } from '../context';
import logger from '../logger';
import { createSerialConnectionContext } from './serial-context';

const logs = logger(__filename);

// The lib type deffinition is wrong!!!!! i made an issue we will see how it goes
//https://github.com/serialport/node-serialport/issues/2600
type PatchedPortInfo = PortInfo & { friendlyName?: string };

export function initSerialWatcher({ rootContext }: { rootContext: RootContextContext }) {
  aiter(setInterval(3000, {})).reduce(async (previousList: PatchedPortInfo[]) => {
    const list: PatchedPortInfo[] = await SerialPort.list();

    const diff = arraydiff.diff(previousList, list, (a, b) => a.path == b.path);

    if (diff.added.length > 0) {
      const { serialConnections } = rootContext.getState();
      diff.added.forEach(async ({ path }) => {
        if (!serialConnections[path]) {
          const context = await createSerialConnectionContext({ port: path, rootContext });
          rootContext.dispatch({
            type: 'serial/new-device',
            port: path,
            context
          });
          // CANT CONTINUE THIS WIHTOUT MORE OF THE SOLARXR IMPLEMENTATION
        }
      });
    }
    return list;
  }, []);
}
