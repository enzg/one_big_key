import { useCallback, useMemo, useRef, useState } from 'react';

import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { useDebouncedCallback } from 'use-debounce';

import { Divider } from '../../content';
import { ListView } from '../../layouts';
import { SizableText, XStack, YStack } from '../../primitives';

import type { IListViewRef } from '../../layouts';
import type { IYStackProps } from '../../primitives';
import type { TabBarProps } from 'react-native-collapsible-tab-view';
import type { SharedValue } from 'react-native-reanimated';

export function TabBarItem({
  name,
  isFocused,
  onPress,
  tabItemStyle,
  focusedTabStyle,
}: {
  name: string;
  isFocused: boolean;
  onPress: (name: string) => void;
  tabItemStyle?: IYStackProps;
  focusedTabStyle?: IYStackProps;
}) {
  const handlePress = useCallback(() => {
    onPress(name);
  }, [name, onPress]);
  return (
    <YStack
      h={44}
      // minWidth={52}
      ai="center"
      jc="center"
      ml={20}
      key={name}
      cursor="pointer"
      onPress={handlePress}
      position="relative"
      {...tabItemStyle}
      {...(isFocused ? focusedTabStyle : undefined)}
    >
      <SizableText
        size="$bodyLgMedium"
        color={isFocused ? '$text' : '$textSubdued'}
      >
        {name}
      </SizableText>
      {isFocused ? (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          h="$0.5"
          bg="$text"
          borderRadius={1}
        />
      ) : null}
    </YStack>
  );
}

export interface ITabBarProps extends TabBarProps<string> {
  containerStyle?: IYStackProps;
  renderToolbar?: ({ focusedTab }: { focusedTab: string }) => React.ReactNode;
}

export function TabBar({
  onTabPress,
  tabNames,
  focusedTab,
  // eslint-disable-next-line react/prop-types
  renderToolbar,
  renderItem,
  divider = true,
  tabItemStyle,
  focusedTabStyle,
  // eslint-disable-next-line react/prop-types
  containerStyle,
  scrollable = false,
}: Omit<Partial<ITabBarProps>, 'focusedTab' | 'tabNames'> & {
  focusedTab: SharedValue<string>;
  tabNames: string[];
  onTabPress: (name: string) => void;
  divider?: boolean;
  tabItemStyle?: IYStackProps;
  focusedTabStyle?: IYStackProps;
  renderItem?: (
    props: {
      name: string;
      isFocused: boolean;
      onPress: (name: string) => void;
      tabItemStyle?: IYStackProps;
      focusedTabStyle?: IYStackProps;
    },
    index: number,
  ) => React.ReactNode;
  scrollable?: boolean;
}) {
  const [currentTab, setCurrentTab] = useState<string>(focusedTab.value);
  const listViewRef = useRef<IListViewRef<string>>(null);
  const listViewTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToTab = useCallback(
    (tabName: string) => {
      if (listViewTimerId.current) {
        clearTimeout(listViewTimerId.current);
      }
      if (listViewRef.current) {
        const index = tabNames.findIndex((name) => name === tabName);
        listViewTimerId.current = setTimeout(() => {
          listViewRef.current?.scrollToIndex({
            index: index < 3 ? 0 : index,
          });
        }, 100);
      }
    },
    [tabNames],
  );

  const debouncedScrollToTab = useDebouncedCallback(scrollToTab, 50);
  const debouncedSetCurrentTab = useDebouncedCallback(setCurrentTab, 50);
  useAnimatedReaction(
    () => focusedTab.value,
    (result, previous) => {
      if (result !== previous && previous) {
        runOnJS(debouncedSetCurrentTab)(result);
        if (scrollable && listViewRef.current) {
          runOnJS(debouncedScrollToTab)(result);
        }
      }
    },
  );
  const tabItems = useMemo(() => {
    return tabNames.map((name, index) =>
      renderItem ? (
        renderItem(
          {
            name,
            isFocused: currentTab === name,
            onPress: onTabPress,
            tabItemStyle,
            focusedTabStyle,
          },
          index,
        )
      ) : (
        <TabBarItem
          key={name}
          name={name}
          isFocused={currentTab === name}
          onPress={onTabPress}
          tabItemStyle={tabItemStyle}
          focusedTabStyle={focusedTabStyle}
        />
      ),
    );
  }, [
    currentTab,
    focusedTabStyle,
    onTabPress,
    renderItem,
    tabItemStyle,
    tabNames,
  ]);
  const content = useMemo(() => {
    if (scrollable) {
      return null;
    }
    return (
      <>
        <XStack ai="center" jc="space-between">
          <XStack>{tabItems}</XStack>
          {renderToolbar?.({ focusedTab: currentTab })}
        </XStack>
        {divider ? <Divider /> : null}
      </>
    );
  }, [currentTab, divider, renderToolbar, scrollable, tabItems]);

  const handleRenderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const name = item;
      return renderItem ? (
        renderItem(
          {
            name,
            isFocused: currentTab === name,
            onPress: onTabPress,
            tabItemStyle,
            focusedTabStyle,
          },
          index,
        )
      ) : (
        <TabBarItem
          key={name}
          name={name}
          isFocused={currentTab === name}
          onPress={onTabPress}
          tabItemStyle={tabItemStyle}
          focusedTabStyle={focusedTabStyle}
        />
      );
    },
    [currentTab, focusedTabStyle, onTabPress, renderItem, tabItemStyle],
  );

  return scrollable ? (
    <ListView
      data={tabNames}
      estimatedItemSize={44}
      ref={listViewRef}
      horizontal
      userSelect="none"
      bg="$bgApp"
      pr="$4"
      contentContainerStyle={{
        pr: 16,
      }}
      renderItem={handleRenderItem as any}
      position={'sticky' as any}
      top={0}
      zIndex={10}
      showsHorizontalScrollIndicator={false}
    />
  ) : (
    <YStack
      userSelect="none"
      cursor="pointer"
      pointerEvents="box-none"
      bg="$bgApp"
      className="onekey-tabs-header"
      position={'sticky' as any}
      top={0}
      zIndex={10}
      {...containerStyle}
    >
      {content}
    </YStack>
  );
}
