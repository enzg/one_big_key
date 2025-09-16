import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import type { IStackStyle, IXStackProps } from '@onekeyhq/components';
import {
  IconButton,
  SearchBar,
  Shortcut,
  View,
  XStack,
  useIsHorizontalLayout,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { EModalRoutes } from '@onekeyhq/shared/src/routes';
import { EUniversalSearchPages } from '@onekeyhq/shared/src/routes/universalSearch';
import { EShortcutEvents } from '@onekeyhq/shared/src/shortcuts/shortcuts.enum';

import useAppNavigation from '../../hooks/useAppNavigation';

export function UniversalSearchInput({
  containerProps,
  size = 'large',
}: {
  containerProps?: IStackStyle;
  size?: 'large' | 'medium' | 'small';
}) {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const toUniversalSearchPage = useCallback(() => {
    navigation.pushModal(EModalRoutes.UniversalSearchModal, {
      screen: EUniversalSearchPages.UniversalSearch,
    });
  }, [navigation]);

  const isLarge = size === 'large';
  if (size === 'small') {
    return (
      <IconButton
        variant="tertiary"
        icon="SearchOutline"
        title={intl.formatMessage({
          id: ETranslations.global_search,
        })}
        onPress={toUniversalSearchPage}
      />
    );
  }
  return (
    <XStack
      $gtLg={{ maxWidth: 320 } as any}
      width="100%"
      {...(containerProps as IXStackProps)}
    >
      <SearchBar
        size={isLarge ? 'small' : 'medium'}
        key="searchInput"
        placeholder={intl.formatMessage({
          id: ETranslations.global_universal_search_placeholder,
        })}
        addOns={[
          {
            label: <Shortcut shortcutKey={EShortcutEvents.UniversalSearch} />,
          },
        ]}
      />
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        onPress={toUniversalSearchPage}
      />
    </XStack>
  );
}

export function MDUniversalSearchInput() {
  const isHorizontal = useIsHorizontalLayout();
  return isHorizontal ? null : (
    <XStack px="$5" pt="$0.5">
      <UniversalSearchInput
        size="medium"
        containerProps={{
          width: '100%',
          $gtLg: undefined,
        }}
      />
    </XStack>
  );
}
