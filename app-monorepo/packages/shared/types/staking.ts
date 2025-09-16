import type {
  ColorTokens,
  IAlertType,
  IBadgeType,
  IButtonProps,
  IKeyOfIcons,
} from '@onekeyhq/components';
import type { IDialogProps } from '@onekeyhq/components/src/composite/Dialog/type';

import type { INetworkAccount } from './account';
import type { IEarnAvailableAssetAprInfo } from './earn';
import type { IFetchTokenDetailItem, IToken } from './token';
import type { ESpotlightTour } from '../src/spotlight';
import type { FontSizeTokens } from 'tamagui';

export type IAllowanceOverview = {
  allowance: string;
  allowanceParsed: string;
};

export enum ECheckAmountActionType {
  STAKING = 'stake',
  UNSTAKING = 'unstake',
  CLAIM = 'claim',
}

export interface IEarnAlertButton {
  text: {
    text: string;
    color?: string;
    size?: FontSizeTokens;
  };
  type: string;
  disabled: boolean;
  data: {
    link: string;
  };
}

export interface ICheckAmountAlert {
  type: IAlertType;
  text: {
    text: string;
  };
  button?: IEarnAlertButton;
}

// export type IStakeTag = 'lido-eth' | 'lido-matic';
export type IStakeTag = string;
type IStakeBadgeTag = { tag: string; badge: IBadgeType };

export enum EEarnLabels {
  Stake = 'Stake',
  Claim = 'Claim',
  Redeem = 'Redeem',
  Withdraw = 'Withdraw',
  Unknown = 'Unknown',
}

export type IStakingInfo = {
  protocol: string;
  protocolLogoURI?: string;
  label: EEarnLabels;
  tags: IStakeTag[]; // used for filtering
  send?: { amount: string; token: IToken };
  receive?: { amount: string; token: IToken };
  orderId?: string;
};

export enum EApproveType {
  Permit = 'permit',
  Legacy = 'legacy',
}

export type IStakeProviderInfo = {
  name: string;
  logoURI: string;
  website: string;
  // btc don't have apr
  aprWithoutFee?: string;
  poolFee: string;
  totalStaked: string;
  totalStakedFiatValue: string;
  totalFiatValue: string;
  minStakeAmount: string;
  maxStakeAmount: string;
  minUnstakeAmount?: number;
  minClaimableAmount?: string;
  isNative?: string;
  nextLaunchLeft?: string;

  type?: 'native' | 'liquid' | 'lending';
  isStaking?: boolean;

  unstakingTime?: number;
  stakingTime?: number;

  receiptToken?: string;

  // native token only
  minTransactionFee?: string;

  // babylon
  minStakeTerm?: number;
  maxStakeTerm?: number;
  minStakeBlocks?: number;
  maxStakeBlocks?: number;
  unbondingTime?: number;
  stakingCap?: string;
  earnPoints?: boolean;
  stakeDisable?: boolean;
  buttonStake: boolean;
  buttonUnstake: boolean;
  alerts: string[];

  // morpho
  apys?: IRewardApys;
  maxUnstakeAmount?: string;
  vault?: string;
  vaultName?: string;
  url?: string;
  rewardUnit: IEarnRewardUnit;

  approveType?: EApproveType;

  liquidity?: string;
  vaultManager?: string;
  vaultManagerName?: string;

  // falcon
  joinRequirement?: string;
  eventEndTime?: number;
};

export type IStakeBaseParams = {
  accountId: string;
  networkId: string;
  amount: string;
  symbol: string;
  provider: string;

  term?: number; // Babylon
  feeRate?: number;
  signature?: string; // lido unstake
  deadline?: number; // lido unstake
  protocolVault?: string; // protocol vault
  approveType?: EApproveType;
  permitSignature?: string;

  inviteCode?: string;
  bindedAccountAddress?: string;
  bindedNetworkId?: string;
};

export type IWithdrawBaseParams = {
  accountId: string;
  networkId: string;
  amount: string;
  symbol: string;
  provider: string;

  identity?: string; // sol pubkey
  signature?: string; // lido unstake
  deadline?: number; // lido unstake
  protocolVault?: string; // protocol vault
  withdrawAll?: boolean;
};

export type IUnstakePushParams = {
  accountId: string;
  networkId: string;
  symbol: string;
  provider: string;
  txId: string;
  unstakeTxHex: string;
};

