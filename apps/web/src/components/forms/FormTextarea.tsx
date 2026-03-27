import { forwardRef } from 'react';
import { useFormContext, Controller, type FieldValues, type Path } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormTextareaProps<T extends FieldValues = FieldValues> = {
  name: Path<T>;
  label: string;
  required?: boolean;
  description?: string;
  rows?: number;
  className?: string;
};

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps<FieldValues>>(
  ({ name, label, required, description, rows = 3, className, ...props }, ref) => {
    const { control, formState: { errors } } = useFormContext();
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
            <textarea
              id={name}
              ref={ref}
              rows={rows}
              {...field}
              {...props}
              aria-invalid={!!error}
              className={cn(
                'flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none resize-none',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
                'placeholder:text-muted-foreground',
                error && 'border-destructive'
              )}
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
);

FormTextarea.displayName = 'FormTextarea';
