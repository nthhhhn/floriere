import { Tabs } from 'expo-router';

import { BottomTabBar } from '../../components/BottomTabBar';

export default function PurchaserLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="home"      options={{ title: 'Home' }} />
      <Tabs.Screen name="curated"   options={{ title: 'Shop' }} />
      <Tabs.Screen name="compose"   options={{ title: 'Concierge' }} />
      <Tabs.Screen name="orders"    options={{ title: 'Orders' }} />
      <Tabs.Screen name="account"   options={{ title: 'Me' }} />
      <Tabs.Screen name="cart"      options={{ href: null }} />
      <Tabs.Screen name="checkout"  options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="intent"    options={{ href: null }} />
    </Tabs>
  );
}
