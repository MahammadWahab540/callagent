
import React from 'react';
import { AgentStatus } from '../types';

interface VoiceVisualizerProps {
  status: AgentStatus;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ status }) => {
  const getStatusText = () => {
    switch (status) {
      case AgentStatus.IDLE: return 'Maya is idle';
      case AgentStatus.CONNECTING: return 'Connecting to Maya...';
      case AgentStatus.LISTENING: return 'Listening...';
      case AgentStatus.THINKING: return 'Thinking...';
      case AgentStatus.SPEAKING: return 'Maya is speaking...';
      case AgentStatus.ERROR: return 'Connection error';
      default: return 'Ready';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 w-full">
        <div className="relative flex items-center justify-center w-24 h-16">
            <div className={`absolute w-4 h-4 rounded-full bg-blue-400 transition-all duration-300 ${status === AgentStatus.LISTENING || status === AgentStatus.SPEAKING ? 'animate-ping' : ''}`}></div>
            <div className={`absolute w-3 h-3 rounded-full bg-blue-300 transition-all duration-300 ${status === AgentStatus.LISTENING || status === AgentStatus.SPEAKING ? 'animate-ping delay-150' : ''}`}></div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                status === AgentStatus.LISTENING ? 'bg-blue-500/30' :
                status === AgentStatus.SPEAKING ? 'bg-green-500/30' :
                status === AgentStatus.THINKING ? 'bg-yellow-500/30 animate-pulse' :
                'bg-gray-700/50'
            }`}>
                 <div className={`w-8 h-8 rounded-full transition-all duration-300 ${
                    status === AgentStatus.LISTENING ? 'bg-blue-500' :
                    status === AgentStatus.SPEAKING ? 'bg-green-500' :
                    status === AgentStatus.THINKING ? 'bg-yellow-500' :
                    'bg-gray-600'
                }`}></div>
            </div>
        </div>
        <p className="text-sm text-gray-400 h-5">{getStatusText()}</p>
    </div>
  );
};

export default VoiceVisualizer;
