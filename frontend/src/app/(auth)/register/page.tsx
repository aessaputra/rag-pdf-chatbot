'use client';

import { useAuth } from '@/hooks/useAuth';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthError } from '@/components/auth/AuthError';
import { AuthForm } from '@/components/auth/AuthForm';

export default function RegisterPage() {
  const {
    email,
    password,
    authState,
    setEmail,
    setPassword,
    handleSubmit,
  } = useAuth('signup');

  return (
    <>
      <AuthHeader mode="signup" />
      <AuthError message={authState.status === 'error' ? authState.message : undefined} />
      <AuthForm
        mode="signup"
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authState={authState}
        onSubmit={handleSubmit}
      />
    </>
  );
}
