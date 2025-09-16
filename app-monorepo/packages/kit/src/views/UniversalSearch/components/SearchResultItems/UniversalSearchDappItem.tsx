import { useCallback } from 'react';

import { StyleSheet } from 'react-native';

import { Icon, Image, Skeleton } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useUniversalSearchActions } from '@onekeyhq/kit/src/states/jotai/contexts/universalSearch';
import { isGoogleSearchItem } from '@onekeyhq/shared/src/consts/discovery';
import { EEnterMethod } from '@onekeyhq/shared/src/logger/scopes/discovery/scenes/dapp';
import type { IUniversalSearchDapp } from '@onekeyhq/shared/types/search';

import { useWebSiteHandler } from '../../../Discovery/hooks/useWebSiteHandler';

interface IUniversalSearchDappItemProps {
  item: IUniversalSearchDapp;
  getSearchInput: () => string;
}

export function UniversalSearchDappItem({
  item,
  getSearchInput,
}: IUniversalSearchDappItemProps) {
  const { name, dappId, logo } = item.payload;
  const isGoogle = isGoogleSearchItem(dappId);
  const handleWebSite = useWebSiteHandler();
  const universalSearchActions = useUniversalSearchActions();

  // Format text content based on display rules
  const formatDisplayText = useCallback((text: string): string => {
    // Short content (≤12 characters): show all
    if (text.length <= 12) {
      return text;
    }
    // Long content (>12 characters): show first 12 characters with ellipsis
    return `${text.substring(0, 12)}...`;
  }, []);

  // Extract main domain from URL and apply display rules
  const extractMainDomain = useCallback(
    (url: string): string => {
      try {
        // Remove protocol and www
        let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

        // Remove path, query, and fragment
        domain = domain.split('/')[0].split('?')[0].split('#')[0];

        // Apply display rules to domain
        return formatDisplayText(domain);
      } catch {
        return formatDisplayText(url);
      }
    },
    [formatDisplayText],
  );

  // Check if input is URL and process display text
  const processSearchInput = useCallback(
    (searchInput: string, fallbackText: string) => {
      const isUrl =
        searchInput.match(/^https?:\/\//) || searchInput.includes('.');

      // For display: use formatted text
      const displayText = isUrl
        ? extractMainDomain(searchInput)
        : formatDisplayText(fallbackText);

      // For auto-fill: use original full text
      const autoFillText = isUrl ? searchInput : fallbackText;

      return {
        isUrl,
        displayText,
        autoFillText,
        originalInput: searchInput,
      };
    },
    [extractMainDomain, formatDisplayText],
  );

  const handlePress = useCallback(() => {
    console.log('[universalSearch] renderItem: ', item);
    handleWebSite({
      dApp: isGoogle ? undefined : item.payload,
      // @ts-expect-error
      webSite: isGoogle
        ? {
            title: 'Google',
            url: getSearchInput(),
          }
        : undefined,
      enterMethod: EEnterMethod.search,
    });

    // Add to recent search list
    setTimeout(() => {
      const searchInput = getSearchInput();
      const { isUrl, displayText, autoFillText } = processSearchInput(
        searchInput,
        isGoogle ? searchInput : name,
      );

      if (isGoogle) {
        const encodedSearchInput = encodeURIComponent(searchInput);
        universalSearchActions.current.addIntoRecentSearchList({
          id: `dapp-google-search-${encodedSearchInput}`,
          text: displayText,
          type: item.type,
          timestamp: Date.now(),
          extra: {
            isGoogleSearch: 'true',
            searchQuery: searchInput,
            originalUrl: searchInput,
            autoFillText,
          },
        });
      } else {
        const recordId = isUrl
          ? `dapp-url-${encodeURIComponent(searchInput)}`
          : `dapp-${dappId}-${encodeURIComponent(name)}`;

        universalSearchActions.current.addIntoRecentSearchList({
          id: recordId,
          text: displayText,
          type: item.type,
          timestamp: Date.now(),
          extra: {
            dappId,
            dappName: name,
            dappUrl: item.payload.url || '',
            autoFillText,
            ...(isUrl
              ? {
                  isUrlSearch: 'true',
                  originalUrl: searchInput,
                }
              : {}),
          },
        });
      }
    }, 10);
  }, [
    getSearchInput,
    handleWebSite,
    isGoogle,
    item,
    name,
    dappId,
    universalSearchActions,
    processSearchInput,
  ]);

  return (
    <ListItem
      onPress={handlePress}
      renderAvatar={
        <Image
          size="$10"
          borderRadius="$2"
          borderWidth={StyleSheet.hairlineWidth}
          borderColor="$borderSubdued"
          source={{ uri: logo }}
          fallback={
            <Image.Fallback
              bg="$bgStrong"
              justifyContent="center"
              alignItems="center"
            >
              <Icon name="GlobusOutline" size="$10" />
            </Image.Fallback>
          }
        />
      }
      title={name}
      titleProps={{
        color: isGoogle ? '$textSubdued' : '$text',
      }}
    />
  );
}
