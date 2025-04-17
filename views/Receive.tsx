import {Skia} from '@shopify/react-native-skia';
import React from 'react';
import {Text} from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';

export const Receive = () => {
  const device = useCameraDevice('back');
  //   const frameProcessor = useFrameProcessor(frame => {
  //     'worklet';
  //     console.log('Frame processed');
  //     console.log(`Frame width: ${frame.width}, height: ${frame.height}`);
  //     console.log(`Frame pixel format: ${frame.pixelFormat}`);

  //     if (frame.pixelFormat === 'yuv') {
  //       const buffer = frame.toArrayBuffer();
  //       const data = new Uint8Array(buffer);
  //       console.log(`Pixel at 0,0: YUV(${data[0]}, ${data[1]}, ${data[2]})`);
  //     }
  //   }, []);
  const frameProcessor = useSkiaFrameProcessor(frame => {
    'worklet';
    frame.render();

    const centerX = frame.width / 2;
    const centerY = frame.height / 2;
    const rect = Skia.XYWHRect(centerX, centerY, 150, 150);
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('red'));
    frame.drawRect(rect, paint);
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
