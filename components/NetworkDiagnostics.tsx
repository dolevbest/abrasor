import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Wifi, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react-native';

interface NetworkTest {
  name: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
  responseTime?: number;
}

export default function NetworkDiagnostics() {
  const [tests, setTests] = useState<NetworkTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const getApiBase = () => {
    const envBase = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE 
      || process.env.EXPO_PUBLIC_API_BASE;
    
    if (envBase) {
      return envBase.replace(/\/$/, "");
    }
    
    if (Platform.OS === "android") {
      return "http://10.0.2.2:3001";
    } else if (Platform.OS === "web") {
      return "http://localhost:3001";
    } else {
      return "http://localhost:3001";
    }
  };

  const apiBase = getApiBase();

  const initializeTests = useCallback((): NetworkTest[] => [
    {
      name: 'API Health Check',
      url: `${apiBase}/api`,
      status: 'pending'
    },
    {
      name: 'API Test Endpoint',
      url: `${apiBase}/api/test`,
      status: 'pending'
    },
    {
      name: 'tRPC Endpoint',
      url: `${apiBase}/api/trpc`,
      status: 'pending'
    }
  ], [apiBase]);

  const runNetworkTest = async (test: NetworkTest): Promise<NetworkTest> => {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing: ${test.name} - ${test.url}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        console.log(`✅ ${test.name} - Success (${responseTime}ms)`);
        return {
          ...test,
          status: 'success',
          responseTime
        };
      } else {
        console.log(`❌ ${test.name} - HTTP ${response.status}`);
        return {
          ...test,
          status: 'error',
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${test.name} - Error:`, error.message);
      
      return {
        ...test,
        status: 'error',
        error: error.message || 'Network error',
        responseTime
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const initialTests = initializeTests();
    setTests(initialTests);

    console.log('🚀 Starting network diagnostics...');
    console.log(`📱 Platform: ${Platform.OS}`);
    console.log(`🔗 API Base: ${apiBase}`);

    const results: NetworkTest[] = [];
    
    for (const test of initialTests) {
      const result = await runNetworkTest(test);
      results.push(result);
      setTests([...results, ...initialTests.slice(results.length)]);
    }

    setTests(results);
    setIsRunning(false);

    // Show summary
    const successCount = results.filter(t => t.status === 'success').length;
    const totalCount = results.length;
    
    console.log(`📊 Network test results: ${successCount}/${totalCount} tests passed`);
    if (successCount === totalCount) {
      console.log('✅ All network tests passed!');
    } else {
      console.warn(`⚠️ ${totalCount - successCount} network tests failed`);
    }
  };

  const runAllTestsCallback = useCallback(runAllTests, [apiBase, initializeTests]);

  useEffect(() => {
    runAllTestsCallback();
  }, [runAllTestsCallback]);

  const getStatusIcon = (status: NetworkTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color="#10B981" />;
      case 'error':
        return <AlertCircle size={20} color="#EF4444" />;
      default:
        return <RefreshCw size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: NetworkTest['status']) => {
    switch (status) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Wifi size={24} color="#3B82F6" />
        <Text style={styles.title}>Network Diagnostics</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>API Base: {apiBase}</Text>
        <Text style={styles.infoText}>
          Environment: {(Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE ? 'Configured' : 'Fallback'}
        </Text>
      </View>

      <ScrollView style={styles.testsList}>
        {tests.map((test) => (
          <View key={test.url} style={styles.testItem}>
            <View style={styles.testHeader}>
              {getStatusIcon(test.status)}
              <Text style={styles.testName}>{test.name}</Text>
              {test.responseTime && (
                <Text style={styles.responseTime}>{test.responseTime}ms</Text>
              )}
            </View>
            
            <Text style={styles.testUrl}>{test.url}</Text>
            
            {test.error && (
              <Text style={[styles.errorText, { color: getStatusColor(test.status) }]}>
                {test.error}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.retryButton, isRunning && styles.retryButtonDisabled]} 
        onPress={runAllTests}
        disabled={isRunning}
      >
        <RefreshCw size={20} color="white" />
        <Text style={styles.retryButtonText}>
          {isRunning ? 'Running Tests...' : 'Retry Tests'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#1F2937',
  },
  info: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  testsList: {
    flex: 1,
  },
  testItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    color: '#1F2937',
  },
  responseTime: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testUrl: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  retryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});