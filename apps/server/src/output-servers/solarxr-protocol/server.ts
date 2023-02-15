import { ByteBuffer } from 'flatbuffers';
import http from 'http';
import { aiter } from 'iterator-helper';
import { MessageBundle } from 'solarxr-protocol';
import { on } from 'stream';
import WebSocket, { WebSocketServer } from 'ws';
import { ConfigContext } from '../../config/config';
import { RootContextContext } from '../../context';
import logger from '../../logger';
import { createSolarXRConnectionContext } from './solarxr-connection';

const log = logger(__filename);

const SOLARXR_PORT = 21110;

export function init({ rootContext }: { rootContext: RootContextContext; configContext: ConfigContext }) {
  const httpS = http.createServer();
  const server = new WebSocketServer({
    server: httpS
  });

  httpS.listen(SOLARXR_PORT, () => {
    log.info({ port: SOLARXR_PORT }, `SolarXR server listening on port`);
  });

  server.on('error', (err) => {
    log.error(err, 'Websocket Error');
  });

  aiter(on(server, 'connection')).reduce(
    (state, [conn]: [WebSocket.WebSocket]) => {
      const solarXRState = createSolarXRConnectionContext({ id: state.handleId, rootContext, conn });
      rootContext.dispatch({ type: 'solarxr/new-connection', id: state.handleId, context: solarXRState });
      log.info({ id: state.handleId }, 'new connection');

      conn.on('close', () => {
        log.info({ id: state.handleId }, 'conn closed');
        solarXRState.destroy();
        rootContext.dispatch({ type: 'solarxr/remove-connection', id: state.handleId });
      });

      conn.on('message', (msg: Buffer) => {
        if (typeof msg === 'string') return;
        const fbb = new ByteBuffer(new Uint8Array(msg));
        const message = MessageBundle.getRootAsMessageBundle(fbb).unpack();
        message.dataFeedMsgs.forEach((header) => {
          solarXRState.datafeedEvents.emit(header.messageType as number, header.message);
        });
      });

      return {
        ...state,
        handleId: state.handleId + 1
      };
    },
    {
      handleId: 0
    }
  );
}
