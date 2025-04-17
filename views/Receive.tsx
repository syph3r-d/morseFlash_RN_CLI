import {PaintStyle, Skia} from '@shopify/react-native-skia';
import React from 'react';
import {Text} from 'react-native-paper';
import {
  Camera,
  Frame,
  useCameraDevice,
  useFrameProcessor,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';

export const Receive = () => {
  const device = useCameraDevice('back');
  const size = 50;
  const reportBrightness = (value: number) => {
    'worklet';

    // You can now use timing logic to interpret as Morse
    if (value > 100) {
      console.log('Flashlight ON');
    } else {
      console.log('Flashlight OFF');
    }
  };
  // const frameProcessor = useFrameProcessor(frame => {
  //   'worklet';
  //   console.log('Frame processed');
  //   console.log(`Frame width: ${frame.width}, height: ${frame.height}`);
  //   console.log(`Frame pixel format: ${frame.pixelFormat}`);

  //   if (frame.pixelFormat === 'yuv') {
  //     const buffer = frame.toArrayBuffer();
  //     const data = new Uint8Array(buffer);
  //     console.log(`Pixel at 0,0: YUV(${data[0]}, ${data[1]}, ${data[2]})`);
  //   }
  // }, []);
  const processRGB = (frame: Frame) => {
    'worklet';

    const width = frame.width;
    const height = frame.height;
    const buffer = new Uint8Array(frame.toArrayBuffer()); // RGBA

    const size = 150;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const half = Math.floor(size / 2);

    const startX = centerX - half;
    const startY = centerY - half;

    const sigma = size / 3; // standard deviation for Gaussian
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

        // Distance from center
        const dx = x - size / 2;
        const dy = y - size / 2;
        const distSq = dx * dx + dy * dy;

        const weight = Math.exp(-distSq / (2 * sigma * sigma));

        weightedBrightness += lum * weight;
        totalWeight += weight;
      }
    }

    const brightness = weightedBrightness / totalWeight;
    reportBrightness(brightness);
  };

  const processYUV = (frame: Frame) => {
    'worklet';
    const width = frame.width;
    const height = frame.height;
    const buffer = new Uint8Array(frame.toArrayBuffer()); // YUV (NV21 or I420)

    const size = 150;
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
    reportBrightness(brightness);
  };

  const frameProcessor = useSkiaFrameProcessor(frame => {
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
    if (frame.pixelFormat === 'rgb') {
      processRGB(frame);
    } else if (frame.pixelFormat === 'yuv') {
      processYUV(frame);
    }
  }, []);

  if (device == null) return <Text>Loading...</Text>;
  return (
    <Camera
      style={{flex: 1}}
      device={device}
      isActive={true}
      frameProcessor={frameProcessor}
    />
  );
};
