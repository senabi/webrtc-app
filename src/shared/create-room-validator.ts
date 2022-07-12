import { z } from "zod";

export const createRoomValidator = z.object({});

export type CreateRoomInputType = z.infer<typeof createRoomValidator>;
