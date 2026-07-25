import lobbyCharacterVideo from "@/assets/lobby-character.webm";

export default function LobbyCharacter() {
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
      <video
        src={lobbyCharacterVideo}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{
          mixBlendMode: "screen",
          transform: "scaleY(1.15)",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 28%, black 35%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 28%, black 35%)",
        }}
      />
    </div>
  );
}
