import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Modal, Image, TouchableWithoutFeedback } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Driver() {
  const router = useRouter();
  const [licenseDetails, setLicenseDetails] = useState({
    full_name: '',
    age: '',
    license_status: '',
    license_expiry: '',
    birthday: '',
    phone_number: '',
    email: '',
    license_number: '',
    license_img: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const [penalties, setPenalties] = useState([]);
  const [checked, setChecked] = useState([]);

  const toggleCheck = (idx) => {
    setChecked((prev) =>
      prev.map((v, i) => (i === idx ? !v : v))
    );
  };

  const handlePayNow = () => {
    // Collect all checked penalties to pay
    const selectedPenalties = penalties.filter((_, idx) => checked[idx]);
    if (selectedPenalties.length === 0) {
      alert('Please select at least one violation to pay.');
      return;
    }
    // You can pass selectedPenalties as params to the payment page if needed
    router.push({
      pathname: '/(tabs)/Payment',
      params: { selectedPenalties: JSON.stringify(selectedPenalties) }
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await AsyncStorage.getItem('driver_user_id');
        if (!userId || userId === 'null' || isNaN(parseInt(userId, 10))) {
          setError('No user ID found. Please log in again.');
          setLoading(false);
          return;
        }

        // Fetch license details
        const detailsRes = await fetch('http://127.0.0.1:8000/api/driver/details/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driver_user_id: parseInt(userId, 10) })
        });
        const detailsData = await detailsRes.json();
        if (detailsData.success && detailsData.full_name) {
          setLicenseDetails(detailsData);
        } else {
          setError(detailsData.error || 'Failed to fetch license details.');
        }

        // Fetch penalties
        const penaltiesRes = await fetch('http://127.0.0.1:8000/api/driver/penalties/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driver_user_id: parseInt(userId, 10) })
        });
        const penaltiesData = await penaltiesRes.json();
        if (penaltiesData.success && Array.isArray(penaltiesData.penalties)) {
          // Only keep unpaid penalties
          const unpaidPenalties = penaltiesData.penalties.filter(p => (!p.status || p.status.toLowerCase() !== 'paid'));
          setPenalties(unpaidPenalties);
          setChecked(unpaidPenalties.map(() => false));
        } else {
          setPenalties([]);
          setChecked([]);
        }

      } catch (e) {
        setError('Error fetching data.');
        setPenalties([]);
        setChecked([]);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate days until expiry
  let daysLeft = '';
  if (licenseDetails.license_expiry) {
    const expiryDate = new Date(licenseDetails.license_expiry);
    const now = new Date();
    const diffDays = Math.round((expiryDate - now) / (1000 * 60 * 60 * 24));
    daysLeft = diffDays > 0 ? ` (${diffDays} days left)` : ' (Expired)';
  }

  const handleLogout = () => {
    router.replace('/(tabs)');
  };

  // Loading and error UI
  if (loading) {
    return (
      <BackgroundWrapper>
        <View className="flex-1 justify-center items-center p-10">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-5">Loading license details...</Text>
        </View>
      </BackgroundWrapper>
    );
  }
  if (error) {
    return (
      <BackgroundWrapper>
        <View className="flex-1 justify-center items-center p-10">
          <Text className="text-red-500 font-bold">Error: {error}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <>
      <BackgroundWrapper>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
          {/* License Details Box */}
          <View className="bg-blue-200 p-4 rounded-xl w-[450px] shadow-md mb-4 ">
            <Text className="text-xl font-bold text-center mb-4 font-mono">License Details</Text>
            <Text className="mb-1 font-mono">Name: {licenseDetails.full_name}</Text>
            <Text className="mb-1 font-mono">Age: {licenseDetails.age}</Text>
            <Text className="mb-1 font-mono ">Driver’s License Status: {licenseDetails.license_status}</Text>
            <Text className="mb-1 font-mono">
              Driver’s License Expires: {licenseDetails.license_expiry
                ? `${new Date(licenseDetails.license_expiry).toLocaleDateString()}${daysLeft}`
                : ''}
            </Text>
            <View className="flex flex-row justify-evenly items-center">
              <View>
                <Pressable
                  className="bg-white border border-gray-300 rounded mt-4 py-2 w-[150px]"
                  onPress={() => setShowDetails(true)}
                >
                  <Text className="text-center text-black font-mono">Show More Details</Text>
                </Pressable>
              </View>
              <View className="">
                <Pressable
                  className="bg-white border border-gray-300 rounded mt-4 py-2 w-[150px]"
                >
                  <Text className="text-center text-black font-mono" onPress={handleLogout}>Log out</Text>
                </Pressable>
              </View>
            </View>
            
          </View>

          <View className="w-[450px] bg-blue-200 rounded-2xl border border-gray-300 px-6 pt-6 pb-4 mb-6">

            {/* Title */}
            <Text className="text-2xl font-bold text-center mb-4 text-gray-800 font-sans">
              Penalties
            </Text>

            {/* Table Header (separated visually with margin) */}
            <View className="flex-row px-2 py-2 bg-blue-100 mb-[5px] rounded-md  flex justify-center">
              <Text className="flex-1 text-center font-semibold text-xs  text-black">Violation</Text>
              <Text className="flex-1 text-center font-semibold text-xs  text-black">Officer</Text>
              <Text className="flex-1 text-center font-semibold text-xs  text-black">Fee</Text>
              <Text className="flex-1 text-center font-semibold text-xs  text-black">Pay</Text>
            </View>

            {/* Table Rows */}
            <View className="space-y-2 mb-4">
              {penalties.length === 0 ? (
                <Text className="text-center text-gray-400 italic py-4">No penalties assigned.</Text>
              ) : penalties.map((row, idx) => (
                <View
                  key={idx}
                  className={`flex-row py-3 px-2 rounded-lg items-center ${
                    idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-100 transition-all duration-150`}
                >
                  <Text className="flex-1 text-center text-gray-700">{row.violation_type}</Text>
                  <Text className="flex-1 text-center text-gray-700">{row.officer}</Text>
                  <Text className="flex-1 text-center text-gray-700">{row.fee} PHP</Text>
                  <View className="flex-1 items-center">
                    <TouchableOpacity
                      className="items-center justify-center w-8 h-8 rounded-md bg-gray-200 hover:bg-blue-400"
                      onPress={() => toggleCheck(idx)}
                    >
                      <MaterialIcons
                        name={checked[idx] ? 'check-box' : 'check-box-outline-blank'}
                        size={20}
                        color={checked[idx] ? '#2563eb' : 'black'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Pay Now Button */}
            {penalties.length > 0 && (
              <Pressable
                className="bg-red-600 rounded-lg py-3 px-5 self-center mt-2 hover:bg-red-700 w-[100px]"
                onPress={handlePayNow}
              >
                <Text className="text-white font-semibold text-sm ">Pay Now</Text>
              </Pressable>
            )}
          </View>

          {/* Transactions Button */}
          <Pressable
            className="bg-white border border-gray-300 rounded-xl px-6 py-3 shadow"
            onPress={() => router.push('/(tabs)/Transaction')}
          >
            <Text className="text-black font-semibold font-mono">View Transactions</Text>
          </Pressable>
        </ScrollView>
      </BackgroundWrapper>
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        {/* Modal overlay */}
        <TouchableWithoutFeedback onPress={() => setShowDetails(false)}>
          <View className="flex-1 bg-black/40 absolute top-0 left-0 right-0 bottom-0 z-10" />
        </TouchableWithoutFeedback>
        {/* Modal content */}
        <View className="absolute top-[15%] left-[5%] w-[90%] min-h-[350px] max-h-[70%] bg-white rounded-2xl p-0 z-20 shadow-lg">
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-lg font-bold mb-4 text-center font-mono">
              More License Details
            </Text>
            <Text className="mb-2 font-mono"><Text className="font-bold font-mono">Full Name:</Text> {licenseDetails.full_name}</Text>
            <Text className="mb-2 font-mono"><Text className="font-bold font-mono">Birthday:</Text> {licenseDetails.birthday || 'N/A'}</Text>
            <Text className="mb-2 font-mono"><Text className="font-bold font-mono">Phone Number:</Text> {licenseDetails.phone_number || 'N/A'}</Text>
            <Text className="mb-2 font-mono"><Text className="font-bold font-mono">Email:</Text> {licenseDetails.email || 'N/A'}</Text>
            <Text className="mb-2 font-mono"><Text className="font-bold font-mono">License Number:</Text> {licenseDetails.license_number || 'N/A'}</Text>
            {/* License image if present */}
            {licenseDetails.license_img ? (
              <Image
                source={{ uri: licenseDetails.license_img }}
                className="w-[200px] h-[120px] mt-5 self-center"
                resizeMode="contain"
              />
            ) : (
              <Text className="text-center mt-5 text-gray-400">No License Image</Text>
            )}
            <Pressable
              className="mt-8 self-center bg-blue-600 rounded-xl py-2 px-6"
              onPress={() => setShowDetails(false)}
            >
              <Text className="text-white font-bold">Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}