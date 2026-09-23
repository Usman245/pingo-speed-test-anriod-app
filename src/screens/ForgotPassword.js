import { useState } from 'react';
import { View, Text } from 'react-native';
import Button from '../components/Button';
import Field from '../components/Field';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';

export default function ForgotPassword({ toAuth }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailOk && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 pt-[30px] px-[22px] pb-[22px] gap-4">
      <View>
        <Button title="← Back to login" variant="text" onPress={toAuth} className="self-start -ml-3" />
        <Text className="text-[11.5px] font-o8 tracking-[0.16em] uppercase text-muted1 mt-2">
          Reset password
        </Text>
        <Text className="font-o9 text-[40px] leading-[40px] tracking-[-0.045em] text-ink mt-2.5 mb-2">
          Forgot it?
        </Text>
        <Text className="text-[14.5px] font-o5 leading-[21px] text-muted2 max-w-[290px]">
          Enter the email on your account and we’ll send you a link to reset your password.
        </Text>
      </View>

      <Card className="p-[18px] gap-3.5">
        <Field
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setSent(false);
          }}
        />
      </Card>

      {error ? (
        <View className="bg-dangerbg rounded-2xl px-4 py-3">
          <Text className="text-[12.5px] font-o7 text-danger">{error}</Text>
        </View>
      ) : null}
      {sent ? (
        <View className="bg-lime rounded-2xl px-4 py-3">
          <Text className="text-[12.5px] font-o7 text-ink">Reset link sent — check your inbox.</Text>
        </View>
      ) : null}

      <View>
        <Button
          title={busy ? 'Sending…' : 'Send reset link'}
          variant="primary"
          block
          disabled={!canSubmit}
          onPress={submit}
        />
        <Button title="Back to login" variant="text" block onPress={toAuth} className="mt-1.5" />
      </View>
    </View>
  );
}
