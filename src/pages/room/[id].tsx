import { Peer, Room } from "@prisma/client";
import { useRouter } from "next/router";
// import { MutableRefObject, useEffect, useRef, useState } from "react";
import React, { useEffect } from "react";
import { trpc } from "../../utils/trpc";

const RoomPageContent: React.FC<{ id: string }> = ({ id }) => {
  const { data, isLoading } = trpc.useQuery(["room.get-by-id", { id }]);

  if (isLoading) {
    return <div>Loading</div>;
  }

  if (!data) {
    return <div>Room not found</div>;
  }

  // return <RoomPagePeerContent room={data} />;
  return <>{JSON.stringify({ room: data })}</>;
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
