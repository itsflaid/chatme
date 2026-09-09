import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname.startsWith("/login")
  const isPublicPage = req.nextUrl.pathname.startsWith("/privacy")

  if (!isLoggedIn && !isLoginPage && !isPublicPage) {
    return Response.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest|icons|.*\\.png|.*\\.json|.*\\.webmanifest|sitemap\\.xml|robots\\.txt).*)",
  ],
};