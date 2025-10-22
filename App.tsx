
import React, { useState, useMemo } from 'react';
import { OnboardingStage, AgentStatus } from './types';
import { STAGES } from './constants';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import Stepper from './components/Stepper';
import StageContent from './components/StageContent';
import VoiceVisualizer from './components/VoiceVisualizer';
import TranscriptDisplay from './components/TranscriptDisplay';
import { SparklesIcon, ArrowLeftIcon, ArrowRightIcon } from './components/Icons';

const App: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<OnboardingStage>(OnboardingStage.GREETING);
  const { agentStatus, transcripts, connect, disconnect, isConnected } = useVoiceAgent();

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleNextStage = () => {
    setCurrentStage(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
  };

  const handlePrevStage = () => {
    setCurrentStage(prev => (prev > 0 ? prev - 1 : prev));
  };
  
  const buttonText = useMemo(() => {
    if (agentStatus === AgentStatus.CONNECTING) return 'Connecting...';
    if (isConnected) return 'End Conversation';
    return 'Start with Maya';
  }, [agentStatus, isConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111827] to-[#1a2035] flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-4xl mx-auto bg-[#1f2937]/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-gray-700/50">
        <header className="p-6 border-b border-gray-700/50">
          <h1 className="text-2xl font-bold text-center text-gray-100 flex items-center justify-center gap-2">
            <SparklesIcon /> NxtWave Onboarding
          </h1>
          <p className="text-center text-gray-400 mt-1">Guided by your AI assistant, Maya</p>
        </header>
        
        <main className="p-6 md:p-8">
          <Stepper stages={STAGES.map(s => s.title)} currentStage={currentStage} />
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <StageContent stage={STAGES[currentStage]} />
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700/50">
                <button
                  onClick={handlePrevStage}
                  disabled={currentStage === 0}
                  className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <ArrowLeftIcon /> Prev
                </button>
                <button
                  onClick={handleNextStage}
                  disabled={currentStage === STAGES.length - 1}
                  className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Next <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between bg-gray-900/50 rounded-lg p-4 h-[400px] border border-gray-700/50">
              <TranscriptDisplay transcripts={transcripts} />
              <div className="flex flex-col items-center gap-4 mt-4">
                 <VoiceVisualizer status={agentStatus} />
                 <button
                    onClick={handleToggleConnection}
                    disabled={agentStatus === AgentStatus.CONNECTING}
                    className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-wait ${
                      isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                    } shadow-lg shadow-black/20`}
                  >
                   {buttonText}
                 </button>
              </div>
            </div>
          </div>
        </main>
      </div>
       <footer className="text-center mt-6 text-gray-500 text-sm">
          <p>This is a demonstration of real-time voice AI using Google's Gemini API.</p>
        </footer>
    </div>
  );
};

export default App;
