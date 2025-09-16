import type {
  IEarnAlert,
  IEarnTokenInfo,
  IProtocolInfo,
  IStakeProtocolDetails,
} from '../../types/staking';

export enum EModalStakingRoutes {
  InvestmentDetails = 'InvestmentDetails',
  Stake = 'Stake',
  Withdraw = 'Withdraw',
  Claim = 'Claim',
  ProtocolDetails = 'ProtocolDetails',
  ProtocolDetailsV2 = 'ProtocolDetailsV2',
  ProtocolDetailsV2Share = 'ProtocolDetailsV2Share',
  AssetProtocolList = 'AssetProtocolList',
  ClaimOptions = 'ClaimOptions',
  WithdrawOptions = 'WithdrawOptions',
  PortfolioDetails = 'PortfolioDetails',
  HistoryList = 'HistoryList',
}

type IBaseRouteParams = {
  networkId: string;
  accountId: string;
  indexedAccountId?: string;
};

interface IDetailPageInfoParams extends IBaseRouteParams {
  protocolInfo?: IProtocolInfo;
  tokenInfo?: IEarnTokenInfo;
}
export type IModalStakingParamList = {
  [EModalStakingRoutes.InvestmentDetails]: undefined;
  [EModalStakingRoutes.ProtocolDetails]: IBaseRouteParams & {
    symbol: string;
    provider: string;
    details?: IStakeProtocolDetails;
    vault?: string;
  };
  [EModalStakingRoutes.ProtocolDetailsV2]: IBaseRouteParams & {
    symbol: string;
    provider: string;
    details?: IStakeProtocolDetails;
    vault?: string;
  };
  [EModalStakingRoutes.ProtocolDetailsV2Share]: {
    network: string; // network name, like 'ethereum', 'bitcoin'
    symbol: string;
    provider: string;
    vault?: string;
    details?: IStakeProtocolDetails;
    // note: does not contain accountId, etc. account information
  };
  [EModalStakingRoutes.Stake]: IDetailPageInfoParams & {
    currentAllowance: string;
    onSuccess?: () => void;
  };
  [EModalStakingRoutes.Withdraw]: IDetailPageInfoParams & {
    rate?: string;
    identity?: string;
    amount?: string;
    fromPage?: EModalStakingRoutes.WithdrawOptions;
    onSuccess?: () => void;
  };
  [EModalStakingRoutes.Claim]: IDetailPageInfoParams &
    IDetailPageInfoParams & {
      amount?: string;
      onSuccess?: () => void;
      identity?: string;
      claimableAmount?: string;
    };
  [EModalStakingRoutes.ClaimOptions]: IDetailPageInfoParams;
  [EModalStakingRoutes.WithdrawOptions]: IDetailPageInfoParams;
  [EModalStakingRoutes.AssetProtocolList]: IBaseRouteParams & {
    symbol: string;
    filter?: boolean;
  };
  [EModalStakingRoutes.PortfolioDetails]: IBaseRouteParams & {
    symbol: string;
    provider: string;
  };
  [EModalStakingRoutes.HistoryList]: IBaseRouteParams & {
    symbol: string;
    provider: string;
    stakeTag?: string;
    protocolVault?: string;
    filterType?: string;
    title?: string;
    alerts?: IEarnAlert[];
  };
};
