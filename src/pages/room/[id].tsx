import { Peer, Room } from "@prisma/client";
import { useRouter } from "next/router";
// import { MutableRefObject, useEffect, useRef, useState } from "react";
import React, { useEffect } from "react";
import { trpc } from "../../utils/trpc";
import * as mediasoup from "mediasoup-client";
import * as sdpTransform from "sdp-transform";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import {
  IceParameters,
  IceCandidate,
  DtlsParameters,
} from "mediasoup-client/lib/types";

const RemoteVideos: React.FC<{ peers: Peer[] }> = ({ peers }) => {
  const btnRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    btnRef.current?.addEventListener("click", () => {
      console.log("clicked");
    });
  }, []);
  return <div>{JSON.stringify(peers)}</div>;
};

const RoomPageData: React.FC<{
  peer: Peer;
  room: Room;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}> = ({ peer, room, localVideoRef, remoteVideoRef }) => {
  const localConnRef = React.useRef<RTCPeerConnection>();
  const localTracksRef = React.useRef<MediaStreamTrack[]>([]);
  // const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const localStreamRef = React.useRef<MediaStream>();
  // const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteStreamRef = React.useRef<MediaStream>();
  const otherPeerId = React.useRef<string>("");
  const device = React.useRef<mediasoup.types.Device>();
  const firstCallback = React.useRef<() => void>(() => {});

  const { data: remotePeers } = trpc.useQuery(
    ["room.get-peers", { roomId: room.id, peerId: peer.id }],
    { staleTime: Infinity }
  );

  trpc.useSubscription(
    ["room.on-join-room", { roomId: room.id, peerId: peer.id }],
    {
      onNext: p => {
        console.log("on-join-room new peer joined", p);
      },
    }
  );

  trpc.useSubscription(
    ["room.get-router-rtp-capabilities", { peerId: peer.id }],
    {
      onNext: rtpCapabilities => {
        console.log("rtpCapabilities", rtpCapabilities);
        onRouterCapabilities(rtpCapabilities);
      },
    }
  );

  const { mutate: mutateCreateProduceTransport } = trpc.useMutation(
    ["room.create-producer-transport"],
    {
      onSuccess: data => {
        console.log("producer transport created", data);
        onProducerTransportCreated({
          id: data?.id as string,
          iceParameters: data?.iceParameters as IceParameters,
          dtlsParameters: data?.dtlsParameters as DtlsParameters,
          iceCandidates: data?.iceCandidates as IceCandidate[],
        });
      },
    }
  );

  const { mutate: mutateConnectProducerTransport } = trpc.useMutation(
    ["room.connect-producer-transport"],
    {
      onSuccess: data => {
        console.log("producer transport connected", data);
        firstCallback.current();
        // if (data==='producer connected'){
        // }
      },
    }
  );

  const { mutate: mutateProduce } = trpc.useMutation(["room.produce"], {
    onSuccess: data => {
      console.log("produced", data);
    },
  });

  const onProducerTransportCreated = (res: {
    id: string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
  }) => {
    const transport = device.current?.createSendTransport(res);
    console.log("onProducerTransportCreated", transport);
    transport?.on("connect", ({ dtlsParameters }, callback, errback) => {
      mutateConnectProducerTransport({
        msg: JSON.stringify({
          dtlsParameters,
        }),
      });
      firstCallback.current = callback;
    });
    transport?.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        console.log("on transport produce");
        const msg = JSON.stringify({
          type: "produce",
          transportId: transport.id,
          kind,
          rtpParameters,
        });
        mutateProduce({ msg });
        console.log("on transport produce sent");
      }
    );
  };

  const onRouterCapabilities = (res: RtpCapabilities) => {
    loadDevice(res);
    // enable publish button
  };
  const loadDevice = async (routerRtpCapabilities: RtpCapabilities) => {
    device.current = new mediasoup.Device();
    await device.current.load({ routerRtpCapabilities });
    console.log("device", device.current);
  };

  const publish = () => {
    mutateCreateProduceTransport({
      peerId: peer.id,
      msg: JSON.stringify({
        forceTcp: false,
        rtpCapabilities: device.current?.rtpCapabilities,
      }),
    });
  };

  return (
    <>
      {remotePeers && <RemoteVideos peers={remotePeers} />}
      <button onClick={publish}>publish</button>
    </>
  );
};

const RoomPagePeerContent: React.FC<{ room: Room }> = ({ room }) => {
  const { mutate, data: peer } = trpc.useMutation("room.add-peer", {
    onSuccess: p => {
      console.log("success peer added with ID:", p.id);
    },
  });
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const init = async () => {
      // localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      //   video: true,
      // });
      // (localVideoRef.current as HTMLVideoElement).srcObject =
      //   localStreamRef.current;
    };
  }, []);

  return (
    <>
      <div>Room: {JSON.stringify(room.id)}</div>
      {peer && <div>peer: {JSON.stringify(peer)}</div>}
      <button
        onClick={() => {
          mutate({ roomId: room.id });
        }}
        className="border-solid border-blue-400 border rounded"
      >
        create peer
      </button>
      {peer && (
        <RoomPageData
          peer={peer}
          room={room}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
        />
      )}
      <video ref={localVideoRef} />
      <video ref={remoteVideoRef} />
    </>
  );
};

const RoomPageContent: React.FC<{ id: string }> = ({ id }) => {
  const { data, isLoading } = trpc.useQuery(["room.get-by-id", { id }]);

  if (isLoading) {
    return <div>Loading</div>;
  }

  if (!data) {
    return <div>Room not found</div>;
  }

  return <RoomPagePeerContent room={data} />;
};

const RoomPage = () => {
  const { query } = useRouter();
  const { id } = query;
  if (!id || typeof id !== "string") {
    return <div>Invalid room id</div>;
  }
  return <RoomPageContent id={id} />;
};

export default RoomPage;
