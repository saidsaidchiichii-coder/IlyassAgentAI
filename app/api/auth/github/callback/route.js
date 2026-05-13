import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // GitHub denied access
  if (error || !code) {
    return NextResponse.redirect(
      new URL('/?github_error=access_denied', 'https://my-webxyu.vercel.app')
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: 'https://my-webxyu.vercel.app/api/auth/github/callback',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[GitHub CB] No token:', tokenData);
      return NextResponse.redirect(
        new URL('/?github_error=token_failed', 'https://my-webxyu.vercel.app')
      );
    }

    // Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });
    const user = await userRes.json();

    // Redirect to frontend with token + user info in URL params
    const params = new URLSearchParams({
      github_token:  tokenData.access_token,
      github_user:   user.login        || '',
      github_name:   user.name         || user.login || '',
      github_avatar: user.avatar_url   || '',
      github_repos:  String(user.public_repos || 0),
    });

    return NextResponse.redirect(
      new URL(`/?${params}`, 'https://my-webxyu.vercel.app')
    );

  } catch (err) {
    console.error('[GitHub CB] Error:', err);
    return NextResponse.redirect(
      new URL(`/?github_error=${encodeURIComponent(err.message)}`, 'https://my-webxyu.vercel.app')
    );
  }
}
