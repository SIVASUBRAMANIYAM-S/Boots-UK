import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from './src/services/supabase';

export default function App() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data, error }) => {
        if (error) setStatus('Error: ' + error.message);
        else setStatus('Connected! Categories: ' + data?.length);
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
