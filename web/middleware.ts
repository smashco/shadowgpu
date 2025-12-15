import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Build the public path list (assets, api, login)
    // We only want to protect /dashboard
    if (path.startsWith('/dashboard')) {
        const token = request.cookies.get('shadow_auth_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
