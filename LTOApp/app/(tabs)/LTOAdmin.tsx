import React, { useState, useEffect } from 'react';
import { Text, View, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import BackgroundWrapper from '@/components/backgroundwrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type AdminDetails = {
  full_name: string;
  position: string;
  phone_number: string;
};

type AuditLog = {
  id: number;
  action?: string;
  description?: string;
  timestamp: string;
};

type DriverUser = {
  id: number;
  name: string;
  license: string;
  status: string;
};

type Payment = {
  id: number;
  driver: string;
  amount: number;
  transaction_ref: string;
  status: string; // <-- add this!
};

export default function LTOAdmin() {
  const [tab, setTab] = useState<'audit' | 'payments' | 'drivers'>('audit');
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showVerified, setShowVerified] = useState(false);
  const router = useRouter();

  // Filter payments based on showCompleted state
  const filteredPayments = showCompleted
    ? payments.filter(p => p.status === 'completed')
    : payments.filter(p => p.status !== 'completed');

  const filteredDrivers = showVerified
    ? drivers.filter(d => d.status === 'Verified')
    : drivers;


  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const uid = await AsyncStorage.getItem('user_id');
        if (!uid) throw new Error('No admin user_id found in storage');
        setUserId(Number(uid));

        // Fetch admin details
        const adminRes = await fetch('http://127.0.0.1:8000/api/lto_admin_details/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: Number(uid) })
        });
        const adminData = await adminRes.json();
        if (!adminRes.ok || !adminData.success) {
          throw new Error(adminData.error || 'Failed to fetch admin details');
        }
        setAdminDetails({
          full_name: adminData.full_name,
          position: adminData.position,
          phone_number: adminData.phone_number,
        });

        // Fetch audit logs
        const logsRes = await fetch('http://127.0.0.1:8000/api/lto_admin_audit_logs/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: Number(uid) })
        });
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs ?? []);

        // Fetch driver users
        const driversRes = await fetch('http://127.0.0.1:8000/api/driver_users/');
        const driversData = await driversRes.json();
        setDrivers(driversData.drivers ?? []);

        // Fetch payments
        const paymentsRes = await fetch('http://127.0.0.1:8000/api/payments/');
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments ?? []);
      } catch (e: any) {
        Alert.alert('Error', e.message ?? 'Failed to load admin dashboard.');
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleUpdatePaymentStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/update_payment_status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: id, status: 'completed', user_id: userId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update payment status');
      setPayments(payments =>
        payments.map(p => (p.id === id ? { ...p, status: newStatus } : p))
      );
      setAuditLogs(logs => [
        { id: Date.now(), action: `Updated payment #${id} to ${newStatus}`, timestamp: new Date().toLocaleString() },
        ...logs,
      ]);
      Alert.alert('Status Updated', `Payment #${id} status set to ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not update payment status');
    }
  };

  const handleVerifyDriver = async (id: number) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/verify_driver_admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_user_id: id, user_id: userId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to verify driver');
      setDrivers(drivers =>
        drivers.map(d => (d.id === id ? { ...d, status: 'verified' } : d))
      );
      setAuditLogs(logs => [
        { id: Date.now(), action: `Verified driver #${id}`, timestamp: new Date().toLocaleString() },
        ...logs,
      ]);
      Alert.alert('Driver Verified', `Driver #${id} is now verified.`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not verify driver');
    }
  };
  const handleUpdateLicenseExpiry = async (id: number, currentExpiry?: string) => {
    let newExpiry = currentExpiry ?? '';
    // Use Alert.prompt if available (iOS), else fallback for Android
    if (typeof Alert.prompt === 'function') {
        Alert.prompt(
        'Update License Expiry',
        'Enter new expiry date (YYYY-MM-DD):',
        [
            {
            text: 'Cancel',
            style: 'cancel',
            },
            {
            text: 'OK',
            onPress: async (input) => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
                Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
                return;
                }
                await doUpdate(id, input);
            },
            },
        ],
        'plain-text',
        newExpiry
        );
    } else {
        // For Android, simple prompt with fallback
        const input = prompt('Enter new expiry date (YYYY-MM-DD):', newExpiry) || '';
        if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        await doUpdate(id, input);
        } else if (input) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
        }
    }

    async function doUpdate(id: number, expiry: string) {
        try {
        const res = await fetch('http://127.0.0.1:8000/api/update_license_expiry/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_user_id: id, license_expiry: expiry, user_id: userId })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update expiry');
        setDrivers(drivers =>
            drivers.map(d => (d.id === id ? { ...d, license_expiry: expiry } : d))
        );
        setAuditLogs(logs => [
            { id: Date.now(), action: `Updated license expiry for driver #${id}`, timestamp: new Date().toLocaleString() },
            ...logs,
        ]);
        Alert.alert('License Expiry Updated', `Driver #${id} license expiry set to ${expiry}`);
        } catch (e: any) {
        Alert.alert('Error', e.message ?? 'Could not update license expiry');
        }
    }
    };
    const handleLogout = () => {
      router.replace('/(tabs)');
    };


  return (
    <BackgroundWrapper>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}>
        <View className="bg-blue-200 p-4 rounded-xl w-[450px] shadow-md mb-2">
          <Text className="text-xl font-bold text-center mb-4">LTO Admin Details</Text>
          <Text className="mb-1">Full Name: {adminDetails?.full_name}</Text>
          <Text className="mb-1">Position: {adminDetails?.position}</Text>
          <Text className="mb-1">Phone: {adminDetails?.phone_number}</Text>
          <View className="flex flex-row justify-evenly items-center">
              <View>
                <Pressable
                  className="bg-white border border-gray-300 rounded mt-4 py-2 w-[150px]"
                >
                  <Text className="text-center text-black">Show More Details</Text>
                </Pressable>
              </View>
              <View className="">
                <Pressable
                  className="bg-white border border-gray-300 rounded mt-4 py-2 w-[150px]"
                >
                  <Text className="text-center text-black" onPress={handleLogout}>Log out</Text>
                </Pressable>
              </View>
            </View>
        </View>
        <View className="bg-blue-200 p-4 rounded-xl w-[450px] shadow-md mb-5 min-h-[700px]">
          {/* Navigation Tabs */}
          <View className="flex-row mb-4">
            <Pressable
              className={`flex-1 py-2 rounded-t-lg ${tab === 'audit' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onPress={() => setTab('audit')}
            >
              <Text className={`text-center font-semibold ${tab === 'audit' ? 'text-white' : 'text-black'}`}>Audit Logs</Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-2 rounded-t-lg ${tab === 'payments' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onPress={() => setTab('payments')}
            >
              <Text className={`text-center font-semibold ${tab === 'payments' ? 'text-white' : 'text-black'}`}>Payments</Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-2 rounded-t-lg ${tab === 'drivers' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onPress={() => setTab('drivers')}
            >
              <Text className={`text-center font-semibold ${tab === 'drivers' ? 'text-white' : 'text-black'}`}>Driver Users</Text>
            </Pressable>
          </View>
          {/* Tab Content */}
          {tab === 'audit' && (
            <View>
              <Text className="font-bold text-lg mb-2">Audit Logs</Text>
              {auditLogs.length === 0 ? (
                <Text className="text-gray-500">No logs available.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 550 }}>
                  {auditLogs.map((log, idx) => (
                    <View key={log.id || idx} className="flex-row border-b border-gray-200 py-2">
                      <Text className="flex-1">{log.action || log.description}</Text>
                      <Text className="flex-1 text-xs text-gray-600">{log.timestamp}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          {tab === 'payments' && (
            <View className="w-full px-4">
              <Text className="font-bold text-xl text-center my-[10px] text-gray-800">🧾 Payments</Text>
              {/* Header */}
              <View className="flex-row bg-blue-100 rounded-md px-2 py-2 mb-2">
                <Text className="flex-1 text-xs text-center font-semibold text-gray-700">Driver</Text>
                <Text className="flex-1 text-xs text-center font-semibold text-gray-700">Amount</Text>
                <Text className="flex-1 text-xs text-center font-semibold text-gray-700">Ref</Text>
                <Text className="flex-1 text-xs text-center font-semibold text-gray-700">Action</Text>
              </View>

              <ScrollView className="bg-white rounded-lg shadow-md" style={{ maxHeight: 550 }}>
                {filteredPayments.map(p => (
                  <View
                    key={p.id}
                    className="flex-row items-center border-b border-gray-200 px-2 py-3 bg-white"
                  >
                    <Text className="flex-1 text-xs text-center text-gray-800">{p.driver}</Text>
                    <Text className="flex-1 text-xs text-center text-blue-700 font-bold">{p.amount} PHP</Text>
                    <Text className="flex-1 text-[10px] text-center text-gray-600">{p.transaction_ref}</Text>
                    <View className="flex-1 items-center">
                      {!showCompleted ? (
                        <Pressable
                          className="bg-green-500 px-2 py-1 rounded-full"
                          onPress={() => handleUpdatePaymentStatus(p.id, 'completed')}
                        >
                          <Text className="text-white text-[10px] font-semibold">Mark Completed</Text>
                        </Pressable>
                      ) : (
                        <Text className="text-green-700 text-[11px] font-medium">✅ Completed</Text>
                      )}
                    </View>
                  </View>
                ))}

                {filteredPayments.length === 0 && (
                  <Text className="text-center text-gray-500 my-6">
                    {showCompleted ? 'No completed payments.' : 'No pending payments.'}
                  </Text>
                )}
                <Pressable
                  className={`mb-4 px-4 py-2 rounded-full self-center ${
                    showCompleted ? 'bg-blue-300' : 'bg-blue-500'
                  }`}
                  onPress={() => setShowCompleted(!showCompleted)}
                >
                  <Text className="text-white text-sm font-semibold">
                    {showCompleted ? 'Hide Completed Payments' : 'Show Completed Payments'}
                  </Text>
              </Pressable>
              </ScrollView>
              
            </View>
          )}
          {tab === 'drivers' && (
            <View className="w-full px-4">
              <Text className="font-bold text-lg mb-2 text-center">Driver Users</Text>

              <ScrollView style={{ maxHeight: 300 }}>
                <View className="border border-gray-300 rounded-md">
                  {/* Table Header */}
                  <View className="flex-row bg-blue-100 py-2 px-2">
                    <Text className="flex-1 text-center font-semibold text-xs">Name</Text>
                    <Text className="flex-1 text-center font-semibold text-xs">License</Text>
                    <Text className="flex-1 text-center font-semibold text-xs">Expiry</Text>
                    <Text className="flex-1 text-center font-semibold text-xs">Action</Text>
                  </View>

                  {/* Table Body */}
                  <ScrollView style={{ maxHeight: 200 }}>
                    {filteredDrivers
                      .filter(d => showVerified ? d.status === 'Verified' : d.status !== 'Verified')
                      .map(d => (
                        <View
                          key={d.id}
                          className="flex-row items-center border-t border-gray-200 py-2 px-2 bg-white"
                        >
                          <Text className="flex-1 text-center text-xs">{d.name}</Text>
                          <Text className="flex-1 text-center text-xs">{d.license}</Text>
                          <Text className="flex-1 text-center text-xs">
                            {d.license_expiry || 'N/A'}
                          </Text>
                          <View className="flex-1 flex-row justify-center space-x-1">
                            {!showVerified && (
                              <Pressable
                                className="bg-blue-500 px-2 py-1 rounded"
                                onPress={() => handleVerifyDriver(d.id)}
                              >
                                <Text className="text-white text-xs">Verify</Text>
                              </Pressable>
                            )}
                            <Pressable
                              className="bg-orange-500 px-2 py-1 rounded"
                              onPress={() => handleUpdateLicenseExpiry(d.id, d.license_expiry)}
                            >
                              <Text className="text-white text-xs">Edit</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    {filteredDrivers.filter(d => showVerified ? d.status === 'Verified' : d.status !== 'Verified').length === 0 && (
                      <Text className="text-center text-gray-500 py-4 text-sm">
                        {showVerified ? 'No verified users.' : 'No non-verified users.'}
                      </Text>
                    )}
                  </ScrollView>
                  <Pressable
                    className={`my-2 px-4 py-2 rounded self-center ${showVerified ? 'bg-blue-300' : 'bg-blue-500'}`}
                    onPress={() => setShowVerified(!showVerified)}
                  >
                    <Text className="text-white text-center">
                      {showVerified ? 'Show Non-Verified Users' : 'Show Verified Users'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}