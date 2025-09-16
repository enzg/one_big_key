import { useCallback, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { useIntl } from 'react-intl';

import {
  Badge,
  Divider,
  NumberSizeableText,
  Progress,
  SizableText,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import {
  formatDate,
  formatDistanceStrict,
} from '@onekeyhq/shared/src/utils/dateUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import { formatBalance } from '@onekeyhq/shared/src/utils/numberUtils';
import {
  ESwapLimitOrderStatus,
  ESwapQuoteKind,
  type IFetchLimitOrderRes,
  LIMIT_PRICE_DEFAULT_DECIMALS,
} from '@onekeyhq/shared/types/swap/types';

import { SwapTxHistoryAvatar } from './SwapTxHistoryListCell';

const LimitOrderCard = ({
  item,
  progressWidth = 255,
  hiddenCreateTime,
  onPress,
  hiddenCancelIcon = false,
  onCancel,
  hiddenHoverBg = false,
  cancelLoading = false,
}: {
  item: IFetchLimitOrderRes;
  hiddenCreateTime?: boolean;
  progressWidth?: number;
  onPress?: () => void;
  hiddenCancelIcon?: boolean;
  onCancel?: () => void;
  cancelLoading?: boolean;
  hiddenHoverBg?: boolean;
}) => {
  const { fromTokenInfo, toTokenInfo, fromAmount, toAmount } = item;
  const intl = useIntl();
  const { gtMd } = useMedia();
  const createdAtFormat = useMemo(() => {
    const date = new BigNumber(item.createdAt).toNumber();
    const dateStr = formatDate(new Date(date), {
      hideSeconds: true,
    });
    if (hiddenCreateTime) {
      return null;
    }
    return (
      <XStack justifyContent="space-between">
        <SizableText size="$bodySm" color="$textSubdued">
          {dateStr}
        </SizableText>
      </XStack>
    );
  }, [hiddenCreateTime, item.createdAt]);

  const expirationTitle = useMemo(() => {
    const date = new BigNumber(item.expiredAt).shiftedBy(3).toNumber();
    let dateStr = formatDate(new Date(date), {
      hideSeconds: true,
    });
    if (
      item.status === ESwapLimitOrderStatus.PRESIGNATURE_PENDING ||
      item.status === ESwapLimitOrderStatus.OPEN
    ) {
      const now = new Date();
      dateStr = formatDistanceStrict(new Date(date), now);
    }
    return (
      <YStack
        gap="$1.5"
        justifyContent="flex-start"
        minWidth={gtMd ? 150 : 180}
      >
        <SizableText size="$bodySm" color="$textSubdued">
          {intl.formatMessage({ id: ETranslations.Limit_order_status_expired })}
        </SizableText>
        <SizableText size="$bodySm">{dateStr}</SizableText>
      </YStack>
    );
  }, [item.expiredAt, item.status, gtMd, intl]);

  const networkName = useMemo(() => {
    const networkInfo = networkUtils.getLocalNetworkInfo(item?.networkId);
    return networkInfo?.name;
  }, [item]);

  const tokenInfo = useCallback(() => {
    const fromAmountFormatted = new BigNumber(fromAmount).shiftedBy(
      -(fromTokenInfo?.decimals ?? 0),
    );
    const toAmountFormatted = new BigNumber(toAmount).shiftedBy(
      -(toTokenInfo?.decimals ?? 0),
    );
    return (
      <XStack gap="$2" alignItems="center">
        <SwapTxHistoryAvatar
          fromUri={fromTokenInfo?.logoURI ?? ''}
          toUri={toTokenInfo?.logoURI ?? ''}
        />
        <YStack>
          <XStack alignItems="center" gap="$1" flex={1}>
            {gtMd ? (
              <NumberSizeableText size="$bodyMd" formatter="balance">
                {fromAmountFormatted.toFixed()}
              </NumberSizeableText>
            ) : null}
            <SizableText size="$bodyMd" numberOfLines={1}>
              {fromTokenInfo?.symbol ?? '-'}
            </SizableText>
            <SizableText size="$bodyMd">→</SizableText>
            {gtMd ? (
              <NumberSizeableText size="$bodyMd" formatter="balance">
                {toAmountFormatted.toFixed()}
              </NumberSizeableText>
            ) : null}
            <SizableText size="$bodyMd" numberOfLines={1}>
              {toTokenInfo?.symbol ?? '-'}
            </SizableText>
          </XStack>
          <SizableText size="$bodySm" color="$textSubdued">
            {` ${networkName ?? '-'}`}
          </SizableText>
        </YStack>
      </XStack>
    );
  }, [
    fromAmount,
    fromTokenInfo?.decimals,
    fromTokenInfo?.logoURI,
    fromTokenInfo?.symbol,
    toAmount,
    toTokenInfo?.decimals,
    toTokenInfo?.logoURI,
    toTokenInfo?.symbol,
    networkName,
    gtMd,
  ]);
  const decimalsAmount = useMemo(
    () => ({
      fromAmount: new BigNumber(item?.fromAmount ?? '0').shiftedBy(
        -(item?.fromTokenInfo?.decimals ?? 0),
      ),
      toAmount: new BigNumber(item?.toAmount ?? '0').shiftedBy(
        -(item?.toTokenInfo?.decimals ?? 0),
      ),
    }),
    [
      item?.fromAmount,
      item?.fromTokenInfo?.decimals,
      item?.toAmount,
      item?.toTokenInfo?.decimals,
    ],
  );
  const limitPrice = useMemo(() => {
    const fromAmountNum = decimalsAmount.fromAmount;
    const toAmountNum = decimalsAmount.toAmount;
    const calculateLimitPrice = toAmountNum
      .div(fromAmountNum)
      .decimalPlaces(
        fromTokenInfo?.decimals ?? LIMIT_PRICE_DEFAULT_DECIMALS,
        BigNumber.ROUND_HALF_UP,
      )
      .toFixed();
    const limitPriceFormat = formatBalance(calculateLimitPrice);
    return limitPriceFormat.formattedValue;
  }, [decimalsAmount, fromTokenInfo?.decimals]);
  const renderLimitOrderPrice = useCallback(
    () => (
      <YStack
        gap="$1.5"
        minWidth={gtMd ? 200 : 180}
        justifyContent="flex-start"
      >
        <SizableText size="$bodySm" color="$textSubdued">
          {intl.formatMessage({ id: ETranslations.Limit_limit_price })}
        </SizableText>
        <SizableText size="$bodySm">
          {`1 ${item?.fromTokenInfo?.symbol ?? '-'} = ${limitPrice ?? '-'} ${
            item?.toTokenInfo?.symbol ?? '-'
          }`}
        </SizableText>
      </YStack>
    ),
    [item, limitPrice, intl, gtMd],
  );
  const renderLimitOrderStatus = useCallback(() => {
    const { status, executedSellAmount, executedBuyAmount, kind } = item ?? {};
    let label = intl.formatMessage({
      id: ETranslations.Limit_order_status_open,
    });
    let color = '$textSuccess';
    if (status) {
      switch (status) {
        case ESwapLimitOrderStatus.CANCELLED:
          label = intl.formatMessage({
            id: ETranslations.Limit_order_status_cancelled,
          });
          color = '$textCritical';
          break;
        case ESwapLimitOrderStatus.FULFILLED:
          label = intl.formatMessage({
            id: ETranslations.Limit_order_status_filled,
          });
          color = '$textSuccess';
          break;
        case ESwapLimitOrderStatus.EXPIRED:
          label = intl.formatMessage({
            id: ETranslations.limit_order_expired,
          });
          color = '$textCaution';
          break;
        case ESwapLimitOrderStatus.PARTIALLY_FILLED:
          label = intl.formatMessage({
            id: ETranslations.Limit_order_history_status_partially_filled,
          });
          color = '$textSuccess';
          break;
        case ESwapLimitOrderStatus.PRESIGNATURE_PENDING:
          label = intl.formatMessage({
            id: ETranslations.Limit_order_status_open,
          });
          break;
        default:
          break;
      }
    }
    let sellPercentage = '0';
    if (kind === ESwapQuoteKind.SELL) {
      const fromAmountBN = new BigNumber(fromAmount ?? '0').shiftedBy(
        -(fromTokenInfo?.decimals ?? 0),
      );
      const executedSellAmountBN = new BigNumber(
        executedSellAmount ?? '0',
      ).shiftedBy(-(fromTokenInfo?.decimals ?? 0));

      sellPercentage = executedSellAmountBN
        .div(fromAmountBN)
        .multipliedBy(100)
        .toFixed(2);
    } else if (kind === ESwapQuoteKind.BUY) {
      const toAmountBN = new BigNumber(toAmount ?? '0').shiftedBy(
        -(toTokenInfo?.decimals ?? 0),
      );
      const executedBuyAmountBN = new BigNumber(
        executedBuyAmount ?? '0',
      ).shiftedBy(-(toTokenInfo?.decimals ?? 0));
      sellPercentage = executedBuyAmountBN
        .div(toAmountBN)
        .multipliedBy(100)
        .toFixed(2);
    }

    return (
      <YStack gap="$1.5" justifyContent="flex-start">
        <SizableText size="$bodySm" color="$textSubdued">
          {intl.formatMessage({ id: ETranslations.Limit_order_status })}
        </SizableText>
        <XStack gap="$2" alignItems="center">
          <SizableText size="$bodySm" color={color}>
            {label}
          </SizableText>
          <Progress
            w={progressWidth}
            h="$1"
            progressColor="$neutral5"
            indicatorColor="$textSuccess"
            value={Number(sellPercentage)}
          />
          <SizableText size="$bodySm" color="$textSubdued">
            {`${sellPercentage}%`}
          </SizableText>
        </XStack>
      </YStack>
    );
  }, [
    item,
    intl,
    progressWidth,
    fromAmount,
    fromTokenInfo?.decimals,
    toAmount,
    toTokenInfo?.decimals,
  ]);

  return (
    <YStack
      flex={1}
      userSelect="none"
      {...(!hiddenHoverBg && {
        hoverStyle: {
          bg: '$bgStrongHover',
        },
        pressStyle: {
          bg: '$bgStrongActive',
        },
      })}
      onPress={onPress ?? (() => {})}
      bg="$bgSubdued"
      p="$4"
      borderRadius="$3"
      gap="$3"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$2">
          {createdAtFormat}
          {tokenInfo()}
        </YStack>
        {!hiddenCancelIcon ? (
          <Badge
            px="$2"
            bg="$bgSubdued"
            borderRadius="$2.5"
            borderWidth={1}
            borderColor={cancelLoading ? '$borderActive' : '$borderSubdued'}
            onPress={(e: {
              stopPropagation?: () => void;
              preventDefault?: () => void;
            }) => {
              if (e) {
                e.stopPropagation?.();
                e.preventDefault?.();
              }
              onCancel?.();
            }}
            userSelect="none"
            hoverStyle={{
              bg: '$bgStrongHover',
            }}
            pressStyle={{
              bg: '$bgStrongActive',
            }}
          >
            {cancelLoading
              ? intl.formatMessage({
                  id: ETranslations.Limit_order_history_status_canceling,
                })
              : intl.formatMessage({ id: ETranslations.Limit_order_cancel })}
          </Badge>
        ) : null}
      </XStack>
      <Divider />
      <XStack gap="$3" flexWrap="wrap" justifyContent="flex-start">
        {renderLimitOrderPrice()}
        {expirationTitle}
        {renderLimitOrderStatus()}
      </XStack>
    </YStack>
  );
};

export default LimitOrderCard;
