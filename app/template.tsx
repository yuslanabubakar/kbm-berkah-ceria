/**
 * Re-mounts on every navigation, giving each page a soft "semi-fade" entrance.
 * Opacity-only on purpose: a transform here would shift fixed children
 * (bottom nav, FAB, modals) while the animation runs.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="kbm-page-fade">{children}</div>;
}
