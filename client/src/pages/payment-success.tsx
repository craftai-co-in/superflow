import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Crown, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import SEO from "@/components/seo";
import type { VerifyPaymentRequest } from "@shared/schema";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [planType, setPlanType] = useState<string>("");
  const [countdown, setCountdown] = useState(5);
  const [userStatus, setUserStatus] = useState<any>(null);
  const { toast } = useToast();

  // Extract plan from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan') || 'lite';
    const orderId = urlParams.get('orderId');
    const status = urlParams.get('status'); // Server-processed status
    
    setPlanType(plan);

    // If status is already success from server processing, payment is complete
    if (status === 'success' && orderId) {
      console.log('Payment already verified by server');
      toast({
        title: "Payment Successful!",
        description: `Your ${plan.toUpperCase()} plan has been activated.`,
      });
      
      // Track successful payment
      trackEvent('payment_completed', 'premium', plan);
    } else if (orderId) {
      // Still try to verify if no status
      verifyPayment.mutate({
        orderId: orderId!,
        transactionId: urlParams.get('transaction_id') || `txn_${Date.now()}`
      });
    } else {
      // No order ID - something went wrong
      toast({
        title: "Payment Status Unknown",
        description: "Unable to verify payment status. Please contact support if you were charged.",
        variant: "destructive",
      });
    }

    // Check user status for proper redirection
    checkUserStatus();

    // Start countdown for redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirection();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const checkUserStatus = async () => {
    try {
      const response = await fetch('/api/auth/check-routing');
      if (response.ok) {
        const data = await response.json();
        setUserStatus(data);
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
    }
  };

  const handleRedirection = () => {
    if (userStatus?.shouldRedirect && userStatus?.redirectTo) {
      window.location.href = userStatus.redirectTo;
    } else if (userStatus?.userPlan?.isPremium) {
      // Force redirect to premium app for premium users
      window.location.href = `https://app.superflow.work/welcome?plan=${planType}`;
    } else {
      // Stay on main app for free users
      window.location.href = '/dashboard';
    }
  };

  const verifyPayment = useMutation({
    mutationFn: async (data: VerifyPaymentRequest) => {
      const response = await apiRequest('POST', '/api/payment/verify', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment verification failed');
      }
      return response.json();
    },
    onSuccess: () => {
      trackEvent('payment_completed', 'premium', planType);
      toast({
        title: "Payment Successful!",
        description: `Your ${planType.toUpperCase()} plan has been activated.`,
      });
      // Refresh user status after payment verification
      setTimeout(() => checkUserStatus(), 1000);
    },
    onError: (error: any) => {
      console.error('Payment verification error:', error);
      toast({
        title: "Verification Issue",
        description: "Payment was successful but verification pending. Contact support if issues persist.",
        variant: "destructive",
      });
    }
  });

  const getPlanDetails = (plan: string) => {
    const plans = {
      lite: { name: 'Lite', price: '₹199', minutes: '60 minutes' },
      pro: { name: 'Pro', price: '₹999', minutes: '600 minutes' },
      max: { name: 'Max', price: '₹1999', minutes: 'Unlimited' }
    };
    return plans[plan as keyof typeof plans] || plans.lite;
  };

  const currentPlan = getPlanDetails(planType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <SEO
        title="Payment Successful - Superflow"
        description="Your payment has been processed successfully. Redirecting to premium features."
        canonical="https://superflow.work/payment/success"
      />
      
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Crown className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="font-semibold text-gray-800">
                {currentPlan.name} Plan Activated
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {currentPlan.price} • {currentPlan.minutes}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-gray-700">
              Welcome to Superflow Premium! Your account has been upgraded successfully.
            </p>
            <p className="text-sm text-gray-600">
              You now have access to unlimited recording, file uploads, and priority processing.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Redirecting to Premium App in {countdown}s
              </span>
            </div>
            <p className="text-xs text-blue-600">
              You'll be taken to app.superflow.work with your premium features
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Stay on Free App
            </Button>
            <Button
              onClick={() => window.location.href = `https://app.superflow.work/welcome?plan=${planType}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Go to Premium
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Receipt will be sent to your email shortly
          </p>
        </CardContent>
      </Card>
    </div>
  );
}