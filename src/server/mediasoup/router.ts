import { createWorker } from "./worker";

export const createMediasoupRouter = async () => {
  try {
    const mediasoupRouter = await createWorker();
    return mediasoupRouter;
  } catch (e) {
    throw e;
  }
};
