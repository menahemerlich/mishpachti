import { useMutation } from '@tanstack/react-query';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { useCallStore } from '@/stores/callStore';
import { api } from '@/lib/api';

export default function CallScreen() {
  const active = useCallStore((s) => s.active);
  const clearAll = useCallStore((s) => s.clearAll);

  const endMutation = useMutation({
    mutationFn: () => api.calls.end(active!.callId),
    onSettled: () => clearAll(),
  });

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[55] bg-navy-950" data-lk-theme="default">
      <LiveKitRoom
        token={active.token}
        serverUrl={active.livekitUrl}
        connect
        video={active.isVideo}
        audio
        onDisconnected={() => clearAll()}
        className="h-full w-full flex flex-col"
      >
        <div className="flex-1 min-h-0">
          <CallStage />
        </div>
        <RoomAudioRenderer />
        <div className="bg-navy-900/80 backdrop-blur p-3 flex justify-center">
          <ControlBar
            controls={{
              microphone: true,
              camera: active.isVideo,
              screenShare: active.isVideo,
              chat: false,
              leave: true,
            }}
          />
        </div>
        <button
          onClick={() => endMutation.mutate()}
          className="absolute top-4 left-4 bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 text-sm shadow-soft"
        >
          סיים שיחה
        </button>
      </LiveKitRoom>
    </div>
  );
}

function CallStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full w-full">
      <ParticipantTile />
    </GridLayout>
  );
}
