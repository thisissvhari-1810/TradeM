import Link from "next/link";

const BENEFITS = [
  ["Price discipline", "A written plan for entry, size, and exit is steadier than reacting to every tick."],
  ["Risk before reward", "The useful question is what you can lose, and whether that loss still leaves you able to trade tomorrow."],
  ["Reading the tape", "Candles, volume, and trend describe how a price has behaved. They do not promise the next move."],
  ["Patience", "Waiting for a setup is part of the work. Most of a good trade happens before the order."],
  ["A record you can review", "Winners and losers both teach when the reason for the trade is written down."],
  ["Capital awareness", "Cash, charges, and open positions decide whether the next trade still fits the book."],
];

export default function HomePage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-primary">Educational paper trading</p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl font-medium sm:text-6xl">Practise market decisions with virtual rupees.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
        TradeLab is a learning desk for students. The benefit of trading here is repetition: you can study risk, timing, and review without sending an order to a broker.
      </p>
      <div className="mt-8">
        <Link className="bg-primary px-5 py-2.5 font-medium text-on-primary" href="/login">Sign in</Link>
      </div>
      <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map(([title, body]) => (
          <section key={title} className="bg-panel p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
