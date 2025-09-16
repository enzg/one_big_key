import { ETabRoutes } from '@onekeyhq/shared/src/routes';

import { MDUniversalSearchInput } from './UniversalSearchInput';

import type { ITabPageHeaderProp } from './type';

export function HeaderMDSearch({ sceneName, tabRoute }: ITabPageHeaderProp) {
  return tabRoute === ETabRoutes.Home || tabRoute === ETabRoutes.Market ? (
    <MDUniversalSearchInput />
  ) : null;
}
