import { useState } from "react";
import { X, Crown, Star, Clock, Upload, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import PaymentStatusModal from "@/components/payment-status-modal";
import type { CreatePaymentOrderRequest } from "@shared/schema";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlanType = 'lite' | 'pro' | 'max';

const PLANS = {
  lite: {
    name: 'Lite',
    price: '₹199',
    minutes: '60 minutes',
    features: [
      '60 minutes of recording',
      'AI transcription',
      'Content enhancement',
      'Basic export options'
    ]
  },
  pro: {
    name: 'Pro',
    price: '₹999',
    minutes: '600 minutes',
    features: [
      '600 minutes of recording',
      'Audio file upload',
      'Priority processing',
      'Advanced export formats',
      'Premium templates'
    ]
  },
  max: {
    name: 'Max',
    price: '₹1999',
    minutes: 'Unlimited',
    features: [
      'Unlimited recording',
      'Audio file upload',
      'Highest priority',
      'All export formats',
      'Premium templates',
      'Early access to features'
    ]
  }
};

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('lite');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'creating' | 'redirecting' | 'processing' | 'success' | 'failed' | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const paymentMutation = useMutation({
    mutationFn: async (data: CreatePaymentOrderRequest) => {
      setPaymentStatus('creating');
      const response = await apiRequest('POST', '/api/payment/create-order', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment order');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Track payment initiation
      trackEvent('payment_initiated', 'premium', selectedPlan);
      
      console.log('Payment order created:', data);
      setPaymentStatus('redirecting');
      
      // Redirect to Cashfree payment page
      if (data.paymentSessionId) {
        setTimeout(() => {
          // Redirect to Cashfree payment page (sandbox for development)
          window.location.href = `https://payments-test.cashfree.com/forms/checkout?payment_session_id=${data.paymentSessionId}`;
        }, 1500);
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setPaymentStatus('failed');
      toast({
        title: "Payment Creation Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePayment = async (planType: PlanType) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please sign in to upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setSelectedPlan(planType);
    paymentMutation.mutate({ planType });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Plan</h2>
              <p className="text-gray-600">Unlock unlimited recording and premium features</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              data-testid="button-close-premium-modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Object.entries(PLANS).map(([key, plan]) => {
              const planKey = key as PlanType;
              const isPopular = planKey === 'pro';
              
              return (
                <div
                  key={key}
                  className={`relative border-2 rounded-xl p-6 transition-all cursor-pointer ${
                    selectedPlan === planKey
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isPopular ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}`}
                  onClick={() => setSelectedPlan(planKey)}
                  data-testid={`card-plan-${planKey}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <Crown className={`w-8 h-8 mx-auto mb-2 ${planKey === 'max' ? 'text-purple-600' : planKey === 'pro' ? 'text-blue-600' : 'text-green-600'}`} />
                    <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-2">{plan.price}</div>
                    <div className="text-gray-600">{plan.minutes}</div>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePayment(planKey);
                    }}
                    disabled={isProcessing}
                    className={`w-full ${
                      planKey === 'max' ? 'bg-purple-600 hover:bg-purple-700' :
                      planKey === 'pro' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-green-600 hover:bg-green-700'
                    }`}
                    data-testid={`button-select-${planKey}`}
                  >
                    {isProcessing && selectedPlan === planKey ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Features Comparison */}
          <div className="text-center text-gray-600">
            <p className="mb-2">✅ All plans include AI transcription and content enhancement</p>
            <p>🔒 Secure payments powered by Cashfree</p>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      {paymentStatus && (
        <PaymentStatusModal
          isOpen={!!paymentStatus}
          onClose={() => setPaymentStatus(null)}
          status={paymentStatus}
          planName={PLANS[selectedPlan].name}
          amount={parseInt(PLANS[selectedPlan].price.replace('₹', '').replace(',', ''))}
        />
      )}
    </div>
  );
}