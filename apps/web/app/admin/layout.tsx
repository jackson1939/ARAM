import { redirect } from 'next/navigation';
import { ShellLayout } from '@/components/ShellLayout';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  if (session.user.rol !== 'admin') redirect('/empresa/dashboard');

  return (
    <ShellLayout
      rol="admin"
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </ShellLayout>
  );
}