export type IClaimRecordParams = {
  networkId: string;
  provider: string;
  symbol: string;
  accountId: string;
  identity: string;
};

export type IStakeClaimBaseParams = {
  accountId: string;
  networkId: string;
  symbol: string;
  vault: string;
  provider: string;
  amount?: string;
  identity?: string;
  claimTokenAddress?: string;
};

export type IStakeHistoryParams = {
  type?: string;
  accountId: string;
  networkId: string;
  symbol: string;
  provider: string;
  protocolVault?: string;
};

export type IStakeHistory = {
  txHash: string;
  title: string;
  type?: string;
  amount?: string;
  timestamp: number;
  tokenAddress: string;
  networkId: string;
  token?: {
    price?: string;
    price24h?: string;
    info?: IToken;
  };
  direction: 'receive' | 'send';
};

export type IStakeHistoriesResponse = {
  filter: Record<string, string>;
  list: IStakeHistory[];
  tokenMap: Record<string, IToken>;
  tokens: {
    price?: string;
    price24h?: string;
    info?: IToken;
  }[];
  nextKey?: string;
  network?: {
    networkId: string;
    name: string;
    logoURI: string;
  };
  networks: {
    networkId: string;
    name: string;
    logoURI: string;
  }[];
};

export enum EStakeTxType {
  EthEvertStake = 'eth-evert-stake',
  EthLido = 'eth-lido',
  BtcBabylon = 'btc-babylon',
}

export type IStakeTx =
  | IStakeTxBtcBabylon
  | IStakeTxEthEvertStake
  | IStakeTxEthLido
  | IStakeTxCosmosAmino
  | IStakeTxSui;

export type IStakeTxResponse = {
  tx: IStakeTx;
  orderId: string;
};

// Babylon
export type IStakeTxBtcBabylon = {
  // type: EStakeTxType.BtcBabylon;
  psbtHex: string;
};

export type IStakeTxEthEvertStake = {
  // type: EStakeTxType.EthEvertStake;
  from: string;
  to: string;
  value: string;
  gasLimit: string;
  data: string;
};

export type IStakeTxEthLido = {
  // type: EStakeTxType.EthLido;
  to: string;
  value: string;
  data: string;
};

// Cosmos dapp interface signAmino
export type IStakeTxCosmosAmino = {
  readonly chain_id: string;
  readonly account_number: string;
  readonly sequence: string;
  fee: {
    amount: {
      denom: string;
      amount: string;
    }[];
    gas: string;
  };
  readonly msgs: {
    type: string;
    value: any;
  }[];
  readonly memo: string;
};

export type IStakeTxSui = string;

export type IEarnTokenItem = {
  balance: string;
  balanceParsed: string;
  fiatValue: string;
  price: string;
  price24h: string;
  info: IToken;
};

export interface IEarnText {
  text: string;
  color?: string;
  size?: FontSizeTokens;
}

export type IProtocolInfo = {
  stakeTag: string;
  // account with Earn
  earnAccount?:
    | {
        accountId: string;
        networkId: string;
        accountAddress: string;
        account: INetworkAccount;
      }
    | null
    | undefined;
  // response from server
  provider: string;
  networkId: string;
  symbol: string;
  vault: string;
  approve?: {
    approveType: EApproveType;
    approveTarget: string;
  };
  providerDetail: {
    name: string;
    logoURI: string;
  };
  apyDetail?: IStakeEarnDetail['apyDetail'];
  // injected by client side
  apys?: IRewardApys;
  activeBalance?: string;
  overflowBalance?: string;
  eventEndTime?: number;
  minTransactionFee?: string;
  maxUnstakeAmount?: string;
  minUnstakeAmount?: string;
  claimable?: string;
  remainingCap?: string;
};

export interface IEarnToken {
  uniqueKey: string;
  address: string;
  decimals: number;
  isNative: boolean;
  logoURI: string;
  name: string;
  symbol: string;
  totalSupply: string;
  riskLevel: number;
  coingeckoId: string;
}

export interface IEarnTokenInfo {
  networkId: string;
  provider: string;
  vault: string | undefined;
  accountId: string;
  indexedAccountId?: string;
  nativeToken?: IFetchTokenDetailItem;
  balanceParsed: string;
  token: IEarnToken;
  price: string;
}

