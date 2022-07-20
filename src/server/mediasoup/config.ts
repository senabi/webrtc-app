import { RtpCodecCapability } from "mediasoup/node/lib/RtpParameters";
import { TransportListenIp } from "mediasoup/node/lib/Transport";
import { WorkerLogTag } from "mediasoup/node/lib/Worker";
import os from "os";

export const config = {
  // mediasoup settings
  listenIp: "0.0.0.0",
  listenPort: 3016,
  mediasoup: {
    numWorkers: os.cpus().length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: "debug",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"] as WorkerLogTag[],
    },
    router: {
      mediaCodecs: [
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
          parameters: {
            "x-google-start-bitrate": 1000,
          },
        },
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
      ] as RtpCodecCapability[],
    },
    // webrtc transport settings
    webRtcTransport: {
      listenIp: [
        {
          ip: "0.0.0.0",
          announcedIp: "127.0.0.1",
        },
      ] as TransportListenIp[],
      maxIncomeBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
} as const;
