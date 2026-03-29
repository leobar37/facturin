import { useFormContext, Controller, type FieldValues, type Path } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

export type FormSelectProps<T extends FieldValues = FieldValues> = {
  name: Path<T>;
  label: string;
  options: SelectOption[];
  required?: boolean;
  description?: string;
  placeholder?: string;
  className?: string;
};

export function FormSelect<T extends FieldValues = FieldValues>({
  name,
  label,
  options,
  required,
  description,
  placeholder,
  className,
  ...props
}: FormSelectProps<T>) {
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
          <select
            id={name}
            {...field}
            {...props}
            aria-invalid={!!error}
            className={cn(
              'flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
              error && 'border-destructive'
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
