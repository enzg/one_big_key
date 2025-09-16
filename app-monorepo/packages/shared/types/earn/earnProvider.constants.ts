import { SUI_TYPE_ARG } from '@mysten/sui/utils';

import { getNetworkIdsMap } from '../../src/config/networkIds';
import {
  EthereumCbBTC,
  EthereumDAI,
  EthereumPol,
  EthereumUSDC,
  EthereumUSDF,
  EthereumUSDT,
  EthereumWBTC,
  EthereumWETH,
} from '../../src/consts/addresses';
import { EEarnProviderEnum } from '../earn';
import { ESwapTabSwitchType } from '../swap/types';

import type { ISupportedSymbol } from '../earn';
import type { ISwapTokenBase } from '../swap/types';

const earnTradeDefaultSetETH = {
  'networkId': 'evm--1',
  'contractAddress': '',
  'name': 'Ethereum',
  'symbol': 'ETH',
  'decimals': 18,
  'isNative': true,
  'networkLogoURI': 'https://uni.onekey-asset.com/static/chain/eth.png',
};

const earnTradeDefaultSetUSDC = {
  'networkId': 'evm--1',
  'contractAddress': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'name': 'USD Coin',
  'symbol': 'USDC',
  'decimals': 6,
  'isNative': false,
  'isPopular': true,
  'networkLogoURI': 'https://uni.onekey-asset.com/static/chain/eth.png',
};

const earnTradeDefaultSetSOL = {
  'networkId': 'sol--101',
  'contractAddress': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'name': 'USDC',
  'symbol': 'USDC',
  'decimals': 6,
  'isNative': false,
  'networkLogoURI': 'https://uni.onekey-asset.com/static/chain/sol.png',
};

const earnTradeDefaultSetSui = {
  'networkId': 'sui--mainnet',
  'contractAddress': SUI_TYPE_ARG,
  'name': 'SUI',
  'symbol': 'SUI',
  'decimals': 9,
  'isNative': true,
  'networkLogoURI': 'https://uni.onekey-asset.com/static/chain/sui.png',
};

export const isSupportStaking = (symbol: string) =>
  [
    'BTC',
    'SBTC',
    'ETH',
    'SOL',
    'APT',
    'ATOM',
    'POL',
    'USDC',
    'USDT',
    'DAI',
    'WETH',
    'CBBTC',
    'WBTC',
    'USDF',
  ].includes(symbol.toUpperCase());

export const earnMainnetNetworkIds = [
  getNetworkIdsMap().eth,
  getNetworkIdsMap().cosmoshub,
  getNetworkIdsMap().apt,
  getNetworkIdsMap().sol,
  getNetworkIdsMap().btc,
  getNetworkIdsMap().sui,
];

export function normalizeToEarnSymbol(
  symbol: string,
): ISupportedSymbol | undefined {
  const symbolMap: Record<string, ISupportedSymbol> = {
    'btc': 'BTC',
    'sbtc': 'SBTC',
    'eth': 'ETH',
    'sol': 'SOL',
    'apt': 'APT',
    'atom': 'ATOM',
    'pol': 'POL',
    'usdc': 'USDC',
    'usdt': 'USDT',
    'dai': 'DAI',
    'weth': 'WETH',
    'cbbtc': 'cbBTC',
    'wbtc': 'WBTC',
    'usdf': 'USDf',
    'usde': 'USDe',
  };
  return symbolMap[symbol.toLowerCase()];
}

export function normalizeToEarnProvider(
  provider: string,
): EEarnProviderEnum | undefined {
  const providerMap: Record<string, EEarnProviderEnum> = {
    'lido': EEarnProviderEnum.Lido,
    'everstake': EEarnProviderEnum.Everstake,
    'babylon': EEarnProviderEnum.Babylon,
    'morpho': EEarnProviderEnum.Morpho,
    'falcon': EEarnProviderEnum.Falcon,
    'ethena': EEarnProviderEnum.Ethena,
    'momentum': EEarnProviderEnum.Momentum,
  };
  return providerMap[provider.toLowerCase()];
}

export function getImportFromToken({
  networkId,
  tokenAddress,
  isSupportSwap = true,
}: {
  networkId: string;
  tokenAddress: string;
  isSupportSwap: boolean;
}) {
  let importFromToken: ISwapTokenBase | undefined;
  let swapTabSwitchType = isSupportSwap
    ? ESwapTabSwitchType.SWAP
    : ESwapTabSwitchType.BRIDGE;
  const networkIdsMap = getNetworkIdsMap();
  switch (networkId) {
    case networkIdsMap.btc:
    case networkIdsMap.sbtc:
      importFromToken = earnTradeDefaultSetETH;
      swapTabSwitchType = ESwapTabSwitchType.BRIDGE;
      break;
    case networkIdsMap.eth:
    case networkIdsMap.holesky:
    case networkIdsMap.sepolia: {
      if (
        [
          EthereumPol.toLowerCase(),
          EthereumUSDC.toLowerCase(),
          EthereumUSDT.toLowerCase(),
          EthereumDAI.toLowerCase(),
          EthereumWETH.toLowerCase(),
          EthereumWBTC.toLowerCase(),
          EthereumCbBTC.toLowerCase(),
          EthereumUSDF.toLowerCase(),
        ].includes(tokenAddress.toLowerCase())
      ) {
        importFromToken = earnTradeDefaultSetETH;
      } else {
        importFromToken = earnTradeDefaultSetUSDC;
      }
      swapTabSwitchType = ESwapTabSwitchType.SWAP;
      break;
    }
    case networkIdsMap.sol: {
      importFromToken = earnTradeDefaultSetSOL;
      swapTabSwitchType = ESwapTabSwitchType.SWAP;
      break;
    }
    case networkIdsMap.apt:
      importFromToken = earnTradeDefaultSetETH;
      swapTabSwitchType = ESwapTabSwitchType.BRIDGE;
      break;
    case networkIdsMap.sui:
      importFromToken = earnTradeDefaultSetSui;
      swapTabSwitchType = ESwapTabSwitchType.SWAP;
      break;
    default:
      break;
  }
  return {
    importFromToken,
    swapTabSwitchType,
  };
}

// Symbol to supported networks mapping for earn protocols
export function getSymbolSupportedNetworks(): Record<
  ISupportedSymbol,
  string[]
> {
  const networkIdsMap = getNetworkIdsMap();

  return {
    'BTC': [networkIdsMap.btc],
    'SBTC': [networkIdsMap.sbtc],
    'ETH': [networkIdsMap.eth],
    'SOL': [networkIdsMap.sol],
    'APT': [networkIdsMap.apt],
    'ATOM': [networkIdsMap.cosmoshub],
    'POL': [networkIdsMap.eth],
    'USDC': [networkIdsMap.eth, networkIdsMap.sui],
    'USDT': [networkIdsMap.eth],
    'DAI': [networkIdsMap.eth],
    'WETH': [networkIdsMap.eth],
    'cbBTC': [networkIdsMap.eth],
    'WBTC': [networkIdsMap.eth, networkIdsMap.sui],
    'USDf': [networkIdsMap.eth],
    'USDe': [networkIdsMap.eth],
  };
}
