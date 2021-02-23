const DetoxConnection = require('./DetoxConnection');
const DetoxSession = require('./DetoxSession');

class DetoxSessionManager {
  constructor() {
    /** @type {Map<WebSocket, DetoxConnection>} **/
    this._connectionsByWs = new Map();
    /** @type {Map<DetoxConnection, DetoxSession>} **/
    this._sessionsByConnection = new Map();
    /** @type {Map<string, DetoxSession>} **/
    this._sessionsById = new Map();
  }

  registerConnection(ws) {
    this._assertSocketIsNotUsed(ws);

    const connection = new DetoxConnection(this, ws);
    this._connectionsByWs.set(ws, connection);
  }

  registerSession(connection, { role, sessionId }) {
    this._assertConnectionIsNotInSession(connection);

    let session = this._sessionsById.get(sessionId);
    if (!session) {
      session = new DetoxSession(sessionId);

      this._sessionsById.set(sessionId, session);
      this._sessionsByConnection.set(connection, session);
    }

    session[role] = connection;
    return session;
  }

  getSession(connection) {
    return this._sessionsByConnection.get(connection) || null;
  }

  unregisterConnection(connection) {
    const session = this._sessionsByConnection.get(connection);
    if (session) {
      session.disconnect(connection);

      this._sessionsByConnection.delete(connection);
      if (session.isEmpty) {
        this._sessionsById.delete(session.id);
      }
    }

    if (this._connectionsByWs.has(connection.socket)) {
      this._connectionsByWs.delete(connection.socket);
    } else {
      throw new Error('Cannot unregister an unknown connection');
    }
  }

  _assertSocketIsNotUsed(ws) {
    if (this._connectionsByWs.has(ws)) {
      throw new Error('Cannot register the same connection twice');
    }
  }

  _assertConnectionIsNotInSession(connection) {
    const session = this._sessionsByConnection.get(connection);
    if (session) {
      throw new Error('Cannot register an already used connection (session)');
    }
  }
}

module.exports = DetoxSessionManager;
