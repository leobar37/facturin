import { useFormContext, Controller, type FieldValues, type Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormInputProps<T extends FieldValues = FieldValues> = {
  name: Path<T>;
  label: string;
  required?: boolean;
  description?: string;
  className?: string;
} & Omit<React.ComponentProps<'input'>, 'name'>;

export function FormInput<T extends FieldValues = FieldValues>({
  name,
  label,
  required,
  description,
  className,
  ...props
}: FormInputProps<T>) {
  const { control, formState: { errors } } = useFormContext<T>();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            id={name}
            {...field}
            {...props}
            aria-invalid={!!error}
          />
        )}
      />
      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
