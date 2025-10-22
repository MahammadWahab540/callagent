
import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[];
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcripts }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);
  
  return (
    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
      {transcripts.map((entry, index) => (
        <div key={index} className={`flex items-start gap-2.5 ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 rounded-xl ${
              entry.speaker === 'user' 
              ? 'rounded-br-none bg-blue-600' 
              : 'rounded-bl-none bg-gray-700'
            } ${!entry.isFinal ? 'opacity-70' : ''}`}>
            <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
              <span className="text-sm font-semibold text-white">{entry.speaker === 'user' ? 'You' : 'Maya'}</span>
            </div>
            <p className="text-sm font-normal text-white">{entry.text}</p>
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TranscriptDisplay;
