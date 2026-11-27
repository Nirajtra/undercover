import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { isDuplicateComment } from "@/lib/comments";
import { sanitizeStateFor } from "@/lib/sanitizeState";
import { Peer, DataConnection } from "peerjs";
import { useGame } from "./GameContext";
import { toast } from "sonner";
import { GameState } from "../types/game";
import { useSound } from "./SoundContext";
import { useTranslation } from "react-i18next";

interface PeerContextType {
  peer: Peer | null;
  connections: Record<string, DataConnection>;
  hostId: string | null;
  isHost: boolean;
  isConnecting: boolean;
  hostGame: (username: string) => void;
  joinGame: (hostId: string, username: string) => void;
  sendGameState: (state: GameState) => void;
  sendToHost: (data: any) => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
  const { playSound } = useSound();
  const { t } = useTranslation();
  
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<Record<string, DataConnection>>({});
  const [hostId, setHostId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { gameState, setGameState, addPlayer, removePlayer, submitMrWhiteGuess, submitVote, submitDescription } = useGame();
  // Connection handlers are registered once, so they read the latest state through this ref
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on("open", (id) => {
      console.log("My peer ID is:", id);
      setPeer(newPeer);
    });

    newPeer.on("error", (error) => {
      console.error("Peer error:", error);
      setIsConnecting(false);
      toast.error(error.type === "peer-unavailable" ? t("peer.gameNotFound") : t("peer.connectionError"));
    });

    //HOST CONNECTION EVENTS
    newPeer.on("connection", (conn) => {
      console.log("Incoming connection from:", conn.peer);

      // Monitor ICE connection state - [unexpected disconnect handling]
      // "disconnected" is often a short blip (Wi-Fi, Safari) that recovers on its own,
      // so only drop the player if it lasts; "failed" is final.
      const pc = conn.peerConnection;
      let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
      const dropPlayer = () => {
        console.log("ICE disconnect detected");
        removePlayer(conn.peer);
        conn.close();
      };
      if (pc) {
        pc.oniceconnectionstatechange = () => {
          console.log("ICE state:", pc.iceConnectionState);
          clearTimeout(disconnectTimer);
          if (pc.iceConnectionState === "failed") {
            dropPlayer();
          } else if (pc.iceConnectionState === "disconnected") {
            disconnectTimer = setTimeout(dropPlayer, 8000);
          }
        };
      }
      
      // The latest state reaches the new player through the broadcast effect below
      // once the connection is registered (sending `gameState` here would be the stale first value)
      conn.on("open", () => {
        setConnections(prev => ({ ...prev, [conn.peer]: conn }));
      });

      conn.on("close", () => {
        console.log("Connection closed with:", conn.peer);

        const name = gameStateRef.current.players.find(p => p.id === conn.peer)?.name;
        removePlayer(conn.peer);
        toast.error(t("peer.playerDisconnected", { name: name || t("peer.unknownPlayer") }));

        setConnections(prev => {
          const newConnections = { ...prev };
          delete newConnections[conn.peer];
          return newConnections;
        });
      });

      // Votes, comments and guesses are always credited to the connection they came from
      // (conn.peer), never to an ID inside the message, so nobody can act for someone else
      conn.on("data", (data: any) => {
        console.debug("Received data:", data);
        switch (data.type) {
          case "JOIN_GAME":
            console.log("New player joining:", data.username);
            playSound("/sounds/player-joined.mp3");
            addPlayer(String(data.username ?? "").slice(0, 25) || t("peer.unknownPlayer"), conn.peer);
            break;
          case "SUBMIT_VOTE":
            console.debug("Received vote:", data);
            submitVote(conn.peer, data.targetId);
            break;
          case "SUBMIT_DESCRIPTION":
            console.debug("Received description:", data);
            // The host has the latest revealed comments, so it makes the final call
            if (isDuplicateComment(gameStateRef.current, data.description)) {
              conn.send({ type: "COMMENT_REJECTED", reason: "duplicate" });
              break;
            }
            submitDescription(conn.peer, String(data.description).slice(0, 100));
            break;
          case "MR_WHITE_GUESS": {
            console.debug("Received Mr. White guess:", data);
            // Only the Mr. White who was just voted out may guess
            const state = gameStateRef.current;
            const guesser = state.players.find(p => p.id === conn.peer);
            if (state.lastEliminatedId === conn.peer && guesser?.role === "mrwhite") {
              submitMrWhiteGuess(String(data.guess).slice(0, 50));
            }
            break;
          }
          default:
            console.log("Unknown data type:", data.type);
        }
      });
    });

    //Cleanup on host disconnect
    const cleanupHost = () => {
      if (!newPeer.disconnected) {
        console.log("Disconnecting peer");
        newPeer.destroy();
      }
      window.removeEventListener('beforeunload', cleanupHost);
    };
    window.addEventListener('beforeunload', cleanupHost);

    return () => {
      newPeer.destroy();
    };
  }, []);

  const hostGame = (username: string) => {
    if (!peer || hostId) return;
    console.log("Hosting game with peer ID:", peer.id);
    setIsHost(true);
    setHostId(peer.id);
    addPlayer(username, peer.id);
    toast.success(t("peer.gameHosted", { id: peer.id }));
  };

  const joinGame = (hostId: string, username: string) => {
    // Ignore repeated clicks while a join is in flight or already done
    if (!peer || isConnecting || connections[hostId]) return;
    setIsConnecting(true);

    const conn = peer.connect(hostId, { reliable: true, serialization: "json" });
    console.log("Joining game with peer ID:", peer.id);
    let hasOpened = false;

    // Give up if the connection never opens (blocked network, wrong ID, etc.)
    const joinTimeout = setTimeout(() => {
      if (!conn.open) {
        console.log("Join timed out");
        conn.close();
        setIsConnecting(false);
        toast.error(t("peer.joinTimeout"));
      }
    }, 15000);

    conn.on("error", (error) => {
      console.error("Connection error:", error);
      clearTimeout(joinTimeout);
      setIsConnecting(false);
      toast.error(t("peer.connectionError"));
    });

    // Log how far the direct connection gets; "failed" means the network blocks it,
    // so tell the player right away instead of waiting for the timeout
    conn.on("iceStateChanged", (state) => {
      console.log("Join ICE state:", state);
      if (state === "failed" && !hasOpened) {
        clearTimeout(joinTimeout);
        conn.close();
        setIsConnecting(false);
        toast.error(t("peer.joinTimeout"));
      }
    });

    const cleanupClient = () => {
      if (!peer.disconnected) {
        console.log("Disconnecting peer");
        peer.destroy();
      }
      window.removeEventListener('beforeunload', cleanupClient);
    };
    window.addEventListener('beforeunload', cleanupClient);
    
    //Client connection events
    conn.on("open", () => {
      hasOpened = true;
      clearTimeout(joinTimeout);
      setIsConnecting(false);
      setConnections(prev => ({ ...prev, [hostId]: conn }));
      setHostId(hostId);
      conn.send({ type: "JOIN_GAME", username });
      toast.success(t("peer.connected"));
    });

    conn.on("data", (data: any) => {
      console.debug("Received data in connection:", data);
      if (data.type === "GAME_STATE") {
        console.debug("Setting received game state:", data.state);
        setGameState(data.state);
      } else if (data.type === "COMMENT_REJECTED") {
        toast.error(t("wordReveal.duplicateComment"));
      }
    });

    conn.on("close", () => {
      console.log("Connection closed with host");
      clearTimeout(joinTimeout);
      setIsConnecting(false);
      // A join that never opened already showed its own error
      if (!hasOpened) return;
      setConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[hostId];
        return newConnections;
      });
      setHostId(null);
      setIsHost(false);
      toast.error(t("peer.hostClosedConnection"));
    });
  };

  const sendGameState = (state: GameState) => {
    console.debug("Sending game state to all connections:", state);
    Object.values(connections).forEach(conn => {
      // Each player only receives what they're allowed to know (no other roles, words or early comments)
      conn.send({ type: "GAME_STATE", state: sanitizeStateFor(state, conn.peer) });
    });
  };

  const sendToHost = (data: any) => {
    if (!hostId || !connections[hostId]) {
      console.error("No connection to host");
      return;
    }
    console.log("Sending data to host:", data);
    connections[hostId].send(data);
  };

  useEffect(() => {
    if (isHost && Object.keys(connections).length > 0) {
      console.log("Host sending updated game state to all connections");
      sendGameState(gameState);
    }
  }, [gameState, isHost, connections]);

  return (
    <PeerContext.Provider
      value={{
        peer,
        connections,
        hostId,
        isHost,
        isConnecting,
        hostGame,
        joinGame,
        sendGameState,
        sendToHost,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export const usePeer = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
};