import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  turnOn(): void;
  turnOff(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeFlashlight');
