import React from 'react';
import {Button, View} from 'react-native';
import NativeFlashlight from './specs/NativeFlashlight';

const MORSE_CODE: {[key: string]: string} = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  ' ': ' ',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '0': '-----',
};

const dotDuration = 200; // milliseconds
const dashDuration = dotDuration * 3;
const symbolGap = dotDuration;
const letterGap = dotDuration * 3;
const wordGap = dotDuration * 7;

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map(char => MORSE_CODE[char] || '')
    .join(' ');
}

async function flashMorse(morse: string) {
  let delay = 0;

  const queue = [];

  for (const char of morse) {
    switch (char) {
      case '.':
        queue.push([delay, dotDuration]);
        delay += dotDuration + symbolGap;
        break;
      case '-':
        queue.push([delay, dashDuration]);
        delay += dashDuration + symbolGap;
        break;
      case ' ':
        delay += wordGap; // word space
        break;
    }
  }

  for (const [onDelay, duration] of queue) {
    setTimeout(() => NativeFlashlight.turnOn(), onDelay);
    setTimeout(() => NativeFlashlight.turnOff(), onDelay + duration);
  }
}

function App(): React.JSX.Element {
  const handleSendTextAsMorse = () => {
    const text = 'HELLO WORLD';
    const morse = textToMorse(text);
    flashMorse(morse);
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Button
        title="Turn On Flashlight"
        onPress={() => NativeFlashlight.turnOn()}
      />
      <Button
        title="Turn Off Flashlight"
        onPress={() => NativeFlashlight.turnOff()}
      />
      <Button
        title="Send 'HELLO WORLD' as Morse"
        onPress={handleSendTextAsMorse}
      />
    </View>
  );
}

export default App;