interface ISubscriptionValue {
  title: IEarnText;
  fiatValue: string;
  formattedValue: string;
  balance: string;
  token: {
    info: IEarnToken;
    price: string;
  };
}

export interface ISubscriptionAction {
  text: string | undefined;
  buttonProps: IButtonProps;
}

interface IEarnBadge {
  badgeType: 'success' | 'warning';
  badgeSize: 'sm' | 'lg';
  text: {
    text: string;
  };
}

interface IRewardToken {
  token: {
    info: IEarnToken;
    price: string;
  };
  title: IEarnText;
  description: IEarnText;
  button?: IEarnClaimActionIcon;
}

interface IRewards {
  title: IEarnText;
  tooltip: IEarnTooltip;
  tokens: IRewardToken[];
}

export interface IEarnIcon {
  icon: IKeyOfIcons;
  color?: ColorTokens;
  size?: string;
}

export interface IEarnPopupActionIcon {
  type: 'popup';
  data: {
    bulletList?: IEarnText[];
    icon?: IEarnIcon;
    description?: IEarnText[];
    panel?: {
      title: IEarnText;
      description: IEarnText;
    }[];
    items?: {
      icon?: IEarnIcon;
      token?: {
        info: IEarnToken;
        price: string;
      };
      title: IEarnText;
      value: string;
    }[];
  };
}

export interface IEarnLinkActionIcon {
  type: 'link';
  data: {
    link: string;
    showIntercom?: boolean;
  };
  icon?: IEarnIcon;
  disabled?: boolean;
  text: IEarnText;
}

export interface IEarnDepositActionIcon {
  type: 'deposit';
  disabled: boolean;
  text: IEarnText;
}

export interface IEarnHistoryActionIcon {
  type: 'history';
  disabled: boolean;
  text: IEarnText;
}

export interface IEarnTextTooltip {
  type: 'text';
  data: IEarnText;
}

export interface IEarnRebateTooltip {
  type: 'rebate';
  data: {
    title: IEarnText;
    description: IEarnText;
    text: IEarnText;
    items: {
      title: IEarnText;
      button?: IEarnActionIcon;
    }[];
  };
}

export interface IEarnWithdrawTooltip {
  type: 'withdraw';
  data: {
    title: string;
    description: string;
    items: {
      title: IEarnText;
      description: IEarnText;
    }[];
  };
}

export interface IEarnRebateDetailsTooltip {
  type: 'rebateDetails';
  data: {
    title: IEarnText;
    description: IEarnText;
    tokens: {
      info: IEarnToken;
      fiatValue: string;
      amount: string;
    }[];
  };
}

export type IEarnTooltip =
  | IEarnTextTooltip
  | IEarnRebateTooltip
  | IEarnWithdrawTooltip
  | IEarnRebateDetailsTooltip;

export enum EClaimType {
  Claim = 'claim',
  ClaimOrder = 'claimOrder',
  ClaimWithKyc = 'claimWithKyc',
}

export interface IEarnClaimActionIcon {
  type: EClaimType;
  text: string | IEarnText;
  disabled: boolean;
  data?: {
    balance: string;
    token: IEarnToken;
  };
}

export interface IEarnClaimWithKycActionIcon {
  type: EClaimType;
  text: string | IEarnText;
  disabled: boolean;
  data?: {
    balance: string;
    token: IEarnToken;
    icon?: IEarnIcon;
    title?: IEarnText;
    description?: IEarnText[];
    button?: IEarnActionIcon;
    tone?: IDialogProps['tone'];
  };
}

export interface IEarnPortfolioActionIcon {
  type: 'portfolio';
  disabled: boolean;
  text: IEarnText;
}

export interface IEarnActivateActionIcon {
  type: 'activate';
  disabled: boolean;
  text: IEarnText;
  data: {
    title: IEarnText;
    description: IEarnText[];
    checkboxes: IEarnText[];
    accordions: {
      title: IEarnText;
      description: IEarnText;
    }[];
    button: IEarnActivateActionIcon;
  };
}

export interface IEarnReceiveActionIcon {
  type: 'receive';
  disabled: boolean;
  text: IEarnText;
}

export interface IEarnTradeActionIcon {
  type: 'trade';
  disabled: boolean;
  text: IEarnText;
}

export interface IEarnCloseActionIcon {
  type: 'close';
  disabled: boolean;
  text: IEarnText;
}

