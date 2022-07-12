import { createRouter } from "./context";
import { EventEmitter } from "events";
import { Subscription, TRPCError } from "@trpc/server";
import { Prisma, Room, Peer } from "@prisma/client";
import { z } from "zod";

const ee = new EventEmitter();

export const roomRouter = createRouter()
  .query("get-by-id", {
    input: z.object({ id: z.string() }),
    async resolve({ input, ctx }) {
      return await ctx.prisma.room.findFirst({
        where: {
          id: input.id,
        },
      });
    },
  })
  .mutation("create", {
    async resolve({ ctx }) {
      // await ctx.prisma.room.update.
      return await ctx.prisma.room.create({
        data: {},
      });
    },
  })
  .mutation("add-offer", {
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
      offer: z.string(),
    }),
    async resolve({ input, ctx }) {
      // const offerCandidate = await ctx.prisma.offerCandidate.create({
      //   data: {
      //     roomId: input.roomId,
      //     data: input.data,
      //   },
      // });
      // ee.emit("add", offerCandidate);
      // return offerCandidate;
      // return await ctx.prisma.peer.groupBy({
      //   where: { roomId: input.roomId },
      //   by: ["id", "offer"],
      // });
      ee.emit("add-offer", input.roomId, input.offer, input.peerId);
      // return input;
    },
  })
  .subscription("on-add-offer", {
    input: z.object({
      roomId: z.string(),
      peerId: z.string().optional(),
    }),
    resolve({ input, ctx }) {
      type onAffOfferSubType = {
        senderId: string;
        offer: string;
      };
      return new Subscription<onAffOfferSubType>(emit => {
        const onAddOffer = (
          roomId: string,
          offer: string,
          senderId: string
        ) => {
          if (roomId === input.roomId) {
            emit.data({ senderId: senderId, offer });
          }
        };
        ee.on("add-offer", onAddOffer);
        return () => ee.off("add-offer", onAddOffer);
      });
    },
  })
  .mutation("add-answer", {
    input: z.object({
      roomId: z.string(),
      data: z.string(),
    }),
    async resolve({ input, ctx }) {
      const answerCandidate = await ctx.prisma.answerCandidate.create({
        data: {
          roomId: input.roomId,
          data: input.data,
        },
      });
      // ee.emit("add", answerCandidate);
      return answerCandidate;
    },
  })
  .mutation("add-peer", {
    input: z.object({
      roomId: z.string(),
    }),
    async resolve({ input, ctx }) {
      const peer = await ctx.prisma.peer.create({
        data: {
          roomId: input.roomId,
        },
      });
      ee.emit("join", input.roomId);
      return peer;
    },
  })
  .subscription("on-join-room", {
    input: z.object({
      roomId: z.string(),
    }),
    async resolve({ input, ctx }) {
      return new Subscription<Peer[]>(emit => {
        const onJoin = async (roomId: string) => {
          const users = await ctx.prisma.peer.findMany({
            where: {
              roomId: input.roomId,
            },
          });
          if (roomId === input.roomId) {
            emit.data(users);
          }
        };
        ee.on("join", onJoin);
        return () => ee.off("join", emit.data);
      });
    },
  });
// .subscription("onAddPeer", {
//   input: z.object({ roomId: z.string() }),
//   resolve({ input }) {
//     return new Subscription<Peer>(emit => {
//       const onAdd = (data: Peer) => {
//         if (data.roomId === input.roomId) {
//           emit.data(data);
//         }
//       };
//       ee.on("add", onAdd);
//       return () => ee.off("add", emit.data);
//     });
//   },
// });
// .subscription("onAddPeer", {
//   input: z.object({
//     roomId: z.string(),
//   }),
//   resolve() {
//     return new Subscription<Peer>(emit => {
//       const onAdd = (data: Peer) => {
//         if (input.roomId === data.roomId) {
//           emit.data(data);
//         }
//       };
//       ee.on("add", onAdd);
//       return () => ee.off("add", onAdd);
//     });
//   },
// });
