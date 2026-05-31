import { redirect } from 'next/navigation';
import { ShellLayout } from '@/components/ShellLayout';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  if (session.user.rol !== 'empresa' && session.user.rol !== 'admin') redirect('/admin/dashboard');

  return (
    <ShellLayout
      rol={session.user.rol as 'admin' | 'empresa'}
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </ShellLayout>
  );
}
