import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  onSend: (data: { blob: Blob; waveform: number[]; duration: number }) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [livePeaks, setLivePeaks] = useState<number[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const peaksRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    void start();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: getSupportedMime() });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      setRecording(true);
      startedAtRef.current = Date.now();

      // Setup analyser for waveform peaks
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const sampleEvery = 100; // ms
      let lastSample = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        // Compute peak for this frame
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = Math.abs(buffer[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        const now = Date.now();
        if (now - lastSample > sampleEvery) {
          peaksRef.current.push(peak);
          lastSample = now;
          setLivePeaks([...peaksRef.current]);
          setSeconds(Math.round((now - startedAtRef.current) / 1000));
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      toast.error('לא ניתן לגשת למיקרופון');
      onCancel();
    }
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => undefined);
  }

  async function stopAndSend() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setRecording(false);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    cleanup();
    const blob = new Blob(chunksRef.current, { type: getSupportedMime() });
    const duration = (Date.now() - startedAtRef.current) / 1000;
    // Down-sample peaks to ~40 bars
    const peaks = peaksRef.current;
    const targetCount = 40;
    const step = Math.max(1, Math.floor(peaks.length / targetCount));
    const downsampled: number[] = [];
    for (let i = 0; i < peaks.length; i += step) {
      const slice = peaks.slice(i, i + step);
      downsampled.push(Math.max(...slice, 0.1));
    }
    onSend({ blob, waveform: downsampled, duration });
  }

  function handleCancel() {
    setRecording(false);
    cleanup();
    onCancel();
  }

  return (
    <div className="flex items-center gap-3 px-2">
      <button
        onClick={handleCancel}
        className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center text-lg"
        title="ביטול"
      >
        ✕
      </button>

      <div className="flex-1 flex items-center gap-2 bg-navy-50 rounded-full px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm tabular-nums">{formatTime(seconds)}</span>
        <div className="flex-1 flex items-end gap-px h-6 overflow-hidden" style={{ direction: 'ltr' }}>
          {livePeaks.slice(-50).map((p, i) => (
            <div
              key={i}
              className="flex-1 bg-teal-500 rounded-sm"
              style={{ height: `${Math.max(15, p * 100)}%` }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={stopAndSend}
        disabled={!recording}
        className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center text-lg"
        title="שלח"
      >
        📤
      </button>
    </div>
  );
}

function getSupportedMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'audio/webm';
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
