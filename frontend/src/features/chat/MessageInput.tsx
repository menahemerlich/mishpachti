import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { MediaAsset, MediaType, MessageType } from '@/types/models';
import { uploadToCloudinary } from '@/lib/cloudinary';
import VoiceRecorder from './VoiceRecorder';

interface Props {
  onSendText: (text: string) => void;
  onSendMedia: (asset: MediaAsset, type: MessageType) => void;
  onTypingChange: (typing: boolean) => void;
}

export default function MessageInput({ onSendText, onSendMedia, onTypingChange }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) onTypingChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTyping(value: string) {
    setText(value);
    if (value.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange(true);
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChange(false);
      }
    }, 2000);
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange(false);
    }
  }

  async function handleFile(file: File) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('יש לבחור תמונה או וידאו');
      return;
    }
    setUploading(true);
    try {
      const type: MediaType = isImage ? 'IMAGE' : 'VIDEO';
      const asset = await uploadToCloudinary({ file, type });
      onSendMedia(asset, type as MessageType);
    } catch {
      toast.error('העלאה נכשלה');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-navy-100 bg-white p-3">
      {recording ? (
        <VoiceRecorder
          onCancel={() => setRecording(false)}
          onSend={async ({ blob, waveform, duration }) => {
            setRecording(false);
            setUploading(true);
            try {
              const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
              const asset = await uploadToCloudinary({
                file,
                type: 'VOICE',
                waveform,
                duration,
              });
              onSendMedia(asset, 'VOICE');
            } catch {
              toast.error('שליחת ההודעה הקולית נכשלה');
            } finally {
              setUploading(false);
            }
          }}
        />
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecording(true)}
            className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center text-xl"
            title="הקלטה קולית"
          >
            🎙️
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-full bg-navy-100 hover:bg-navy-200 text-navy-700 flex items-center justify-center text-lg"
            title="העלה תמונה/וידאו"
          >
            🖼️
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="הקלד הודעה..."
            disabled={uploading}
            className="input flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || uploading}
            className="btn-primary px-5"
          >
            שלח
          </button>
        </div>
      )}
      {uploading && (
        <div className="text-xs text-navy-500 mt-2 text-center">מעלה מדיה…</div>
      )}
    </div>
  );
}
