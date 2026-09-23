import { Tabs, TabSlot, TabList, TabTrigger } from 'expo-router/ui';
import { TABS, TabButton, tabBarStyles } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList style={tabBarStyles.tabList}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton tab={tab} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}
