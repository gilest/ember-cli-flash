/* eslint-disable ember/no-computed-properties-in-native-classes */
import { equal, sort, mapBy } from '@ember/object/computed';
import Service from '@ember/service';
import { typeOf, isNone } from '@ember/utils';
import { warn, assert } from '@ember/debug';
// import { computed } from '@ember/object';
import { classify } from '@ember/string';
import FlashObject from '../flash/object';
import objectWithout from '../utils/object-without';
import { getOwner } from '@ember/application';
import flashMessageOptions from '../utils/flash-message-options';
import getWithDefault from '../utils/get-with-default';
import { registerDestructor } from '@ember/destroyable';

function destructor(instance) {
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
  @(equal('queue.length', 0).readOnly()) readonly isEmpty: boolean;

  @(mapBy('queue', '_guid').readOnly()) _guids;

  @(sort('queue', function (a, b) {
    if (a.priority < b.priority) {
      return 1;
    } else if (a.priority > b.priority) {
      return -1;
    }
    return 0;
  }).readOnly())
  readonly arrangedQueue: FlashObject[];

  queue: FlashObject[] = [];
  defaultPreventDuplicates = false;

  // Default methods defined by flashMessageDefaults
  success: FlashFunction;
  warning: FlashFunction;
  info: FlashFunction;
  danger: FlashFunction;
  alert: FlashFunction;
  secondary: FlashFunction;

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
    return this.queue.at(0);
  }

  peekLast() {
    return this.queue.at(-1);
  }

  getFlashObject() {
    const errorText = 'A flash message must be added before it can be returned';
    const flashObject = this.peekLast();
    if (!flashObject) {
      throw new Error(errorText);
    }

    return flashObject;
  }

  _newFlashMessage(options: CustomMessageInfo) {
    assert(
      'The flash message cannot be empty when preventDuplicates is enabled.',
      this.defaultPreventDuplicates ? options.message : true,
    );
    assert(
      'The flash message cannot be empty when preventDuplicates is enabled.',
      options.preventDuplicates ? options.message : true,
    );

    const flashService = this;
    const allDefaults = getWithDefault(this, 'flashMessageDefaults', {});
    const defaults = objectWithout(allDefaults, ['types', 'preventDuplicates']);

    const flashMessageOptions = Object.assign({}, defaults, { flashService });

    for (let key in options) {
      const value = options[key];
      const option = this._getOptionOrDefault(key, value);

      flashMessageOptions[key] = option;
    }

    return FlashObject.create(flashMessageOptions);
  }

  _getOptionOrDefault(key, value) {
    const defaults = getWithDefault(this, 'flashMessageDefaults', {});
    const defaultOption = defaults[key];

    if (typeOf(value) === 'undefined') {
      return defaultOption;
    }

    return value;
  }

  // @computed
  get flashMessageDefaults() {
    const config = getOwner(this).resolveRegistration('config:environment');
    const overrides = getWithDefault(config, 'flashMessageDefaults', {});
    return flashMessageOptions(overrides);
  }

  _setDefaults() {
    const defaults = getWithDefault(this, 'flashMessageDefaults', {});

    for (let key in defaults) {
      const classifiedKey = classify(key);
      const defaultKey = `default${classifiedKey}`;
      this[defaultKey] = defaults[key];
    }

    this.registerTypes(getWithDefault(this, 'defaultTypes', []));
  }

  _registerType(type) {
    assert('The flash type cannot be undefined', type);

    this[type] = (message, options: CustomMessageInfo) => {
      const flashMessageOptions = Object.assign({}, options);
      flashMessageOptions.message = message;
      flashMessageOptions.type = type;

      return this.add(flashMessageOptions);
    };
  }

  _hasDuplicate(guid) {
    return this._guids.includes(guid);
  }

  _enqueue(flashInstance) {
    const instancePreventDuplicates = flashInstance.preventDuplicates;
    const preventDuplicates =
      typeof instancePreventDuplicates === 'boolean'
        ? // always prefer instance option over global option
          instancePreventDuplicates
        : this.defaultPreventDuplicates;

    if (preventDuplicates) {
      const guid = flashInstance._guid;

      if (this._hasDuplicate(guid)) {
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

    return this.queue.push(flashInstance);
  }
}
