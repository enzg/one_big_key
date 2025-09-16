import BigNumber from 'bignumber.js';
import { omit } from 'lodash';

import { isTaprootAddress } from '@onekeyhq/core/src/chains/btc/sdkBtc';
import type { IAxiosResponse } from '@onekeyhq/shared/src/appApiClient/appApiClient';
import {
  backgroundClass,
  backgroundMethod,
} from '@onekeyhq/shared/src/background/backgroundDecorators';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import { OneKeyServerApiError } from '@onekeyhq/shared/src/errors/errors/baseErrors';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { memoizee } from '@onekeyhq/shared/src/utils/cacheUtils';
import earnUtils from '@onekeyhq/shared/src/utils/earnUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import type { INetworkAccount } from '@onekeyhq/shared/types/account';
import type { IDiscoveryBanner } from '@onekeyhq/shared/types/discovery';
import type {
  EAvailableAssetsTypeEnum,
  EEarnProviderEnum,
  ISupportedSymbol,
} from '@onekeyhq/shared/types/earn';
import {
  earnMainnetNetworkIds,
  getSymbolSupportedNetworks,
} from '@onekeyhq/shared/types/earn/earnProvider.constants';
import { EServiceEndpointEnum } from '@onekeyhq/shared/types/endpoint';
import type {
  IAccountHistoryTx,
  IChangedPendingTxInfo,
} from '@onekeyhq/shared/types/history';
import type {
  ECheckAmountActionType,
  IAllowanceOverview,
  IAvailableAsset,
  IBabylonPortfolioItem,
  IBuildPermit2ApproveSignDataParams,
  IBuildRegisterSignMessageParams,
  ICheckAmountAlert,
  IClaimRecordParams,
  IClaimableListResponse,
  IEarnAccountResponse,
  IEarnAccountToken,
  IEarnAccountTokenResponse,
  IEarnBabylonTrackingItem,
  IEarnEstimateAction,
  IEarnEstimateFeeResp,
  IEarnFAQList,
  IEarnInvestmentItem,
  IEarnPermit2ApproveSignData,
  IEarnRegisterSignMessageResponse,
  IEarnSummary,
  IEarnUnbondingDelegationList,
  IGetPortfolioParams,
  IStakeBaseParams,
  IStakeClaimBaseParams,
  IStakeEarnDetail,
  IStakeHistoriesResponse,
  IStakeHistoryParams,
  IStakeProtocolDetails,
  IStakeProtocolListItem,
  IStakeTag,
  IStakeTransactionConfirmation,
  IStakeTx,
  IStakeTxResponse,
  IUnstakePushParams,
  IVerifyRegisterSignMessageParams,
  IWithdrawBaseParams,
} from '@onekeyhq/shared/types/staking';
import { EApproveType } from '@onekeyhq/shared/types/staking';
import { EDecodedTxStatus } from '@onekeyhq/shared/types/tx';

import simpleDb from '../dbs/simple/simpleDb';
import { vaultFactory } from '../vaults/factory';

import ServiceBase from './ServiceBase';

import type { ISimpleDBAppStatus } from '../dbs/simple/entity/SimpleDbEntityAppStatus';
import type {
  IAddEarnOrderParams,
  IEarnOrderItem,
} from '../dbs/simple/entity/SimpleDbEntityEarnOrders';

interface ICheckAmountResponse {
  code: number;
  message: string;
  data?: {
    alerts?: ICheckAmountAlert[];
  };
}

interface IRecommendResponse {
  code: string;
  message?: string;
  data: { tokens: IEarnAccountToken[] };
}

interface IAvailableAssetsResponse {
  code: string;
  message?: string;
  data: { assets: IAvailableAsset[] };
}

@backgroundClass()
class ServiceStaking extends ServiceBase {
  constructor({ backgroundApi }: { backgroundApi: any }) {
    super({ backgroundApi });
  }

