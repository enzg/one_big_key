import { useMemo } from 'react';

import { Page, View, XStack, useSafeAreaInsets } from '@onekeyhq/components';
import { PageHeaderDivider } from '@onekeyhq/components/src/layouts/Page/PageHeader';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { HomeTokenListProviderMirror } from '../../views/Home/components/HomeTokenListProvider/HomeTokenListProviderMirror';

import { HeaderLeft } from './HeaderLeft';
import { HeaderMDSearch } from './HeaderMDSearch';
import { HeaderRight } from './HeaderRight';
import { HeaderTitle } from './HeaderTitle';

import type { ITabPageHeaderProp } from './type';

export function TabPageHeader({
  sceneName,
  tabRoute,
  customHeaderRightItems,
  customHeaderLeftItems,
  hideSearch = false,
}: ITabPageHeaderProp) {
  const { top } = useSafeAreaInsets();

  const headerRight = useMemo(() => {
    return (
      <HomeTokenListProviderMirror>
        <HeaderRight
          sceneName={sceneName}
          tabRoute={tabRoute}
          customHeaderRightItems={customHeaderRightItems}
        />
      </HomeTokenListProviderMirror>
    );
  }, [sceneName, tabRoute, customHeaderRightItems]);

  return (
    <>
      <Page.Header headerShown={false} />
      <XStack
        alignItems="center"
        justifyContent="space-between"
        px="$5"
        h="$11"
        {...(top || platformEnv.isNativeAndroid ? { mt: top || '$2' } : {})}
      >
        <View>
          <HeaderLeft
            sceneName={sceneName}
            tabRoute={tabRoute}
            customHeaderLeftItems={customHeaderLeftItems}
          />
        </View>
        <View>
          <HeaderTitle sceneName={sceneName} />
        </View>
        {headerRight}
      </XStack>

      {!hideSearch ? (
        <HeaderMDSearch tabRoute={tabRoute} sceneName={sceneName} />
      ) : null}

      <PageHeaderDivider mt="$3" />
    </>
  );
}
