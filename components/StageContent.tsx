
import React from 'react';
import { OnboardingStage } from '../types';

interface StageContentProps {
  stage: {
    id: OnboardingStage;
    title: string;
    narrative: string;
  };
}

const StageContent: React.FC<StageContentProps> = ({ stage }) => {
  return (
    <div className="flex-grow">
      <h2 className="text-xl font-semibold text-blue-300 mb-2">Stage {stage.id + 1}: {stage.title}</h2>
      <p className="text-gray-300 leading-relaxed">{stage.narrative}</p>
    </div>
  );
};

export default StageContent;
