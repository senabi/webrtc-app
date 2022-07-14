import { Peer, Room } from "@prisma/client";
import { useRouter } from "next/router";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { trpc } from "../../utils/trpc";
import * as sdpTransform from "sdp-transform";

const RoomPagePeerMedia: React.FC<{ peer: Peer; room: Room }> = ({
  peer,
  room,
}) => {
  const localConnRef = useRef<RTCPeerConnection>();
  const localTracksRef = useRef<MediaStreamTrack[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream>();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream>();
  const otherPeerId = useRef<string>("");

  trpc.useSubscription(
    ["room.on-join-room", { roomId: room.id, peerId: peer.id }],
    {
      onNext: p => {
        console.log("on-join-room new peer joined", p);
      },
    }
  );
  // onAddOffer
  trpc.useSubscription(
    ["room.on-add-offer", { roomId: room.id, peerId: peer.id }],
    {
      onNext: o => {
        console.log(o);
      },
    }
  );
  const { mutate: mutateAddOffer } = trpc.useMutation("room.add-offer", {
    onSuccess: data => {
      console.log("offer sent successfully from", peer.id);
    },
  });
  // onAddAnswer
  trpc.useSubscription(
    ["room.on-add-answer", { roomId: room.id, peerId: peer.id }],
    {
      onNext: a => {
        console.log("onAddAnswer", a);
      },
    }
  );
  const { mutate: mutateAddAnswer } = trpc.useMutation("room.add-answer", {
    onSuccess: data => {
      console.log("answer sent successfully from", peer.id);
    },
  });
  // onAddIceCandidate
  trpc.useSubscription(
    ["room.on-add-icecandidate", { roomId: room.id, peerId: peer.id }],
    {
      onNext: c => {
        console.log("onAddIceCandidate", c);
      },
    }
  );
  const { mutate: mutateAddIceCandidate } = trpc.useMutation(
    "room.add-icecandidate",
    {
      onSuccess: data => {
        console.log("icecandidate sent successfully from:", peer.id);
      },
    }
  );

  const createPeer = (peerId: string) => {
    const peer = new RTCPeerConnection();
    peer.onicecandidate = handleICECandidateEvent;
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peerId);
    return peer;
  };

  const handleNegotiationNeededEvent = (otherPeerId: string) => {
    localConnRef.current
      ?.createOffer()
      .then(offer => localConnRef.current?.setLocalDescription(offer))
      .then(() => {
        mutateAddOffer({
          roomId: room.id,
          targetId: otherPeerId,
          sdp: JSON.stringify(localConnRef.current?.localDescription?.toJSON()),
        });
      })
      .catch(e => console.error(e));
  };

  const handleTrackEvent = (e: RTCTrackEvent) => {
    (remoteVideoRef.current as HTMLVideoElement).srcObject = e
      .streams[0] as MediaStream;
  };

  const handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      mutateAddIceCandidate({
        roomId: room.id,
        targetId: otherPeerId.current,
        icecandidate: JSON.stringify(event.candidate.toJSON()),
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      (localVideoRef.current as HTMLVideoElement).srcObject =
        localStreamRef.current;
    };
    return () => {
      init();
    };
  }, []);

  return (
    <>
      <video autoPlay ref={localVideoRef} />
      <video autoPlay ref={remoteVideoRef} />
    </>
  );
};

const RoomPagePeerContent: React.FC<{ data: Room }> = ({ data }) => {
  const {
    mutate,
    isLoading,
    data: peerData,
  } = trpc.useMutation("room.add-peer", {
    onSuccess: p => {
      console.log("success peer added with ID:", p.id);
    },
  });

  return (
    <>
      <div>Room: {JSON.stringify(data.id)}</div>
      {/* <div>User Id: {localId}</div> */}
      {peerData && <div>peer: {JSON.stringify(peerData)}</div>}
      <button
        onClick={() => {
          mutate({ roomId: data.id });
        }}
        className="border-solid border-blue-400 border rounded"
      >
        Add Peer
      </button>
      {peerData && <RoomPagePeerMedia peer={peerData} room={data} />}
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

  return <RoomPagePeerContent data={data} />;
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
