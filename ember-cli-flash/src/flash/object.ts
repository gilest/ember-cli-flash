import { cancel, later } from '@ember/runloop';
import { isTesting, macroCondition } from '@embroider/macros';
import { tracked } from '@glimmer/tracking';
import { guidFor } from '@ember/object/internals';
import { EmberRunTimer } from '@ember/runloop/types';
import type FlashMessagesService from '../services/flash-messages.ts';

// Disable timeout by default when running tests
const defaultDisableTimeout = macroCondition(isTesting()) ? true : false;

export default class FlashObject {
  @tracked exiting = false;
  @tracked message = '';
  sticky?: boolean;
  extendedTimeout?: number;
  timeout: number;
  priority: number;

  initializedTime: number;
  isExitable = true;
  isDestroyed = false;

  exitTaskInstance?: EmberRunTimer;
  timerTaskInstance?: EmberRunTimer;

  testHelperDisableTimeout?: boolean;
  flashService?: FlashMessagesService;

  onDestroy?: () => void;
  onDidExitMessage?: () => void;
  onDidDestroyMessage?: () => void;

  // testHelperDisableTimeout – Set by `disableTimeout` and `enableTimeout` in test-support.js

  get _disableTimeout() {
    return this.testHelperDisableTimeout ?? defaultDisableTimeout;
  }

  get _guid() {
    return guidFor(this.message?.toString());
  }

  constructor(messageOptions) {
    for (const [key, value] of Object.entries(messageOptions)) {
      this[key] = value;
    }

    if (this._disableTimeout || this.sticky) {
      return;
    }
    this.timerTask();
    this._setInitializedTime();
  }

  destroyMessage() {
    this._cancelTimer();
    if (this.exitTaskInstance) {
      cancel(this.exitTaskInstance);
      this._teardown();
    } else {
      this.exitTimerTask();
    }
  }

  exitMessage() {
    if (!this.isExitable) {
      return;
    }
    this.exitTimerTask();
    this.onDidExitMessage?.();
  }

  destroy() {
    this.onDestroy?.();

    this._cancelTimer();
    this._cancelTimer('exitTaskInstance');
    this.isDestroyed = true;
  }

  preventExit() {
    this.isExitable = false;
  }

  allowExit() {
    this.isExitable = true;
    this._checkIfShouldExit();
  }

  timerTask() {
    if (!this.timeout) {
      return;
    }
    const timerTaskInstance = later(() => {
      this.exitMessage();
    }, this.timeout);
    this.timerTaskInstance = timerTaskInstance;
  }

  exitTimerTask() {
    if (this.isDestroyed) {
      return;
    }
    this.exiting = true;
    if (this.extendedTimeout) {
      let exitTaskInstance = later(() => {
        this._teardown();
      }, this.extendedTimeout);
      this.exitTaskInstance = exitTaskInstance;
    } else {
      this._teardown();
    }
  }

  _setInitializedTime() {
    let currentTime = new Date().getTime();
    this.initializedTime = currentTime;

    return this.initializedTime;
  }

  _getElapsedTime() {
    let currentTime = new Date().getTime();

    return currentTime - this.initializedTime;
  }

  _cancelTimer(taskName = 'timerTaskInstance') {
    if (this[taskName]) {
      cancel(this[taskName]);
    }
  }

  _checkIfShouldExit() {
    if (this._getElapsedTime() >= this.timeout && !this.sticky) {
      this._cancelTimer();
      this.exitMessage();
    }
  }

  _teardown() {
    if (this.flashService?.queue) {
      this.flashService.queue = this.flashService.queue.filter(
        (flash) => flash !== this,
      );
    }
    this.destroy();
    this.onDidDestroyMessage?.();
  }
}
