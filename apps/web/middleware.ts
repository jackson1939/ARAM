import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') && token?.rol !== 'admin') {
      return NextResponse.redirect(new URL('/empresa/dashboard', req.url));
    }

    if (path.startsWith('/empresa') && token?.rol !== 'empresa') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    if (path === '/') {
      if (token) {
        const dest = token.rol === 'admin' ? '/admin/dashboard' : '/empresa/dashboard';
        return NextResponse.redirect(new URL(dest, req.url));
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (
          path === '/' ||
          path.startsWith('/api/webhook') ||
          path.startsWith('/api/telegram') ||
          path.startsWith('/api/auth') ||
          path === '/api/public-stats' ||
          path === '/login'
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
