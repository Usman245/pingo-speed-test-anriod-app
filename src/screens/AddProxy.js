import { useState } from 'react';
import { View, Text } from 'react-native';
import Button from '../components/Button';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import { Card } from '../components/Card';

export default function AddProxy({ toProxy }) {
  const [protocol, setProtocol] = useState('socks5');

  return (
    <View className="flex-1 pt-[18px] px-[18px]">
      <Button title="← Route" variant="text" onPress={toProxy} textClassName="text-[12.5px] tracking-[0.1em] uppercase" className="items-start py-1.5" />
      <Text className="font-o9 text-[34px] leading-[34px] tracking-[-0.045em] text-ink mt-2 mb-4">Add a proxy</Text>
      <Card className="p-[18px] gap-3.5">
        <Field label="Label" placeholder="Frankfurt box" />
        <View className="flex-row gap-3">
          <Field label="Host" placeholder="203.0.113.24" className="flex-1" />
          <Field label="Port" placeholder="1080" className="w-[100px]" />
        </View>
        <View>
          <Text className="text-[10.5px] font-o8 tracking-[0.12em] uppercase text-muted1 mb-2">Protocol</Text>
          <Segmented
            options={[
              { label: 'SOCKS5', value: 'socks5' },
              { label: 'HTTP', value: 'http' },
            ]}
            value={protocol}
            onChange={setProtocol}
            optionClassName="py-2.5 px-[22px]"
          />
        </View>
        <View className="flex-row gap-3">
          <Field label="Username" placeholder="Optional" className="flex-1" />
          <Field label="Password" placeholder="Optional" secureTextEntry className="flex-1" />
        </View>
      </Card>
      <View className="flex-row gap-2.5 mt-4">
        <Button title="Test" variant="secondary" onPress={toProxy} className="flex-1" />
        <Button title="Save" variant="primary" onPress={toProxy} className="flex-1" />
      </View>
      <Text className="text-xs font-o6 text-muted1 mt-3.5">Credentials are stored on the device, never synced.</Text>
    </View>
  );
}
