import React from 'react';
import {StyleSheet, Dimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

interface SquareOverlayProps {
  initialSize?: number;
  initialX?: number;
  initialY?: number;
  onUpdate?: (params: {
    x: number;
    y: number;
    size: number;
  }) => void;
}

const HANDLE_SIZE = 20; // Size of the resize handles

const SquareOverlay = ({
  initialSize = 100,
  initialX = screenWidth / 2 - initialSize / 2,
  initialY = screenHeight / 2 - initialSize / 2,
  onUpdate,
}: SquareOverlayProps) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const squareSize = useSharedValue(initialSize);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startSize = useSharedValue(0);

  const callOnUpdate = () => {
    if (onUpdate) {
      onUpdate({
        x: translateX.value,
        y: translateY.value,
        size: squareSize.value,
      });
    }
  };

  const dragGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate(event => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      if (onUpdate) {
        runOnJS(callOnUpdate)();
      }
    });

  const resizeGesture = Gesture.Pan()
    .onBegin(() => {
      startSize.value = squareSize.value;
      // Capture initial position of the square for relative resizing if needed
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate(event => {
      const newSize = Math.max(
        50, // Minimum size
        startSize.value + (event.translationX + event.translationY) / 2,
      );
      squareSize.value = newSize;
      // To make it resize from top-left, adjust translateX/Y as well, but that complicates things slightly.
      // For now, it resizes and the drag gesture can be used to reposition.
    })
    .onEnd(() => {
      if (onUpdate) {
        runOnJS(callOnUpdate)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(squareSize.value),
      height: withSpring(squareSize.value),
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
      ],
      borderWidth: 2,
      borderColor: 'red',
      borderStyle: 'solid',
      position: 'absolute', // Important for positioning
    };
  });

  const resizeHandleStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: 'blue', // Changed to blue for visibility
      // Position the handle at the bottom-right corner of the square
      left: squareSize.value - HANDLE_SIZE / 2, // Adjusted for Animated.View container
      top: squareSize.value - HANDLE_SIZE / 2,  // Adjusted for Animated.View container
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={animatedStyle}>
        <GestureDetector gesture={resizeGesture}>
          <Animated.View style={resizeHandleStyle} />
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
};

export default SquareOverlay;
