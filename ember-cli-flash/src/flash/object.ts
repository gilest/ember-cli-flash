import Evented from '@ember/object/evented';
import EmberObject from '@ember/object';
import { cancel, later } from '@ember/runloop';
import { tracked } from '@glimmer/tracking';
import FlashMessagesService from '../services/flash-messages.ts';
import type { EmberRunTimer } from '@ember/runloop/types';
import { guidFor } from '@ember/object/internals';

// Note:
// To avoid https://github.com/adopted-ember-addons/ember-cli-flash/issues/341 from happening, this class can't simply be called Object
export default class FlashObject extends EmberObject.extend(Evented) {
  declare flashService: FlashMessagesService;

  @tracked exiting = false;

  exitTimer = null;
  isExitable = true;
  initializedTime: number = new Date().getTime();

  exitTaskInstance?: EmberRunTimer;
  timerTaskInstance?: EmberRunTimer;

  declare extendedTimeout?: number;
  declare message: string;
  declare type: string;
  declare timeout?: number;
  declare priority: number;
  declare sticky: boolean;
  declare showProgress: boolean;
  declare destroyOnClick: boolean;
  declare preventDuplicates: boolean;
  declare onDestroy?: () => void;

  get _guid() {
    if (!this.message) return;

    return guidFor(this.message);
  }

  init() {
    if (this.sticky) {
      return;
    }
    this.timerTask();
  }

  willDestroy() {
    if (this.onDestroy) {
      this.onDestroy();
    }

    this._cancelTimer();
    this._cancelTimer('exitTaskInstance');
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
    this.trigger('didExitMessage');
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
      this.exitTaskInstance, exitTaskInstance;
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

  _cancelTimer(
    taskName: 'timerTaskInstance' | 'exitTaskInstance' = 'timerTaskInstance',
  ) {
    if (this[taskName]) {
      cancel(this[taskName]);
    }
  }

  _checkIfShouldExit() {
    if (this._getElapsedTime() >= (this.timeout ?? 0) && !this.sticky) {
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
    this.trigger('didDestroyMessage');
  }
}
