import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Button from '../components/Button';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { useEffect as useMountLog } from 'react';
import { colors } from '../theme';

const COPY = {
  signup: {
    kicker: 'Pingo account',
    title: 'Keep your history.',
    sub: 'Results sync to your account and turn into trends.',
    cta: 'Create account',
    passwordHint: 'At least 8 characters',
  },
  login: {
    kicker: 'Welcome back',
    title: 'Log in.',
    sub: 'Pick up your history where you left off.',
    cta: 'Log in',
    passwordHint: 'Your password',
  },
};

export default function Auth({ toTest }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useMountLog(() => {
    console.log('[GAUGE] Auth MOUNTED');
    return () => console.log('[GAUGE] Auth UNMOUNTED');
  }, []);
  console.log(`[GAUGE] Auth render mode=${mode} email=${email.length} pw=${password.length}`);

  const copy = COPY[mode];
  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const passwordOk = mode === 'signup' ? password.length >= 8 : password.length > 0;
  const canSubmit = emailOk && passwordOk && !busy;

  const emailHint = email.length > 0 && !emailOk ? 'That doesn’t look like an email address yet.' : '';
  const passwordHint =
    mode === 'signup' && password.length > 0 && password.length < 8
      ? `${8 - password.length} more character${8 - password.length === 1 ? '' : 's'} needed.`
      : '';
  const blockedBy = !emailOk
    ? 'Enter your email address to continue.'
    : !passwordOk
      ? mode === 'signup'
        ? 'Choose a password of at least 8 characters.'
        : 'Enter your password to continue.'
      : '';

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // Supabase returns no session when the project requires email confirmation.
        if (!data.session) {
          setNotice('Check your inbox to confirm your email, then log in.');
          setMode('login');
          setPassword('');
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }
      toTest();
    } catch (e) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!emailOk) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) setError(resetError.message);
    else setNotice('Password reset link sent — check your inbox.');
  };

  return (
    <View className="flex-1 pt-[30px] px-[22px] pb-[22px] gap-4">
      <View>
        <Text className="text-[11.5px] font-o8 tracking-[0.16em] uppercase text-muted1">{copy.kicker}</Text>
        <Text className="font-o9 text-[40px] leading-[40px] tracking-[-0.045em] text-ink mt-2.5 mb-2">{copy.title}</Text>
        <Text className="text-[14.5px] font-o5 leading-[21px] text-muted2 max-w-[290px]">{copy.sub}</Text>
      </View>

      <Segmented
        options={[
          { label: 'Sign up', value: 'signup' },
          { label: 'Log in', value: 'login' },
        ]}
        value={mode}
        onChange={switchMode}
        trackClassName="bg-segtrack"
        optionClassName="py-[9px] px-5"
      />

      <Card className="p-[18px] gap-3.5">
        <Field
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
        />
        {emailHint ? <Text className="text-[11.5px] font-o6 text-muted1 -mt-2">{emailHint}</Text> : null}
        <Field
          label="Password"
          secureTextEntry
          placeholder={copy.passwordHint}
          value={password}
          onChangeText={setPassword}
        />
        {passwordHint ? <Text className="text-[11.5px] font-o6 text-muted1 -mt-2">{passwordHint}</Text> : null}
        {mode === 'login' ? (
          <Button title="Forgot password?" variant="link" onPress={resetPassword} className="self-start" />
        ) : null}
      </Card>

      {error ? (
        <View className="bg-dangerbg rounded-2xl px-4 py-3">
          <Text className="text-[12.5px] font-o7 text-danger">{error}</Text>
        </View>
      ) : null}
      {notice ? (
        <View className="bg-lime rounded-2xl px-4 py-3">
          <Text className="text-[12.5px] font-o7 text-ink">{notice}</Text>
        </View>
      ) : null}

      <View>
        <Button title={busy ? 'Working…' : copy.cta} variant="primary" block disabled={!canSubmit} onPress={submit} />
        {blockedBy && !busy ? (
          <Text className="text-[11.5px] font-o6 text-muted1 text-center mt-2">{blockedBy}</Text>
        ) : null}
        {busy ? <ActivityIndicator color={colors.ink} className="mt-2" /> : null}
        <Button title="Continue without an account" variant="text" block onPress={toTest} className="mt-1.5" />
      </View>

      <Text className="text-xs font-o6 text-muted1 max-w-[300px] mt-auto">
        Tests run the same either way. An account only adds storage and trends.
      </Text>
    </View>
  );
}
