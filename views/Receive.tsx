import {PaintStyle, Skia} from '@shopify/react-native-skia';
import React, {useRef, useState, useCallback} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {runOnJS} from 'react-native-reanimated';
import {
  Frame,
  useCameraDevice,
  useFrameProcessor,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {Camera} from 'react-native-vision-camera';
import {Worklets} from 'react-native-worklets-core';
import {morseToText} from '../utils';
import SquareOverlay from '../components/SquareOverlay';

export default function Receive() {
  const device = useCameraDevice('back');
  const [scanning, setScanning] = useState(false);
  const [morseCode, setMorseCode] = useState('');
  const [decoded, setDecoded] = useState('');
  const size = 50;

  const lastState = useRef<'on' | 'off'>('off');
  const lastChange = useRef(Date.now());
  const collected = useRef<string[]>([]);

  const THRESHOLD = 130;
  const DOT_DURATION = 230; // ms
  const DASH_DURATION = 300; // ms
  const CHAR_GAP = 700; // ms

  const reset = () => {
    collected.current = [];
    lastState.current = 'off';
    lastChange.current = Date.now();
    setMorseCode('');
    setDecoded('');
  };

  const reportBrightness = (brightness: number) => {
    if (!scanning) return;

    const now = Date.now();
    const state = brightness > THRESHOLD ? 'on' : 'off';

    if (state !== lastState.current) {
      const duration = now - lastChange.current;

      if (lastState.current === 'on') {
        if (duration < DOT_DURATION) {
          collected.current.push('.'); // too short, but treat as dot
        } else if (duration < DASH_DURATION) {
          collected.current.push('.');
        } else {
          collected.current.push('-');
        }
      } else {
        console.log(`Duration: ${duration}`);
        if (duration > CHAR_GAP) {
          collected.current.push(' '); // space between characters
        }
      }

      lastState.current = state;
      lastChange.current = now;

      setMorseCode(collected.current.join(''));
    }
  };
  const myFunctionJS = Worklets.createRunOnJS(reportBrightness);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (frame.pixelFormat === 'yuv') {
        processYUV(frame);
      } else {
        processRGB(frame);
      }

      function processYUV(frame: Frame) {
        const width = frame.width;
        const height = frame.height;
        const buffer = new Uint8Array(frame.toArrayBuffer());

        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const half = Math.floor(size / 2);
        const startX = centerX - half;
        const startY = centerY - half;

        const sigma = size / 3;
        let weightedBrightness = 0;
        let totalWeight = 0;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const frameX = startX + x;
            const frameY = startY + y;
            const idx = frameY * width + frameX;
            const lum = buffer[idx];

            const dx = x - size / 2;
            const dy = y - size / 2;
            const distSq = dx * dx + dy * dy;
            const weight = Math.exp(-distSq / (2 * sigma * sigma));

            weightedBrightness += lum * weight;
            totalWeight += weight;
          }
        }

        const brightness = weightedBrightness / totalWeight;
        myFunctionJS(brightness);
      }

      function processRGB(frame: Frame) {
        const width = frame.width;
        const height = frame.height;
        const buffer = new Uint8Array(frame.toArrayBuffer());

        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const half = Math.floor(size / 2);
        const startX = centerX - half;
        const startY = centerY - half;

        const sigma = size / 3;
        let weightedBrightness = 0;
        let totalWeight = 0;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const frameX = startX + x;
            const frameY = startY + y;
            const idx = (frameY * width + frameX) * 4;

            const r = buffer[idx];
            const g = buffer[idx + 1];
            const b = buffer[idx + 2];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            const dx = x - size / 2;
            const dy = y - size / 2;
            const distSq = dx * dx + dy * dy;
            const weight = Math.exp(-distSq / (2 * sigma * sigma));

            weightedBrightness += lum * weight;
            totalWeight += weight;
          }
        }

        const brightness = weightedBrightness / totalWeight;
        myFunctionJS(brightness);
      }
    },
    [scanning],
  );

  const decodeMorse = useCallback(() => {
    const morse = collected.current.join('');
    setDecoded(morseToText(morse));
  }, []);

  if (!device) {
    return <Text style={styles.text}>No camera device found</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraView}>
        <Camera
          style={styles.camera}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
        />
        <SquareOverlay SquareSize={size} />
      </View>

      <View style={styles.buttons}>
        <Button
          title={scanning ? 'Stop Scan' : 'Start Scan'}
          onPress={() => {
            if (!scanning) {
              reset();
            }
            setScanning(s => !s);
          }}
        />

        <Text style={styles.text}>Morse: {morseCode}</Text>
        <Button title="Decode" onPress={decodeMorse} />
        <Text style={styles.text}>Decoded: {decoded}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'black'},
  camera: {flex: 1},
  text: {color: 'white', padding: 10, fontSize: 18},
  cameraView: {position: 'relative', flex: 4},
  buttons: {
    flex: 1,
  },
});
