const _ = require('lodash');
const Detox = require('./Detox');
const DetoxConstants = require('./DetoxConstants');
const configuration = require('./configuration');

const _detox = Symbol('detox');

class DetoxExportWrapper {
  constructor() {
    this[_detox] = [];

    this.init = this.init.bind(this);
    this.cleanup = this.cleanup.bind(this);

    this.DetoxConstants = DetoxConstants;
  }

  async init(config, params) {
    const instance = DetoxExportWrapper._createInstance(config);
    this[_detox].push(instance);

    await instance.init(params);
    return instance;
  }

  async cleanup() {
    for (const instance of this[_detox]) {
      await this[_detox].cleanup();
    }
  }

  static _createInstance(detoxConfig) {
    if (!detoxConfig || _.isError(detoxConfig)) {
      throw new Error(`No configuration was passed to detox, make sure you pass a detoxConfig when calling 'detox.init(detoxConfig)'`);
    }

    if (!(detoxConfig.configurations && _.size(detoxConfig.configurations) >= 1)) {
      throw new Error(`There are no device configurations in the detox config`);
    }

    const deviceConfig = configuration.composeDeviceConfig(detoxConfig);
    const configurationName = _.findKey(detoxConfig.configurations, (config) => config === deviceConfig);
    const artifactsConfig = configuration.composeArtifactsConfig({
      configurationName,
      detoxConfig,
      deviceConfig,
    });

    return new Detox({
      deviceConfig,
      artifactsConfig,
      session: detoxConfig.session,
    });
  }
}

module.exports = DetoxExportWrapper;
