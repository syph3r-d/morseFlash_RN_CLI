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

export default function Receive() {
  const device = useCameraDevice('back');
  const [scanning, setScanning] = useState(false);
  const [morseCode, setMorseCode] = useState('');
  const [decoded, setDecoded] = useState('');
  const size = 50;

  const lastState = useRef<'on' | 'off'>('off');
  const lastChange = useRef(Date.now());
  const collected = useRef<string[]>([]);

  const THRESHOLD = 180;
  const DOT_DURATION = 200; // ms
  const DASH_DURATION = 600; // ms
  const CHAR_GAP = 1000; // ms

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

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet';
      frame.render();
      const centerX = frame.width / 2;
      const centerY = frame.height / 2;
      const rect = Skia.XYWHRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size,
      );

      const paint = Skia.Paint();
      paint.setColor(Skia.Color('red'));
      paint.setStyle(PaintStyle.Stroke); // Draw only the border
      paint.setStrokeWidth(4); // Adjust stroke width if needed

      frame.drawRect(rect, paint);
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

  const morseToText = (morse: string) => {
    const MORSE_TABLE = {
      '.-': 'A',
      '-...': 'B',
      '-.-.': 'C',
      '-..': 'D',
      '.': 'E',
      '..-.': 'F',
      '--.': 'G',
      '....': 'H',
      '..': 'I',
      '.---': 'J',
      '-.-': 'K',
      '.-..': 'L',
      '--': 'M',
      '-.': 'N',
      '---': 'O',
      '.--.': 'P',
      '--.-': 'Q',
      '.-.': 'R',
      '...': 'S',
      '-': 'T',
      '..-': 'U',
      '...-': 'V',
      '.--': 'W',
      '-..-': 'X',
      '-.--': 'Y',
      '--..': 'Z',
      '-----': '0',
      '.----': '1',
      '..---': '2',
      '...--': '3',
      '....-': '4',
      '.....': '5',
      '-....': '6',
      '--...': '7',
      '---..': '8',
      '----.': '9',
    };

    return morse
      .split(' ')
      .map(
        (code: string) => MORSE_TABLE[code as keyof typeof MORSE_TABLE] || '?',
      )
      .join('');
  };

  if (!device) {
    return <Text style={styles.text}>No camera device found</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

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
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'black'},
  camera: {flex: 1},
  text: {color: 'white', padding: 10, fontSize: 18},
});
