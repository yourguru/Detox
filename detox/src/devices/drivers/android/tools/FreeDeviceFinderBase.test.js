jest.mock('../../../../utils/logger');

const FreeDeviceFinderBase = require('./FreeDeviceFinderBase');

describe('FreeDeviceFinderBase.findFreeDevice()', () => {
  /** @type FreeDeviceFinderBase */
  let uut;
  let adb, deviceRegistry, logger;

  beforeEach(() => {
    logger = require('../../../../utils/logger');
    const ADB = jest.genMockFromModule('../exec/ADB');
    const DeviceRegistry = jest.genMockFromModule('../../../DeviceRegistry');

    adb = new ADB();
    deviceRegistry = new DeviceRegistry();
    uut = new FreeDeviceFinderBase(adb, deviceRegistry);
  });

  it('should have virtual .isDeviceMatching() method', async () => {
    expect(await uut.isDeviceMatching()).toBe(false);
  });

  describe('when there are a few devices', () => {
    let devices;

    beforeEach(() => {
      const busyDevice = { adbName: '1-busy', avdName: 'matching' };
      const nonMatching = { adbName: '2-free', avdName: 'nonMatching' };
      const matching = { adbName: '3-free', avdName: 'matching' };

      devices = [busyDevice, nonMatching, matching];

      adb.devices.mockImplementation(async () => ({ devices }));
      deviceRegistry.isDeviceBusy.mockImplementation((adbName) => adbName.includes('busy'));

      const fakeIsDeviceMatching = async (candidate, matcher) => candidate.avdName === matcher;
      jest.spyOn(uut, 'isDeviceMatching').mockImplementation(fakeIsDeviceMatching);
    });

    it('should return first matching non-busy device', async () => {
      const adbName = await uut.findFreeDevice('matching');
      expect(adbName).toBe('3-free');
    });

    it('should return null if no free and matching device is found', async () => {
      devices.splice(2, 1);

      const adbName = await uut.findFreeDevice('matching');
      expect(adbName).toBe(null);
    });

    // TODO: add logger output test
  });
});