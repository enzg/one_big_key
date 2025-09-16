import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

import { Spinner, Stack, Table, useMedia } from '@onekeyhq/components';
import type { ITableColumn } from '@onekeyhq/components';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { useMarketTokenColumns } from './hooks/useMarketTokenColumns';
import { useToDetailPage } from './hooks/useToDetailPage';
import { type IMarketToken } from './MarketTokenData';

const SPINNER_HEIGHT = 52;
const SORTABLE_COLUMNS = {
  liquidity: 'liquidity',
  marketCap: 'mc',
  turnover: 'v24hUSD',
} as const;

export type IMarketTokenListResult = {
  data: IMarketToken[];
  isLoading: boolean | undefined;
  isLoadingMore?: boolean;
  isNetworkSwitching?: boolean;
  canLoadMore?: boolean;
  loadMore?: () => void | Promise<void>;
  setSortBy: (sortBy: string | undefined) => void;
  setSortType: (sortType: 'asc' | 'desc' | undefined) => void;
};

type IMarketTokenListBaseProps = {
  networkId?: string;
  onItemPress?: (item: IMarketToken) => void;
  toolbar?: ReactNode;
  result: IMarketTokenListResult;
  isWatchlistMode?: boolean;
};

function MarketTokenListBase({
  networkId = 'sol--101',
  onItemPress,
  toolbar,
  result,
  isWatchlistMode = false,
}: IMarketTokenListBaseProps) {
  const toDetailPage = useToDetailPage();
  const { md } = useMedia();

  const marketTokenColumns = useMarketTokenColumns();

  const {
    data,
    isLoading,
    isLoadingMore,
    isNetworkSwitching,
    canLoadMore,
    loadMore,
    setSortBy,
    setSortType,
  } = result;

  // Listen to MarketWatchlistOnlyChanged event to update sort settings
  useEffect(() => {
    const handleWatchlistOnlyChanged = (payload: {
      showWatchlistOnly: boolean;
    }) => {
      if (payload.showWatchlistOnly && isWatchlistMode) {
        setSortBy(undefined);
        setSortType(undefined);
      } else if (!payload.showWatchlistOnly && !isWatchlistMode) {
        setSortBy('v24hUSD');
        setSortType('desc');
      }
    };

    // Register event listener
    appEventBus.on(
      EAppEventBusNames.MarketWatchlistOnlyChanged,
      handleWatchlistOnlyChanged,
    );

    // Cleanup event listener on unmount
    return () => {
      appEventBus.off(
        EAppEventBusNames.MarketWatchlistOnlyChanged,
        handleWatchlistOnlyChanged,
      );
    };
  }, [setSortBy, setSortType, isWatchlistMode]);

  const handleSortChange = useCallback(
    (sortBy: string, sortType: 'asc' | 'desc' | undefined) => {
      setSortBy(sortBy);
      setSortType(sortType);
    },
    [setSortBy, setSortType],
  );

  const handleHeaderRow = useCallback(
    (column: ITableColumn<IMarketToken>) => {
      // Sorting logic
      const sortKey =
        SORTABLE_COLUMNS[column.dataIndex as keyof typeof SORTABLE_COLUMNS];

      if (sortKey) {
        return {
          onSortTypeChange: (order: 'asc' | 'desc' | undefined) => {
            handleSortChange(sortKey, order);
          },
        };
      }

      return undefined;
    },
    [handleSortChange],
  );

  const handleEndReached = useCallback(() => {
    if (canLoadMore && loadMore && !isLoadingMore) {
      void loadMore();
    }
  }, [canLoadMore, loadMore, isLoadingMore]);

  // Show skeleton on initial load or network switching
  // Initial load: when there's no data yet
  // Network switching: when network is changing (provides better UX feedback)
  const showSkeleton =
    (Boolean(isLoading) && data.length === 0) || Boolean(isNetworkSwitching);

  const TableFooterComponent = useMemo(() => {
    return isLoadingMore ? (
      <Stack alignItems="center" justifyContent="center" py="$4">
        <Spinner size="small" />
      </Stack>
    ) : null;
  }, [isLoadingMore]);

  if (showSkeleton && platformEnv.isNativeAndroid) {
    return (
      <Stack flex={1} alignItems="center" justifyContent="center" py="$4">
        <Spinner size="small" />
      </Stack>
    );
  }

  return (
    <Stack flex={1} width="100%">
      {/* render custom toolbar if provided */}
      {toolbar ? (
        <Stack width="100%" mb="$3">
          {toolbar}
        </Stack>
      ) : null}

      {/* Table container with horizontal scroll support */}
      <Stack
        flex={1}
        className="normal-scrollbar"
        style={{
          paddingTop: 4,
          overflowX: 'auto',
          ...(md ? { marginLeft: 8, marginRight: 8 } : {}),
        }}
      >
        <Stack flex={1} minHeight={platformEnv.isNative ? undefined : 400}>
          {showSkeleton ? (
            <Table.Skeleton
              columns={marketTokenColumns}
              count={30}
              rowProps={{
                minHeight: '$14',
              }}
            />
          ) : (
            <Table<IMarketToken>
              // Add padding bottom to content container to provide space for loading spinner
              // Fix Android loading spinner visibility issue by ensuring proper content height
              contentContainerStyle={
                platformEnv.isNativeAndroid
                  ? {
                      paddingBottom: SPINNER_HEIGHT * 2,
                    }
                  : undefined
              }
              stickyHeader
              scrollEnabled
              columns={marketTokenColumns}
              onEndReached={handleEndReached}
              dataSource={data}
              keyExtractor={(item) =>
                `${item.address}${item.chainId ?? ''}${item.name ?? ''}${
                  item.networkId ?? ''
                }${item.symbol ?? ''}${item.tokenImageUri ?? ''}`
              }
              extraData={networkId}
              onHeaderRow={handleHeaderRow}
              TableFooterComponent={TableFooterComponent}
              estimatedItemSize="$14"
              onRow={
                onItemPress
                  ? (item) => ({
                      onPress: () => onItemPress(item),
                    })
                  : (item) => ({
                      onPress: () =>
                        toDetailPage({
                          symbol: item.symbol,
                          tokenAddress: item.address,
                          networkId: item.networkId,
                        }),
                    })
              }
            />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

export { MarketTokenListBase };
