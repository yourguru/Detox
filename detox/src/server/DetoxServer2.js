const WebSocket = require('ws');
const DetoxSessionManager = require('./DetoxSessionManager');
const log = require('../utils/logger').child({ __filename });

class DetoxServer2 {
  constructor({ port }) {
    this._onConnection = this._onConnection.bind(this);

    this._port = port;
    this._sessionManager = new DetoxSessionManager();
    this._wss = null;
  }

  async open() {
    await this._startListening();
    log.info(`server listening on localhost:${this._wss.options.port}...`);
  }

  async close() {
    await this._closeWithTimeout(10000);
  }

  async _startListening() {
    return new Promise((resolve) => {
      this._wss = new WebSocket.Server({
        port: this._port,
        perMessageDeflate: {}
      }, resolve);

      this._wss.on('connection', this._onConnection);
    });
  }

  _onConnection(ws) {
    this._sessionManager.registerConnection(ws);
  }

  _closeWithTimeout(timeoutValue) {
    return new Promise((resolve) => {
      const handle = setTimeout(() => {
        log.warn({ event: 'TIMEOUT' }, 'Detox server closed ungracefully on a timeout!!!');
        resolve();
      }, timeoutValue);

      this._wss.close(() => {
        log.debug({ event: 'WS_CLOSE' }, 'Detox server connections terminated gracefully');
        clearTimeout(handle);
        resolve();
      });
    });
  }
}

module.exports = DetoxServer2;
