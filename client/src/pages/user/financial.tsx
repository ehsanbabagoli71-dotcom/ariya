import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PersianDatePicker } from "@/components/persian-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Plus,
  Minus,
  Eye,
  EyeOff
} from "lucide-react";
import moment from "moment-jalaali";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTransactionSchema, type Transaction } from "@shared/schema";
import { z } from "zod";

const transactionColors = {
  deposit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  withdraw: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  order_payment: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  commission: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
};

const transactionLabels = {
  deposit: "واریز",
  withdraw: "برداشت",
  order_payment: "پرداخت سفارش",
  commission: "کمیسیون"
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

const statusLabels = {
  pending: "در انتظار",
  completed: "تکمیل شده",
  failed: "ناموفق"
};

const depositWithdrawSchema = z.object({
  type: z.literal("deposit"),
  amount: z.coerce.number().positive("مبلغ باید مثبت باشد"),
  status: z.literal("pending"),
  transactionDate: z.string().min(1, "تاریخ انجام تراکنش الزامی است"),
  transactionTime: z.string().min(1, "ساعت انجام تراکنش الزامی است"),
  accountSource: z.string().min(1, "از حساب الزامی است"),
  paymentMethod: z.string().default("card"),
  referenceId: z.string().optional(),
  userId: z.string().optional(), // Server sets this
  orderId: z.string().optional(),
});

export default function FinancialPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType] = useState<"deposit">("deposit");
  const [showBalance, setShowBalance] = useState(false);
  
  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions']
  });

  // Calculate balance and stats
  const balance = transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => {
      const amount = Number(t.amount);
      if (t.type === 'deposit' || t.type === 'commission') {
        return acc + amount;
      } else if (t.type === 'withdraw' || t.type === 'order_payment') {
        return acc - amount;
      }
      return acc;
    }, 0);

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalWithdraws = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'completed')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Request form
  const form = useForm({
    resolver: zodResolver(depositWithdrawSchema),
    defaultValues: {
      type: "deposit" as const,
      amount: 0,
      status: "pending" as const,
      transactionDate: moment().format('YYYY-MM-DD'), // تاریخ امروز
      transactionTime: moment().format('HH:mm'), // زمان فعلی
      accountSource: "",
      paymentMethod: "card",
      referenceId: ""
    }
  });

  // Create transaction request mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/transactions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "موفق",
        description: "درخواست واریز ثبت شد"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: "خطا در ثبت درخواست",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    console.log('✅ Form submitted successfully with data:', data);
    console.log('✅ Form errors:', form.formState.errors);
    
    // Force amount to be string for API
    const payload = {
      ...data,
      amount: String(data.amount)
    };
    
    console.log('✅ Final payload being sent to server:', payload);
    createTransactionMutation.mutate(payload);
  };

  const onError = (errors: any) => {
    console.log('❌ Form validation failed:', errors);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-financial">
            امور مالی
          </h1>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) {
              // Reset form with current date/time when dialog opens
              form.reset({
                type: "deposit" as const,
                amount: 0,
                status: "pending" as const,
                transactionDate: moment().format('YYYY-MM-DD'),
                transactionTime: moment().format('HH:mm'),
                accountSource: "",
                paymentMethod: "card",
                referenceId: ""
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-new-transaction">
                <Plus className="w-4 h-4" />
                درخواست جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  درخواست واریز
                </DialogTitle>
                <DialogDescription>
                  اطلاعات مورد نیاز را تکمیل کنید
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مبلغ (تومان)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1000"
                            step="1000"
                            {...field}
                            placeholder="۰"
                            data-testid="input-amount"
                            className="text-right"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاریخ انجام تراکنش</FormLabel>
                        <FormControl>
                          <Input 
                            type="text"
                            {...field}
                            placeholder="1403/07/05"
                            data-testid="input-transaction-date"
                            className="text-right"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ساعت انجام تراکنش</FormLabel>
                        <FormControl>
                          <Input 
                            type="time"
                            {...field}
                            data-testid="input-transaction-time"
                            className="text-right"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>از حساب</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="نام بانک یا منبع حساب..."
                            {...field}
                            data-testid="input-account-source"
                            className="text-right"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="referenceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>شماره پیگیری (اختیاری)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value ?? ""}
                            placeholder="شماره پیگیری تراکنش"
                            data-testid="input-reference-id"
                            className="text-right"
                            dir="rtl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createTransactionMutation.isPending}
                      data-testid="button-submit-transaction"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {createTransactionMutation.isPending ? "در حال ثبت..." : "ثبت درخواست"}
                    </Button>

                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel-transaction"
                    >
                      لغو
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    موجودی کل
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-balance">
                      {showBalance ? formatPrice(balance) : '••••••••'}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBalance(!showBalance)}
                      data-testid="button-toggle-balance"
                    >
                      {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    کل واریزی‌ها
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2" data-testid="text-deposits">
                    {formatPrice(totalDeposits)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    کل برداشت‌ها
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2" data-testid="text-withdrawals">
                    {formatPrice(totalWithdraws)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    تعداد تراکنش‌ها
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2" data-testid="text-transaction-count">
                    {transactions.length}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              تاریخچه تراکنش‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  هنوز تراکنشی انجام نداده‌اید
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                  اولین درخواست مالی خود را ثبت کنید
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-first-transaction">
                  <Plus className="w-4 h-4 mr-2" />
                  درخواست جدید
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${transactionColors[transaction.type as keyof typeof transactionColors]}`}>
                        {transaction.type === 'deposit' && <TrendingUp className="w-4 h-4" />}
                        {transaction.type === 'withdraw' && <TrendingDown className="w-4 h-4" />}
                        {transaction.type === 'order_payment' && <Minus className="w-4 h-4" />}
                        {transaction.type === 'commission' && <Plus className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {transactionLabels[transaction.type as keyof typeof transactionLabels]}
                          </h4>
                          <Badge className={statusColors[transaction.status as keyof typeof statusColors]}>
                            {statusLabels[transaction.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                          {transaction.transactionDate && (
                            <p>تاریخ انجام: {transaction.transactionDate}</p>
                          )}
                          {transaction.transactionTime && (
                            <p>ساعت انجام: {transaction.transactionTime}</p>
                          )}
                          {transaction.accountSource && (
                            <p>از حساب: {transaction.accountSource}</p>
                          )}
                        </div>
                        {transaction.createdAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            {moment(transaction.createdAt).format('jYYYY/jMM/jDD')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <p 
                        className={`text-lg font-bold ${
                          transaction.type === 'deposit' || transaction.type === 'commission' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}
                        data-testid={`amount-${transaction.id}`}
                      >
                        {transaction.type === 'deposit' || transaction.type === 'commission' ? '+' : '-'}
                        {formatPrice(Number(transaction.amount))}
                      </p>
                      {transaction.referenceId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          رف: {transaction.referenceId}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}