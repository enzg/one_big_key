export const tronTokenAddressMainnet: Record<string, string> = {
  TRX: 'native',
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  USDD: 'TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz',
};

export const tronTokenAddressTestnet: Record<string, string> = {
  TRX: 'native',
  USDT: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  USDD: 'TLSKhknqGdvLZyEocevYQ4FTygCVR7PB6F',
};

export const TRON_SOURCE_FLAG_TESTNET = 'test';
export const TRON_SOURCE_FLAG_MAINNET = '1key';

export const TRON_MESSAGE_PREFIX = '\x19TRON Signed Message:\n';
