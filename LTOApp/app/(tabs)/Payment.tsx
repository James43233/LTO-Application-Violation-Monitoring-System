import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, Alert } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Payment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [penalties, setPenalties] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [driverUserId, setDriverUserId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('driver_user_id').then((val) => setDriverUserId(val));
    if (params.selectedPenalties) {
      try {
        const parsed = JSON.parse(params.selectedPenalties);
        setPenalties(parsed.filter(p => p && Object.keys(p).length > 0));
      } catch {
        setPenalties([]);
      }
    }
  }, [params.selectedPenalties]);

  // Calculates the grand total
  const getTotal = () => (
    penalties.reduce((sum, p) => {
      const num = parseFloat(
        (p.fee_at_time || p.fee || '').toString().replace(/[^\d.]/g, '')
      );
      return sum + (isNaN(num) ? 0 : num);
    }, 0)
  );

  const handleSubmitPayment = async () => {
    if (!paymentMethod) {
      Alert.alert('Please select a payment method.');
      return;
    }
    if (!referenceId) {
      Alert.alert('Please enter the Reference ID.');
      return;
    }
    if (!driverUserId) {
      Alert.alert('User not logged in.');
      return;
    }
    if (!penalties.length) {
      Alert.alert('No penalties to pay.');
      return;
    }

    setSubmitting(true);
    let allSuccess = true;
    let failedPenalties = [];

    try {
      for (const penalty of penalties) {
        const violation_id = penalty.violation_id || penalty.id;
        if (!violation_id) {
          allSuccess = false;
          failedPenalties.push(penalty);
          continue;
        }
        // Pay only the penalty's amount, not the total for all
        const amount = parseFloat(
          (penalty.fee_at_time || penalty.fee || '').toString().replace(/[^\d.]/g, '')
        );
        const response = await fetch('http://127.0.0.1:8000/api/payment/submit/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            violation_id,
            driver_user_id: driverUserId,
            payment_type: paymentMethod,
            amount_paid: isNaN(amount) ? 0 : amount,
            transaction_ref: referenceId,
          }),
        });
        const data = await response.json();
        if (!data.success) {
          allSuccess = false;
          failedPenalties.push(penalty);
        }
      }
      if (allSuccess) {
        // Optional: clear form
        setPaymentMethod('');
        setReferenceId('');
        Alert.alert(
          'Payment Successful',
          'Your payment has been submitted!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/Driver'), // or router.back()
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          'Some Payments Failed',
          'Some penalties failed to be paid. Please try again.',
        );
      }
    } catch (e) {
      Alert.alert('Payment error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BackgroundWrapper>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 32 }}>
        <View className="bg-white/70 w-[400px] rounded-2xl shadow-md p-6">
          <Text className="text-2xl font-bold text-center mb-6 font-mono">Payment</Text>
          <View className="w-full">
            <View className="flex-row px-2 mb-2">
              <Text className="flex-1 text-center font-semibold text-sm uppercase text-black">Violation</Text>
              <Text className="flex-1 text-center font-semibold text-sm uppercase text-black">Officer</Text>
              <Text className="flex-1 text-center font-semibold text-sm uppercase text-black">Violation Fee</Text>
            </View>

            {/* Table Data (INSIDE the rounded card) */}
            <View className="bg-white p-4 rounded-2xl shadow-md border border-gray-200">
              {penalties.length === 0 ? (
                <View className="py-4">
                  <Text className="text-center text-gray-400 italic">No penalties selected.</Text>
                </View>
              ) : penalties.map((row, idx) => (
                <View
                  key={idx}
                  className={`flex-row py-3 items-center rounded-md ${
                    idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <Text className="flex-1 text-center text-gray-800">{row.violation_type || row.violation}</Text>
                  <Text className="flex-1 text-center text-gray-800">{row.officer}</Text>
                  <Text className="flex-1 text-center text-gray-800">
                    {(row.fee_at_time || row.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })} PHP
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              <View className="mt-4 w-full items-end">
                <Text className="text-right font-semibold text-gray-700 font-mono">
                  Total: {getTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-8">
            <Text className="text-base font-semibold mb-2 font-mono">Mode of Payment</Text>
            <View className="border border-gray-400 rounded-lg bg-white mb-4">
              <Picker
                selectedValue={paymentMethod}
                onValueChange={setPaymentMethod}
                style={{ height: 40 }}
                dropdownIconColor="#000"
              >
                <Picker.Item label="Select Payment Method" value="" />
                <Picker.Item label="Gcash" value="Gcash" />
                <Picker.Item label="Paymaya" value="Paymaya" />
                <Picker.Item label="Bank Transfer" value="BankTransfer" />
              </Picker>
            </View>
            {paymentMethod ? (
              <View className="items-center mb-4">
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(paymentMethod)}`,
                  }}
                  className="w-36 h-36 rounded-lg mb-2"
                  resizeMode="contain"
                />
                <Text className="text-xs text-gray-600 mb-1 font-mono">
                  Scan QR code to pay with {paymentMethod}
                </Text>
              </View>
            ) : null}
            <Text className="text-base font-semibold mb-2 font-mono">Reference ID</Text>
            <TextInput
              className="border border-gray-400 rounded-lg px-4 py-2 text-base mb-4 bg-white"
              placeholder="Enter Reference ID"
              value={referenceId}
              onChangeText={setReferenceId}
              keyboardType="default"
            />
            <Pressable
              className="bg-green-600 rounded-lg py-3 mt-2"
              onPress={handleSubmitPayment}
              disabled={submitting}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {submitting ? 'Processing...' : 'Submit Payment'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}