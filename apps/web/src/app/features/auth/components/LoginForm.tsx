import React from 'react';
import { useNavigate } from 'react-router';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormInput, FormPassword } from '@/components/forms';
import { loginSchema, type LoginInput } from '../schemas/login-schema';

export function LoginForm() {
  const navigate = useNavigate();
  
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('auth_token', responseData.token);
      localStorage.setItem('auth_user', JSON.stringify(responseData.user));

      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      setGeneralError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = form.formState.isValid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-blue-600 mb-2">Facturin</h1>
          <p className="text-gray-500 text-sm">Sistema de Facturación Electrónica</p>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm" role="alert">
                {generalError}
              </div>
            )}

            <FormInput<LoginInput>
              name="email"
              label="Email"
              type="email"
              placeholder="admin@facturin.local"
              autoComplete="email"
              disabled={isLoading}
              required
            />

            <FormPassword<LoginInput>
              name="password"
              label="Contraseña"
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              disabled={isLoading}
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
