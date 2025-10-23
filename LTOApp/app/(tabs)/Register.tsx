import React, { useState } from 'react';
import { Text, TextInput, View, Pressable, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BackgroundWrapper from '@/components/backgroundwrapper';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseImg, setLicenseImg] = useState(null); // base64 string

  // Image picker
  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setLicenseImg(result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : null);
    }
  };

  const handleRegister = async () => {
    // Simple validation
    if (!fullName || !username || !password || !email || !birthday || !phoneNumber || !licenseNumber) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/driver/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
          email,
          birthday,
          phone_number: phoneNumber,
          license_number: licenseNumber,
          license_img: licenseImg,
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Registered successfully! Please login.');
        router.replace('/(tabs)'); // <--- Redirect to login page
      } else {
        Alert.alert('Error', data.error || 'Registration failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to register.');
    }
  };

  return (
    <BackgroundWrapper>
      <View className="bg-blue-200 w-[450px] rounded-2xl shadow-md p-6">
        <Text className="text-2xl font-bold text-center mb-6 font-mono">Register</Text>

        {/* Full Name */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Full Name</Text>
          <TextInput
            placeholder="Enter Full Name"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Username */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Username</Text>
          <TextInput
            placeholder="Enter Username"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        {/* Password */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Password</Text>
          <TextInput
            placeholder="Enter Password"
            secureTextEntry
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Email */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono" >Email</Text>
          <TextInput
            placeholder="Enter Email"
            keyboardType="email-address"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        {/* Birthday */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Birthday (YYYY-MM-DD)</Text>
          <TextInput
            placeholder="Enter Birthday"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={birthday}
            onChangeText={setBirthday}
          />
        </View>

        {/* Phone Number */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Phone Number</Text>
          <TextInput
            placeholder="Enter Phone Number"
            keyboardType="phone-pad"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* Driver's License Number */}
        <View className="mb-3">
          <Text className="text-gray-700 mb-1 font-mono">Driver's License Number</Text>
          <TextInput
            placeholder="Enter Driver's License Number"
            className="border border-gray-300 rounded-md px-4 py-2 bg-white"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
          />
        </View>

        {/* License Image Upload */}
        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-mono">Driver's License Image</Text>
          <Pressable
            className="border border-dashed border-gray-400 rounded-md px-4 py-6 items-center justify-center bg-gray-50"
            onPress={handlePickImage}
          >
            {licenseImg ? (
              <Image source={{ uri: licenseImg }} style={{ width: 120, height: 80, marginBottom: 8 }} />
            ) : (
              <Text className="text-gray-500 font-mono">Upload License Image</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={handleRegister} className="bg-blue-500 rounded-md py-2 mt-2">
          <Text className="text-white text-center font-semibold font-mono">Register</Text>
        </Pressable>
      </View>
    </BackgroundWrapper>
  );
}