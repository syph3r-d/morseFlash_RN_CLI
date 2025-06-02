import React, {useState, useMemo, useEffect} from 'react';
import {Button, Text, View, Platform} from 'react-native';
import NativeFlashlight from '../specs/NativeFlashlight';
import {TextInput, TouchableRipple} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {textToMorse} from '../utils';

interface FlashlightConstants {
  maxBrightnessLevel: number;
  defaultBrightnessLevel: number;
  isBrightnessControlSupported: boolean;
}

// Get constants from the native module
let flashlightConstants: FlashlightConstants;
try {
  const fetchedConstants = NativeFlashlight.getConstants ? NativeFlashlight.getConstants() : null;
  if (fetchedConstants && typeof fetchedConstants.maxBrightnessLevel === 'number' &&
      typeof fetchedConstants.defaultBrightnessLevel === 'number' &&
      typeof fetchedConstants.isBrightnessControlSupported === 'boolean') {
    flashlightConstants = fetchedConstants as FlashlightConstants;
  } else {
    flashlightConstants = {
      maxBrightnessLevel: 1,
      defaultBrightnessLevel: 1,
      isBrightnessControlSupported: false,
    };
  }
} catch (e) {
  console.error("Failed to get flashlight constants:", e);
  flashlightConstants = {
    maxBrightnessLevel: 1,
    defaultBrightnessLevel: 1,
    isBrightnessControlSupported: false,
  };
}

function Transmit({navigation}: any): React.JSX.Element {
  const [transmitting, setTransmitting] = useState(false);
  const [text, setText] = useState('');
  const [speed, setSpeed] = useState(200); // default dot duration in ms
  // Initialize brightness to a normalized default (e.g., 0.5 if supported, or 1.0 if not)
  const initialBrightness = flashlightConstants.isBrightnessControlSupported 
                            ? (flashlightConstants.defaultBrightnessLevel / flashlightConstants.maxBrightnessLevel) 
                            : 1.0;
  const [brightness, setBrightness] = useState(initialBrightness);

  const durations = useMemo(
    () => ({
      dot: speed,
      dash: speed * 3,
      symbolGap: speed,
      letterGap: speed * 3,
      wordGap: speed * 7,
    }),
    [speed],
  );

  // Apply brightness when the component mounts or when brightness changes and flashlight is on
  // This is a simplified effect; a more robust solution might track torch state.
  useEffect(() => {
    if (Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported) {
        // If we want to set brightness immediately even if torch is off, call this.
        // Or, only call if torch is known to be on.
        // For simplicity, let's call it. If brightness is 0 and torch is off, it should remain off.
        // If brightness > 0 and torch is off, it will turn on.
        NativeFlashlight.setBrightness(brightness);
    }
  }, [brightness]);

  async function flashMorse(morse: string) {
    setTransmitting(true);
    // Ensure brightness is applied before starting transmission if supported
    if (Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported) {
      NativeFlashlight.setBrightness(brightness > 0 ? brightness : 0.001); // Ensure it turns on if brightness was 0
    } else {
        NativeFlashlight.turnOn(); // Fallback for non-Android or unsupported
    }

    let delay = 0;
    const queue: [number, number][] = [];

    for (const char of morse) {
      switch (char) {
        case '.':
          // For the ON part of the morse code, brightness is handled by the initial setBrightness or turnOn call
          queue.push([delay, durations.dot]);
          delay += durations.dot + durations.symbolGap;
          break;
        case '-':
          queue.push([delay, durations.dash]);
          delay += durations.dash + durations.symbolGap;
          break;
        case ' ':
          delay += durations.wordGap;
          break;
      }
    }

    let isFlashOn = true; // Assume flash is on at the start of morse sequence
    if (Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported && brightness <= 0) {
        isFlashOn = false; // If initial brightness is 0, it should be off
    }

    for (const [onDelay, duration] of queue) {
      setTimeout(() => {
        if (Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported) {
            NativeFlashlight.setBrightness(brightness > 0 ? brightness : 0.001); // Ensure it's on with desired brightness
        } else {
            NativeFlashlight.turnOn();
        }
        isFlashOn = true;
      }, onDelay);
      setTimeout(() => {
        NativeFlashlight.turnOff(); // Turn off after each dot/dash
        isFlashOn = false;
      }, onDelay + duration);
    }

    setTimeout(() => {
      // Ensure flashlight is off at the very end, unless brightness is > 0 (meaning user wants it on)
      if (!(Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported && brightness > 0)) {
        NativeFlashlight.turnOff();
      }
      setTransmitting(false);
    }, delay + durations.dash + durations.symbolGap); // Add symbolGap to ensure last off is effective
  }

  const handleSendTextAsMorse = () => {
    const morse = textToMorse(text);
    flashMorse(morse);
  };

 const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    if (Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported) {
      NativeFlashlight.setBrightness(value);
    } else if (value > 0) {
        // For platforms without brightness control, or if not supported, turn on if value > 0
        NativeFlashlight.turnOn();
    } else {
        // If value is 0, turn off
        NativeFlashlight.turnOff();
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <TextInput
        label="Enter text"
        mode="outlined"
        style={{width: '80%', marginBottom: 20}}
        placeholder="Type here..."
        onChangeText={setText}
        value={text}
      />

      <Text style={{marginBottom: 10}}>Speed: {speed} ms per dot</Text>
      <Slider
        style={{width: '80%', height: 40}}
        minimumValue={100}
        maximumValue={600}
        step={50}
        value={speed}
        onValueChange={setSpeed}
        disabled={transmitting}
      />
      
      {Platform.OS === 'android' && flashlightConstants.isBrightnessControlSupported && (
        <>
          <Text style={{marginTop: 20, marginBottom: 10}}>
            Brightness: {Math.round(brightness * 100)}%
          </Text>
          <Slider
            style={{width: '80%', height: 40}}
            minimumValue={0} // 0% brightness
            maximumValue={1} // 100% brightness (will be mapped to maxLevel)
            step={0.01} // Finer control for brightness
            value={brightness}
            onValueChange={handleBrightnessChange} // Use the new handler
            disabled={transmitting}
          />
        </>
      )}

      <Button
        title={transmitting ? 'Transmitting...' : 'Send text as Morse'}
        onPress={handleSendTextAsMorse}
        disabled={transmitting}
        color={transmitting ? 'gray' : 'blue'}
      />

      <TouchableRipple
        className="mt-2"
        onPress={() => navigation.navigate('Receive')}
        disabled={transmitting}>
        <View
          className="p-2 bg-blue-500 rounded-md mt-4"
          style={{
            padding: 10,
            backgroundColor: transmitting ? 'gray' : 'blue',
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 20,
          }}>
          <Text style={{color: 'white'}}>{'Receive Morse Code'}</Text>
        </View>
      </TouchableRipple>
    </View>
  );
}

export default Transmit;
