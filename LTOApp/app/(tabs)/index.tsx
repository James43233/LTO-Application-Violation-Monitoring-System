import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TextInput, View, Pressable } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // Always clear previous
      await AsyncStorage.removeItem('driver_user_id');
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem('user_type');
      await AsyncStorage.removeItem('full_name');
      await AsyncStorage.removeItem('account_status');

      if (res.ok && data.success) {
        await AsyncStorage.setItem('user_type', data.user_type);

        if (data.full_name) await AsyncStorage.setItem('full_name', data.full_name);
        if (data.account_status) await AsyncStorage.setItem('account_status', data.account_status);

        if (data.user_type === 'driver') {
          await AsyncStorage.setItem('driver_user_id', String(data.user_id));
          router.push('/(tabs)/Driver');
        } else if (data.user_type === 'officer') {
          await AsyncStorage.setItem('user_id', String(data.user_id));
          router.push('/(tabs)/Officer');
        } else if (data.user_type === 'admin') {
          await AsyncStorage.setItem('user_id', String(data.user_id));
          router.push('/(tabs)/LTOAdmin');
        } else {
          setError('Unknown user type.');
        }
      } else if (data.error) {
        setError(data.error);
      } else {
        setError('Invalid username or password.');
      }
    } catch (e: any) {
      console.error(e);
      setError('Network or server error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/(tabs)/Register');
  };

  return (
    <BackgroundWrapper>
      <View className="w-[380px] h-[420px] rounded-2xl shadow-md p-6 bg-blue-200">
        <Text className="text-2xl font-bold text-center mb-6">LTO PORTAL</Text>

        <View className="mb-4">
          <Text className="text-Black font-semibold mb-1 text-lg font-mono">Username</Text>
          <TextInput
            placeholder="Enter Username"
            value={username}
            onChangeText={setUsername}
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View className="mb-4">
          <Text className="text-Black font-semibold mb-1 text-lg font-mono">Password</Text>
          <TextInput
            placeholder="Enter Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
          />
        </View>

        {error ? (
          <Text className="text-red-500 text-center mb-2">{error}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          className={`bg-blue-500 rounded-md py-2 mt-4 ${loading ? 'opacity-60' : ''}`}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold font-mono">
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </Pressable>

        <Pressable onPress={handleRegister}>
          <Text className="text-blue-600 underline text-center mt-4 text-md font-mono">
            Don't have an account? Register
          </Text>
        </Pressable>
      </View>
    </BackgroundWrapper>
  );
}