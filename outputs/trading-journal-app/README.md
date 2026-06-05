# Multi-Currency Trading Journal

Open `index.html` in a browser.

This app imports broker CSV files and keeps trades in separate journals by currency. EUR trades stay in the EUR journal, GBP trades stay in the GBP journal, USD trades stay in the USD journal, and so on. No FX conversion is performed.

It supports comma-separated CSVs, tab-separated transaction-history exports, and UTF-16 files that use Excel-style cells such as `="Transaction Date"`.

For transaction-history rows like `Currency conversion to AUD-C from GBP-C @ ...`, the app uses the source currency (`GBP`) as the journal currency so converted trades do not all collapse into AUD.

For trade rows with `Action` values such as `Trade Receivable` and `Trade Payable`, the app reads:

- `Description` as the instrument
- `Amount` as absolute position size
- negative `Amount` as short and positive `Amount` as long
- `Opening` as entry price
- `Closing` as exit price
- `P/L` as realised profit or loss
- `Currency` as the journal currency

## CSV fields

The importer recognises common column names for:

- Date
- Symbol / ticker / instrument
- Side / direction
- Quantity / size
- Entry price
- Exit price
- PnL / profit / realized PnL
- Currency / ccy / PnL currency
- Setup / strategy / tag
- Notes / comments

Imported data is stored locally in the browser with `localStorage`.

Repeated uploads are de-duplicated. For broker transaction-history exports, the `Serial` column is used as the stable trade id. For other CSVs, the app falls back to a fingerprint made from date, symbol, side, size, entry, exit, P/L, and currency.

When multiple currencies are present, the portfolio dropdown includes `All in AUD`. If the statement includes broker currency-conversion rows, that view uses the statement's own AUD conversion amounts and rates for each trade instead of an external FX lookup. Zero-P/L trades are treated as `0 AUD`.

In `All in AUD`, each row still shows the original instrument description, source currency, and original P/L. The AUD value is shown separately in `Net Return`.

Cash-transfer rows such as `Online Transfer Cash In` are excluded from the trade journal so deposits do not affect trading stats. If the broker statement includes a `Balance` column, the `Account Balance` metric uses the latest statement balance for the active currency view. If no statement balance is available, it falls back to cash transfers plus trading P/L.

The top `Date` dropdown filters the active journal or combined AUD view. Use the preset ranges or choose `Custom range` to reveal from/to date inputs.

The top symbol filter is a dropdown. Choose `All symbols` to clear it, or pick a symbol for an exact-match filter. Options are populated from the active journal/date/status context.
