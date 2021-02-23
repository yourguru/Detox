class DetoxSession {
  /**
   * @param {string} id
   */
  constructor(id) {
    this._id = id;
    /** @type {DetoxConnection} */
    this._tester = null;
    /** @type {DetoxConnection} */
    this._app = null;
  }

  get id() {
    return this._id;
  }

  get app() {
    return this._app;
  }

  set app(value) {
    if (value) {
      // this._assertAppIsNotConnected();
      this._app = value;
      // this._notifyAboutAppConnect();
    } else {
      this._app = null;
      this._notifyAboutAppDisconnect();
    }
  }

  get tester() {
    return this._tester;
  }

  set tester(value) {
    if (value) {
      // this._assertTesterIsNotConnected();
      this._tester = value;
      // this._notifyAboutTesterConnect();
    } else {
      this._tester = null;
      this._notifyAboutTesterDisconnect();
    }
  }

  get isEmpty() {
    return !this._tester && !this._app;
  }

  getRole(connection) {
    if (connection === this.tester) {
      return 'tester';
    }

    if (connection === this.app) {
      return 'app';
    }

    throw new Error('AssertionError: connection should be either this.app or this.tester');
  }

  getDestination(connection) {
    const role = this.getRole(connection);
    return role === 'tester' ? this.app : this.tester;
  }

  carry(from, message) {
    const to = this.getDestination(from);
    if (!to) {
      throw new Error('Cannot forward the message to the app.');
    }

    to.sendAction(message);
  }

  disconnect(connection) {
    if (!connection) {
      throw new Error('Assert connection != null');
    }

    const role = this.getRole(connection);
    this[role] = null;
  }

  _notifyAboutAppDisconnect() {
    if (!this._tester) {
      return;
    }

    this._tester.send(/* TODO: message */);
  }

  _notifyAboutTesterDisconnect() {
    if (!this._app) {
      return;
    }

    this._app.sendAction(/* TODO: message */);
  }
}

module.exports = DetoxSession;
