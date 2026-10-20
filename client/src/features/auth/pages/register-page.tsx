import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@homely/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import { Button, FormAlert, Input } from '@/shared/ui/index.ts';
import { useRegister } from '../api/session.ts';

export function RegisterPage() {
  const register = useRegister();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await register.mutateAsync(values);
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['name', 'email', 'password']));
    }
  });

  return (
    <>
      <h1 className="text-display">Crea tu cuenta</h1>
      <p className="mt-1 mb-8 text-body text-fg-2">
        Cada persona del hogar tiene la suya. Luego creas tu hogar o te unes con un código.
      </p>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <Input
          label="Nombre"
          autoComplete="given-name"
          error={errors.name?.message}
          {...form.register('name')}
        />
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
          autoComplete="new-password"
          helper="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" fullWidth loading={register.isPending} className="mt-2">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-8 text-center text-small text-fg-2">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={location.state} className="font-medium text-accent">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
