export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: 'https://my-webxyu.vercel.app/api/auth/github/callback',
    scope: 'repo read:user user:email',
  });
  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
