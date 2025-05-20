import React, {useState, useMemo} from 'react';
import {Button, Text, View} from 'react-native';
import NativeFlashlight from '../specs/NativeFlashlight';
import {TextInput, TouchableRipple} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {textToMorse} from '../utils';

function Transmit({navigation}: any): React.JSX.Element {
  const [transmitting, setTransmitting] = useState(false);
  const [text, setText] = useState('');
  const [speed, setSpeed] = useState(200); // default dot duration in ms

  const durations = useMemo(
    () => ({
      dot: speed,
      dash: speed * 3,
      symbolGap: speed,
      letterGap: speed * 3,
      wordGap: speed * 7,
    }),
    [speed],
  );

  async function flashMorse(morse: string) {
    setTransmitting(true);
    let delay = 0;
    const queue: [number, number][] = [];

    for (const char of morse) {
      switch (char) {
        case '.':
          queue.push([delay, durations.dot]);
          delay += durations.dot + durations.symbolGap;
          break;
        case '-':
          queue.push([delay, durations.dash]);
          delay += durations.dash + durations.symbolGap;
          break;
        case ' ':
          delay += durations.wordGap;
          break;
      }
    }

    for (const [onDelay, duration] of queue) {
      setTimeout(() => NativeFlashlight.turnOn(), onDelay);
      setTimeout(() => NativeFlashlight.turnOff(), onDelay + duration);
    }

    setTimeout(() => {
      setTransmitting(false);
    }, delay + durations.dash);
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
        onChangeText={setText}
        value={text}
      />

      <Text style={{marginBottom: 10}}>Speed: {speed} ms per dot</Text>
      <Slider
        style={{width: '80%', height: 40}}
        minimumValue={100}
        maximumValue={600}
        step={50}
        value={speed}
        onValueChange={setSpeed}
        disabled={transmitting}
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
        <View
          className="p-2 bg-blue-500 rounded-md mt-4"
          style={{
            padding: 10,
            backgroundColor: transmitting ? 'gray' : 'blue',
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 20,
          }}>
          <Text style={{color: 'white'}}>{'Receive Morse Code'}</Text>
        </View>
      </TouchableRipple>
    </View>
  );
}

export default Transmit;
