import { Room } from "@prisma/client";
import { useRouter } from "next/router";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { trpc } from "../../utils/trpc";
import * as sdpTransform from "sdp-transform";

const useOffer = (peerId: string | undefined) => {};

const RoomPageContentMedia: React.FC<{ data: Room }> = ({ data }) => {
  // const userVideo = useRef<HTMLVideoElement>(document.createElement("video"));
  // const [localId, setLocalId] = useState<string>("");
  const [offerBtnDisabled, setOfferBtnDisabled] = useState<boolean>(false);
  const [answerBtnDisabled, setAnswerBtnDisabled] = useState<boolean>(false);
  const { mutate: mutateAnswer } = trpc.useMutation("room.add-answer", {
    onSuccess: data => {
      console.log("success local peer added with ID:", data.id);
    },
  });
  const { mutate: mutateAddOffer } = trpc.useMutation("room.add-offer", {
    onSuccess: data => {
      console.log("success local peer added with ID:", data);
    },
  });
  const {
    mutate,
    isLoading,
    data: peerData,
  } = trpc.useMutation("room.add-peer", {
    onSuccess: p => {
      console.log("success peer added with ID:", p.id);
    },
  });
  trpc.useSubscription(["room.on-join-room", { roomId: data.id }], {
    onNext: p => {
      console.log("on-join-room", p);
    },
  });
  trpc.useSubscription(["room.on-add-offer", { roomId: data.id }], {
    onNext: o => {
      console.log(o);
    },
  });
  // trpc.useSubscription(["room.onAddPeer", { roomId: data.id }], {
  //   onNext(data) {
  //     console.log("subscription", data);
  //   },
  // });
  const localConnRef = useRef<RTCPeerConnection>();
  const localTracksRef = useRef<MediaStreamTrack[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream>();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream>();

  useEffect(() => {
    const init = async () => {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      (localVideoRef.current as HTMLVideoElement).srcObject =
        localStreamRef.current;
      //   localConnRef.current = new RTCPeerConnection({
      //     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      //   });
      //   localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      //     video: true,
      //     // audio: true,
      //   });
      //   remoteStreamRef.current = new MediaStream();
      //   // push tracks from local stream to peer connection
      //   localStreamRef.current.getTracks().forEach(track => {
      //     localConnRef.current?.addTrack(
      //       track,
      //       localStreamRef.current as MediaStream
      //     );
      //   });
      //   // pull tracks from remote stream
      //   localConnRef.current.ontrack = event => {
      //     event.streams[0]?.getTracks().forEach(track => {
      //       remoteStreamRef.current?.addTrack(track);
      //     });
      //   };
      //   // video elements
      //   if (localVideoRef.current && remoteVideoRef.current) {
      //     localVideoRef.current.srcObject = localStreamRef.current;
      //     remoteVideoRef.current.srcObject = remoteStreamRef.current;
      //   }
      //   console.log("useEffect");
      //   console.log(localConnRef.current);
    };
    return () => {
      init();
    };
  }, []);

  const createPeer = () => {};

  const handleCreateAnswer = async () => {
    console.log("yikes");
  };

  const handleCreateOffer = async () => {
    //get ice candidates
    (localConnRef.current as RTCPeerConnection).onicecandidate = event => {
      // console.log("target: ", event.target);
      console.log((event.target as RTCPeerConnection).iceGatheringState);
      if ((event.target as RTCPeerConnection).iceGatheringState != "complete") {
        console.log("new candidate");
        return;
      }
      console.log("onicecandidate", event.candidate, "\n", event);
      event.candidate && console.log("new candidate", event.candidate.toJSON());
      console.log(
        "SDP on ice",
        localConnRef.current?.localDescription?.toJSON()
      );
    };
    //create offer
    const offerDescription = await localConnRef.current?.createOffer();
    await localConnRef.current?.setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription?.sdp,
      type: offerDescription?.type,
    };
    console.log("offer", offer);
    console.log("SDP", localConnRef.current?.localDescription?.toJSON());
    setOfferBtnDisabled(true);
  };

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
      <button
        onClick={handleCreateOffer}
        className="border-solid border-blue-400 border rounded"
        disabled={offerBtnDisabled}
      >
        Create Offer
      </button>
      <button
        onClick={handleCreateAnswer}
        className="border-solid border-blue-400 border rounded"
        disabled={answerBtnDisabled}
      >
        Create Answer
      </button>
      <video autoPlay ref={localVideoRef} />
      <video autoPlay ref={remoteVideoRef} />
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

  return <RoomPageContentMedia data={data} />;
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
