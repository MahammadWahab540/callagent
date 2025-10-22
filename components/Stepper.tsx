
import React from 'react';
import { OnboardingStage } from '../types';

interface StepperProps {
  stages: string[];
  currentStage: OnboardingStage;
}

const Stepper: React.FC<StepperProps> = ({ stages, currentStage }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {stages.map((stage, stageIdx) => (
          <li key={stage} className={`relative ${stageIdx !== stages.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stageIdx < currentStage ? (
              // Completed step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-blue-500" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center bg-blue-500 rounded-full hover:bg-blue-600">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                  </svg>
                </div>
              </>
            ) : stageIdx === currentStage ? (
              // Current step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center bg-gray-700 border-2 border-blue-500 rounded-full" aria-current="step">
                  <span className="h-2.5 w-2.5 bg-blue-500 rounded-full" aria-hidden="true" />
                </div>
              </>
            ) : (
              // Upcoming step
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-600" />
                </div>
                <div className="group relative flex h-8 w-8 items-center justify-center bg-gray-700 border-2 border-gray-600 rounded-full hover:border-gray-400">
                   <span className="h-2.5 w-2.5 bg-transparent rounded-full group-hover:bg-gray-400" aria-hidden="true" />
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;
