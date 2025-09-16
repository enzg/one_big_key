/* eslint-disable spellcheck/spell-checker */
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

import type { IBackgroundApi } from '@onekeyhq/kit-bg/src/apis/IBackgroundApi';
import { InvalidAccount, OneKeyLocalError } from '@onekeyhq/shared/src/errors';

import type {
  AccountAddressInput,
  LedgerVersionArg,
  MoveModuleBytecode,
  MoveResource,
  PaginationArgs,
  TransactionResponse,
} from '@aptos-labs/ts-sdk';

export class AptosClient {
  backgroundApi: IBackgroundApi;

  networkId: string;

  aptos: Aptos;

  constructor({
    backgroundApi,
    networkId,
  }: {
    backgroundApi: any;
    networkId: string;
  }) {
    const config = new AptosConfig({ network: Network.MAINNET });
    this.aptos = new Aptos(config);
    this.backgroundApi = backgroundApi;
    this.networkId = networkId;
  }

  getAccountModule(
    accountAddress: string,
    moduleName: string,
    _options?: LedgerVersionArg,
  ): Promise<MoveModuleBytecode> {
    return this.proxyRequest('getAccountModule', [accountAddress, moduleName]);
  }

  getChainId(): Promise<number> {
    return this.proxyRequest('getChainId', []);
  }

  async getAccount(
    accountAddress: AccountAddressInput,
  ): Promise<{ sequence_number: string; authentication_key: string }> {
    try {
      return await this.proxyRequest('getAccount', [accountAddress]);
    } catch (error: any) {
      const { message } = error;

      if (
        typeof message === 'string' &&
        message.includes('account_not_found')
      ) {
        try {
          const { message: errorMessage } = JSON.parse(message);
          throw new InvalidAccount({
            message: errorMessage,
          });
        } catch (_) {
          throw new InvalidAccount({
            message,
          });
        }
      }
      throw error;
    }
  }

  getTransactionByHash(txnHash: string): Promise<TransactionResponse> {
    return this.proxyRequest<TransactionResponse>('getTransactionByHash', [
      txnHash,
    ]);
  }

  getTransactions(
    query?: PaginationArgs | undefined,
  ): Promise<TransactionResponse[]> {
    return this.aptos.transaction.getTransactions({ options: query });
  }

  getAccountTransactions(
    accountAddress: AccountAddressInput,
    query?: PaginationArgs | undefined,
  ): Promise<TransactionResponse[]> {
    return this.proxyRequest<TransactionResponse[]>('getAccountTransactions', [
      accountAddress,
      query,
    ]);
  }

  getAccountResources(
    accountAddress: AccountAddressInput,
    query?: { ledgerVersion?: (number | bigint) | undefined } | undefined,
  ): Promise<MoveResource[]> {
    return this.proxyRequest('getAccountResources', [accountAddress, query]);
  }

  getGasPriceEstimation(): Promise<{ gas_estimate: number }> {
    return this.proxyRequest('estimateGasPrice');
  }

  getLedgerInfo(): Promise<{
    chain_id: number;
    epoch: string;
    ledger_version: string;
    oldest_ledger_version: string;
    ledger_timestamp: string;
    node_role: any;
    oldest_block_height: string;
    block_height: string;
    git_hash?: string | undefined;
  }> {
    return this.proxyRequest('getLedgerInfo');
  }

  async proxyRequest<T>(method: string, params?: any): Promise<T> {
    const res: T[] =
      await this.backgroundApi.serviceAccountProfile.sendProxyRequest({
        networkId: this.networkId,
        body: [
          {
            route: 'rpc',
            params: {
              method,
              params,
            },
          },
        ],
      });
    const response = res?.[0];
    if (!response) {
      throw new OneKeyLocalError('No response received from the proxy');
    }

    return response;
  }
}
