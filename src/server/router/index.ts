// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { exampleRouter } from "./example";
import { roomRouter } from "./room";

import { Subscription } from "@trpc/server";
import { clearInterval } from "timers";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("room.", roomRouter)
  .merge("example.", exampleRouter)
  .subscription("randomNumber", {
    resolve() {
      return new Subscription<number>(emit => {
        const interval = setInterval(() => {
          emit.data(Math.random());
        }, 1000);
        return () => clearInterval(interval);
      });
    },
  });

// export type definition of API
export type AppRouter = typeof appRouter;
