# Simulation rules

TradeLab never sends an order to a broker. A fill is a ledger event inside PostgreSQL.

## Prices

The chart does not create prices. A configured provider does.

- `demo`, the default, builds a deterministic synthetic series. Every quote and fill is labelled `DEMO`. The same symbol and timestamp produce the same price on every server instance.
- `twelvedata` requests NSE or BSE symbols from Twelve Data. It is labelled `DELAYED` unless `MARKET_DATA_MODE=realtime` is set by an operator who has the right to display real-time data.
- `alphavantage` requests a global quote and daily history. It is labelled `DELAYED` or `HISTORICAL`. It is not an Indian real-time feed.
- If the selected provider errors, the order is rejected or left resting. Demo prices are not substituted under a live provider's name.

Market orders require a fresh reference. Real-time quotes older than 20 seconds, delayed quotes older than 20 minutes, and demo quotes older than 15 minutes are stale. Those windows are configurable. A stale or missing price does not fill.

The cash-session clock is an approximation of weekdays 09:15–15:30 Asia/Kolkata, plus an optional holiday list. It is not an official exchange status feed. For a delayed or real-time provider, marketable orders do not fill while that session is closed. Demo mode can still fill when the session is closed so a class can practise; the fill remains labelled `DEMO`. Set `demoFillWhenClosed` to false in `trading.risk` to turn that off.

## Orders

Supported types are market, limit, stop, stop-limit, and target. An administrator can disable types.

- Market buy fills at the ask, or the last price if no ask exists, plus configured slippage, rounded up to the tick.
- Market sell fills at the bid, or the last price, minus slippage, rounded down to the tick.
- A limit buy rests until the reference last price is less than or equal to the limit, then fills at the limit. A limit sell rests until last is greater than or equal to the limit and fills at the limit. There is no queue position and no partial fill. This is more pessimistic than an exchange when the market trades through the limit, and it can be more optimistic when the last price touches the limit without enough size.
- A stop sell triggers when last is at or below the stop, then fills as a market sell.
- A stop-limit sell arms when last is at or below the stop, then rests as a limit.
- A target sell triggers when last is at or above the target, then fills as a market sell.
- Short selling is not allowed. Open sell orders reserve quantity by being counted against the position.
- A resting buy reserves estimated notional plus charges. Cancelling, rejecting, or filling releases that reserve. The fill then posts the actual notional and the actual charges.

Evaluation runs when the student loads the portfolio and on the scheduled `/api/cron?job=evaluate` job. A Vercel function does not keep a socket open between requests. Quote polling from the browser hits the server, which calls the provider. Provider secrets stay on the server.

## Charges

The default model is a simplified educational version of Indian delivery equity costs, rounded half-up to the paise on each component:

- Brokerage: 0.03 percent, capped at ₹20
- Securities transaction tax: 0.1 percent of sell turnover
- Exchange transaction charge: 0.00345 percent
- SEBI charge: ₹10 per crore of turnover
- Stamp duty: 0.015 percent of buy turnover
- GST: 18 percent of brokerage plus the exchange charge
- Slippage: 5 basis points against the student on marketable fills
- Spread in the demo book: 2 basis points

These are not a particular broker's contract note. Change them in `trading.charges`.

## What the simulator does not model

Auctions, circuit limits, corporate actions, settlement shortages, order-book queue priority, partial fills, and intraday product types are not modelled. A simulated profit is not evidence that the same decision would have made money with a broker.
