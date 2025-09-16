import { BaseScope } from '../../base/baseScope';
import { EScopeName } from '../../types';

import { ActionsScene } from './scenes/actions';
import { ChartScene } from './scenes/chart';
import { EnterScene } from './scenes/enter';
import { ListScene } from './scenes/list';
import { SwapScene } from './scenes/swap';
import { TradingViewScene } from './scenes/tradingview';
import { WatchlistScene } from './scenes/watchlist';

export class DexScope extends BaseScope {
  protected override scopeName = EScopeName.dex;

  enter = this.createScene('enter', EnterScene);

  list = this.createScene('list', ListScene);

  watchlist = this.createScene('watchlist', WatchlistScene);

  actions = this.createScene('actions', ActionsScene);

  swap = this.createScene('swap', SwapScene);

  chart = this.createScene('chart', ChartScene);

  tradingView = this.createScene('tradingView', TradingViewScene);
}

export * from './types';
