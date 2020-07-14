const log = require('../../../../utils/logger').child({ __filename });

class FreeDeviceFinderBase {
  constructor(adb, deviceRegistry) {
    this.adb = adb;
    this.deviceRegistry = deviceRegistry;
  }

  async findFreeDevice(matcher) {
    const { devices } = await this.adb.devices();
    for (const candidate of devices) {
      const isBusy = this.deviceRegistry.isDeviceBusy(candidate.adbName);
      if (isBusy) {
        log.debug({ event: 'DEVICE_LOOKUP' }, `Device %j is busy, skipping...`, candidate.adbName);
        continue;
      }

      if (await this.isDeviceMatching(candidate, matcher)) {
        log.debug({ event: 'DEVICE_LOOKUP' }, `Found a matching free device %j`, candidate.adbName);
        return candidate.adbName;
      } else {
        log.debug({ event: 'DEVICE_LOOKUP' }, `Device %j does not match %j`, candidate.adbName, matcher);
      }
    }

    return null;
  }

  /** @protected */
  async isDeviceMatching(candidate, matcher) {
    return false;
  }
}

module.exports = FreeDeviceFinderBase;
