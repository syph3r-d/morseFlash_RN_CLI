import React, {useState, useRef, useCallback} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {
  useCameraDevice,
  useFrameProcessor,
  Camera,
  Frame,
} from 'react-native-vision-camera';
import {Worklets} from 'react-native-worklets-core';
import SquareOverlay from '../components/SquareOverlay';
import {morseToText} from '../utils';

export default function Receive() {
  const device = useCameraDevice('back');
  const [scanning, setScanning] = useState(false);
  const [morseCode, setMorseCode] = useState('');
  const [decoded, setDecoded] = useState('');
  const size = 50;

  const lastState = useRef<'on' | 'off'>('off');
  const lastChange = useRef(Date.now());
  const durations = useRef<{type: 'on' | 'off'; duration: number}[]>([]);

  const THRESHOLD = 130;

  const reset = () => {
    durations.current = [];
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
      durations.current.push({type: lastState.current, duration});

      lastState.current = state;
      lastChange.current = now;
    }
  };

  const analyzeDurations = () => {
    const all = durations.current;

    const onDurations = all.filter(d => d.type === 'on').map(d => d.duration);
    if (onDurations.length === 0) return;

    const unit = Math.min(...onDurations);
    const dashThreshold = unit * 2.5;
    const charGapThreshold = unit * 3;
    const wordGapThreshold = unit * 4.5;

    const morse: string[] = [];
    let currentSymbol = '';

    for (const {type, duration} of all) {
      if (type === 'on') {
        currentSymbol += duration < dashThreshold ? '.' : '-';
      } else {
        if (duration < charGapThreshold) {
        } else if (duration < wordGapThreshold) {
          if (currentSymbol) {
            morse.push(currentSymbol);
            currentSymbol = '';
          }
        } else {
          if (currentSymbol) {
            morse.push(currentSymbol);
            currentSymbol = '';
          }
          morse.push('/');
        }
      }
    }

    if (currentSymbol) {
      morse.push(currentSymbol);
    }

    const morseStr = morse.join(' ');
    setMorseCode(morseStr);
    setDecoded(morseToText(morseStr));
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
            if (scanning) {
              analyzeDurations(); // Analyze when stopping
            } else {
              reset(); // Reset when starting
            }
            setScanning(s => !s);
          }}
        />
        <Text style={styles.text}>Morse: {morseCode}</Text>
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
