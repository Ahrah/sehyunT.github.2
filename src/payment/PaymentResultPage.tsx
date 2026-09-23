import { CheckCircle2, XCircle, Clock } from 'lucide-react';

type ResultStatus = 'success' | 'cancel' | 'fail';

const CONTENT: Record<ResultStatus, { icon: typeof CheckCircle2; title: string; desc: string; color: string }> = {
  success: {
    icon: CheckCircle2,
    title: '결제가 완료되었습니다',
    desc: '결제해 주셔서 감사합니다. 확인 후 순차적으로 안내드릴게요.',
    color: 'text-emerald-600',
  },
  cancel: {
    icon: Clock,
    title: '결제가 취소되었습니다',
    desc: '결제를 진행하지 않으셨어요. 다시 시도하시려면 원래 링크로 돌아가 주세요.',
    color: 'text-brand-gray',
  },
  fail: {
    icon: XCircle,
    title: '결제에 실패했습니다',
    desc: '결제 처리 중 문제가 발생했어요. 잠시 후 다시 시도하거나 문의해 주세요.',
    color: 'text-brand-accent',
  },
};

export function PaymentResultPage({ status }: { status: ResultStatus }) {
  const { icon: Icon, title, desc, color } = CONTENT[status];

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <Icon className={`mx-auto ${color}`} size={48} />
        <h1 className="text-xl font-extrabold text-brand-text">{title}</h1>
        <p className="text-sm text-brand-gray">{desc}</p>
        <a href="/" className="inline-block text-sm font-bold text-brand-text underline hover:opacity-70">
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}
