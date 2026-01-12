import { LoginButton } from '@/components/Auth/LoginButton';
import { FeatureCard } from '@/components/FeatureCard';

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2 flex items-baseline justify-center">
          <img src="/oneweek.svg" alt="Calendar" className="w-10 h-10" />
          <span>
            <span className="text-[#ef4136]">One</span>Week
          </span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">Familjekalendern för veckofokus</p>
      </div>

      <div className="bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 text-center">Kom igång</h2>
        <p className="text-[var(--color-text-secondary)] text-center mb-6">
          Logga in med Google för att ansluta dina kalendrar.
        </p>
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
        <FeatureCard icon="📅" title="Veckovy" description="Se hela familjens vecka" />
        <FeatureCard icon="🎯" title="Ansvar" description="Tydligt vem som äger vad" />
        <FeatureCard icon="⚡" title="Snabbt" description="Byt ansvar med ett klick" />
      </div>
    </div>
  );
}
