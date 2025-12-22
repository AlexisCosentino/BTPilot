import { useCallback, useEffect, useRef, useState } from "react";

export const AUDIO_SIZE_LIMIT_BYTES = 3_000_000;

type RecorderHandlers = {
  onStop: (blob: Blob) => void;
  onError: (message: string) => void;
};

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioSupported, setAudioSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setAudioSupported(typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = useCallback(
    async ({ onStop, onError }: RecorderHandlers) => {
      if (!audioSupported) {
        onError("L'enregistrement audio n'est pas supportÇ¸ sur cet appareil.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recordingChunksRef.current = [];
        mediaStreamRef.current = stream;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || "audio/webm"
          });

          if (blob.size > AUDIO_SIZE_LIMIT_BYTES) {
            onError("MÇ¸mo vocal trop lourd (max 3 Mo).");
            return;
          }

          onStop(blob);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("[project-detail] DÇ¸marrage enregistrement impossible", err);
        onError("Micro inaccessible. VÇ¸rifiez les autorisations.");
      }
    },
    [audioSupported]
  );

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  return { audioSupported, isRecording, startRecording, stopRecording };
}
