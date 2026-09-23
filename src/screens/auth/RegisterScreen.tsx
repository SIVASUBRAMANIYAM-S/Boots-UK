import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors } from '@/constants/colors';
import { supabase } from '@/services/supabase';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/utils/validation';

type RegisterForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterForm, string>>;

const EMPTY_FORM: RegisterForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validate(form: RegisterForm): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Enter your full name.';
  }
  if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function goToSignIn() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/login');
  }
}

export default function RegisterScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const updateField = (field: keyof RegisterForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as the user starts correcting it.
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleRegister = async () => {
    if (isSubmitting) return;

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const email = form.email.trim();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // The users profile row (with Advantage Card number) is created by a
      // database trigger from this metadata; see
      // supabase/migrations/20260924000000_create_user_profile_on_signup.sql.
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: { data: { full_name: form.fullName.trim() } },
      });

      if (error) {
        setSubmitError(error.message);
        return;
      }

      // With email confirmation off, signUp signs the user in and the root
      // layout switches to Home on its own. Otherwise, ask them to confirm.
      if (!data.session) {
        setConfirmationEmail(email);
      }
    } catch {
      setSubmitError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationEmail) {
    return (
      <AuthScreenLayout>
        <View style={styles.success}>
          <Text style={styles.successTitle} accessibilityRole="header">
            Check your email to confirm account
          </Text>
          <Text style={styles.successBody}>
            We sent a confirmation link to {confirmationEmail}. Open it, then sign in.
          </Text>
          <PrimaryButton label="Back to Sign In" onPress={goToSignIn} />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <View style={styles.form}>
        <FormField
          label="Full Name"
          value={form.fullName}
          onChangeText={updateField('fullName')}
          error={fieldErrors.fullName}
          placeholder="Jane Smith"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!isSubmitting}
        />
        <FormField
          ref={emailRef}
          label="Email"
          value={form.email}
          onChangeText={updateField('email')}
          error={fieldErrors.email}
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
          value={form.password}
          onChangeText={updateField('password')}
          error={fieldErrors.password}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          editable={!isSubmitting}
        />
        <FormField
          ref={confirmPasswordRef}
          label="Confirm Password"
          value={form.confirmPassword}
          onChangeText={updateField('confirmPassword')}
          error={fieldErrors.confirmPassword}
          placeholder="Re-enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
          editable={!isSubmitting}
        />

        {submitError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}

        <PrimaryButton label="Create Account" onPress={handleRegister} isLoading={isSubmitting} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            onPress={goToSignIn}
            disabled={isSubmitting}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>Sign In</Text>
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
  success: {
    gap: 16,
  },
  successTitle: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBody: {
    color: Colors.darkText,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
});
