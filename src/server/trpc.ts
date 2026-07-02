import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function createTRPCContext() {
  const session = await auth()
  return { session, prisma }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
      userId: ctx.session.user.id,
    },
  })
})
