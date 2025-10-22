
import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { AgentStatus, TranscriptEntry } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';
import { encode, decode, decodeAudioData, createBlob } from '../utils/audioUtils';

export const useVoiceAgent = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  
  // Use a ref to manage the connection state machine to prevent race conditions
  const connectionStateRef = useRef<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING'>('DISCONNECTED');

  const disconnect = useCallback(() => {
    // Prevent re-entrant or unnecessary calls
    if (connectionStateRef.current !== 'CONNECTED') {
      return;
    }
    connectionStateRef.current = 'DISCONNECTING';
    console.log("Disconnecting...");

    sessionPromiseRef.current?.then(session => session.close()).catch(e => console.error("Error closing session:", e));
    sessionPromiseRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close().catch(e => console.error("Error closing input audio context:", e));
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(e => console.error("Error closing output audio context:", e));
    }
    outputAudioContextRef.current = null;

    setAgentStatus(AgentStatus.IDLE);
    setIsConnected(false);
    connectionStateRef.current = 'DISCONNECTED';
  }, []);

  const handleTranscription = useCallback((message: LiveServerMessage) => {
    if (message.serverContent?.inputTranscription) {
        const text = message.serverContent.inputTranscription.text;
        const isFinal = message.serverContent.inputTranscription.isFinal ?? false;
        currentInputTranscriptionRef.current += text;

        setTranscripts(prev => {
            const last = prev[prev.length -1];
            if (last?.speaker === 'user' && !last.isFinal) {
                const newLast = {...last, text: last.text + text, isFinal };
                return [...prev.slice(0, -1), newLast];
            }
            return [...prev, {speaker: 'user', text, isFinal}];
        });
        if(isFinal) currentInputTranscriptionRef.current = '';
    }

    if (message.serverContent?.outputTranscription) {
        const text = message.serverContent.outputTranscription.text;
        const isFinal = message.serverContent.outputTranscription.isFinal ?? false;
        currentOutputTranscriptionRef.current += text;
        
        setTranscripts(prev => {
            const last = prev[prev.length -1];
            if (last?.speaker === 'agent' && !last.isFinal) {
                const newLast = {...last, text: last.text + text, isFinal };
                return [...prev.slice(0, -1), newLast];
            }
            return [...prev, {speaker: 'agent', text, isFinal}];
        });
        if(isFinal) currentOutputTranscriptionRef.current = '';
    }

    if(message.serverContent?.turnComplete) {
      setAgentStatus(AgentStatus.LISTENING);
    }
  }, []);

  const handleAudio = useCallback(async (message: LiveServerMessage) => {
      const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
      if (audioData) {
          setAgentStatus(AgentStatus.SPEAKING);
          const outputContext = outputAudioContextRef.current!;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);

          const audioBuffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
          const source = outputContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputContext.destination);
          
          source.addEventListener('ended', () => {
              audioSourcesRef.current.delete(source);
              if (audioSourcesRef.current.size === 0) {
                  setAgentStatus(AgentStatus.LISTENING);
              }
          });

          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          audioSourcesRef.current.add(source);
      }
  }, []);
  
  const connect = useCallback(async () => {
    if (connectionStateRef.current !== 'DISCONNECTED') return;
    
    connectionStateRef.current = 'CONNECTING';
    setAgentStatus(AgentStatus.CONNECTING);
    setTranscripts([]);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;

            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
            
            connectionStateRef.current = 'CONNECTED';
            setAgentStatus(AgentStatus.LISTENING);
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            handleTranscription(message);
            await handleAudio(message);

            if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                    audioSourcesRef.current.delete(source);
                }
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setAgentStatus(AgentStatus.ERROR);
            disconnect();
          },
          onclose: (e: CloseEvent) => {
            disconnect();
          },
        },
      });

    } catch (error) {
      console.error("Failed to connect:", error);
      setAgentStatus(AgentStatus.ERROR);
      setIsConnected(false);
      connectionStateRef.current = 'DISCONNECTED';
    }
  }, [disconnect, handleAudio, handleTranscription]);

  useEffect(() => {
    return () => {
        if(connectionStateRef.current === 'CONNECTED') {
            disconnect();
        }
    };
  }, [disconnect]);

  return { agentStatus, transcripts, connect, disconnect, isConnected };
};
