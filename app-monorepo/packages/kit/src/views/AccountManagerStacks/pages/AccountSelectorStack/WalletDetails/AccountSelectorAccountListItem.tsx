import { useCallback, useMemo } from 'react';

import type { IButtonProps } from '@onekeyhq/components';
import { IconButton, SizableText, Stack, XStack } from '@onekeyhq/components';
import { AccountAvatar } from '@onekeyhq/kit/src/components/AccountAvatar';
import { AccountSelectorCreateAddressButton } from '@onekeyhq/kit/src/components/AccountSelector/AccountSelectorCreateAddressButton';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import {
  useAccountSelectorActions,
  useActiveAccount,
} from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import type {
  IDBAccount,
  IDBDevice,
  IDBIndexedAccount,
  IDBWallet,
} from '@onekeyhq/kit-bg/src/dbs/local/types';
import type {
  IAccountSelectorAccountsListSectionData,
  IAccountSelectorSelectedAccount,
} from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAccountSelector';
import { useIndexedAccountAddressCreationStateAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';

import { AccountEditButton } from '../../../components/AccountEdit';

import { AccountAddress } from './AccountAddress';
import { AccountValueWithSpotlight } from './AccountValue';

function PlusButton({ onPress, loading }: IButtonProps) {
  return (
    <IconButton
      borderWidth={0}
      borderRadius="$2"
      variant="tertiary"
      size="medium"
      loading={loading}
      onPress={onPress}
      icon="PlusSmallOutline"
    />
  );
}

export function AccountSelectorAccountListItem({
  num,
  linkedNetworkId,
  item,
  section,
  index,
  isOthersUniversal,
  selectedAccount,
  accountsValue,
  linkNetwork,
  allowSelectEmptyAccount,
  editable,
  accountsCount,
  focusedWalletInfo,
  mergeDeriveAssetsEnabled,
  hideAddress,
}: {
  num: number;
  linkedNetworkId: string | undefined;
  item: IDBIndexedAccount | IDBAccount;
  section: IAccountSelectorAccountsListSectionData;
  index: number;
  isOthersUniversal: boolean;
  selectedAccount: IAccountSelectorSelectedAccount;
  accountsValue: {
    accountId: string;
    value: Record<string, string> | string | undefined;
    currency: string | undefined;
  }[];
  linkNetwork: boolean | undefined;
  allowSelectEmptyAccount: boolean | undefined;
  editable: boolean;
  accountsCount: number;
  focusedWalletInfo:
    | {
        wallet: IDBWallet;
        device: IDBDevice | undefined;
      }
    | undefined;
  mergeDeriveAssetsEnabled: boolean | undefined;
  hideAddress?: boolean;
}) {
  const actions = useAccountSelectorActions();
  const navigation = useAppNavigation();
  const {
    activeAccount: { network },
  } = useActiveAccount({
    num,
  });

  const [addressCreationState] = useIndexedAccountAddressCreationStateAtom();

  const account = useMemo(
    () => (isOthersUniversal ? (item as IDBAccount) : undefined),
    [isOthersUniversal, item],
  );
  const indexedAccount = useMemo(
    () => (isOthersUniversal ? undefined : (item as IDBIndexedAccount)),
    [isOthersUniversal, item],
  );

  const isCreatingAddress = useMemo(
    () =>
      Boolean(
        addressCreationState?.indexedAccountId === indexedAccount?.id &&
          addressCreationState?.walletId === focusedWalletInfo?.wallet?.id,
      ),
    [
      addressCreationState?.indexedAccountId,
      addressCreationState?.walletId,
      focusedWalletInfo?.wallet?.id,
      indexedAccount?.id,
    ],
  );

  const buildSubTitleInfo = useCallback((): {
    linkedNetworkId: string | undefined;
    address: string;
    isEmptyAddress: boolean;
    hideAddress?: boolean;
  } => {
    let address: string | undefined;
    let allowEmptyAddress = false;
    if (isOthersUniversal) {
      address = account?.address;
    } else {
      const associateAccount = indexedAccount?.associateAccount;
      address = associateAccount?.address;

      if (
        associateAccount?.addressDetail?.isValid &&
        associateAccount?.addressDetail?.normalizedAddress
      ) {
        allowEmptyAddress = true;
      }
    }
    if (
      !address &&
      !isOthersUniversal &&
      linkedNetworkId &&
      !allowEmptyAddress
    ) {
      // TODO custom style
      return {
        linkedNetworkId,
        address: '',
        isEmptyAddress: true,
      };
    }
    return {
      linkedNetworkId: undefined,
      address: address
        ? accountUtils.shortenAddress({
            address,
          })
        : '',
      isEmptyAddress: false,
      hideAddress: isOthersUniversal ? false : hideAddress,
    };
  }, [
    account?.address,
    indexedAccount?.associateAccount,
    isOthersUniversal,
    linkedNetworkId,
    hideAddress,
  ]);

  const subTitleInfo = useMemo(() => buildSubTitleInfo(), [buildSubTitleInfo]);

  // TODO performance
  const accountValue = useMemo(
    () => accountsValue?.find((i) => i.accountId === item.id),
    [accountsValue, item.id],
  );

  const shouldShowCreateAddressButton = useMemo(
    () => !!(linkNetwork && subTitleInfo.isEmptyAddress),
    [linkNetwork, subTitleInfo.isEmptyAddress],
  );

  const actionButton = useMemo(() => {
    if (isCreatingAddress) {
      return null;
    }
    if (editable) {
      return (
        <AccountEditButton
          accountsCount={accountsCount}
          indexedAccount={indexedAccount}
          firstIndexedAccount={
            isOthersUniversal
              ? undefined
              : (section?.firstAccount as IDBIndexedAccount)
          }
          account={account}
          firstAccount={
            isOthersUniversal
              ? (section?.firstAccount as IDBAccount)
              : undefined
          }
          wallet={focusedWalletInfo?.wallet}
          networkId={linkedNetworkId ?? network?.id}
        />
      );
    }
    if (shouldShowCreateAddressButton) {
      return (
        <AccountSelectorCreateAddressButton
          num={num}
          selectAfterCreate
          account={{
            walletId: focusedWalletInfo?.wallet?.id,
            networkId: linkedNetworkId,
            indexedAccountId: indexedAccount?.id,
            deriveType: selectedAccount.deriveType,
          }}
          buttonRender={PlusButton}
        />
      );
    }
    return null;
  }, [
    isCreatingAddress,
    editable,
    shouldShowCreateAddressButton,
    accountsCount,
    indexedAccount,
    isOthersUniversal,
    section?.firstAccount,
    account,
    focusedWalletInfo?.wallet,
    linkedNetworkId,
    network?.id,
    num,
    selectedAccount.deriveType,
  ]);

  const isSelected = useMemo(() => {
    if (isOthersUniversal) {
      return selectedAccount.othersWalletAccountId === item.id;
    }
    return selectedAccount.indexedAccountId === item.id;
  }, [
    isOthersUniversal,
    selectedAccount.othersWalletAccountId,
    selectedAccount.indexedAccountId,
    item.id,
  ]);

  const avatarNetworkId: string | undefined = useMemo(() => {
    let _avatarNetworkId: string | undefined;
    if (isOthersUniversal && account) {
      _avatarNetworkId = accountUtils.getAccountCompatibleNetwork({
        account,
        networkId: linkNetwork
          ? selectedAccount?.networkId
          : account.createAtNetwork,
      });
    }
    if (!_avatarNetworkId && indexedAccount && linkNetwork) {
      _avatarNetworkId = selectedAccount?.networkId;
    }
    return _avatarNetworkId;
  }, [
    account,
    indexedAccount,
    isOthersUniversal,
    linkNetwork,
    selectedAccount?.networkId,
  ]);

  const canConfirmAccountSelectPress = useMemo(
    () => allowSelectEmptyAccount || !shouldShowCreateAddressButton,
    [allowSelectEmptyAccount, shouldShowCreateAddressButton],
  );

  const renderAccountValue = useCallback(() => {
    if (platformEnv.isE2E || (linkNetwork && !subTitleInfo.address))
      return null;

    return (
      <>
        <AccountValueWithSpotlight
          isOthersUniversal={isOthersUniversal}
          index={index}
          accountValue={accountValue}
          indexedAccountId={indexedAccount?.id}
          linkedAccountId={indexedAccount?.associateAccount?.id ?? item.id}
          linkedNetworkId={avatarNetworkId ?? network?.id}
          mergeDeriveAssetsEnabled={mergeDeriveAssetsEnabled}
        />
        {subTitleInfo.address && !subTitleInfo.hideAddress ? (
          <Stack
            mx="$1.5"
            w="$1"
            h="$1"
            bg="$iconSubdued"
            borderRadius="$full"
          />
        ) : null}
      </>
    );
  }, [
    linkNetwork,
    subTitleInfo.address,
    subTitleInfo.hideAddress,
    isOthersUniversal,
    index,
    accountValue,
    indexedAccount?.id,
    indexedAccount?.associateAccount?.id,
    item.id,
    avatarNetworkId,
    network?.id,
    mergeDeriveAssetsEnabled,
  ]);

  return (
    <Stack>
      <ListItem
        testID={`account-item-index-${index}`}
        key={item.id}
        renderAvatar={
          <AccountAvatar
            loading={<AccountAvatar.Loading w="$8" h="$8" />}
            size="medium"
            indexedAccount={indexedAccount}
            account={account as any}
            networkId={avatarNetworkId}
          />
        }
        renderItemText={(textProps) => (
          <ListItem.Text
            {...textProps}
            flex={1}
            pr="$8"
            primary={
              <SizableText size="$bodyLg" numberOfLines={1}>
                {item.name}
              </SizableText>
            }
            secondary={
              <XStack
                key={`${focusedWalletInfo?.wallet?.id || ''}-${item.id}-${
                  subTitleInfo.address
                }`}
                alignItems="center"
              >
                {renderAccountValue()}
                <AccountAddress
                  num={num}
                  linkedNetworkId={subTitleInfo.linkedNetworkId}
                  address={accountUtils.shortenAddress({
                    address: subTitleInfo.address,
                    leadingLength: 6,
                    trailingLength: 4,
                  })}
                  isEmptyAddress={subTitleInfo.isEmptyAddress}
                  hideAddress={subTitleInfo.hideAddress}
                />
              </XStack>
            }
          />
        )}
        {...(canConfirmAccountSelectPress && {
          onPress: async () => {
            // show CreateAddress Button here, disabled confirmAccountSelect()
            if (!allowSelectEmptyAccount && shouldShowCreateAddressButton) {
              return;
            }
            if (isOthersUniversal) {
              let autoChangeToAccountMatchedNetworkId = avatarNetworkId;
              if (
                selectedAccount?.networkId &&
                networkUtils.isAllNetwork({
                  networkId: selectedAccount?.networkId,
                })
              ) {
                autoChangeToAccountMatchedNetworkId =
                  selectedAccount?.networkId;
              }
              await actions.current.confirmAccountSelect({
                num,
                indexedAccount: undefined,
                othersWalletAccount: account,
                autoChangeToAccountMatchedNetworkId,
              });
            } else if (focusedWalletInfo) {
              await actions.current.confirmAccountSelect({
                num,
                indexedAccount,
                othersWalletAccount: undefined,
                autoChangeToAccountMatchedNetworkId: undefined,
              });
            }
            navigation.popStack();
          },
          isLoading: isCreatingAddress,
          userSelect: 'none',
        })}
        {...(isSelected && {
          bg: '$bgActive',
        })}
      />
      {isCreatingAddress ? null : (
        /* The value of top should be change if the height of the item is changed, since we can not use percentage value in translateY for keeping the Icon central aligned in React Native */
        <Stack position="absolute" right="$5" top={18}>
          {actionButton}
        </Stack>
      )}
    </Stack>
  );
}
