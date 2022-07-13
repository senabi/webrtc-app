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
  .mutation("add-answer", { // Answer
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
      answer: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit("add-answer", input.roomId, input.answer, input.peerId);
    },
  })
  .subscription("on-add-answer", { // Answer subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string().optional(),
    }),
    resolve({ input, ctx }) {
      type onAddAnswerSubType = {
        senderId: string;
        answer: string;
      };
      return new Subscription<onAddAnswerSubType>(emit => {
        const onAddAnswer = (
          roomId: string,
          answer: string,
          senderId: string
        ) => {
          if (roomId === input.roomId) {
            emit.data({ senderId: senderId, answer });
          }
        };
        ee.on("add-answer", onAddAnswer);
        return () => ee.off("add-answer", onAddAnswer);
      });
    },
  })
  .mutation("add-offer", { // add offer
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
      sdp: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit("add-offer", input.roomId, input.sdp, input.peerId);
    },
  })
  .subscription("on-add-offer", { // offer subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string().optional(),
    }),
    resolve({ input, ctx }) {
      type onAddOfferSubType = {
        senderId: string;
        sdp: string;
      };
      return new Subscription<onAddOfferSubType>(emit => {
        const onAddOffer = (
          roomId: string,
          senderId: string,
          sdp: string,
        ) => {
          if (roomId === input.roomId) {
            emit.data({ senderId: senderId, sdp });
          }
        };
        ee.on("add-offer", onAddOffer);
        return () => ee.off("add-offer", onAddOffer);
      });
    },
  })
  .mutation("add-icecanditate", { // add icecandiate
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
      icecandidate: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit("add-icecandidate", input.roomId, input.icecandidate, input.peerId);
    },
  })
  .subscription("on-add-icecandidate", { // icecandidate subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string().optional(),
    }),
    resolve({ input, ctx }) {
      type onAddIceCandidateSubType = {
        senderId: string;
        icecandidate: string;
      };
      return new Subscription<onAddIceCandidateSubType>(emit => {
        const onAddICECandidate = (
          roomId: string,
          senderId: string,
          icecandidate: string,
        ) => {
          if (roomId === input.roomId) {
            emit.data({ senderId: senderId, icecandidate });
          }
        };
        ee.on("add-icecandidate", onAddICECandidate);
        return () => ee.off("add-icecandidate", onAddICECandidate);
      });
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
