import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  errors?: string[];
};

/** Label + Input + Thai error text. */
export function FormField({ label, name, errors, id, ...props }: Props) {
  const inputId = id ?? name;
  const error = errors?.[0];
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "rounded-md border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-sm text-brand-green"
          : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {message}
    </p>
  );
}
