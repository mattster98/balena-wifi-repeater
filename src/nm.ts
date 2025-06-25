import { NetworkManagerTypes } from './types';
import { BodyEntry } from 'dbus-native';
import {
  dbusInvoker,
  getProperty
} from './dbus';

export interface NetworkDevice {
  iface: string; // IP interface name
  path: string; // DBus object path
  type: string;
  driver: string;
  connected: boolean;
}

export interface WirelessDevice extends NetworkDevice {
  apCapable: boolean;
}

export interface WiredDevice extends NetworkDevice {
}

export interface WirelessNetwork {
  iface: string;
  ssid: string;
  password?: string;
}

const nm: string = 'org.freedesktop.NetworkManager';

// -------- BRIDGE MODE SUPPORT --------

/**
 * Create a bridge and add specified interfaces as ports.
 * Members example:
 * [
 *   { iface: 'eth0', type: 'ethernet' },
 *   { iface: 'wlan0', type: 'wireless', ssid: 'MySSID', password: 'pass1234' }
 * ]
 */
export const createBridge = async (
  bridgeName: string,
  members: { iface: string; type: 'ethernet' | 'wireless'; ssid?: string; password?: string }[]
) => {
  // 1. Create bridge connection
  const bridgeParams: BodyEntry[] = [
    ['connection', [
      ['id', ['s', bridgeName]],
      ['type', ['s', 'bridge']],
      ['interface-name', ['s', bridgeName]],
    ]],
    ['bridge', [
      ['stp', ['b', false]],
    ]],
    ['ipv4', [
      ['method', ['s', 'auto']],
    ]],
    ['ipv6', [
      ['method', ['s', 'ignore']],
    ]],
  ];
  const bridgeConnection = await addConnection(bridgeParams);

  // 2. Attach each member interface to the bridge
  for (const member of members) {
    let portParams: BodyEntry[] = [
      ['connection', [
        ['id', ['s', `${bridgeName}-${member.iface}`]],
        ['type', ['s', member.type === 'ethernet' ? '802-3-ethernet' : '802-11-wireless']],
        ['interface-name', ['s', member.iface]],
        ['slave-type', ['s', 'bridge']],
        ['master', ['s', bridgeName]],
      ]],
    ];
    if (member.type === 'wireless') {
      portParams.push(['802-11-wireless', [
        ['mode', ['s', 'ap']],
        ['ssid', ['ay', stringToArrayOfBytes(member.ssid || 'BridgeAP')]],
      ]]);
      if (member.password) {
        portParams.push(['802-11-wireless-security', [
          ['key-mgmt', ['s', 'wpa-psk']],
          ['psk', ['s', member.password]],
        ]]);
      }
    }
    await addConnection(portParams);
  }

  // 3. Activate the bridge (only the bridge interface needs activation)
  const bridgePath = await getPathByIface(bridgeName);
  return await activateConnection(bridgeConnection, bridgePath);
};

// --------- STANDARD FUNCTIONS ---------

// Wireless
export const createAccessPoint = async (device: WirelessNetwork): Promise<any> => {
  try {
    // Error out if the interface does not exist
    const wifiDevices: NetworkDevice[] = await getWiFiDevices()

    if (!wifiDevices.some(d => d.iface === device.iface)) {
      console.log(`Selected interface ${device.iface} does not exist. Hotspot creation aborted...`);
      return
    }

    const connectionParams: BodyEntry[] = [
      ['connection', [
        ['id', ['s', device.ssid]],
        ['type', ['s', '802-11-wireless']],
      ]],
      ['802-11-wireless', [
        ['ssid', ['ay', stringToArrayOfBytes(device.ssid)]],
        ['mode', ['s', 'ap']],
      ]],
      ['802-11-wireless-security', [
        ['key-mgmt', ['s', 'wpa-psk']],
        ['psk', ['s', device.password]],
      ]],
      ['ipv4', [
        ['method', ['s', 'shared']],
      ]],
      ['ipv6', [
        ['method', ['s', 'ignore']],
      ]],
    ];

    const dbusPath = await getPathByIface(device.iface);
    const connection = await addConnection(connectionParams);
    const result = await activateConnection(connection, dbusPath);
    return result
  } catch (error) {
    console.log(`Error creating Hotspot: ${error}`);
  }
};

export const connectToWifi = async (network: WirelessNetwork): Promise<any> => {
  try {
    const connectionParams = [
      ['connection', [
        ['id](#)*

