import { useState, useEffect } from "react";
import { CheckCircle, Clock, AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'creating' | 'redirecting' | 'processing' | 'success' | 'failed';
  planName: string;
  amount: number;
  paymentUrl?: string;
}

export default function PaymentStatusModal({ 
  isOpen, 
  onClose, 
  status, 
  planName, 
  amount, 
  paymentUrl 
}: PaymentStatusModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === 'creating') {
      setProgress(20);
    } else if (status === 'redirecting') {
      setProgress(40);
    } else if (status === 'processing') {
      setProgress(70);
    } else if (status === 'success') {
      setProgress(100);
    }
  }, [status]);

  if (!isOpen) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'creating':
        return {
          icon: <Clock className="w-8 h-8 text-blue-500 animate-spin" />,
          title: "Creating Payment Order",
          description: "Setting up your payment with Cashfree...",
          color: "text-blue-600"
        };
      case 'redirecting':
        return {
          icon: <ExternalLink className="w-8 h-8 text-purple-500" />,
          title: "Redirecting to Payment",
          description: "Opening secure payment gateway...",
          color: "text-purple-600"
        };
      case 'processing':
        return {
          icon: <CreditCard className="w-8 h-8 text-orange-500 animate-pulse" />,
          title: "Payment in Progress",
          description: "Completing your transaction...",
          color: "text-orange-600"
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: "Payment Successful!",
          description: "Your plan has been activated.",
          color: "text-green-600"
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-500" />,
          title: "Payment Failed",
          description: "Please try again or contact support.",
          color: "text-red-600"
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {statusConfig.icon}
          </div>
          <CardTitle className={`text-xl ${statusConfig.color}`}>
            {statusConfig.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600">{statusConfig.description}</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500">Plan</div>
              <div className="font-semibold">{planName} - ₹{amount}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {status === 'redirecting' && paymentUrl && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                If redirect doesn't happen automatically:
              </p>
              <Button 
                onClick={() => window.open(paymentUrl, '_self')}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="manual-payment-redirect"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Continue to Payment
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="flex-1"
                data-testid="close-payment-modal"
              >
                Close
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="retry-payment"
              >
                Try Again
              </Button>
            </div>
          )}

          {status === 'success' && (
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="go-to-dashboard"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}