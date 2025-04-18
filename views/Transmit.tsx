import React, {useState} from 'react';
import {Button, Text, View} from 'react-native';
import NativeFlashlight from '../specs/NativeFlashlight';
import {TextInput, TouchableRipple} from 'react-native-paper';
import {textToMorse} from '../utils';

const dotDuration = 200; // milliseconds
const dashDuration = dotDuration * 3;
const symbolGap = dotDuration;
const letterGap = dotDuration * 3;
const wordGap = dotDuration * 7;

function Transmit({navigation}: any): React.JSX.Element {
  const [transmitting, setTransmitting] = useState(false);
  const [text, setText] = useState('');
  async function flashMorse(morse: string) {
    setTransmitting(true);
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
    setTimeout(() => {
      setTransmitting(false);
    }, delay + dashDuration);
  }
  const handleSendTextAsMorse = () => {
    const morse = textToMorse(text);
    flashMorse(morse);
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <TextInput
        label="Enter text"
        mode="outlined"
        style={{width: '80%', marginBottom: 20}}
        placeholder="Type here..."
        onChangeText={text => {
          setText(text);
        }}
        value={text}
      />
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
        <View className="p-2 bg-blue-500 rounded-md">
          <Text>{transmitting ? 'Transmitting...' : 'Receive Morse Code'}</Text>
        </View>
      </TouchableRipple>
    </View>
  );
}

export default Transmit;
