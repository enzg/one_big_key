import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import type { ITableColumn } from '@onekeyhq/components';
import {
  NumberSizeableText,
  SizableText,
  Skeleton,
  Stack,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import { MarketStarV2 } from '@onekeyhq/kit/src/views/Market/components/MarketStarV2';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EWatchlistFrom } from '@onekeyhq/shared/src/logger/scopes/market/scenes/token';

import { TokenIdentityItem } from '../../components/TokenIdentityItem';
import { Txns } from '../../components/Txns';

import type { IMarketToken } from '../../MarketTokenData';

export const useColumnsDesktop = (
  networkId?: string,
): ITableColumn<IMarketToken>[] => {
  const { gtLg, gtXl } = useMedia();
  const [settings] = useSettingsPersistAtom();
  const currency = settings.currencyInfo.symbol;
  const intl = useIntl();

  return [
    {
      title: (
        <SizableText pl="$3.5" size="$bodyMd" color="$textSubdued">
          #
        </SizableText>
      ) as any,
      dataIndex: 'star',
      columnWidth: 50,
      render: (_: unknown, record: IMarketToken) => (
        <Stack pl="$2">
          <MarketStarV2
            chainId={record.chainId || networkId || ''}
            contractAddress={record.address}
            from={EWatchlistFrom.catalog}
            size="small"
          />
        </Stack>
      ),
      renderSkeleton: () => (
        <Skeleton width={24} height={24} borderRadius="$full" />
      ),
    },
    {
      title: intl.formatMessage({ id: ETranslations.global_name }),
      dataIndex: 'name',
      columnWidth: 200,
      render: (_: unknown, record: IMarketToken) => (
        <TokenIdentityItem
          tokenLogoURI={record.tokenImageUri}
          networkLogoURI={record.networkLogoUri}
          symbol={record.symbol}
          address={record.address}
          showCopyButton
        />
      ),
      renderSkeleton: () => (
        <XStack alignItems="center" gap="$3">
          <XStack position="relative">
            <Skeleton width={32} height={32} borderRadius="$full" />
          </XStack>
          <YStack gap="$1">
            <Skeleton width={80} height={16} />
            <Skeleton width={60} height={12} />
          </YStack>
        </XStack>
      ),
    },
    {
      title: intl.formatMessage({ id: ETranslations.global_price }),
      dataIndex: 'price',
      columnProps: { flex: 1 },
      render: (text: string) => {
        return (
          <NumberSizeableText
            size="$bodyMd"
            formatter={BigNumber(text).gt(1_000_000) ? 'marketCap' : 'price'}
            formatterOptions={{ currency, capAtMaxT: true }}
          >
            {text}
          </NumberSizeableText>
        );
      },
      renderSkeleton: () => <Skeleton width={70} height={16} />,
    },
    {
      title: `${intl.formatMessage({
        id: ETranslations.dexmarket_token_change,
      })}(%)`,
      dataIndex: 'change24h',
      columnProps: { flex: 1 },
      render: (text: number) => {
        return (
          <NumberSizeableText
            size="$bodyMd"
            formatter="priceChange"
            color={text >= 0 ? '$textSuccess' : '$textCritical'}
            formatterOptions={{
              showPlusMinusSigns: true,
            }}
          >
            {text}
          </NumberSizeableText>
        );
      },
      renderSkeleton: () => <Skeleton width={60} height={16} />,
    },
    {
      title: intl.formatMessage({ id: ETranslations.global_market_cap }),
      dataIndex: 'marketCap',
      columnProps: { flex: 1 },
      render: (text: number) => (
        <NumberSizeableText
          size="$bodyMd"
          formatter="marketCap"
          formatterOptions={{ currency, capAtMaxT: true }}
        >
          {text}
        </NumberSizeableText>
      ),
      renderSkeleton: () => <Skeleton width={80} height={16} />,
    },
    {
      title: intl.formatMessage({ id: ETranslations.global_liquidity }),
      dataIndex: 'liquidity',
      columnProps: { flex: 1.2 },
      render: (text: number) => (
        <NumberSizeableText
          size="$bodyMd"
          formatter="marketCap"
          formatterOptions={{ currency }}
        >
          {text}
        </NumberSizeableText>
      ),
      renderSkeleton: () => <Skeleton width={100} height={16} />,
    },
    {
      title: intl.formatMessage({ id: ETranslations.dexmarket_turnover }),
      dataIndex: 'turnover',
      columnProps: { flex: 1.1 },
      render: (text: number) => (
        <NumberSizeableText
          size="$bodyMd"
          formatter="marketCap"
          formatterOptions={{ currency }}
        >
          {text}
        </NumberSizeableText>
      ),
      renderSkeleton: () => <Skeleton width={100} height={16} />,
    },
    {
      title: intl.formatMessage({ id: ETranslations.dexmarket_txns }),
      dataIndex: 'transactions',
      columnProps: { flex: 1 },
      render: (text: number, record: IMarketToken) => (
        <Txns transactions={text} walletInfo={record.walletInfo} />
      ),
      renderSkeleton: () => (
        <YStack gap="$1" alignItems="flex-start">
          <Skeleton width={50} height={14} />
          <XStack gap="$1">
            <Skeleton width={20} height={12} />
            <Skeleton width={20} height={12} />
          </XStack>
        </YStack>
      ),
    },
    gtLg
      ? {
          title: intl.formatMessage({ id: ETranslations.dexmarket_traders }),
          dataIndex: 'uniqueTraders',
          columnProps: { flex: 1 },
          render: (text: number) => (
            <NumberSizeableText size="$bodyMd" formatter="marketCap">
              {text}
            </NumberSizeableText>
          ),
          renderSkeleton: () => <Skeleton width={60} height={16} />,
        }
      : undefined,
    gtXl
      ? {
          title: intl.formatMessage({ id: ETranslations.dexmarket_holders }),
          dataIndex: 'holders',
          columnProps: { flex: 1 },
          render: (text: number) => (
            <NumberSizeableText size="$bodyMd" formatter="marketCap">
              {text}
            </NumberSizeableText>
          ),
          renderSkeleton: () => <Skeleton width={60} height={16} />,
        }
      : undefined,
  ].filter(Boolean);
};
