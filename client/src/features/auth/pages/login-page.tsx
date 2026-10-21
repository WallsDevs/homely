import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@homely/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import { Button, FormAlert, Input } from '@/shared/ui/index.ts';
import { useAuthOptions, useLogin } from '../api/session.ts';

export function LoginPage() {
  const login = useLogin();
  const options = useAuthOptions();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      // El guard de invitado redirige a la página de origen.
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['email', 'password']));
    }
  });

  return (
    <>
      <h1 className="text-display">Hola de nuevo</h1>
      <p className="mt-1 mb-8 text-body text-fg-2">Inicia sesión para ver tu hogar.</p>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" fullWidth loading={login.isPending} className="mt-2">
          Iniciar sesión
        </Button>
      </form>

      {options.data?.registrationOpen && (
        <p className="mt-8 text-center text-small text-fg-2">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" state={location.state} className="font-medium text-accent">
            Crear cuenta
          </Link>
        </p>
      )}
    </>
  );
}