export type IEarnActionIcon =
  | IEarnPopupActionIcon
  | IEarnLinkActionIcon
  | IEarnClaimActionIcon
  | IEarnHistoryActionIcon
  | IEarnPortfolioActionIcon
  | IEarnActivateActionIcon
  | IEarnReceiveActionIcon
  | IEarnTradeActionIcon
  | IEarnCloseActionIcon;

interface IEarnGridItem {
  title: IEarnText;
  description: IEarnText;
  button?: IEarnActionIcon;
  tooltip?: IEarnTooltip;
  type?: 'default' | 'info';
}

interface IEarnProfit {
  title: IEarnText;
  items: IEarnGridItem[];
}

export interface IEarnFAQItem {
  title: IEarnText;
  description: IEarnText;
}

interface IEarnRisk {
  title: IEarnText;
  items?: {
    title: IEarnText;
    description: IEarnText;
    icon: IEarnIcon;
    actionButton: IEarnLinkActionIcon;
    list?: {
      title: IEarnText;
      icon: IEarnIcon;
    }[];
  }[];
}

interface IEarnToast {
  type: 'success' | 'error';
  text: IEarnText;
}

export interface IEarnWithdrawAction {
  type: 'withdraw';
  data: {
    balance: string;
    token: IEarnToken;
  };
}

export enum EStakingActionType {
  Withdraw = 'withdraw',
  WithdrawOrder = 'withdrawOrder',
  Deposit = 'deposit',
  Activate = 'activate',
  Receive = 'receive',
  Trade = 'trade',
}

export interface IEarnWithdrawActionIcon {
  type: EStakingActionType;
  disabled: boolean;
  text: IEarnText;
  data: {
    balance: string;
    token: IEarnToken;
  };
}

export interface IEarnWithdrawOrderActionIcon {
  type: EStakingActionType;
  disabled: boolean;
  text: IEarnText;
  data: {
    text: IEarnText;
  };
}

export type IEarnDetailActions =
  | IEarnDepositActionIcon
  | IEarnWithdrawActionIcon
  | IEarnHistoryActionIcon
  | IEarnWithdrawOrderActionIcon
  | IEarnActivateActionIcon;

export interface IEarnAlert {
  alert: string;
  key: ESpotlightTour;
  badge: IBadgeType;
  button?: IEarnAlertButton;
}

export interface IEarnRiskNoticeDialog {
  title: IEarnText;
  description: IEarnText;
  checkboxes: IEarnText[];
}

export interface IStakeEarnDetail {
  protection?: {
    title: IEarnText;
    items: {
      title: IEarnText;
      description: IEarnText;
      icon: IEarnIcon;
    }[];
  };
  apyDetail?: {
    type: 'default';
    title: IEarnText;
    description: IEarnText;
    button: IEarnActionIcon;
  };
  actions?: IEarnDetailActions[];
  subscriptionValue?: ISubscriptionValue;
  tags?: IStakeBadgeTag[];
  protocol?: IProtocolInfo;
  countDownAlert?: {
    description: IEarnText;
    startTime: number;
    endTime: number;
  };
  portfolios?: {
    title: IEarnText;
    items: {
      type: 'default';
      token: {
        info: IEarnToken;
        price: string;
      };
      fiatValue: string;
      formattedValue: string;
      title: IEarnText;
      description?: IEarnText;
      badge: IEarnBadge;
      tooltip?: IEarnTooltip;
      buttons?: IEarnActionIcon[];
    }[];
    button?: IEarnPortfolioActionIcon;
  };
  timeline?: {
    title: IEarnText;
    step: number;
    items: {
      title: IEarnText;
      description: IEarnText;
    }[];
  };
  rewards?: IRewards;
  risk?: IEarnRisk;
  profit?: IEarnProfit;
  provider?: {
    title: IEarnText;
    items: IEarnGridItem[];
  };
  alertsV2?: IEarnAlert[];
  faqs?: {
    title: IEarnText;
    items: IEarnFAQItem[];
  };
  nums?: {
    overflow: string;
    minUnstakeAmount: string;
    maxUnstakeAmount: string;
    minTransactionFee: string;
    claimable: string;
    remainingCap: string;
  };
  managers?: {
    items: {
      title: IEarnText;
      description: IEarnText;
      logoURI: string;
    }[];
  };
  statement?: {
    icon: IEarnIcon;
    title: IEarnText;
    items: {
      title: IEarnText;
    }[];
    buttons: {
      type: 'close' | 'link';
      text: IEarnText;
      disabled: boolean;
      data?: {
        icon?: IEarnIcon;
        link?: string;
      };
    }[];
  };
  riskNoticeDialog?: Record<string, IEarnRiskNoticeDialog>;
}

