import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';
import { typeOf, isNone } from '@ember/utils';
import { warn, assert } from '@ember/debug';
import { classify } from '@ember/string';
import FlashObject from '../flash/object.ts';
import { getOwner } from '@ember/owner';
import flashMessageOptions from '../utils/flash-message-options.ts';
import { registerDestructor } from '@ember/destroyable';

function destructor(instance: FlashMessagesService) {
  instance.clearMessages();
}

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
  get isEmpty() {
    return this.queue.length === 0;
  }

  get _guids() {
    return this.queue.map((flash) => flash._guid);
  }

  get arrangedQueue() {
    return this.queue.sort(function (a, b) {
      if (a.priority < b.priority) {
        return 1;
      } else if (a.priority > b.priority) {
        return -1;
      }
      return 0;
    });
  }

  @tracked queue: FlashObject[] = [];

  // Set by _setDefaults
  declare defaultTimeout: number;
  declare defaultExtendedTimeout: number;
  declare defaultPriority: number;
  declare defaultSticky: boolean;
  declare defaultShowProgress: boolean;
  declare defaultType: string;
  declare defaultTypes: [];
  declare defaultPreventDuplicates: boolean;

  // Default methods set by _registerType
  // Not sure if it's possible to make these dynamic
  declare success: FlashFunction;
  declare warning: FlashFunction;
  declare info: FlashFunction;
  declare danger: FlashFunction;
  declare alert: FlashFunction;
  declare secondary: FlashFunction;

  constructor() {
    super(...arguments);
    this._setDefaults();

    registerDestructor(this, destructor);
  }

  add(options: CustomMessageInfo) {
    this._enqueue(this._newFlashMessage(options));

    return this;
  }

  clearMessages() {
    const flashes = this.queue;

    if (isNone(flashes)) {
      return this;
    }

    flashes.forEach((flash) => flash.destroyMessage());
    this.queue = [];

    return this;
  }

  registerTypes(types: string[] = []) {
    types.forEach((type) => this._registerType(type));

    return this;
  }

  peekFirst() {
    return this.queue[0];
  }

  peekLast() {
    return this.queue[this.queue.length - 1];
  }

  getFlashObject() {
    const errorText = 'A flash message must be added before it can be returned';
    const flashObject = this.peekLast();
    if (!flashObject) {
      throw new Error(errorText);
    }

    return flashObject;
  }

  _newFlashMessage(options: CustomMessageInfo): FlashObject {
    assert(
      'The flash message cannot be empty when preventDuplicates is enabled.',
      this.defaultPreventDuplicates ? options.message : true,
    );
    assert(
      'The flash message cannot be empty when preventDuplicates is enabled.',
      options['preventDuplicates'] ? options.message : true,
    );

    const flashService = this;
    const allDefaults = this.flashMessageDefaults ?? {};
    const defaults = {
      ...allDefaults,
      types: undefined,
      preventDuplicates: undefined,
    };

    const flashMessageOptions = Object.assign({}, defaults, { flashService });

    for (let key in options) {
      const value = options[key];
      const option = this._getOptionOrDefault(key, value);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      flashMessageOptions[key] = option;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return FlashObject.create(flashMessageOptions);
  }

  _getOptionOrDefault(key: string, value: unknown) {
    const defaults = this.flashMessageDefaults ?? {};
    const defaultOption = defaults[key];

    if (typeOf(value) === 'undefined') {
      return defaultOption;
    }

    return value;
  }

  get flashMessageDefaults() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const config = getOwner(this).resolveRegistration('config:environment');
    const overrides = config.flashMessageDefaults ?? {};
    return flashMessageOptions(overrides);
  }

  _setDefaults() {
    const defaults = this.flashMessageDefaults ?? {};

    for (let key in defaults) {
      const classifiedKey = classify(key);
      const defaultKey = `default${classifiedKey}`;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this[defaultKey] = defaults[key];
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.registerTypes(this.defaultTypes ?? []);
  }

  _registerType(type: string) {
    assert('The flash type cannot be undefined', type);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this[type] = (message: string, options: CustomMessageInfo) => {
      const flashMessageOptions = Object.assign({}, options);
      flashMessageOptions.message = message;
      flashMessageOptions.type = type;

      return this.add(flashMessageOptions);
    };
  }

  _hasDuplicate(guid: string) {
    return this._guids.includes(guid);
  }

  _enqueue(flashInstance: FlashObject) {
    const instancePreventDuplicates = flashInstance.preventDuplicates;
    const preventDuplicates =
      typeof instancePreventDuplicates === 'boolean'
        ? // always prefer instance option over global option
          instancePreventDuplicates
        : this.defaultPreventDuplicates;

    if (preventDuplicates) {
      const guid = flashInstance._guid;

      if (guid && this._hasDuplicate(guid)) {
        warn(
          'Attempting to add a duplicate message to the Flash Messages Service',
          false,
          {
            id: 'ember-cli-flash.duplicate-message',
          },
        );
        return;
      }
    }

    this.queue = [...this.queue, flashInstance];
    return this.queue;
  }
}
