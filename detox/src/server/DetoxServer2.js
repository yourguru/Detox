const _ = require('lodash');
const WebSocket = require('ws');
const logger = require('../utils/logger').child({ __filename });

const WebSocketServer = WebSocket.Server;

const CLOSE_TIMEOUT = 10000;
const ROLE_TESTER = 'tester';
const ROLE_APP = 'app';

const BROADCAST = Symbol('broadcast');

class Room {
  constructor() {
    this.tester = null;
    this.app = null;
  }
}

class DetoxServer {
  constructor({ port, standalone = false }) {
    this._onConnection = this._onConnection.bind(this);
    this._wss = new WebSocketServer({ 
      port,
      perMessageDeflate: {}
    });

    this._rooms = new Map();
    this._anonymousClients = new Set();

    this.standalone = standalone;
    logger.info(`server listening on localhost:${this._wss.options.port}...`);
    this._wss.on('connection', this._onConnection);
  }

  _onConnection(ws) {
    let sessionId;
    let role;

    ws.on('message', (str) => {
      const action = _.attempt(() => JSON.parse(str));
      if (_.isError(action)) {
        logger.debug({ event: 'ERROR', err: action }, `Invalid JSON received, cannot parse`, action);
        return;
      }
      if (!action.type) {
        logger.warn({ event: 'EMPTY_ACTION' }, `role=${role}, sessionId=${sessionId}`);
        return;
      }
      try {
        if (action.type === 'login') {
          if (action.params && action.params.sessionId && action.params.role) {
            sessionId = action.params.sessionId;
            role = action.params.role;
            logger.debug({ event: 'LOGIN' }, `role=${role}, sessionId=${sessionId}`);
            _.set(this.sessions, [sessionId, role], ws);
            action.type = 'loginSuccess';
            this.sendAction(ws, action);
            logger.debug({ event: 'LOGIN_SUCCESS' }, `role=${role}, sessionId=${sessionId}`);
          }
        } else if (sessionId && role) {
          logger.trace({ event: 'MESSAGE', action: action.type }, `role=${role} action=${action.type} (sessionId=${sessionId})`);
          this.sendToOtherRole(sessionId, role, action);
        }
      } catch (err) {
      }
    });

    ws.on('error', (e) => {
      logger.warn({ event: 'WEBSOCKET_ERROR', role, sessionId }, `${e && e.message} (role=${role}, session=${sessionId})`);
    });

    ws.on('close', () => {
      if (sessionId && role) {
        logger.debug({ event: 'DISCONNECT' }, `role=${role}, sessionId=${sessionId}`);

        if (role === ROLE_APP) {
          this.sendToOtherRole(sessionId, role, { type: 'appDisconnected', messageId: -0xc1ea });
        }

        if (this.standalone && role === ROLE_TESTER) {
          this.sendToOtherRole(sessionId, role, { type: 'testerDisconnected', messageId: -1 });
        }

        _.set(this.sessions, [sessionId, role], undefined);
      }
    });
  });
  }

  sendAction(ws, action) {
    ws.send(JSON.stringify(action) + '\n ');
  }

  sendToOtherRole(sessionId, role, action) {
    const otherRole = role === ROLE_APP ? ROLE_TESTER : ROLE_APP;
    const ws = _.get(this.sessions, [sessionId, otherRole]);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendAction(ws, action);
    } else {
      logger.debug({ event: 'CANNOT_FORWARD' }, `role=${otherRole} not connected, cannot fw action (sessionId=${sessionId})`);

      if (role === ROLE_TESTER && action.type === 'cleanup') {
        this.sendToOtherRole(sessionId, otherRole, {
          type: 'appDisconnected',
          messageId: action.messageId,
        });
      }
    }
  }

  async close() {
    await this._closeWithTimeout();
  }

  _closeWithTimeout() {
    return new Promise((resolve) => {
      const handle = setTimeout(() => {
        logger.warn({ event: 'TIMEOUT' }, 'Detox server closed ungracefully on a timeout!!!');
        resolve();
      }, CLOSE_TIMEOUT);

      this._wss.close(() => {
        logger.debug({ event: 'WS_CLOSE' }, 'Detox server connections terminated gracefully');
        clearTimeout(handle);
        resolve();
      });
    });
  }
}

module.exports = DetoxServer;
