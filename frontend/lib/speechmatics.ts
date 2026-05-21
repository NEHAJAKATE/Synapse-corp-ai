/**
 * Speechmatics Real-Time Speech-to-Text Client
 * Connects via WebSocket to Speechmatics RT API
 */

const SPEECHMATICS_RT_URL = "wss://eu2.rt.speechmatics.com/v2";

export class SpeechmaticsClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onError?: (error: string) => void;

  constructor(
    apiKey: string,
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) {
    this.apiKey = apiKey;
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async connect(): Promise<void> {
    try {
      // 1. Get short-lived JWT from Speechmatics management API
      const tokenResponse = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 3600 }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }

      const { key_value } = await tokenResponse.json();

      // 2. Open WebSocket connection
      this.ws = new WebSocket(`${SPEECHMATICS_RT_URL}?jwt=${key_value}`);

      this.ws.onopen = () => {
        // 3. Send StartRecognition message
        this.ws!.send(
          JSON.stringify({
            message: "StartRecognition",
            transcription_config: {
              language: "en",
              operating_point: "enhanced",
              enable_partials: true,
            },
            audio_format: {
              type: "raw",
              encoding: "pcm_f32le",
              sample_rate: 16000,
            },
          })
        );
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.message === "AddTranscript") {
          const text = data.results
            .map((r: any) => r.alternatives[0]?.content || "")
            .join(" ");
          if (text.trim()) this.onTranscript(text, true);
        }
        if (data.message === "AddPartialTranscript") {
          const text = data.results
            .map((r: any) => r.alternatives[0]?.content || "")
            .join(" ");
          if (text.trim()) this.onTranscript(text, false);
        }
        if (data.message === "Error") {
          this.onError?.(`Speechmatics error: ${data.reason}`);
        }
      };

      this.ws.onerror = () => {
        this.onError?.("Speechmatics WebSocket connection error");
      };
    } catch (error: any) {
      this.onError?.(`Failed to connect to Speechmatics: ${error.message}`);
      throw error;
    }
  }

  sendAudioChunk(audioData: Float32Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const buffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
      this.ws.send(buffer);
    }
  }

  async startMicCapture(): Promise<{ stream: MediaStream; audioContext: AudioContext }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.sendAudioChunk(new Float32Array(inputData));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    return { stream, audioContext };
  }

  disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message: "EndOfStream", last_seq_no: 0 }));
      this.ws.close();
    }
  }
}
