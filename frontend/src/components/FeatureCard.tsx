export function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-medium text-[var(--color-text-primary)] text-sm">{title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>
    </div>
  );
}
