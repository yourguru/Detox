const FreeDeviceFinderBase = require('../tools/FreeDeviceFinderBase');

class FreeEmulatorFinder extends FreeDeviceFinderBase {
  async isDeviceMatching(candidate, avdName) {
    if (candidate.type !== 'emulator') {
      return false;
    }

    return await candidate.queryName() === avdName;
  }
}

module.exports = FreeEmulatorFinder;
