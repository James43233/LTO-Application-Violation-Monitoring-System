import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Transaction() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError('');
      try {
        const driver_user_id = await AsyncStorage.getItem('driver_user_id');
        if (!driver_user_id) {
          setError('No user ID found.');
          setLoading(false);
          return;
        }
        const res = await fetch('http://127.0.0.1:8000/api/driver/payments/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driver_user_id: parseInt(driver_user_id, 10) }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
        } else {
          setPayments([]);
          setError(data.error || 'No payment history found.');
        }
      } catch (e) {
        setError('Unable to load payment history.');
      }
      setLoading(false);
    };
    fetchPayments();
  }, []);

  return (
    <BackgroundWrapper>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 32 }}>
        <View className="bg-white/70 w-[400px] rounded-2xl shadow-md p-6">
          <Text className="text-2xl font-bold text-center mb-6 font-mono">Payment Transactions</Text>
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#000" />
              <Text className="mt-2 font-mono">Loading payment history...</Text>
            </View>
          ) : error ? (
            <Text className="text-red-500 text-center">{error}</Text>
          ) : payments.length === 0 ? (
            <Text className="text-gray-400 text-center font-mono">No payment history found.</Text>
          ) : (
            <View>
              <View className="flex-row border-b border-gray-400 pb-2 mb-2">
                <Text className="flex-1 text-center font-semibold font-mono">Date</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Amount</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Ref #</Text>
                <Text className="flex-1 text-center font-semibold font-mono">Status</Text>
              </View>
              {payments.map((p, idx) => (
                <View key={idx} className="flex-row border-b border-gray-200 py-2 items-center">
                  <Text className="flex-1 text-center text-xs">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}
                  </Text>
                  <Text className="flex-1 text-center font-mono">{p.amount_paid} PHP</Text>
                  <Text className="flex-1 text-center text-xs font-mono">{p.transaction_ref}</Text>
                  <View className="flex-1 items-center font-mono">
                    <View className={`px-2 py-1 rounded-full 
                      ${p.status === 'completed' ? 'bg-green-200' : p.status === 'For Checking' ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                      <Text className={`text-xs font-semibold font-mono 
                        ${p.status === 'completed' ? 'text-green-800' : p.status === 'For Checking' ? 'text-yellow-800' : 'text-gray-800'}`}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable
            className="mt-8 bg-blue-600 rounded-xl py-3 px-8 self-center"
            onPress={() => router.replace('/Driver')}
          >
            <Text className="text-white font-bold text-center font-mono">Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}