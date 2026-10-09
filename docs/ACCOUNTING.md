# Accounting

TradeLab keeps money as integer paise. One rupee is 100 paise. Balances, prices, charges, and profit figures in the ledger are paise, not floating-point rupees.

## Cost basis

The cost-basis method is weighted average cost.

- A buy increases quantity. The new average is `(old quantity × old average + fill quantity × fill price + buy charges) / new quantity`, rounded half-up to the nearest paise.
- Buy-side charges are part of the cost basis. They are also deducted from cash, once.
- A sell realizes `(fill price × quantity − sell charges) − average cost × quantity`.
- The average cost of the remaining shares does not change. When quantity reaches zero, the average is cleared.
- Unrealized profit is `(mark − average cost) × quantity`. It does not subtract an estimate of future exit charges.

Realized and unrealized results are stored and displayed separately.

## Cash

- Available cash can be spent.
- Reserved cash is locked for a resting buy. It is still part of equity, and it is not also included in available cash.
- Equity = available cash + reserved cash + the market value of open holdings.
- A holding with no mark is omitted from market value and the valuation is marked incomplete. The average cost is not substituted as a price.

## Returns

- All-time return for a practice period compares equity with that period's starting capital.
- Performance return compares equity with starting capital plus net administrator adjustments. A credit is not profit. A debit is not a trading loss.
- Daily and monthly returns compare equity with the latest snapshot from before that day or month. They stay blank until such a snapshot exists.
- Maximum drawdown is the largest peak-to-trough decline on the snapshot equity curve.

## Practice periods

A reset closes the current period, cancels its open orders, releases reserves, and opens a new period with the configured starting capital. Orders, fills, positions, and ledger rows from the closed period remain. Competition entries bound to the closed period are finalized so the new cash balance cannot replace the old ranking.

## Reconciliation

For the open practice period, the sum of `cashDelta` equals available cash and the sum of `reservedDelta` equals reserved cash, starting from zero at the period's opening entry. Each entry stores the balances after it was posted. Ledger and audit rows are insert-only in application code, and the database rejects updates and deletes of those tables.
