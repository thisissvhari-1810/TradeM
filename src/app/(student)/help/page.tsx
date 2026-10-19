import Link from "next/link";

export const instant = false;

export default function HelpPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-6">
      <h1 className="text-xl font-semibold">Help</h1>
      <p className="text-muted">TradeLab is a practice platform. Balances, orders, and profit figures are virtual. Nothing on this site is sent to a broker.</p>
      <p>The chart uses the configured market source. While that source is the built-in demo, prices are labelled DEMO and are not live exchange prices. A Dhan connection, when configured, replaces those candles with Dhan prices. Orders still stay inside TradeLab. NIFTY 50 and SENSEX are not in the equity practice catalogue.</p>
      <p><Link className="text-primary" href="/options">Options</Link> is a separate simulated NIFTY 50 options book. It can read the Dhan index and option chain when that token is set. Premiums are labelled modelled when the chain is missing. Nothing on that page is sent to a broker.</p>
      <p>A market order needs a fresh quote. If the quote is stale or missing, the server rejects it. Selling is limited to shares you already hold.</p>
      <p className="text-muted">Charts use the Lightweight Charts library. <a className="text-primary" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a> created that library.</p>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li><Link className="text-primary" href="/dashboard">Home</Link> shows this account&apos;s equity, quotes, and recent orders.</li>
        <li><Link className="text-primary" href="/terminal">Chart</Link> is where simulated orders are reviewed and submitted.</li>
        <li><Link className="text-primary" href="/learn">Learn</Link> stores lesson completion on your account.</li>
        <li><Link className="text-primary" href="/journal">Journal</Link> stores the reason and lesson for a practice trade.</li>
      </ul>
    </article>
  );
}
