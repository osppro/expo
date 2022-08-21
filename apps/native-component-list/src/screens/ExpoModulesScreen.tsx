import { NativeModulesProxy } from 'expo-modules-core';
import React from 'react';
import { ScrollView, StyleSheet, View, NativeModules } from 'react-native';

import FunctionDemo, { FunctionDescription } from '../components/FunctionDemo';
import HeadingText from '../components/HeadingText';
import MonoText from '../components/MonoText';

// Custom JSON replacer that can stringify functions.
const customJsonReplacer = (_: string, value: any) => {
  return typeof value === 'function' ? value.toString().replace(/\s+/g, ' ') : value;
};

const series = 50;
const repeats = 1000;
const byteCount = 1024 * 4;

const LegacyProxy = NativeModules.NativeUnimoduleProxy;
const ExpoRandomProxy = NativeModulesProxy.ExpoRandom;
const ExpoCryptoProxy = NativeModulesProxy.ExpoCrypto;
const ExpoRandom = global.ExpoModules.ExpoRandom;
const ExpoCrypto = global.ExpoModules.ExpoCrypto;

async function test(...suites) {
  const results: Record<string, number> = {};

  for (const suite of suites) {
    const times = [];

    for (let i = 0; i < series; i++) {
      const startTime = performance.now();

      for (let j = 0; j < repeats; j++) {
        if (suite.async) {
          await suite.action();
        } else {
          suite.action();
        }
      }
      times.push(performance.now() - startTime);
    }

    const average = times.reduce((acc, time) => acc + time, 0) / series;

    results[suite.name] = average;
  }
  return results;
}

async function testBridgeProxy() {
  const randomString = await LegacyProxy.callMethod('ExpoRandom', 'getRandomBase64StringAsync', [
    byteCount,
  ]);
}

async function testJsiProxy() {
  const randomString = await ExpoRandomProxy.getRandomBase64StringAsync(byteCount);
  // await ExpoCryptoProxy.digestStringAsync('MD5', randomString, { encoding: 'base64' });

  // await ExpoCryptoProxy.digestStringAsync('MD5', 'Expo is the best', { encoding: 'base64' });
}

async function testAsyncJSI() {
  const randomString = await ExpoRandom.getRandomBase64StringAsync(byteCount);
  // await ExpoCrypto.digestStringAsync('MD5', randomString, { encoding: 'base64' });

  // await ExpoCrypto.digestStringAsync('MD5', 'Expo is the best', { encoding: 'base64' });
}

function testSyncJSI() {
  const randomString = ExpoRandom.getRandomBase64String(byteCount);
  // ExpoCrypto.digestString('MD5', randomString, { encoding: 'base64' });

  // ExpoCrypto.digestString('MD5', 'Expo is the best', { encoding: 'base64' });
}

// function testBuffer() {
//   const buffer = new Uint8Array(byteCount);
//   ExpoCrypto.getRandomValues(buffer);
// }

async function runTests() {
  const results = await test(
    { name: 'bridgeProxy', action: testBridgeProxy, async: true },
    { name: 'jsiProxy', action: testJsiProxy, async: true },
    { name: 'async', action: testAsyncJSI, async: true },
    { name: 'sync', action: testSyncJSI, async: false }
    // { name: 'buffer', action: testBuffer, async: false }
  );
  const output = {
    bridgeProxy: {
      total: results.bridgeProxy,
      speed: 1,
    },
    jsiProxy: {
      total: results.jsiProxy,
      speed: results.bridgeProxy / results.jsiProxy,
    },
    async: {
      total: results.async,
      speed: results.bridgeProxy / results.async,
    },
    sync: {
      total: results.sync,
      speed: results.bridgeProxy / results.sync,
    },
    // buffer: {
    //   total: results.buffer,
    //   speed: results.bridge / results.buffer,
    // },
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

const PERFORMANCE_DEMO: FunctionDescription = {
  name: 'getRandomBase64String',
  parameters: [{ type: 'constant', name: '' + byteCount, value: byteCount }],
  actions: [
    {
      name: 'Run tests',
      action: runTests,
    },
  ],
};

export default class ExpoModulesScreen extends React.PureComponent<any, any> {
  render() {
    const modules = { ...global.ExpoModules };
    const moduleNames = Object.keys(modules);

    return (
      <ScrollView style={styles.scrollView}>
        <HeadingText>Performance</HeadingText>
        <FunctionDemo namespace="ExpoRandom" {...PERFORMANCE_DEMO} />

        <HeadingText>Host object is installed</HeadingText>
        <MonoText>{`'ExpoModules' in global => ${'ExpoModules' in global}`}</MonoText>

        <HeadingText>Available Expo modules</HeadingText>
        <MonoText>
          {`Object.keys(global.ExpoModules) => [\n  ${moduleNames.join(',\n  ')}\n]`}
        </MonoText>

        {moduleNames.map((moduleName) => {
          return (
            <View key={moduleName}>
              <HeadingText>Module: {moduleName}</HeadingText>
              <MonoText>{JSON.stringify(modules[moduleName], customJsonReplacer, 2)}</MonoText>
            </View>
          );
        })}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  scrollView: {
    paddingHorizontal: 10,
  },
});
