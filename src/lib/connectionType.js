import * as Network from 'expo-network';
import * as Cellular from 'expo-cellular';

export async function fetchConnectionLabel() {
  const state = await Network.getNetworkStateAsync();
  if (state.type === Network.NetworkStateType.WIFI) return 'Wi-Fi';
  if (state.type === Network.NetworkStateType.CELLULAR) {
    const carrier = await Cellular.getCarrierNameAsync().catch(() => null);
    return carrier ? `Cellular · ${carrier}` : 'Cellular';
  }
  if (state.type === Network.NetworkStateType.NONE) return 'Offline';
  return 'Unknown';
}
