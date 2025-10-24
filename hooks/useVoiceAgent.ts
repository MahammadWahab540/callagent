import { useState, useCallback, useRef, useEffect } from 'react';
// Fix: Removed non-exported type 'LiveSession'.
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { AgentStatus, TranscriptEntry, OnboardingStage } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';
import { encode, decode, decodeAudioData, createBlob } from '../utils/audioUtils';

const selectPaymentOption: FunctionDeclaration = {
  name: 'selectPaymentOption',
  description: 'Registers the payment option selected by the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      option: {
        type: Type.STRING,
        description: 'The payment option chosen.',
        enum: ['FULL_PAYMENT', 'CREDIT_CARD', 'EMI'],
      },
    },
    required: ['option'],
  },
};

export const useVoiceAgent = ({ setCurrentStage }: { setCurrentStage: React.Dispatch<React.SetStateAction<OnboardingStage>> }) => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const connectionStateRef = useRef<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING'>('DISCONNECTED');

  const disconnect = useCallback(() => {
    if (connectionStateRef.current === 'DISCONNECTED' || connectionStateRef.current === 'DISCONNECTING') {
      return;
    }
    
    connectionStateRef.current = 'DISCONNECTING';
    console.log("Disconnecting due to error or user action...");

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
      setTranscripts((prev) => {
        const last = prev[prev.length - 1];
        if (last?.speaker === 'user' && !last.isFinal) {
          const newLast = { ...last, text: last.text + text };
          return [...prev.slice(0, -1), newLast];
        }
        return [...prev, { speaker: 'user', text, isFinal: false }];
      });
    }

    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      setTranscripts((prev) => {
        const last = prev[prev.length - 1];
        if (last?.speaker === 'agent' && !last.isFinal) {
          const newLast = { ...last, text: last.text + text };
          return [...prev.slice(0, -1), newLast];
        }
        return [...prev, { speaker: 'agent', text, isFinal: false }];
      });
    }

    if (message.serverContent?.turnComplete) {
      setAgentStatus(AgentStatus.LISTENING);
      setTranscripts(prev => {
          const newTranscripts = prev.map(t => ({...t}));
          
          let lastAgentFinalized = false;
          let lastUserFinalized = false;

          for (let i = newTranscripts.length - 1; i >= 0; i--) {
              if (newTranscripts[i].speaker === 'agent' && !newTranscripts[i].isFinal && !lastAgentFinalized) {
                  newTranscripts[i].isFinal = true;
                  lastAgentFinalized = true;
              }
              if (newTranscripts[i].speaker === 'user' && !newTranscripts[i].isFinal && !lastUserFinalized) {
                  newTranscripts[i].isFinal = true;
                  lastUserFinalized = true;
              }
              if(lastAgentFinalized && lastUserFinalized) break;
          }
          return newTranscripts;
      });
    }
  }, []);

  const handleAudio = useCallback(async (message: LiveServerMessage) => {
    try {
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
    } catch (error) {
        console.error("Error processing audio chunk:", error);
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
          tools: [{ functionDeclarations: [selectPaymentOption] }],
        },
        callbacks: {
          onopen: async () => {
            try {
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
            } catch (error) {
              console.error("Error during microphone setup:", error);
              setAgentStatus(AgentStatus.ERROR);
              disconnect();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            handleTranscription(message);
            await handleAudio(message);

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'selectPaymentOption') {
                  const option = fc.args.option;
                  if (option === 'EMI') {
                    setCurrentStage(OnboardingStage.NBFC);
                  }
                }
                
                sessionPromiseRef.current?.then((session) => {
                  session.sendToolResponse({
                    functionResponses: {
                      id : fc.id,
                      name: fc.name,
                      response: { result: "ok, choice registered" },
                    }
                  })
                });
              }
            }

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

      sessionPromiseRef.current.catch(e => {
        console.error("Session promise rejected:", e);
        setAgentStatus(AgentStatus.ERROR);
        disconnect();
      });

    } catch (error) {
      console.error("Failed to connect:", error);
      setAgentStatus(AgentStatus.ERROR);
      disconnect();
    }
  }, [disconnect, handleAudio, handleTranscription, setCurrentStage]);

  useEffect(() => {
    return () => {
        if(connectionStateRef.current === 'CONNECTED' || connectionStateRef.current === 'CONNECTING') {
            disconnect();
        }
    };
  }, [disconnect]);

  return { agentStatus, transcripts, connect, disconnect, isConnected };
};