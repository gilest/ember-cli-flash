import Service from '@ember/service';
import FlashObject from '../flash/object.ts';
export interface MessageOptions {
    type: string;
    priority: number;
    timeout: number;
    sticky: boolean;
    showProgress: boolean;
    extendedTimeout: number;
    destroyOnClick: boolean;
    onDestroy: () => void;
    [key: string]: unknown;
}
export interface CustomMessageInfo extends Partial<MessageOptions> {
    message: string;
}
export interface FlashFunction {
    (message: string, options?: Partial<MessageOptions>): FlashMessagesService;
}
export default class FlashMessagesService extends Service {
    get isEmpty(): boolean;
    get _guids(): (string | undefined)[];
    get arrangedQueue(): FlashObject[];
    queue: FlashObject[];
    defaultPreventDuplicates: boolean;
    success: FlashFunction;
    warning: FlashFunction;
    info: FlashFunction;
    danger: FlashFunction;
    alert: FlashFunction;
    secondary: FlashFunction;
    constructor();
    add(options: CustomMessageInfo): this;
    clearMessages(): this;
    registerTypes(types?: string[]): this;
    peekFirst(): FlashObject | undefined;
    peekLast(): FlashObject | undefined;
    getFlashObject(): FlashObject;
    _newFlashMessage(options: CustomMessageInfo): FlashObject;
    _getOptionOrDefault(key: string, value: unknown): unknown;
    get flashMessageDefaults(): {
        timeout: number;
        extendedTimeout: number;
        priority: number;
        sticky: boolean;
        showProgress: boolean;
        type: string;
        types: string[];
        preventDuplicates: boolean;
    } & CustomMessageInfo;
    _setDefaults(): void;
    _registerType(type: string): void;
    _hasDuplicate(guid: string): boolean;
    _enqueue(flashInstance: FlashObject): FlashObject[] | undefined;
}
//# sourceMappingURL=flash-messages.d.ts.map