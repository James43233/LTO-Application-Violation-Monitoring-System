import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ViolationDetails() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const penalties = params.penalties ? JSON.parse(params.penalties) : [];
  const violation_id = params.violation_id || 'N/A';

  const [checked, setChecked] = useState(penalties.map(() => false));

  const {
    driverName = "N/A",
    licenseNumber = "N/A",
    address = "N/A",
    platenumber = "N/A",
    vehicleType = "N/A",
    carName = "N/A",
    vehicleColor = "N/A",
    notes = "",
    officerName = "N/A",
    officerTitle = "N/A",
    officerBadgeId = "N/A",
  } = params;

  const toggleCheck = (idx) => {
    setChecked(prev => prev.map((v, i) => (i === idx ? !v : v)));
  };

  // Handler for deleting selected penalties/violation (cancel)
  const handleDelete = () => {
    // Alert and go back to dashboard or previous page
    Alert.alert('Violation canceled');
    router.back();
  };

  // Calculate total fee for checked penalties
  const getTotal = () => {
    return penalties
      .reduce((sum, p, idx) => {
        if (checked[idx] && (p.violation || p.violation_type) && (p.fee || p.fee_at_time)) {
          const feeStr = p.fee || p.fee_at_time || "";
          const num = parseFloat(feeStr.replace(/[^\d.]/g, ""));
          return sum + (isNaN(num) ? 0 : num);
        }
        return sum;
      }, 0)
      .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Handler for confirming violations
  const handleConfirm = () => {
    Alert.alert('Violation details confirmed!');
    router.push('/(tabs)/Officer');
  };

  return (
    <BackgroundWrapper>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 24 }}>
        <View className="bg-white/70 p-6 rounded-xl w-[400px] shadow-md mb-6">
          <View>
            <Text className="text-xl font-bold text-center mb-4 font-mono">Violation Details</Text>
            <Text className="mb-1 font-bold font-mono text-md">Violation ID: {violation_id}</Text>
            <Text className="mb-[15px] text-center text-lg font-semibold font-mono">Driver's Information</Text>
            <Text className="mb-1 font-mono text-md">Driver's Name: {driverName}</Text>
            <Text className="mb-1 font-mono text-md">License Number: {licenseNumber}</Text>
            <Text className="mb-1 font-mono text-md">Address: {address}</Text>
            <Text className="mb-1 font-mono text-md">Plate Number: {platenumber}</Text>
            <Text className="mb-1 font-mono text-md">Vehicle Type: {vehicleType}</Text>
            <Text className="mb-1 font-mono text-md">Car Name: {carName}</Text>
            <Text className="mb-1 font-mono">Vehicle Color: {vehicleColor}</Text>
            {notes ? <Text className="mb-1 font-mono">Notes: {notes}</Text> : null}
            <Text className="mb-[15px] text-center text-lg font-semibold font-mono">Officer's Information</Text>
            <Text className="mb-1 font-mono text-md">Officer Name: {officerName}</Text>
            <Text className="mb-1 font-mono text-md">Officer Title: {officerTitle}</Text>
            <Text className="mb-1 font-mono text-md">Officer Badge ID: {officerBadgeId}</Text>
          </View>
          <View>
            {/* Penalties Table */}
            <View className="">
              <Text className="text-lg font-semibold text-center mb-2 font-mono mt-[20px]">Penalties</Text>
              {/* Table Headers */}
              <View className="flex-row border-b border-gray-400 pb-2 mb-1">
                <Text className="flex-1 text-center font-semibold font-mono">Violation</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Officer</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Violation Fee</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Select</Text>
              </View>
              {/* Table Rows */}
              {penalties.map((row, idx) => (
                <View key={idx} className="flex-row border-b border-gray-200 py-2 items-center">
                  <Text className="flex-1 text-center font-mono">{row.violation_type || row.violation || " "}</Text>
                  <Text className="flex-1 text-center font-mono">{row.officer || officerName || " "}</Text>
                  <Text className="flex-1 text-center font-mono">{row.fee_at_time || row.fee || " "}</Text>
                  <View className="flex-1 items-center">
                    {(row.violation_type || row.violation) ? (
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => toggleCheck(idx)}
                      >
                        <MaterialIcons
                          name={checked[idx] ? 'check-box' : 'check-box-outline-blank'}
                          size={22}
                          color="black"
                        />
                      </TouchableOpacity>
                    ) : (
                      <Text> </Text>
                    )}
                  </View>
                </View>
              ))}
              <View className="flex flex-row justify-between items-center pt-4 mb-[20px]">
                <View>
                  <Pressable
                    className="bg-red-600 rounded-md w-[120px] h-[30px] mt-4 flex justify-center items-center"
                    onPress={handleDelete}
                  >
                    <Text className="text-white font-semibold text-center font-mono">Delete Selected</Text>
                  </Pressable>
                </View>
                <View className="flex-row justify-between items-center pt-4">
                  <Text className="text-lg font-bold text-black font-mono">Total: ₱ {getTotal()}</Text>
                </View>
              </View>
              <View className="flex flex-row justify-between items-center mx-auto">
                <Pressable className="bg-blue-600 rounded-md w-[100px] h-[30px] flex justify-center items-center" onPress={handleConfirm}>
                  <Text className="text-white font-semibold font-mono">Enter</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
});