  @backgroundMethod()
  public async fetchTokenAllowance(params: {
    networkId: string;
    accountId: string;
    tokenAddress: string;
    spenderAddress: string;
    blockNumber?: number;
  }) {
    const { networkId, accountId, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const accountAddress =
      await this.backgroundApi.serviceAccount.getAccountAddressForApi({
        networkId,
        accountId,
      });

    const resp = await client.get<{
      data: IAllowanceOverview;
    }>(`/earn/v1/on-chain/allowance`, {
      params: { accountAddress, networkId, ...rest },
    });

    return resp.data.data;
  }

  @backgroundMethod()
  async getEarnSummary({
    accountAddress,
    networkId,
  }: {
    accountAddress: string;
    networkId: string;
  }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const response = await client.get<{
      data: IEarnSummary;
    }>('/earn/v1/rebate', {
      params: {
        accountAddress,
        networkId,
      },
    });
    return response.data.data;
  }

  @backgroundMethod()
  public async fetchLocalStakingHistory({
    accountId,
    networkId,
    stakeTag,
  }: {
    accountId: string;
    networkId: string;
    stakeTag: IStakeTag;
  }) {
    const [xpub, accountAddress] = await Promise.all([
      this.backgroundApi.serviceAccount.getAccountXpub({
        accountId,
        networkId,
      }),
      await this.backgroundApi.serviceAccount.getAccountAddressForApi({
        accountId,
        networkId,
      }),
    ]);

    const pendingTxs =
      await this.backgroundApi.serviceHistory.getAccountLocalHistoryPendingTxs({
        networkId,
        accountAddress,
        xpub,
      });

    const stakingTxs = pendingTxs.filter(
      (
        o,
      ): o is IAccountHistoryTx &
        Required<Pick<IAccountHistoryTx, 'stakingInfo'>> =>
        Boolean(o.stakingInfo && o.stakingInfo.tags.includes(stakeTag)),
    );

    return stakingTxs;
  }

  @backgroundMethod()
  public async buildLidoEthPermitMessageData({
    amount,
    accountId,
    networkId,
  }: {
    amount: string;
    accountId: string;
    networkId: string;
  }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const accountAddress =
      await this.backgroundApi.serviceAccount.getAccountAddressForApi({
        networkId,
        accountId,
      });
    const resp = await client.post<{
      data: { message: string; deadline: number };
    }>(`/earn/v1/lido-eth/tx/permit_message`, {
      amount,
      accountAddress,
      networkId,
    });
    return resp.data.data;
  }

  private async getFirmwareDeviceTypeParam({
    accountId,
  }: {
    accountId: string;
  }) {
    if (!accountUtils.isHwAccount({ accountId })) {
      return undefined;
    }
    const device = await this.backgroundApi.serviceAccount.getAccountDeviceSafe(
      {
        accountId,
      },
    );
    if (device?.deviceType) {
      return device?.deviceType;
    }
    return undefined;
  }

  @backgroundMethod()
  async buildStakeTransaction(
    params: IStakeBaseParams,
  ): Promise<IStakeTxResponse> {
    const {
      networkId,
      accountId,
      provider,
      symbol,
      protocolVault,
      approveType,
      permitSignature,
      ...rest
    } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const account = await vault.getAccount();
    const stakingConfig = await this.getStakingConfigs({
      networkId,
      symbol,
      provider,
    });
    if (!stakingConfig) {
      throw new OneKeyLocalError('Staking config not found');
    }
    const useVaultProvider = earnUtils.useVaultProvider({
      providerName: provider,
    });
    const paramsToSend: Record<string, any> = {
      accountAddress: account.address,
      publicKey: stakingConfig.usePublicKey ? account.pub : undefined,
      term: params.term,
      feeRate: params.feeRate,
      networkId,
      symbol,
      provider,
      firmwareDeviceType: await this.getFirmwareDeviceTypeParam({
        accountId,
      }),
      approveType,
      permitSignature:
        approveType === EApproveType.Permit ? permitSignature : undefined,
      ...rest,
    };

    if (useVaultProvider) {
      paramsToSend.vault = protocolVault;
    }

    const walletReferralCode =
      await this.backgroundApi.serviceReferralCode.checkAndUpdateReferralCode({
        accountId,
      });
    if (walletReferralCode) {
      paramsToSend.bindedAccountAddress = walletReferralCode.address;
      paramsToSend.bindedNetworkId = walletReferralCode.networkId;
    }
    const resp = await client.post<{
      data: IStakeTxResponse;
    }>(`/earn/v2/stake`, paramsToSend);
    return resp.data.data;
  }

  @backgroundMethod()
  async buildUnstakeTransaction(params: IWithdrawBaseParams) {
    const { networkId, accountId, protocolVault, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const account = await vault.getAccount();
    const stakingConfig = await this.getStakingConfigs({
      networkId,
      symbol: params.symbol,
      provider: params.provider,
    });
    if (!stakingConfig) {
      throw new OneKeyLocalError('Staking config not found');
    }
    const useVaultProvider = earnUtils.useVaultProvider({
      providerName: params.provider,
    });
    const resp = await client.post<{
      data: IStakeTxResponse;
    }>(`/earn/v2/unstake`, {
      accountAddress: account.address,
      networkId,
      publicKey: stakingConfig.usePublicKey ? account.pub : undefined,
      firmwareDeviceType: await this.getFirmwareDeviceTypeParam({
        accountId,
      }),
      vault: useVaultProvider ? protocolVault : '',
      ...rest,
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async unstakePush(params: IUnstakePushParams) {
    const { networkId, accountId, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const acc = await vault.getAccount();
    const resp = await client.post<{
      data: IStakeTxResponse;
    }>(`/earn/v1/unstake/push`, {
      accountAddress: acc.address,
      networkId,
      ...rest,
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async babylonClaimRecord(params: IClaimRecordParams) {
    const { networkId, accountId, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const acc = await vault.getAccount();
    const resp = await client.post<{
      data: IStakeTxResponse;
    }>(`/earn/v1/claim/record`, {
      accountAddress: acc.address,
      publicKey: acc.pub,
      networkId,
      ...rest,
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async buildClaimTransaction(params: IStakeClaimBaseParams) {
    const {
      networkId,
      accountId,
      claimTokenAddress: rewardTokenAddress,
      vault: vaultAddress,
      ...rest
    } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const account = await vault.getAccount();
    const stakingConfig = await this.getStakingConfigs({
      networkId,
      symbol: params.symbol,
      provider: params.provider,
    });
    if (!stakingConfig) {
      throw new OneKeyLocalError('Staking config not found');
    }

    const sendParams: Record<string, string | undefined> = {
      accountAddress: account.address,
      networkId,
      publicKey: stakingConfig.usePublicKey ? account.pub : undefined,
      firmwareDeviceType: await this.getFirmwareDeviceTypeParam({
        accountId,
      }),
      ...rest,
    };

    if (rewardTokenAddress) {
      sendParams.rewardTokenAddress = rewardTokenAddress;
    }
    if (
      earnUtils.useVaultProvider({ providerName: params.provider }) &&
      vaultAddress
    ) {
      sendParams.vault = vaultAddress;
    }
    const resp = await client.post<{
      data: IStakeTxResponse;
    }>(`/earn/v2/claim`, sendParams);
    return resp.data.data;
  }

  @backgroundMethod()
  async buildPermit2ApproveSignData(
    params: IBuildPermit2ApproveSignDataParams,
  ) {
    if (!params?.networkId) {
      throw new OneKeyLocalError('networkId is required');
    }
    if (!params?.provider) {
      throw new OneKeyLocalError('provider is required');
    }
    if (!params?.symbol) {
      throw new OneKeyLocalError('symbol is required');
    }
    if (!params?.accountAddress) {
      throw new OneKeyLocalError('accountAddress is required');
    }
    if (!params?.vault) {
      throw new OneKeyLocalError('vault is required');
    }
    if (!params?.amount) {
      throw new OneKeyLocalError('amount is required');
    }
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.post<{
      data: IEarnPermit2ApproveSignData;
    }>(`/earn/v1/permit-signature`, params);
    return resp.data.data;
  }

  @backgroundMethod()
  async buildRegisterSignMessageData(params: IBuildRegisterSignMessageParams) {
    if (!params?.networkId) {
      throw new OneKeyLocalError('networkId is required');
    }
    if (!params?.provider) {
      throw new OneKeyLocalError('provider is required');
    }
    if (!params?.symbol) {
      throw new OneKeyLocalError('symbol is required');
    }
    if (!params?.accountAddress) {
      throw new OneKeyLocalError('accountAddress is required');
    }
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.post<{
      data: IEarnRegisterSignMessageResponse;
    }>(`/earn/v1/permit-signature`, params);
    return resp.data.data;
  }

  @backgroundMethod()
  async verifyRegisterSignMessage(params: IVerifyRegisterSignMessageParams) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    let verifyParams = params;
    if (earnUtils.isEthenaProvider({ providerName: params.provider })) {
      verifyParams = omit(params, [
        'signature',
        'message',
      ]) as IVerifyRegisterSignMessageParams;
    }
    const resp = await client.post<{
      data: IEarnRegisterSignMessageResponse;
    }>(`/earn/v1/verify-sig`, verifyParams);
    return resp.data.data;
  }

  @backgroundMethod()
  async getStakeHistory(params: IStakeHistoryParams) {
    const { networkId, accountId, protocolVault, type, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const accountAddress =
      await this.backgroundApi.serviceAccount.getAccountAddressForApi({
        networkId,
        accountId,
      });
    const useVaultProvider =
      params.provider &&
      earnUtils.useVaultProvider({
        providerName: params.provider,
      });
    const data: Record<string, string | undefined> & { type?: string } = {
      accountAddress,
      networkId,
      ...rest,
    };

    if (useVaultProvider) {
      data.vault = protocolVault;
    }
    if (type) {
      data.type = params.type;
    }
    const resp = await client.get<{
      data: IStakeHistoriesResponse;
    }>(`/earn/v1/stake-histories`, {
      params: data,
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async getPortfolioList(params: IGetPortfolioParams) {
    const { networkId, accountId, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const acc = await vault.getAccount();

    const resp = await client.get<{
      data: IBabylonPortfolioItem[];
    }>(`/earn/v1/portfolio/list`, {
      params: {
        accountAddress: acc.address,
        networkId,
        publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,
        ...rest,
      },
      headers:
        await this.backgroundApi.serviceAccountProfile._getWalletTypeHeader({
          accountId,
        }),
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async getProtocolDetails(params: {
    accountId?: string;
    indexedAccountId?: string;
    networkId: string;
    symbol: string;
    provider: string;
    vault?: string;
    isV2?: boolean;
  }) {
    const { networkId, accountId, indexedAccountId, isV2, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const requestParams: {
      accountAddress?: string;
      networkId: string;
      symbol: string;
      provider: string;
      publicKey?: string;
      vault?: string;
      kycAccountAddress?: string;
    } = { networkId, ...rest };
    const account = await this.getEarnAccount({
      accountId: accountId ?? '',
      networkId,
      indexedAccountId,
      btcOnlyTaproot: true,
    });
    if (account?.accountAddress) {
      requestParams.accountAddress = account.accountAddress;
    }
    if (account?.account?.pub) {
      requestParams.publicKey = account?.account?.pub;
    }
    if (requestParams.provider) {
      requestParams.provider = requestParams.provider.toLowerCase();
    }
    if (
      earnUtils.isEthenaProvider({ providerName: requestParams.provider }) &&
      params.symbol?.toUpperCase() === 'USDE'
    ) {
      const ethenaKycAddress =
        await this.backgroundApi.serviceStaking.getEthenaKycAddress();
      if (ethenaKycAddress) {
        requestParams.kycAccountAddress = ethenaKycAddress;
      }
    }
    const resp = await client.get<{ data: IStakeProtocolDetails }>(
      isV2
        ? '/earn/v2/stake-protocol/detail'
        : '/earn/v1/stake-protocol/detail',
      {
        params: requestParams,
        headers:
          await this.backgroundApi.serviceAccountProfile._getWalletTypeHeader({
            accountId,
          }),
      },
    );
    const result = resp.data.data;
    return result;
  }

  @backgroundMethod()
  async getProtocolDetailsV2(params: {
    accountId?: string;
    indexedAccountId?: string;
    networkId: string;
    symbol: string;
    provider: string;
    vault?: string;
  }) {
    const result = await this.getProtocolDetails({
      ...params,
      isV2: true,
    });
    return result as unknown as IStakeEarnDetail;
  }

  @backgroundMethod()
  async getTransactionConfirmation(params: {
    networkId: string;
    provider: string;
    symbol: string;
    vault: string;
    accountAddress: string;
    action: 'stake' | 'unstake' | 'claim';
    amount: string;
  }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const amountNumber = BigNumber(params.amount);
    params.amount = amountNumber.isNaN() ? '0' : amountNumber.toFixed();
    const resp = await client.get<{
      data: IStakeTransactionConfirmation;
    }>(`/earn/v1/transaction-confirmation`, {
      params,
    });
    return resp.data.data;
  }

  _getProtocolList = memoizee(
    async (params: {
      symbol: string;
      items: Array<{
        networkId: string;
        accountAddress?: string;
        publicKey?: string;
      }>;
    }) => {
      const { symbol, items } = params;
      const client = await this.getClient(EServiceEndpointEnum.Earn);

      // Use v2 API that supports multiple networks
      const protocolListResp = await client.post<{
        data: { protocols: IStakeProtocolListItem[] };
      }>('/earn/v2/stake-protocol/list', {
        symbol,
        items: items.filter((item) => item.accountAddress), // Only include items with account address
      });
      const protocols = protocolListResp.data.data.protocols;
      return protocols;
    },
    {
      promise: true,
      maxAge: timerUtils.getTimeDurationMs({ seconds: 5 }),
    },
  );

  @backgroundMethod()
  async getProtocolList(params: {
    symbol: string;
    accountId?: string;
    indexedAccountId?: string;
    filterNetworkId?: string;
  }) {
    const symbolSupportedNetworks = getSymbolSupportedNetworks();
    const supportedNetworkIds =
      symbolSupportedNetworks[
        params.symbol as keyof typeof symbolSupportedNetworks
      ] || [];

    if (supportedNetworkIds.length === 0) {
      return [];
    }

    // Get account info for each supported network
    const networkAccountsPromises = supportedNetworkIds.map(
      async (networkId) => {
        if (!params.accountId) {
          return { networkId, accountAddress: undefined, publicKey: undefined };
        }

        const earnAccount = await this.getEarnAccount({
          accountId: params.accountId,
          networkId,
          indexedAccountId: params.indexedAccountId,
          btcOnlyTaproot: true,
        });

        if (!earnAccount) {
          return { networkId, accountAddress: undefined, publicKey: undefined };
        }

        return {
          networkId: earnAccount.networkId,
          accountAddress: earnAccount.accountAddress,
          publicKey: networkUtils.isBTCNetwork(earnAccount.networkId)
            ? earnAccount.account.pub
            : undefined,
        };
      },
    );

    const networkAccounts = await Promise.all(networkAccountsPromises);

    // Use cached _getProtocolList method with v2 API
    let allItems: IStakeProtocolListItem[] = [];
    try {
      allItems = await this._getProtocolList({
        symbol: params.symbol,
        items: networkAccounts,
      });
    } catch (error) {
      console.warn(
        `Failed to fetch protocol list for symbol ${params.symbol}:`,
        error,
      );
      // Fall back to empty array if request fails
      allItems = [];
    }

    // Apply network filter if specified
    if (
      params.filterNetworkId &&
      !networkUtils.isAllNetwork({ networkId: params.filterNetworkId })
    ) {
      allItems = allItems.filter(
        (item) => item.network.networkId === params.filterNetworkId,
      );
    }

    // Check enabled status for all items
    const itemsWithEnabledStatus = await Promise.all(
      allItems.map(async (item) => {
        const stakingConfig = await this.getStakingConfigs({
          networkId: item.network.networkId,
          symbol: params.symbol,
          provider: item.provider.name,
        });
        const isEnabled = stakingConfig?.enabled;
        return { item, isEnabled };
      }),
    );

    const enabledItems = itemsWithEnabledStatus
      .filter(({ isEnabled }) => isEnabled)
      .map(({ item }) => item);

    return enabledItems;
  }

  @backgroundMethod()
  async getClaimableList(params: {
    networkId: string;
    accountId: string;
    symbol: string;
    provider: string;
  }) {
    const { networkId, accountId, symbol, ...rest } = params;
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const acc = await vault.getAccount();
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.get<{
      data: IClaimableListResponse;
    }>('/earn/v1/claimable/list', {
      params: {
        networkId,
        accountAddress: acc.address,
        symbol,
        publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,
        ...rest,
      },
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async getWithdrawList(params: {
    networkId: string;
    accountId: string;
    symbol: string;
    provider: string;
  }) {
    const { networkId, accountId, symbol, ...rest } = params;
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const acc = await vault.getAccount();

    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.get<{
      data: IClaimableListResponse;
    }>('/earn/v1/withdraw/list', {
      params: {
        networkId,
        accountAddress: acc.address,
        symbol,
        publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,
        ...rest,
      },
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async getAccountAsset(
    params: {
      networkId: string;
      accountAddress: string;
      publicKey?: string;
    }[],
  ) {
    const client = await this.getRawDataClient(EServiceEndpointEnum.Earn);
    const result: IEarnAccountTokenResponse = {
      accounts: [],
    };
    const tokensResponse = await client.post<
      IRecommendResponse,
      IAxiosResponse<IRecommendResponse>
    >(`/earn/v1/recommend`, { accounts: params });

    this.handleServerError({
      ...tokensResponse.data,
      requestId: tokensResponse.$requestId,
    });
    const tokens =
      tokensResponse?.data.data.tokens?.map((item, index) => ({
        ...item,
        orderIndex: index,
      })) || [];

    for (const account of params) {
      result.accounts.push({
        ...account,
        tokens: tokens?.filter((i) => i.networkId === account.networkId) || [],
      });
    }
    return result;
  }

  @backgroundMethod()
  async getEarnAvailableAccountsParams({
    accountId,
    networkId,
    indexedAccountId,
  }: {
    accountId: string;
    networkId: string;
    indexedAccountId?: string;
  }) {
    const accounts = await this.getEarnAvailableAccounts({
      accountId,
      networkId,
      indexedAccountId,
    });
    const accountParams: {
      networkId: string;
      accountAddress: string;
      publicKey?: string;
    }[] = [];

    earnMainnetNetworkIds.forEach((mainnetNetworkId) => {
      const account = accounts.find((i) => i.networkId === mainnetNetworkId);
      if (account?.apiAddress) {
        accountParams.push({
          accountAddress: account?.apiAddress,
          networkId: mainnetNetworkId,
          publicKey: account?.pub,
        });
      }
    });

    const uniqueAccountParams = Array.from(
      new Map(
        accountParams.map((item) => [
          `${item.networkId}-${item.accountAddress}-${item.publicKey || ''}`,
          item,
        ]),
      ).values(),
    );
    return uniqueAccountParams;
  }

  @backgroundMethod()
  async fetchAccountOverview(params: {
    accountId: string;
    networkId: string;
    indexedAccountId?: string;
  }) {
    const accounts = await this.getEarnAvailableAccountsParams(params);
    const client = await this.getRawDataClient(EServiceEndpointEnum.Earn);
    const overviewData = (
      await Promise.allSettled(
        accounts.map((account) =>
          client.get<{
            data: IEarnAccountResponse;
          }>(`/earn/v1/overview`, { params: account }),
        ),
      )
    )
      .filter((result) => result.status === 'fulfilled')
      .map(
        (result) =>
          (
            result as PromiseFulfilledResult<{
              data: { data: IEarnAccountResponse };
            }>
          ).value,
      );

    const { totalFiatValue, earnings24h, hasClaimableAssets } =
      overviewData.reduce(
        (prev, item) => {
          prev.totalFiatValue = prev.totalFiatValue.plus(
            BigNumber(item?.data?.data?.totalFiatValue || 0),
          );
          prev.earnings24h = prev.earnings24h.plus(
            BigNumber(item?.data?.data?.earnings24h || 0),
          );
          prev.hasClaimableAssets =
            prev.hasClaimableAssets || !!item?.data?.data?.canClaim;
          return prev;
        },
        {
          totalFiatValue: BigNumber(0),
          earnings24h: BigNumber(0),
          hasClaimableAssets: false,
        },
      );

    return {
      totalFiatValue: totalFiatValue.toFixed(),
      earnings24h: earnings24h.toFixed(),
      hasClaimableAssets,
    };
  }

  @backgroundMethod()
  async fetchAllNetworkAssets({
    accountId,
    networkId,
    indexedAccountId,
  }: {
    accountId: string;
    networkId: string;
    indexedAccountId?: string;
  }) {
    const accounts = await this.getEarnAvailableAccountsParams({
      accountId,
      networkId,
      indexedAccountId,
    });
    return this.getAccountAsset(accounts);
  }

  @backgroundMethod()
  async fetchInvestmentDetail(
    list: {
      accountAddress: string;
      networkId: string;
      publicKey?: string;
    }[],
  ) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const response = await client.post<{
      data: IEarnInvestmentItem[];
    }>(`/earn/v1/investment/detail`, {
      list,
    });
    return response.data.data;
  }

  _getAvailableAssets = memoizee(
    async ({ type }: { type?: EAvailableAssetsTypeEnum }) => {
      const client = await this.getRawDataClient(EServiceEndpointEnum.Earn);
      const resp = await client.get<
        IAvailableAssetsResponse,
        IAxiosResponse<IAvailableAssetsResponse>
      >(`/earn/v1/available-assets`, {
        params: {
          type,
        },
      });

      this.handleServerError({
        ...resp.data,
        requestId: resp.$requestId,
      });
      return resp.data.data.assets;
    },
    {
      promise: true,
      maxAge: timerUtils.getTimeDurationMs({ minute: 5 }),
    },
  );

  @backgroundMethod()
  async getAvailableAssets({ type }: { type?: EAvailableAssetsTypeEnum } = {}) {
    return this._getAvailableAssets({ type });
  }

  @backgroundMethod()
  async clearAvailableAssetsCache() {
    void this._getAvailableAssets.clear();
  }

  handleServerError(data: {
    code?: string | number;
    message?: string;
    requestId?: string;
  }) {
    if (data.code !== undefined && Number(data.code) !== 0 && data.message) {
      throw new OneKeyServerApiError({
        autoToast: true,
        disableFallbackMessage: true,
        code: Number(data.code),
        message: data.message,
        requestId: data.requestId,
      });
    }
  }

  @backgroundMethod()
  async checkAmount({
    networkId,
    accountId,
    symbol,
    provider,
    action,
    withdrawAll,
    amount,
    protocolVault,
  }: {
    accountId?: string;
    networkId?: string;
    symbol?: string;
    provider?: string;
    action: ECheckAmountActionType;
    withdrawAll: boolean;
    amount?: string;
    protocolVault?: string;
  }) {
    if (!networkId || !accountId || !provider) {
      throw new OneKeyLocalError(
        'networkId or accountId or provider not found',
      );
    }
    const useVaultProvider = earnUtils.useVaultProvider({
      providerName: provider,
    });
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const account = await vault.getAccount();
    const client = await this.getRawDataClient(EServiceEndpointEnum.Earn);
    const amountNumber = BigNumber(amount || 0);
    const result = await client.get<
      ICheckAmountResponse,
      IAxiosResponse<ICheckAmountResponse>
    >(`/earn/v1/check-amount`, {
      params: {
        networkId,
        accountAddress: account.address,
        symbol,
        provider: provider || '',
        action,
        amount: amountNumber.isNaN() ? '0' : amountNumber.toFixed(),
        vault: useVaultProvider ? protocolVault : '',
        withdrawAll,
      },
    });
    return result.data;
  }

  @backgroundMethod()
  async getStakingConfigs({
    networkId,
    symbol,
    provider,
  }: {
    networkId: string;
    symbol: string;
    provider: string;
  }) {
    const providerKey = earnUtils.getEarnProviderEnumKey(provider);
    if (!providerKey) {
      return null;
    }

    const vaultSettings =
      await this.backgroundApi.serviceNetwork.getVaultSettings({ networkId });
    const allStakingConfig = vaultSettings.stakingConfig;
    if (!allStakingConfig) {
      return null;
    }

    const stakingConfig = allStakingConfig[networkId];
    if (!stakingConfig) {
      return null;
    }

    const providerConfig = stakingConfig.providers[providerKey];
    if (!providerConfig) {
      return null;
    }

    const tokenSymbol = symbol as ISupportedSymbol;
    if (providerConfig.supportedSymbols.includes(tokenSymbol)) {
      return providerConfig.configs[tokenSymbol];
    }

    return null;
  }

  @backgroundMethod()
  async findSymbolByTokenAddress({
    networkId,
    tokenAddress,
  }: {
    networkId: string;
    tokenAddress: string;
  }) {
    const vaultSettings =
      await this.backgroundApi.serviceNetwork.getVaultSettings({ networkId });

    const allStakingConfig = vaultSettings.stakingConfig;
    if (!allStakingConfig) {
      return null;
    }

    const stakingConfig = allStakingConfig[networkId];
    if (!stakingConfig) {
      return null;
    }

    const normalizedTokenAddress = tokenAddress.toLowerCase();

    const providerEntries = Object.entries(stakingConfig.providers).filter(
      ([, providerConfig]) => providerConfig !== undefined,
    );

    for (const [provider, providerConfig] of providerEntries) {
      const symbolEntry = Object.entries(providerConfig.configs).find(
        ([, config]) =>
          config &&
          config.tokenAddress.toLowerCase() === normalizedTokenAddress &&
          config.enabled,
      );

      if (symbolEntry) {
        const [symbol] = symbolEntry;
        return {
          symbol: symbol as ISupportedSymbol,
          provider: provider as EEarnProviderEnum,
        };
      }
    }

    return null;
  }

  @backgroundMethod()
  async getEarnAccount(params: {
    accountId: string;
    networkId: string;
    indexedAccountId?: string;
    btcOnlyTaproot?: boolean;
  }) {
    const { accountId, networkId, indexedAccountId, btcOnlyTaproot } = params;
    if (!accountId && !indexedAccountId) {
      return null;
    }
    if (networkUtils.isAllNetwork({ networkId })) {
      throw new OneKeyLocalError('networkId should not be all network');
    }
    if (networkUtils.isAllNetwork({ networkId }) && !indexedAccountId) {
      throw new OneKeyLocalError('indexedAccountId should be provided');
    }
    if (accountUtils.isOthersAccount({ accountId }) || !indexedAccountId) {
      let account: INetworkAccount | null = null;
      try {
        account = await this.backgroundApi.serviceAccount.getAccount({
          accountId,
          networkId,
        });
      } catch (e) {
        return null;
      }
      if (
        networkUtils.isBTCNetwork(networkId) &&
        btcOnlyTaproot &&
        !isTaprootAddress(account?.address)
      ) {
        return null;
      }
      const accountAddress =
        await this.backgroundApi.serviceAccount.getAccountAddressForApi({
          networkId,
          accountId,
        });
      const walletId = accountUtils.getWalletIdFromAccountId({
        accountId: account.id,
      });
      return {
        walletId,
        accountId: account.id,
        networkId,
        accountAddress,
        account,
      };
    }
    try {
      const globalDeriveType =
        await this.backgroundApi.serviceNetwork.getGlobalDeriveTypeOfNetwork({
          networkId,
        });
      let deriveType = globalDeriveType;
      // only support taproot for earn
      if (networkUtils.isBTCNetwork(networkId) && btcOnlyTaproot) {
        deriveType = 'BIP86';
      }
      const networkAccount =
        await this.backgroundApi.serviceAccount.getNetworkAccount({
          accountId: undefined,
          indexedAccountId,
          networkId,
          deriveType,
        });
      const accountAddress =
        await this.backgroundApi.serviceAccount.getAccountAddressForApi({
          networkId,
          accountId: networkAccount.id,
        });
      const walletId = accountUtils.getWalletIdFromAccountId({
        accountId: networkAccount.id,
      });
      return {
        walletId,
        accountId: networkAccount.id,
        networkId,
        accountAddress,
        account: networkAccount,
      };
    } catch (e) {
      // ignore error
      return null;
    }
  }

  @backgroundMethod()
  async getUnbondingDelegationList(params: {
    accountAddress: string;
    provider: string;
    networkId: string;
    symbol: string;
  }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.get<{
      data: {
        delegations: IEarnUnbondingDelegationList;
      };
    }>(`/earn/v1/unbonding-delegation/list`, {
      params,
    });
    return resp.data.data.delegations;
  }

  @backgroundMethod()
  fetchEarnHomePageData() {
    return this._fetchEarnHomePageData();
  }

  _fetchEarnHomePageData = memoizee(
    async () => {
      const client = await this.getClient(EServiceEndpointEnum.Utility);
      const res = await client.get<{ data: IDiscoveryBanner[] }>(
        '/utility/v1/earn-banner/list',
      );
      return res.data.data;
    },
    {
      promise: true,
      maxAge: timerUtils.getTimeDurationMs({ seconds: 60 }),
    },
  );

  @backgroundMethod()
  async getEarnAvailableAccounts(params: {
    accountId: string;
    networkId: string;
    indexedAccountId?: string;
  }) {
    const { accountId, networkId } = params;
    const { accountsInfo } =
      await this.backgroundApi.serviceAllNetwork.getAllNetworkAccounts({
        accountId,
        networkId,
        indexedAccountId: params.indexedAccountId,
        fetchAllNetworkAccounts: accountUtils.isOthersAccount({ accountId })
          ? undefined
          : true,
      });
    return accountsInfo.filter(
      (account) =>
        !(
          networkUtils.isBTCNetwork(account.networkId) &&
          !isTaprootAddress(account.apiAddress)
        ),
    );
  }

  _getFAQListForHome = memoizee(
    async () => {
      const client = await this.getClient(EServiceEndpointEnum.Earn);
      const resp = await client.get<{
        data: {
          list: IEarnFAQList;
        };
      }>(`/earn/v1/faq/list`);
      return resp.data.data.list;
    },
    {
      promise: true,
      maxAge: timerUtils.getTimeDurationMs({ minute: 1 }),
    },
  );

  @backgroundMethod()
  async getFAQListForHome() {
    return this._getFAQListForHome();
  }

  @backgroundMethod()
  async getFAQList(params: { provider: string; symbol: string }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.get<{
      data: {
        list: IEarnFAQList;
      };
    }>(`/earn/v1/faq/list`, {
      params,
    });
    return resp.data.data.list;
  }

  @backgroundMethod()
  async buildEarnTx({
    accountId,
    networkId,
    tx,
  }: {
    accountId: string;
    networkId: string;
    tx: IStakeTx;
  }) {
    const vault = await vaultFactory.getVault({ networkId, accountId });
    const encodedTx = await vault.buildStakeEncodedTx(tx as any);
    return encodedTx;
  }

  @backgroundMethod()
  async estimateFee(params: {
    networkId: string;
    provider: string;
    symbol: string;
    action: IEarnEstimateAction;
    amount: string;
    txId?: string;
    protocolVault?: string;
    identity?: string;
    accountAddress?: string;
    approveType?: 'permit';
    permitSignature?: string;
  }) {
    const { symbol, protocolVault, ...rest } = params;
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const sendParams: Record<string, string | undefined> = {
      symbol,
      ...rest,
    };
    if (earnUtils.useVaultProvider({ providerName: params.provider })) {
      sendParams.vault = protocolVault;
    }
    const resp = await client.get<{
      data: IEarnEstimateFeeResp;
    }>(`/earn/v1/estimate-fee`, {
      params: sendParams,
    });
    return resp.data.data;
  }

  @backgroundMethod()
  async addBabylonTrackingItem(item: IEarnBabylonTrackingItem) {
    return simpleDb.babylonSync.addTrackingItem(item);
  }

  @backgroundMethod()
  async getBabylonTrackingItems({
    accountId,
    networkId,
  }: {
    accountId: string;
    networkId: string;
  }) {
    const items = await simpleDb.babylonSync.getTrackingList();
    const result = items.filter(
      (o) => o.accountId === accountId && networkId === o.networkId,
    );
    return result;
  }

  @backgroundMethod()
  async removeBabylonTrackingItem(item: { txIds: string[] }) {
    return simpleDb.babylonSync.removeTrackingItem({ txIds: item.txIds });
  }

  @backgroundMethod()
  async getPendingActivationPortfolioList({
    accountId,
    networkId,
  }: {
    accountId: string;
    networkId: string;
  }): Promise<IBabylonPortfolioItem[]> {
    const trackingItems = await this.getBabylonTrackingItems({
      accountId,
      networkId,
    });
    const pendingActivationItems = trackingItems.filter(
      (o) => o.action === 'stake',
    );
    return pendingActivationItems.map((o) => {
      const item = {
        txId: '',
        status: 'local_pending_activation',
        amount: o.amount,
        fiatValue: '',
        lockBlocks: 0,
        isOverflow: '',
      } as IBabylonPortfolioItem;
      if (o.minStakeTerm && o.createAt) {
        item.startTime = o.createAt;
        item.endTime = o.createAt + o.minStakeTerm;
      }
      return item;
    });
  }

  @backgroundMethod()
  async addEarnOrder(order: IAddEarnOrderParams) {
    defaultLogger.staking.order.addOrder(order);
    await simpleDb.earnOrders.addOrder(order);
    try {
      await this.updateEarnOrderStatusToServer({
        order: order as IEarnOrderItem,
      });
    } catch (e) {
      // ignore error, continue
      defaultLogger.staking.order.updateOrderStatusError({
        txId: order.txId,
        status: order.status,
      });
    }
  }

  @backgroundMethod()
  async updateSingleEarnOrderStatus({ order }: { order: IEarnOrderItem }) {
    await this.updateEarnOrderStatusToServer({
      order,
    });
  }

  @backgroundMethod()
  async updateEarnOrder({ txs }: { txs: IChangedPendingTxInfo[] }) {
    for (const tx of txs) {
      try {
        const order =
          await this.backgroundApi.simpleDb.earnOrders.getOrderByTxId(tx.txId);
        if (order && tx.status !== EDecodedTxStatus.Pending) {
          order.status = tx.status;
          await this.updateEarnOrderStatusToServer({ order });
          await this.backgroundApi.simpleDb.earnOrders.updateOrderStatusByTxId({
            currentTxId: tx.txId,
            status: tx.status,
          });
          defaultLogger.staking.order.updateOrderStatus({
            txId: tx.txId,
            status: tx.status,
          });
        }
      } catch (e) {
        // ignore error, continue loop
        defaultLogger.staking.order.updateOrderStatusError({
          txId: tx.txId,
          status: tx.status,
        });
      }
    }
  }

  @backgroundMethod()
  async updateEarnOrderStatusToServer({ order }: { order: IEarnOrderItem }) {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i += 1) {
      try {
        const client = await this.getClient(EServiceEndpointEnum.Earn);
        await client.post('/earn/v1/orders', {
          orderId: order.orderId,
          networkId: order.networkId,
          txId: order.txId,
        });
        return; // Return early on success
      } catch (error) {
        lastError = error;
        if (i === maxRetries - 1) break; // Exit loop on final retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // 1s, 2s, 3s
      }
    }

    throw lastError; // Throw last error after all retries fail
  }

  @backgroundMethod()
  async updateOrderStatusByTxId(params: {
    currentTxId: string;
    newTxId?: string;
    status: EDecodedTxStatus;
  }) {
    defaultLogger.staking.order.updateOrderStatusByTxId(params);
    await this.backgroundApi.simpleDb.earnOrders.updateOrderStatusByTxId(
      params,
    );
  }

  @backgroundMethod()
  async getFetchHistoryPollingInterval({ networkId }: { networkId: string }) {
    const vaultSettings =
      await this.backgroundApi.serviceNetwork.getVaultSettings({ networkId });
    return vaultSettings.stakingResultPollingInterval ?? 30;
  }

  @backgroundMethod()
  async queryInviteCodeByAddress(params: {
    networkId: string;
    accountAddress: string;
  }) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const response = await client.get<{
      data: {
        referCode: string;
      };
    }>(`/earn/v1/account/invite-code/query`, {
      params,
    });
    return response.data.data.referCode;
  }

  @backgroundMethod()
  async checkInviteCode(inviteCode: string) {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const response = await client.get<{
      code: number;
    }>(`/earn/v1/account/invite-code/check`, {
      params: { inviteCode },
    });
    return response.data.code === 0;
  }

  @backgroundMethod()
  async setFalconDepositDoNotShowAgain() {
    await simpleDb.appStatus.setRawData(
      (v): ISimpleDBAppStatus => ({
        ...v,
        falconDepositDoNotShowAgain: true,
      }),
    );
  }

  @backgroundMethod()
  async getFalconDepositDoNotShowAgain() {
    const v = await simpleDb.appStatus.getRawData();
    return v?.falconDepositDoNotShowAgain ?? false;
  }

  @backgroundMethod()
  async resetEarnCache() {
    await this.backgroundApi.simpleDb.earn.resetEarnData();
  }

  @backgroundMethod()
  async checkEthenaKycStatusByAccounts({
    accounts,
  }: {
    accounts: Array<{ accountAddress: string; networkId: string }>;
  }) {
    try {
      const client = await this.getClient(EServiceEndpointEnum.Earn);
      const response = await client.post<{
        data: {
          networkId: string;
          accountAddress: string;
          kycVerifyStatus: 'none' | 'pending' | 'verified' | 'rejected';
        }[];
      }>('/earn/v1/sumsub/status', {
        accounts,
      });
      const result = response.data.data
        .filter((i) => i.kycVerifyStatus === 'verified')
        .map((i) => i.accountAddress);
      if (Array.isArray(result) && result.length > 0) {
        await this.backgroundApi.simpleDb.earnExtra.setEthenaKycAddresses(
          result,
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error('checkEthenaKycStatusByAccounts error:', e);
      return false;
    }
  }

  @backgroundMethod()
  async getEthenaKycAddress() {
    return this.backgroundApi.simpleDb.earnExtra.getEthenaKycAddress();
  }
}

export default ServiceStaking;
