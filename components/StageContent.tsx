import React from 'react';
import { OnboardingStage } from '../types';

interface StageContentProps {
  stage: {
    id: OnboardingStage;
    title: string;
    narrative: string;
  };
  onPaymentSelect: (option: 'EMI' | 'FULL_PAYMENT' | 'CREDIT_CARD') => void;
  isConnected: boolean;
}

const StageContent: React.FC<StageContentProps> = ({ stage, onPaymentSelect, isConnected }) => {
  return (
    <div className="flex-grow flex flex-col">
      <h2 className="text-xl font-semibold text-blue-300 mb-2">Stage {stage.id + 1}: {stage.title}</h2>
      <p className="text-gray-300 leading-relaxed">{stage.narrative}</p>

      {stage.id === OnboardingStage.PAYMENT && (
        <div className="mt-6 pt-6 border-t border-gray-700/50 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Choose an option:</h3>
            <button
                onClick={() => onPaymentSelect('EMI')}
                disabled={isConnected}
                className="w-full text-left p-3 bg-blue-600/50 hover:bg-blue-600/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="font-bold">0% Loan EMI</span>
                <span className="block text-sm text-blue-200">Proceed with our NBFC partners.</span>
            </button>
            <button
                onClick={() => onPaymentSelect('FULL_PAYMENT')}
                disabled={isConnected}
                className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="font-bold">Full Payment</span>
                 <span className="block text-sm text-gray-300">Complete the payment in one go.</span>
            </button>
            <button
                onClick={() => onPaymentSelect('CREDIT_CARD')}
                disabled={isConnected}
                className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="font-bold">Credit Card</span>
                 <span className="block text-sm text-gray-300">Flexible billing options.</span>
            </button>
        </div>
      )}
    </div>
  );
};

export default StageContent;