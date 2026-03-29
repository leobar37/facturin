import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms';
import { createApiKeySchema, type CreateApiKeyInput } from '../schemas/api-key-schemas';

type CreateApiKeyFormProps = {
  onSuccess: (data: CreateApiKeyInput) => void;
  onCancel: () => void;
  isPending: boolean;
};

export function CreateApiKeyForm({ onSuccess, onCancel, isPending }: CreateApiKeyFormProps) {
  const form = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      expiresAt: '',
    },
  });

  const handleSubmit = (data: CreateApiKeyInput) => {
    onSuccess(data);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormInput
          name="name"
          label="Nombre de la API Key"
          placeholder="Ej: Producción API"
          required
          disabled={isPending}
        />

        <FormInput
          name="expiresAt"
          label="Fecha de Expiración (opcional)"
          type="date"
          disabled={isPending}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || !form.formState.isValid}>
            {isPending ? 'Creando...' : 'Crear'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
