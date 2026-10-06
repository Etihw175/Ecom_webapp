export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-brand-sky/10 px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
