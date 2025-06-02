import React, {useState, useRef, useCallback} from 'react';
import {View, Text, Button, StyleSheet, Dimensions} from 'react-native';
import {
  useCameraDevice,
  useFrameProcessor,
  Camera,
  Frame,
} from 'react-native-vision-camera';
import {Worklets, useSharedValue} from 'react-native-worklets-core';
import SquareOverlay from '../components/SquareOverlay';
import {morseToText} from '../utils';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

export default function Receive() {
  const device = useCameraDevice('back');
  const [scanning, setScanning] = useState(false);
  const [morseCode, setMorseCode] = useState('');
  const [decoded, setDecoded] = useState('');

  // Shared values for the region of interest (ROI)
  const roiX = useSharedValue(screenWidth / 2 - 50); // Initial X of ROI
  const roiY = useSharedValue(screenHeight / 2 - 50); // Initial Y of ROI
  const roiSize = useSharedValue(100); // Initial size of ROI

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

  const reportBrightness = Worklets.createRunOnJS((brightness: number) => {
    if (!scanning) return;

    const now = Date.now();
    const state = brightness > THRESHOLD ? 'on' : 'off';

    if (state !== lastState.current) {
      const duration = now - lastChange.current;
      durations.current.push({type: lastState.current, duration});

      lastState.current = state;
      lastChange.current = now;
    }
  });

  const analyzeDurations = () => {
    const all = durations.current;
    const onDurations = all.filter(d => d.type === 'on').map(d => d.duration);
    if (onDurations.length === 0) return;

    const unit = Math.min(...onDurations);
    const dashThreshold = unit * 2.5;
    const charGapThreshold = unit * 1.5;
    const wordGapThreshold = unit * 3.5;

    const morse: string[] = [];
    let currentSymbol = '';

    for (const {type, duration} of all) {
      if (type === 'on') {
        currentSymbol += duration < dashThreshold ? '.' : '-';
      } else {
        if (duration < charGapThreshold) {
          // ignore
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

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      // Get the current ROI values. These are shared values updated by SquareOverlay
      const currentRoiX = roiX.value;
      const currentRoiY = roiY.value;
      const currentRoiSize = roiSize.value;

      // Ensure ROI is within frame boundaries - adjust if necessary
      const clampedRoiX = Math.max(0, Math.min(currentRoiX, frame.width - currentRoiSize));
      const clampedRoiY = Math.max(0, Math.min(currentRoiY, frame.height - currentRoiSize));
      const clampedRoiSize = Math.min(currentRoiSize, frame.width - clampedRoiX, frame.height - clampedRoiY);


      if (frame.pixelFormat === 'yuv') {
        processYUV(frame, clampedRoiX, clampedRoiY, clampedRoiSize);
      } else {
        processRGB(frame, clampedRoiX, clampedRoiY, clampedRoiSize);
      }

      function processYUV(f: Frame, xRegion: number, yRegion: number, sizeRegion: number) {
        const width = f.width;
        // const height = f.height; // Unused
        const buffer = new Uint8Array(f.toArrayBuffer());

        const startX = Math.floor(xRegion);
        const startY = Math.floor(yRegion);
        const regionSize = Math.floor(sizeRegion);

        if (regionSize <= 0) {
            reportBrightness(0); // Or some default value
            return;
        }

        const sigma = regionSize / 3;
        let weightedBrightness = 0;
        let totalWeight = 0;

        for (let y = 0; y < regionSize; y++) {
          for (let x = 0; x < regionSize; x++) {
            const frameX = startX + x;
            const frameY = startY + y;
            // Boundary checks for frameX and frameY are implicitly handled by clampedRoi
            const idx = frameY * width + frameX;
            const lum = buffer[idx];

            const dx = x - regionSize / 2;
            const dy = y - regionSize / 2;
            const distSq = dx * dx + dy * dy;
            const weight = Math.exp(-distSq / (2 * sigma * sigma));

            weightedBrightness += lum * weight;
            totalWeight += weight;
          }
        }
        const brightness = totalWeight > 0 ? weightedBrightness / totalWeight : 0;
        reportBrightness(brightness);
      }

      function processRGB(f: Frame, xRegion: number, yRegion: number, sizeRegion: number) {
        const width = f.width;
        // const height = f.height; // Unused
        const buffer = new Uint8Array(f.toArrayBuffer());

        const startX = Math.floor(xRegion);
        const startY = Math.floor(yRegion);
        const regionSize = Math.floor(sizeRegion);

        if (regionSize <= 0) {
            reportBrightness(0); // Or some default value
            return;
        }

        const sigma = regionSize / 3;
        let weightedBrightness = 0;
        let totalWeight = 0;

        for (let y = 0; y < regionSize; y++) {
          for (let x = 0; x < regionSize; x++) {
            const frameX = startX + x;
            const frameY = startY + y;
            // Boundary checks for frameX and frameY are implicitly handled by clampedRoi
            const idx = (frameY * width + frameX) * 4;

            const r = buffer[idx];
            const g = buffer[idx + 1];
            const b = buffer[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            const dx = x - regionSize / 2;
            const dy = y - regionSize / 2;
            const distSq = dx * dx + dy * dy;
            const weight = Math.exp(-distSq / (2 * sigma * sigma));

            weightedBrightness += lum * weight;
            totalWeight += weight;
          }
        }
        const brightness = totalWeight > 0 ? weightedBrightness / totalWeight : 0;
        reportBrightness(brightness);
      }
    },
    [scanning, roiX, roiY, roiSize], // Add ROI shared values to dependencies
  );

  const handleSquareUpdate = useCallback((params: {x: number; y: number; size: number}) => {
    // Update shared values that the frame processor will use
    // These are updated from the SquareOverlay component
    roiX.value = params.x;
    roiY.value = params.y;
    roiSize.value = params.size;
  }, [roiX, roiY, roiSize]);


  if (!device) {
    return <Text style={styles.text}>No camera device found</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraView}>
        <Camera
          style={StyleSheet.absoluteFill} // Changed from styles.camera for overlay to work correctly
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          pixelFormat='yuv' // Explicitly set pixelFormat if you know it
        />
        {/* The SquareOverlay is now positioned by its own animated styles */}
        <SquareOverlay
            initialX={roiX.value}
            initialY={roiY.value}
            initialSize={roiSize.value}
            onUpdate={handleSquareUpdate}
        />
      </View>

      <View style={styles.buttons}>
        <Button
          title={scanning ? 'Stop Scan' : 'Start Scan'}
          onPress={() => {
            if (scanning) {
              analyzeDurations();
            } else {
              reset();
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
  // camera: {flex: 1}, // Removed as Camera now uses StyleSheet.absoluteFill
  text: {color: 'white', padding: 10, fontSize: 18},
  cameraView: {position: 'relative', flex: 4 /* Adjust flex توزيع as needed */},
  buttons: {
    flex: 1, // Adjust flex as needed
  },
});
