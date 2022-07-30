import { createRouter } from "./context";
import { EventEmitter } from "events";
import { Subscription, TRPCError } from "@trpc/server";
import { Prisma, Room, Peer } from "@prisma/client";
import { z } from "zod";

const ee = new EventEmitter();

export const roomRouter = createRouter()
  // Room
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
  // Room
  .mutation("create", {
    async resolve({ ctx }) {
      // await ctx.prisma.room.update.
      return await ctx.prisma.room.create({
        data: {},
      });
    },
  })
  .query("get-peers", {
    input: z.object({ roomId: z.string(), peerId: z.string() }),
    async resolve({ input, ctx }) {
      return await ctx.prisma.peer.findMany({
        where: {
          roomId: input.roomId,
          id: {
            not: input.peerId,
          },
        },
      });
    },
  })
  .subscription("peers", {
    input: z.object({ roomId: z.string(), peerId: z.string() }),
    async resolve({ input, ctx }) {
      return new Subscription<Peer[]>(emit => {
        const peersOnRoom = async () => {
          const peers = await ctx.prisma.peer.findMany({
            where: {
              roomId: input.roomId,
              id: {
                not: input.peerId,
              },
            },
          });
          emit.data(peers);
        };
        ee.on("peers", peersOnRoom);
        ee.emit("peers");
        return () => ee.off("peers", peersOnRoom);
      });
    },
  })
  .mutation("add-answer", {
    // Answer
    input: z.object({
      roomId: z.string(),
      targetId: z.string(),
      answer: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit("add-answer", input.roomId, input.answer, input.targetId);
    },
  })
  .subscription("on-add-answer", {
    // Answer subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
    }),
    resolve({ input, ctx }) {
      type onAddAnswerSubType = {
        targetId: string;
        answer: string;
      };
      return new Subscription<onAddAnswerSubType>(emit => {
        const onAddAnswer = (
          roomId: string,
          answer: string,
          targetId: string
        ) => {
          if (roomId === input.roomId && targetId === input.peerId) {
            emit.data({ targetId, answer });
          }
        };
        ee.on("add-answer", onAddAnswer);
        return () => ee.off("add-answer", onAddAnswer);
      });
    },
  })
  .mutation("add-offer", {
    // add offer
    input: z.object({
      roomId: z.string(),
      targetId: z.string(),
      sdp: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit("add-offer", input.roomId, input.targetId, input.sdp);
    },
  })
  .subscription("on-add-offer", {
    // offer subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
    }),
    resolve({ input, ctx }) {
      type onAddOfferSubType = {
        targetId: string;
        sdp: string;
      };
      return new Subscription<onAddOfferSubType>(emit => {
        const onAddOffer = (roomId: string, targetId: string, sdp: string) => {
          if (roomId === input.roomId && targetId === input.peerId) {
            emit.data({ targetId, sdp });
          }
        };
        ee.on("add-offer", onAddOffer);
        return () => ee.off("add-offer", onAddOffer);
      });
    },
  })
  .mutation("add-icecandidate", {
    // add icecandiate
    input: z.object({
      roomId: z.string(),
      targetId: z.string(),
      icecandidate: z.string(),
    }),
    async resolve({ input, ctx }) {
      ee.emit(
        "add-icecandidate",
        input.roomId,
        input.targetId,
        input.icecandidate
      );
    },
  })
  .subscription("on-add-icecandidate", {
    // icecandidate subscription
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
    }),
    resolve({ input, ctx }) {
      type onAddIceCandidateSubType = {
        targetId: string;
        icecandidate: string;
      };
      return new Subscription<onAddIceCandidateSubType>(emit => {
        const onAddICECandidate = (
          roomId: string,
          targetId: string,
          icecandidate: string
        ) => {
          if (roomId === input.roomId && targetId === input.peerId) {
            emit.data({ targetId, icecandidate });
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
      ee.emit("join", input.roomId, peer);
      return peer;
    },
  })
  .subscription("on-join-room", {
    input: z.object({
      roomId: z.string(),
      peerId: z.string(),
    }),
    async resolve({ input, ctx }) {
      return new Subscription<Peer>(emit => {
        const onJoin = async (roomId: string, newPeer: Peer) => {
          if (roomId !== input.roomId || newPeer.id === input.peerId) return;
          emit.data(newPeer);
        };
        ee.on("join", onJoin);
        return () => ee.off("join", emit.data);
      });
    },
  });
