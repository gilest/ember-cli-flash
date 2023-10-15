import Evented from '@ember/object/evented';
import EmberObject from '@ember/object';
import FlashMessagesService from '../services/flash-messages.ts';
import type { EmberRunTimer } from "@ember/runloop/types";
declare const FlashObject_base: Readonly<typeof EmberObject> & (new (properties?: object | undefined) => Evented & EmberObject) & (new (...args: any[]) => Evented & EmberObject);
export default class FlashObject extends FlashObject_base {
    flashService: FlashMessagesService;
    exitTimer: null;
    exiting: boolean;
    isExitable: boolean;
    initializedTime: number;
    exitTaskInstance?: EmberRunTimer;
    timerTaskInstance?: EmberRunTimer;
    extendedTimeout?: number;
    message: string;
    type: string;
    timeout?: number;
    priority?: number;
    sticky: boolean;
    showProgress: boolean;
    destroyOnClick: boolean;
    preventDuplicates: boolean;
    onDestroy?: () => void;
    _guid: string;
    constructor();
    destroyMessage(): void;
    exitMessage(): void;
    preventExit(): void;
    allowExit(): void;
    timerTask(): void;
    exitTimerTask(): void;
    _getElapsedTime(): number;
    _cancelTimer(taskName?: 'timerTaskInstance' | 'exitTaskInstance'): void;
    _checkIfShouldExit(): void;
    _teardown(): void;
}
export {};
//# sourceMappingURL=object.d.ts.map