export interface IEarnProvider {
  name: string;
  vault: string;
  logoURI: string;
  approveType?: string;
}

export interface IStakeTransactionConfirmation {
  title: IEarnText;
  tooltip?: IEarnTooltip;
  rewards: Array<{
    title: IEarnText;
    description: IEarnText;
    tooltip?: IEarnTooltip;
  }>;
  receive: {
    title: IEarnText;
    description: IEarnText;
    tooltip: {
      type: 'text';
      data: {
        title: IEarnText;
      };
    };
  };
}

export type IStakeProtocolDetails = {
  staked: string;
  stakedFiatValue: string;
  available: string;
  active?: string;
  pendingInactive?: string;
  pendingActive?: string;
  claimable?: string;
  rewards?: string;
  earnings24h?: string;
  totalRewardAmount?: string;
  provider: IStakeProviderInfo;
  totalStaked?: string;
  totalStakedFiatValue?: string;
  stakingCap?: string;
  token: IEarnTokenItem;
  network?: {
    name: string;
  };
  buttons?: {
    addInviteCode?: boolean;
  };
  updateFrequency: string;
  rewardToken: string;
  approveTarget?: string;
  earnHistoryEnable?: boolean;
  pendingActivatePeriod?: number;
  unstakingPeriod?: number;
  overflow?: string;
  rewardNum?: IEarnRewardNum;
  rewardAssets?: Record<string, IEarnTokenItem>;
  waitingRebateRewardAmount: string;

  // falcon
  preStaked?: boolean; // pre stake usdf user
  hasRegister?: boolean; // register falcon user
  preStakeActive?: string; // pre stake portfolio, user staked usdf before event end time
  formalActive?: string; // formal stake portfolio, user staked usdf after event end time
};

export enum EStakeProtocolGroupEnum {
  Available = 'available',
  WithdrawOnly = 'withdrawOnly',
  Deposited = 'deposited',
  Unavailable = 'unavailable',
}

export type IStakeProtocolListItem = {
  provider: IStakeProviderInfo & {
    group: EStakeProtocolGroupEnum;
    description?: string;
    badges?: Array<{
      badgeType: IBadgeType;
      tag: string;
    }>;
  };
  network: {
    networkId: string;
    name: string;
    logoURI: string;
  };
  isEarning: boolean;
  aprInfo?: IEarnAvailableAssetAprInfo;
};

export type IRewardApys = {
  // Base rates
  rate?: string;
  netApy?: string;
  performanceFee: string;

  // Time-based APYs
  dailyApy?: string;
  dailyNetApy?: string;
  weeklyNetApy?: string;
  monthlyNetApy?: string;
  weeklyNetApyWithoutFee?: string;

  // falcon
  airdrop?: string;
  fixed?: string;

  // Token rewards
  rewards: Record<string, string>;

  // rebate reward
  rebateReward: string;
};

export type IBabylonPortfolioStatus =
  | 'active'
  | 'withdraw_requested'
  | 'claimable'
  | 'claimed'
  | 'local_pending_activation'; // local_pending_activation created by client side ;

export type IBabylonPortfolioItem = {
  txId: string;
  status: IBabylonPortfolioStatus;
  amount: string;
  fiatValue: string;
  startTime?: number;
  endTime?: number;
  lockBlocks: number;
  isOverflow: string;
};

export type IClaimableListItem = {
  id: string;
  amount: string;
  fiatValue?: string;
  isPending?: boolean;
  babylonExtra?: IBabylonPortfolioItem;
};

export type IClaimableListResponse = {
  token: IToken;
  network?: {
    networkId: string;
    name: string;
    logoURI: string;
  };
  items: IClaimableListItem[];
};

export interface IEarnAccountToken {
  orderIndex: number;
  networkId: string;
  name: string;
  symbol: string;
  logoURI: string;
  aprWithoutFee: string;
  profit: string;
  balance: string;
  balanceParsed: string;
  address: string;
  price: string;
  rewardUnit: IEarnRewardUnit;
}

