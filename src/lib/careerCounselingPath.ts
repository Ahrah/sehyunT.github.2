export const CAREER_COUNSELING_SLUG = 'jinro-counseling';

export function isCareerCounselingPath(pathname = typeof window !== 'undefined' ? window.location.pathname : ''): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === `/${CAREER_COUNSELING_SLUG}`;
}
