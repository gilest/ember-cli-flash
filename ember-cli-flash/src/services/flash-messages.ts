import Service from '@ember/service';
import { typeOf, isNone } from '@ember/utils';
import { warn, assert } from '@ember/debug';
import { classify } from '@ember/string';
import FlashMessage from '../flash/object';
import objectWithout from '../utils/object-without';
import { getOwner } from '@ember/application';
import flashMessageOptions from '../utils/flash-message-options';
import { tracked } from '@glimmer/tracking';
import { registerDestructor } from '@ember/destroyable';

interface MessageOptions {
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

interface CustomMessageInfo extends Partial<MessageOptions> {
  message: string;
}

interface FlashFunction {
  (message: string, options?: Partial<MessageOptions>): FlashMessagesService;
}
// TODO define flash functions for each type

export default class FlashMessagesService extends Service {
  @tracked queue: FlashMessage[] = [];

  defaultPreventDuplicates = false;

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

  get isEmpty() {
    return this.queue.length === 0;
  }

  get _guids() {
    return this.queue.map((flash) => flash._guid);
  }

  constructor() {
    super(...arguments);
    this._setDefaults();

    registerDestructor(this, this.clearMessages.bind(this));
  }

  add(messageInfo: CustomMessageInfo) {
    this._enqueue(this._newFlashMessage(messageInfo));

    return this;
  }

  clearMessages() {
    if (isNone(this.queue)) {
      return this;
    }

    this.queue.forEach((flash) => flash.destroyMessage());
    this.queue = [];

    return this;
  }

  registerTypes(types: string[] = []) {
    types.forEach((type) => this._registerType(type));

    return this;
  }

  peekFirst(): FlashMessage | undefined {
    return this.queue[0];
  }

  peekLast(): FlashMessage | undefined {
    return this.queue[this.queue.length - 1];
  }

  getFlashObject(): FlashMessage | undefined {
    assert('A flash message must be added before it can be returned', this.queue.length);

    return this.peekLast();
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
    const defaults = objectWithout(this.flashMessageDefaults, [
      'types',
      'preventDuplicates',
    ]);

    const flashMessageOptions = Object.assign({}, defaults, { flashService });

    for (let key in options) {
      const value = options[key];
      const option = this._getOptionOrDefault(key, value);

      flashMessageOptions[key] = option;
    }

    return new FlashMessage(flashMessageOptions);
  }

  _getOptionOrDefault(key, value) {
    const defaults = this.flashMessageDefaults;
    const defaultOption = defaults[key];

    if (typeOf(value) === 'undefined') {
      return defaultOption;
    }

    return value;
  }

  get flashMessageDefaults() {
    const config = getOwner(this).resolveRegistration('config:environment');
    const overrides = config.flashMessageDefaults ?? {};
    return flashMessageOptions(overrides);
  }

  _setDefaults() {
    const defaults = this.flashMessageDefaults;

    for (let key in defaults) {
      const classifiedKey = classify(key);
      const defaultKey = `default${classifiedKey}`;

      this[defaultKey] = defaults[key];
    }

    this.registerTypes(this.defaultTypes ?? []);
  }

  _registerType(type: string) {
    assert('The flash type cannot be undefined', type);

    this[type] = (message: string, options = {}) => {
      return this.add({ ...options, message, type });
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

    this.queue = [...this.queue, flashInstance];
    return this.queue;
  }
}
