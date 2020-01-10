const _ = require('lodash');
const AsyncWebSocket = require('./AsyncWebSocket');
const actions = require('./actions/actions');
const argparse = require('../utils/argparse');
const log = require('../utils/logger').child({ __filename });

class Client {
  constructor(config) {
    this.isConnected = false;
    this.configuration = config;
    this.ws = new AsyncWebSocket(config.server);
    this.slowInvocationStatusHandler = null;
    this.slowInvocationTimeout = argparse.getArgValue('debug-synchronization');
    this.successfulTestRun = true; // flag for cleanup
    this._pendingAppCrashMessage = undefined;

    this.setActionListener(new actions.AppWillTerminateWithError(), (response) => {
      this._pendingAppCrashMessage = response.params.errorDetails;
      this.ws.rejectAll(this._pendingAppCrashMessage);
    });
  }

  async connect() {
    await this.ws.open();
    await this.sendAction(new actions.Login(this.configuration.sessionId));
  }

  reset() {
    this._pendingAppCrashMessage = undefined;
    this.ws.resetInFlightPromises();
  }

  async reloadReactNative() {
    await this.sendAction(new actions.ReloadReactNative());
  }

  async waitUntilReady() {
    await this.sendAction(new actions.Ready());
    this.isConnected = true;
  }

  async waitForBackground() {
    await this.sendAction(new actions.WaitForBackground());
  }

  async waitForActive() {
    await this.sendAction(new actions.WaitForActive());
  }

  async cleanup() {
    clearTimeout(this.slowInvocationStatusHandler);
    if (this.isConnected && !this._pendingAppCrashMessage) {
      if(this.ws.isOpen()) {
        await this.sendAction(new actions.Cleanup(this.successfulTestRun));
      }
      this.isConnected = false;
    }

    if (this.ws.isOpen()) {
      await this.ws.close();
    }
  }

  async currentStatus() {
    return (await this.sendAction(new actions.CurrentStatus())).params;
  }

  async shake() {
    await this.sendAction(new actions.Shake());
  }

  async startInstrumentsRecording({ recordingPath }) {
    await this.sendAction(new actions.SetInstrumentsRecordingState({
      recordingPath
    }));
  }

  async stopInstrumentsRecording() {
    await this.sendAction(new actions.SetInstrumentsRecordingState());
  }

  async deliverPayload(params) {
    await this.sendAction(new actions.DeliverPayload(params));
  }

  async execute(invocation) {
    if (typeof invocation === 'function') {
      invocation = invocation();
    }

    if (this.slowInvocationTimeout) {
      this.slowInvocationStatusHandler = this.slowInvocationStatus();
    }

    // when this test run fails, we want a stack trace from up here where the
    // $callee is still available, and not inside the catch block where it isn't
    const potentialError = new Error();

    try {
      return await this.sendAction(new actions.Invoke(invocation));
    } catch (err) {
      this.successfulTestRun = false;

      potentialError.message = _.isError(err) ? err.message : String(err);
      throw potentialError;
    } finally {
      clearTimeout(this.slowInvocationStatusHandler);
    }
  }

  getStatus() {
    return {
      pendingAppCrashMessage: this._pendingAppCrashMessage,
      pendingRequests: _.values(this.ws.inFlightPromises)
        .map(({ message }) => ({
          id: message.messageId,
          type: message.type,
          params: message.params
        }))
        .filter(m => m.type !== 'currentStatus'),
    };

  }

  setActionListener(action, clientCallback) {
    this.ws.setEventCallback(action.messageId, (response) => {
      const parsedResponse = JSON.parse(response);
      action.handle(parsedResponse);

      /* istanbul ignore next */
      if (clientCallback) {
        clientCallback(parsedResponse);
      }
    });
  }

  async sendAction(action) {
    const response = await this.ws.send(action, action.messageId);
    const parsedResponse = JSON.parse(response);
    await action.handle(parsedResponse);
    return parsedResponse;
  }

  slowInvocationStatus() {
    return setTimeout(async () => {
      if (this.ws.isOpen()) {
        this._lastStatus = await this.currentStatus();
        this.slowInvocationStatusHandler = this.slowInvocationStatus();
      }
    }, this.slowInvocationTimeout);
  }
}

module.exports = Client;
