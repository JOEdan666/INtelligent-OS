import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 定义需要保护的路由
// 除了公开路由外，其他所有路由都需要登录
const isProtectedRoute = createRouteMatcher([
  '/learning-setup(.*)',
  '/learning-interface(.*)',
  '/today(.*)',
  '/review(.*)',
  '/knowledge-base(.*)',
  '/notes(.*)',
  '/unified-chat(.*)',
  '/learning-history(.*)',
  '/knowledge-map(.*)',
  '/wrong-book(.*)',
  '/dashboard(.*)',
  '/workspace(.*)',
  '/validator(.*)',
  '/debug-generation(.*)',
  '/debug-learning(.*)',
  '/quiz-check(.*)',
  '/test-jys-learning(.*)'
]);

const isProtectedApi = createRouteMatcher([
  '/api/analytics(.*)',
  '/api/knowledge-base(.*)',
  '/api/knowledge-mastery(.*)',
  '/api/learning-items(.*)',
  '/api/learning-progress(.*)',
  '/api/learning-results(.*)',
  '/api/notes(.*)',
  '/api/openai-chat(.*)',
  '/api/generate-question(.*)',
  '/api/generate-title(.*)',
  '/api/review-cards(.*)',
  '/api/test-connection(.*)',
  '/api/validator(.*)',
  '/api/user-answers(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // 开发环境且请求 API 时，跳过验证
  if (process.env.NODE_ENV === 'development' && req.nextUrl.pathname.startsWith('/api/')) {
    return;
  }
  
  if (isProtectedRoute(req) || isProtectedApi(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
