import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors } from '@/constants/colors';
import { supabase } from '@/services/supabase';
import { isValidEmail } from '@/utils/validation';

function getSignInErrorMessage(message: string): string {
  if (message === 'Invalid login credentials') {
    return 'Incorrect email or password.';
  }
  if (message === 'Email not confirmed') {
    return 'Please confirm your email address before signing in.';
  }
  return message;
}

export default function LoginScreen() {
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (isSubmitting) return;

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // On success the session changes and the root layout switches to Home.
      if (signInError) {
        setError(getSignInErrorMessage(signInError.message));
      }
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout>
      <View style={styles.form}>
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!isSubmitting}
        />
        <FormField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          editable={!isSubmitting}
        />

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <PrimaryButton label="Sign In" onPress={handleSignIn} isLoading={isSubmitting} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Pressable
            onPress={() => router.push('/register')}
            disabled={isSubmitting}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>Register</Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: Colors.darkText,
    fontSize: 15,
  },
  link: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
