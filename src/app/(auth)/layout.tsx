export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Siteflo Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Service contract tracker</p>
        </div>
        {children}
      </div>
    </div>
  );
}
