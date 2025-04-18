import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');

const SquareOverlay = ({SquareSize}: {SquareSize: number}) => {
  const styles = StyleSheet.create({
    overlayContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width,
      height,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{translateY: SquareSize * 2}],
      pointerEvents: 'none', // allows touches to pass through
    },
    square: {
      width: SquareSize,
      height: SquareSize,
      borderWidth: 2,
      borderColor: 'red',
      borderStyle: 'solid',
    },
  });
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.square} />
    </View>
  );
};

export default SquareOverlay;
