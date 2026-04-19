export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
