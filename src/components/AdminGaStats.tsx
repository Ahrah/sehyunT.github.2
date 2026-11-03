import { useEffect, useState } from 'react';
import { Users, Clock, MousePointer2, ExternalLink } from 'lucide-react';
import {
  fetchGaStats,
  formatDuration,
  gaReportUrl,
  gaStatusLabel,
  gaStatusMessage,
  type GaStatsState,
} from '../lib/adminGaStats';
import { formatKstDateTime } from '../lib/careerCounseling';

const REFRESH_MS = 5 * 60 * 1000;

/** 실제 로그인한 관리자 토큰으로 GA 숫자를 불러옵니다. */
export function useGaStats(): GaStatsState {
  const [state, setState] = useState<GaStatsState>({ kind: 'loading' });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { auth } = await import('../lib/firebase');
      const next = await fetchGaStats(async () => {
        if (!auth.currentUser) throw new Error('signed out');
        return auth.currentUser.getIdToken();
      });
      if (alive) setState(next);
    };
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  return state;
}

function statusColor(state: GaStatsState): string {
  if (state.kind === 'ok') return 'text-emerald-500';
  if (state.kind === 'error') return 'text-red-500';
  return 'text-brand-gray';
}

type Card = { label: string; value: string; sub?: string; icon: typeof Users; color: string; status?: string };

/** 회원 수 카드와 GA 카드 두 개, 아래에 연결 상태 줄을 그립니다. 연결 전·오류일 때는 숫자 대신 '—'만 보입니다. */
export function AdminStatsCards({ memberCount, state }: { memberCount: number; state: GaStatsState }) {
  const ok = state.kind === 'ok' ? state : null;
  const label = gaStatusLabel(state);
  const cards: Card[] = [
    { label: '전체 회원', value: memberCount.toString(), icon: Users, color: 'text-brand-accent' },
    {
      label: '오늘 방문자',
      value: ok ? ok.today.activeUsers.toLocaleString('ko-KR') : '—',
      sub: ok ? `오늘 세션 ${ok.today.sessions.toLocaleString('ko-KR')}회 · 최근 7일 방문자 ${ok.last7Days.activeUsers.toLocaleString('ko-KR')}명` : undefined,
      icon: MousePointer2,
      color: 'text-amber-500',
      status: label,
    },
    {
      label: '평균 머문 시간 (최근 7일)',
      value: ok ? formatDuration(ok.last7Days.avgSessionSeconds) : '—',
      sub: ok ? `오늘 ${formatDuration(ok.today.avgSessionSeconds)} · 최근 7일 세션 ${ok.last7Days.sessions.toLocaleString('ko-KR')}회` : undefined,
      icon: Clock,
      color: 'text-emerald-500',
      status: label,
    },
  ];

  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-brand-secondary border border-brand-light-gray p-8 flex flex-col justify-between h-48 group hover:border-brand-text transition-all">
            <div className="flex justify-between items-start">
              <stat.icon className={stat.color} size={24} />
              {stat.status && (
                <span className={`text-[10px] font-black tracking-widest ${statusColor(state)}`} data-testid="ga-status">
                  {stat.status}
                </span>
              )}
            </div>
            <div>
              <p className="text-4xl font-black mb-1">{stat.value}</p>
              <p className="text-[10px] font-black tracking-widest text-brand-gray">{stat.label}</p>
              {stat.sub && <p className="mt-1 text-[10px] font-bold text-brand-gray">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px] font-bold text-brand-gray">
        <p data-testid="ga-message">
          {gaStatusMessage(state)}
          {ok?.fetchedAt ? ` (불러온 시각 ${formatKstDateTime(new Date(ok.fetchedAt))})` : ''}
        </p>
        <a
          href={gaReportUrl(ok?.propertyId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand-text hover:text-brand-accent underline underline-offset-4"
        >
          GA에서 자세히 보기 <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
