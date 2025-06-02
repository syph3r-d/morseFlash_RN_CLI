import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  turnOn(): void;
  turnOff(): void;
  setBrightness(brightness: number): void; // 0.0 to 1.0
  getConstants(): {maxBrightnessLevel: number, defaultBrightnessLevel: number, isBrightnessControlSupported: boolean}; // Updated return type
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeFlashlight');
