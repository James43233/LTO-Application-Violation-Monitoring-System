import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Alert } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

export default function OfficerDashboard() {
  const router = useRouter();
  const [officerDetails, setOfficerDetails] = useState({
    full_name: '',
    badge_id: '',
    station: '',
    phone_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [nextViolationId, setNextViolationId] = useState(null);

  const [violationTypes, setViolationTypes] = useState([]);
  const [loadingViolationTypes, setLoadingViolationTypes] = useState(true);

  // Car/vehicle info entered ONCE
  const [platenumber, setPlatenumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [carName, setCarName] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [notes, setNotes] = useState('');

  // Per-driver info entered ONCE
  const [driverName, setDriverName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');

  // Violations: just an array of {violation_type, fee_at_time}
  const [violations, setViolations] = useState([
    { violation_type: '', fee_at_time: '' },
  ]);

  // Backend base URL
  const BACKEND_URL = "http://localhost:8000";

  useEffect(() => {
    const fetchOfficerDetails = async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId || userId === 'null' || isNaN(parseInt(userId, 10))) {
          setError('No officer ID found. Please log in again.');
          setLoading(false);
          return;
        }
        const detailsRes = await fetch(`${BACKEND_URL}/api/officer/details/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ officer_user_id: parseInt(userId, 10) }),
        });
        const detailsData = await detailsRes.json();
        if (detailsData.success && detailsData.full_name) {
          setOfficerDetails(detailsData);
        } else {
          setError(detailsData.error || 'Failed to fetch officer details.');
        }
      } catch (e) {
        setError('Error fetching officer details.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOfficerDetails();
  }, []);

  useEffect(() => {
    const fetchNextViolationId = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/violation/next-id/`);
        const data = await res.json();
        setNextViolationId(data.next_violation_id);
      } catch (e) {
        setNextViolationId('...');
      }
    };
    fetchNextViolationId();
  }, []);

  useEffect(() => {
    const fetchViolationTypes = async () => {
      setLoadingViolationTypes(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/violation/types/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setViolationTypes(data.violation_types || []);
      } catch (e) {
        setViolationTypes([]);
        Alert.alert('Could not load violation types');
        console.error("Violation types fetch error:", e);
      } finally {
        setLoadingViolationTypes(false);
      }
    };
    fetchViolationTypes();
  }, []);

  const handleViolationChange = (idx, name, value) => {
    setViolations(prev => {
      const arr = [...prev];
      arr[idx][name] = value;
      return arr;
    });
  };

  const handleAddMore = () => {
    setViolations(prev => [...prev, { violation_type: '', fee_at_time: '' }]);
  };

  const handleSubmit = async () => {
    // Validate primary fields
    if (!driverName || !licenseNumber || !address ||
        !platenumber || !vehicleType || !carName || !vehicleColor || !notes) {
      Alert.alert('Please fill out all ticket and vehicle information fields.');
      return;
    }
    // Validate violations
    for (const v of violations) {
      if (!v.violation_type || !v.fee_at_time) {
        Alert.alert('Please fill out all fields for each violation.');
        return;
      }
    }

    // Check driver existence in backend before submitting violation
    try {
      const verifyRes = await fetch(`${BACKEND_URL}/api/driver/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: driverName, license_number: licenseNumber })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        Alert.alert('No driver account matches this name and license number.');
        return;
      }
    } catch (e) {
      Alert.alert('Could not verify driver account.', e.message);
      return;
    }

    // Register violation
    try {
      const res = await fetch(`${BACKEND_URL}/api/violation/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          violation_id: nextViolationId,
          driver_name: driverName,
          license_number: licenseNumber,
          address: address,
          platenumber,
          vehicle_type: vehicleType,
          car_name: carName,
          vehicle_color: vehicleColor,
          notes,
          violations,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // After successful registration, go to ViolationDetails screen and pass all the details as params
        router.push({
          pathname: '/ViolationDetails',
          params: {
            violation_id: nextViolationId,
            penalties: JSON.stringify(
              violations.map(v => ({
                violation: v.violation_type,
                officer: officerDetails.full_name,
                fee: v.fee_at_time + " PHP",
              }))
            ),
            driverName,
            licenseNumber,
            address,
            platenumber,
            vehicleType,
            carName,
            vehicleColor,
            notes,
            officerName: officerDetails.full_name,
            officerTitle: officerDetails.station,
            officerBadgeId: officerDetails.badge_id,
          }
        });
        // Reset fields
        setDriverName('');
        setLicenseNumber('');
        setAddress('');
        setPlatenumber('');
        setVehicleType('');
        setCarName('');
        setVehicleColor('');
        setNotes('');
        setViolations([{ violation_type: '', fee_at_time: '' }]);
        const res2 = await fetch(`${BACKEND_URL}/api/violation/next-id/`);
        const newData = await res2.json();
        setNextViolationId(newData.next_violation_id);
      } else {
        Alert.alert('Error', data.error || 'Failed to register violations.');
      }
    } catch (e) {
      Alert.alert('Network error', e.message);
    }
  };
  const handleLogout = () => {
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <BackgroundWrapper>
        <View className="flex-1 justify-center items-center p-10">
          <ActivityIndicator size="large" color="#000" />
          <Text className="mt-5">Loading officer details...</Text>
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
          {/* Officer Details Box */}
          <View className="bg-blue-200 p-4 rounded-xl w-[450px] shadow-md mb-2">
            <Text className="text-xl font-bold text-center mb-4 font-mono">Officer Details</Text>
            <Text className="mb-1 font-mono">Name: {officerDetails.full_name}</Text>
            <Text className="mb-1 font-mono">Badge ID: {officerDetails.badge_id}</Text>
            <Text className="mb-1 font-mono">Station: {officerDetails.station}</Text>
            <Text className="mb-1 font-mono">Phone: {officerDetails.phone_number}</Text>
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
          {/* Violation Form */}
          <View className="bg-blue-200 p-4 rounded-xl w-[450px] shadow-md mb-6 flex justify-center items-center">
            <Text className="text-xl font-bold text-center mb-4 font-mono">City Traffic Violation Ticket</Text>
            <View className="flex flex-row justify-start items-start w-full mb-3">
              <Text className="text-sm ml-[55px] font-mono">Violation ID: </Text>
              <Text className="text-sm ml-[5px] font-mono">
                {nextViolationId !== null ? nextViolationId : '...'}
              </Text>
            </View>

            <Text className="text-sm font-mono">Driver’s Name</Text>
            <TextInput
              className="border border-gray-300 bg-white rounded px-3 py-2 mb-3 w-[200px]"
              value={driverName}
              onChangeText={setDriverName}
            />

            <Text className="text-sm font-mono">License Number</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />

            <Text className="text-sm font-mono">Address</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={address}
              onChangeText={setAddress}
            />

            <Text className="text-sm font-mono">Plate Number</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={platenumber}
              onChangeText={setPlatenumber}
              placeholder="Plate Number"
            />

            <Text className="text-sm font-mono">Vehicle Type</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={vehicleType}
              onChangeText={setVehicleType}
              placeholder="Vehicle Type"
            />

            <Text className="text-sm font-mono">Car Name</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={carName}
              onChangeText={setCarName}
              placeholder="Car Name"
            />

            <Text className="text-sm font-mono">Vehicle Color</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={vehicleColor}
              onChangeText={setVehicleColor}
              placeholder="Vehicle Color"
            />

            <Text className="text-sm font-mono">Notes</Text>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes"
            />

            {/* Violations - only Violation Committed + Fee per entry */}
            {violations.map((v, idx) => (
              <View key={idx} className="w-full mt-2 mb-2 border-t border-blue-500 pt-2 flex justify-center items-center">
                <Text className="text-sm font-mono">Violation Committed</Text>
                {loadingViolationTypes ? (
                  <ActivityIndicator size="small" color="#000" style={{ marginBottom: 12 }} />
                ) : violationTypes.length === 0 ? (
                  <Text style={{ color: 'red', marginBottom: 12 }} className="font-mono">No violation types found.</Text>
                ) : (
                  <Picker
                    selectedValue={v.violation_type}
                    style={{ height: 40, width: 200, marginBottom: 12 }}
                    onValueChange={val => handleViolationChange(idx, 'violation_type', val)}
                  >
                    <Picker.Item label="Select Violation" value="" />
                    {violationTypes.map(type => (
                      <Picker.Item
                        key={type.violation_type ?? type.id}
                        label={type.violation_name}
                        value={type.violation_type ?? type.id}
                      />
                    ))}
                  </Picker>
                )}
                <Text className="text-sm font-mono">Violation Fee</Text>
                <TextInput
                  className="border border-gray-300 rounded px-3 py-2 mb-3 w-[200px] bg-white"
                  value={v.fee_at_time}
                  onChangeText={val => handleViolationChange(idx, 'fee_at_time', val)}
                  placeholder="Fee"
                  keyboardType="numeric"
                />
              </View>
            ))}

            <Pressable className="mb-4" onPress={handleAddMore}>
              <Text className="text-red-600 text-sm font-mono">Add More Violation</Text>
            </Pressable>

            <Pressable
              className="bg-white border border-gray-300 rounded-xl px-6 py-3 shadow"
              onPress={handleSubmit}
            >
              <Text className="text-black font-semibold text-center w-[150px] font-mono">Enter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </BackgroundWrapper>
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDetails(false)}>
          <View className="flex-1 bg-black/40 absolute top-0 left-0 right-0 bottom-0 z-10" />
        </TouchableWithoutFeedback>
        <View className="absolute top-[20%] left-[5%] w-[90%] min-h-[240px] max-h-[60%] bg-white rounded-2xl p-0 z-20 shadow-lg">
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-lg font-bold mb-4 text-center font-mono">
              More Officer Details
            </Text>
            <Text className="mb-2"><Text className="font-bold font-mono">Full Name:</Text> {officerDetails.full_name}</Text>
            <Text className="mb-2"><Text className="font-bold font-mono">Badge ID:</Text> {officerDetails.badge_id}</Text>
            <Text className="mb-2"><Text className="font-bold font-mono">Station:</Text> {officerDetails.station}</Text>
            <Text className="mb-2"><Text className="font-bold font-mono">Phone:</Text> {officerDetails.phone_number || 'N/A'}</Text>
            <Pressable
              className="mt-8 self-center bg-blue-600 rounded-xl py-2 px-6"
              onPress={() => setShowDetails(false)}
            >
              <Text className="text-white font-bold font-mono">Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}