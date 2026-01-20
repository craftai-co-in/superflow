import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Clock, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PaymentTestPanel() {
  const [testingPlan, setTestingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user plan status
  const { data: planStatus, isLoading } = useQuery({
    queryKey: ['/api/user/plan-status']
  });

  const createOrderMutation = useMutation({
    mutationFn: async ({ planType }: { planType: string }) => {
      setTestingPlan(planType);
      const response = await apiRequest('POST', '/api/payment/create-order', { planType });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment order');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Order Created Successfully!",
        description: `Payment session ID: ${data.paymentSessionId.substring(0, 20)}...`,
      });
      
      // For testing, simulate going to payment page
      toast({
        title: "Payment Gateway Ready",
        description: "In production, user would be redirected to Cashfree payment page",
      });
      
      setTestingPlan(null);
    },
    onError: (error: any) => {
      toast({
        title: "Order Creation Failed",
        description: error.message,
        variant: "destructive",
      });
      setTestingPlan(null);
    }
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, planType }: { orderId: string, planType: string }) => {
      const response = await apiRequest('POST', '/api/payment/verify', { 
        orderId, 
        transactionId: `test_txn_${Date.now()}` 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify payment');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Verified!",
        description: `Plan activated: ${data.planType}`,
      });
      
      // Refresh user plan status
      queryClient.invalidateQueries({ queryKey: ['/api/user/plan-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const plans = [
    { type: 'lite', name: 'Lite Plan', price: '₹199', minutes: '60', color: 'bg-green-500' },
    { type: 'pro', name: 'Pro Plan', price: '₹999', minutes: '600', color: 'bg-blue-500' },
    { type: 'max', name: 'Max Plan', price: '₹1999', minutes: 'Unlimited', color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Gateway Testing Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Plan Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Current Plan Status</h3>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : planStatus ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={planStatus.isPremium ? "default" : "secondary"}>
                    {planStatus.planType.toUpperCase()}
                  </Badge>
                  <span>{planStatus.minutesRemaining} minutes remaining</span>
                </div>
                {planStatus.planExpiresAt && (
                  <p className="text-sm text-gray-600">
                    Expires: {new Date(planStatus.planExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <span>Not loaded</span>
            )}
          </div>

          {/* Payment Plan Testing */}
          <div>
            <h3 className="font-semibold mb-4">Test Payment Plans</h3>
            <div className="grid gap-3">
              {plans.map(plan => (
                <div key={plan.type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-gray-600">{plan.price} • {plan.minutes} minutes</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => createOrderMutation.mutate({ planType: plan.type })}
                      disabled={createOrderMutation.isPending || testingPlan === plan.type}
                      data-testid={`test-create-order-${plan.type}`}
                    >
                      {testingPlan === plan.type ? (
                        <>
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Order"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Created Order Testing */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Test Payment Verification</h3>
            <p className="text-sm text-gray-600 mb-3">
              Simulate successful payment for testing plan activation
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const lastOrderId = "order_1756989545565_8"; // Use last created order
                  simulatePaymentMutation.mutate({ orderId: lastOrderId, planType: "lite" });
                }}
                disabled={simulatePaymentMutation.isPending}
                data-testid="simulate-payment-success"
              >
                {simulatePaymentMutation.isPending ? (
                  <>
                    <Clock className="w-3 h-3 mr-1 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Simulate Success
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}