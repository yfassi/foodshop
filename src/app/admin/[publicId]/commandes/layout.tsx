import { CommandesShell } from "./_components/commandes-shell";

export default function CommandesLayout({ children }: { children: React.ReactNode }) {
  return <CommandesShell>{children}</CommandesShell>;
}