export type IEarnAccountResponse = {
  claimableNum: number;
  totalFiatValue: string;
  earnings24h: string;
  tokens: IEarnAccountToken[];
  canClaim: boolean;
};

export type IEarnAccount = {
  tokens: IEarnAccountToken[];
  networkId: string;
  accountAddress: string;
  publicKey?: string;
};

export type IEarnAccountTokenResponse = {
  hasClaimableAssets?: boolean;
  totalFiatValue?: string;
  earnings24h?: string;
  accounts: IEarnAccount[];
  isOverviewLoaded?: boolean;
};

export type IEarnRewardUnit = 'APY' | 'APR';
export type IAvailableAsset = {
  name: string;
  symbol: string;
  logoURI: string;
  apr: string;
  aprWithoutFee: string;
  tags: string[];
  rewardUnit: IEarnRewardUnit;
  protocols: Array<{
    networkId: string;
    provider: string;
    vault: string;
  }>;
  badges?: Array<{
    badgeType: IBadgeType;
    tag: string;
  }>;
};

export interface IEarnAtomData {
  earnAccount?: Record<string, IEarnAccountTokenResponse>;
  availableAssetsByType?: Record<string, IAvailableAsset[]>;
  refreshTrigger?: number;
}

export type IGetPortfolioParams = {
  networkId: string;
  accountId: string;
  provider: string;
  symbol: string;
};

export interface IInvestmentTokenInfo {
  uniqueKey: string;
  address: string;
  decimals: number;
  isNative: boolean;
  logoURI: string;
  name: string;
  symbol: string;
  totalSupply: string;
  riskLevel: number;
  networkId: string;
}

export type IEarnRewardNum = Record<
  string,
  {
    claimableNow: string;
    claimableNext: string;
  }
>;

export interface IInvestment {
  active: string;
  claimable: string;
  overflow: string;
  staked: string;
  stakedFiatValue: string;
  tokenInfo: IInvestmentTokenInfo;
  rewardNum?: IEarnRewardNum;
  rewards?: string;
  vault?: string;
}
export interface IEarnInvestmentItem {
  name: string;
  logoURI: string;
  investment: IInvestment[];
}

export interface IEarnFAQListItem {
  question: string;
  answer: string;
}
export type IEarnFAQList = IEarnFAQListItem[];

export type IEarnEstimateAction = 'stake' | 'unstake' | 'claim' | 'approve';

export type IEarnUnbondingDelegationListItem = {
  amount: string;
  timestampLeft: number;
};

export type IEarnUnbondingDelegationList = IEarnUnbondingDelegationListItem[];

export type IEarnEstimateFeeResp = {
  coverFeeDays?: string;
  coverFeeSeconds?: string;
  feeFiatValue: string;
  token: {
    balance: string;
    balanceParsed: string;
    fiatValue: string;
    price: string;
    price24h: string;
    info: IToken;
  };
};

export interface IEarnBabylonTrackingItem {
  txId: string;
  action: 'stake' | 'claim';
  createAt: number;
  accountId: string;
  networkId: string;
  amount: string;
  minStakeTerm?: number;
}

export interface IBuildPermit2ApproveSignDataParams {
  networkId: string;
  provider: string;
  symbol: string;
  accountAddress: string;
  vault: string;
  amount: string;
}

export interface IEarnPermit2ApproveSignData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
    expiry?: string; // dai
  };
  primaryType: string;
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    Permit: {
      name: string;
      type: string;
    }[];
  };
}

export interface IBuildRegisterSignMessageParams {
  networkId: string;
  provider: string;
  symbol: string;
  accountAddress: string;
}

export interface IEarnRegisterSignMessageResponse {
  expiredAt: string;
  message: string;
  toast?: IEarnToast;
}

export interface IVerifyRegisterSignMessageParams
  extends IBuildRegisterSignMessageParams {
  signature: string;
  message: string;
}

export type IApproveConfirmFnParams = {
  amount: string;
  approveType?: EApproveType;
  permitSignature?: string;
};

export interface IEarnSummary {
  icon: IEarnIcon;
  title: IEarnText;
  alerts?: IEarnAlert[];
  items: {
    title: IEarnText;
    description: IEarnText;
    tooltip?: IEarnTooltip;
    button?: IEarnActionIcon;
  }[];
}
