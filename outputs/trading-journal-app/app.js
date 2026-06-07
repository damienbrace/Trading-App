const STORAGE_KEY = "multiCurrencyTradingJournal.v2";
const AUTH_STORAGE_KEY = "multiCurrencyTradingJournal.auth.v1";
const AUD_VIEW = "__ALL_AUD__";
const TARGET_CURRENCY = "AUD";
const publicConfig = window.TRADING_APP_CONFIG || {};

let fxStatus = "";
let overviewChartConfig = null;
let authSession = null;

const aliases = {
  serial: ["serial", "id", "trade id", "transaction id", "order id", "ticket"],
  date: ["date", "transaction date", "close date", "entry date", "opened", "closed", "time", "datetime"],
  openDate: ["open date", "opened at", "entry date", "entry time", "open time"],
  symbol: ["symbol", "ticker", "instrument", "market", "asset", "description"],
  side: ["side", "direction", "type", "action"],
  qty: ["qty", "quantity", "size", "shares", "contracts", "lots", "amount"],
  entry: ["entry", "entry price", "open price", "opening", "avg entry", "buy price"],
  exit: ["exit", "exit price", "close price", "closing", "avg exit", "sell price"],
  pnl: ["pnl", "p/l", "p&l", "profit", "profit/loss", "realized pnl", "realised pnl", "net pnl"],
  balance: ["balance", "account balance"],
  currency: ["currency", "ccy", "base currency", "pnl currency", "settlement currency"],
  setup: ["setup", "strategy", "playbook", "tag", "tags", "status"],
  notes: ["notes", "note", "comment", "comments", "mistake", "review", "description"]
};

const sampleCsv = `Date,Symbol,Side,Qty,Entry,Exit,PnL,Currency,Setup,Notes
2026-05-01,DAX,Long,2,18410,18488,156,EUR,Opening drive,Managed stop well
2026-05-02,DAX,Short,1,18520,18595,-75,EUR,Failed breakout,Chased the second entry
2026-05-03,VOD,Long,800,0.72,0.76,32,GBP,Mean reversion,Good patience
2026-05-04,BP,Short,300,5.14,5.03,33,GBP,Trend pullback,Clean exit
2026-05-05,AAPL,Long,20,188.2,191.8,72,USD,Breakout,Scaled out into strength
2026-05-06,MSFT,Long,10,432,427,-50,USD,Breakout,Entry was late
2026-05-07,NKD,Short,1,38600,38250,35000,JPY,Opening drive,Followed plan`;

let state = {
  activeView: "journal",
  activeReport: "overview",
  overviewChartType: "line",
  activeCurrency: "",
  sortKey: "closeDate",
  sortDirection: "desc",
  dateFilter: "all",
  dateFrom: "",
  dateTo: "",
  calendarMonth: "",
  symbolFilter: "",
  selectedSizeBand: "",
  cashFlows: [],
  statementBalances: [],
  trades: []
};

const els = {
  appShell: document.querySelector("#appShell"),
  csvInput: document.querySelector("#csvInput"),
  sampleBtn: document.querySelector("#sampleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInBtn: document.querySelector("#signInBtn"),
  signUpBtn: document.querySelector("#signUpBtn"),
  syncUpBtn: document.querySelector("#syncUpBtn"),
  syncDownBtn: document.querySelector("#syncDownBtn"),
  signOutBtn: document.querySelector("#signOutBtn"),
  authStatus: document.querySelector("#authStatus"),
  exportBtn: document.querySelector("#exportBtn"),
  currencySelect: document.querySelector("#currencySelect"),
  dateFilter: document.querySelector("#dateFilter"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  customDateRange: document.querySelector("#customDateRange"),
  metricsGrid: document.querySelector("#metricsGrid"),
  journalTabs: document.querySelector("#journalTabs"),
  journalViewBtn: document.querySelector("#journalViewBtn"),
  reportsViewBtn: document.querySelector("#reportsViewBtn"),
  reportsSubnav: document.querySelector("#reportsSubnav"),
  overviewReportBtn: document.querySelector("#overviewReportBtn"),
  calendarReportBtn: document.querySelector("#calendarReportBtn"),
  weekdayReportBtn: document.querySelector("#weekdayReportBtn"),
  sizeReportBtn: document.querySelector("#sizeReportBtn"),
  overviewReport: document.querySelector("#overviewReport"),
  overviewSections: document.querySelector("#overviewSections"),
  overviewChart: document.querySelector("#overviewChart"),
  overviewGrossLabel: document.querySelector("#overviewGrossLabel"),
  overviewGrossReturn: document.querySelector("#overviewGrossReturn"),
  calendarView: document.querySelector("#calendarView"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarMonthTotal: document.querySelector("#calendarMonthTotal"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarSummary: document.querySelector("#calendarSummary"),
  calendarPrev: document.querySelector("#calendarPrev"),
  calendarToday: document.querySelector("#calendarToday"),
  calendarNext: document.querySelector("#calendarNext"),
  weekdayReport: document.querySelector("#weekdayReport"),
  weekdayChart: document.querySelector("#weekdayChart"),
  weekdayRows: document.querySelector("#weekdayRows"),
  weekdayInsights: document.querySelector("#weekdayInsights"),
  sizeReport: document.querySelector("#sizeReport"),
  sizeChart: document.querySelector("#sizeChart"),
  sizeRows: document.querySelector("#sizeRows"),
  sizeDrilldown: document.querySelector("#sizeDrilldown"),
  sizeInsights: document.querySelector("#sizeInsights"),
  tablePanel: document.querySelector(".table-panel"),
  journalLayout: document.querySelector(".journal-layout"),
  inspector: document.querySelector(".inspector"),
  symbolSelect: document.querySelector("#symbolSelect"),
  resultFilter: document.querySelector("#resultFilter"),
  journalTitle: document.querySelector("#journalTitle"),
  netPnl: document.querySelector("#netPnl"),
  winRate: document.querySelector("#winRate"),
  profitFactor: document.querySelector("#profitFactor"),
  avgTrade: document.querySelector("#avgTrade"),
  maxDrawdown: document.querySelector("#maxDrawdown"),
  tradeCount: document.querySelector("#tradeCount"),
  accountBalance: document.querySelector("#accountBalance"),
  equityChart: document.querySelector("#equityChart"),
  performanceChart: document.querySelector("#performanceChart"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
  setupList: document.querySelector("#setupList"),
  mistakeList: document.querySelector("#mistakeList"),
  tradeRows: document.querySelector("#tradeRows"),
  tableSubtitle: document.querySelector("#tableSubtitle"),
  statusReturn: document.querySelector("#statusReturn"),
  sideAvgReturn: document.querySelector("#sideAvgReturn"),
  sideAvgPct: document.querySelector("#sideAvgPct"),
  sideWin: document.querySelector("#sideWin")
};

const sortAccessors = {
  status: (trade) => trade.pnl > 0 ? 2 : trade.pnl < 0 ? 0 : 1,
  side: (trade) => trade.side || "",
  symbol: (trade) => trade.symbol || "",
  currency: (trade) => trade.sourceCurrency || trade.currency || "",
  openDate: (trade) => tradeTime(trade.openedAt || trade.date),
  entry: (trade) => trade.entry || 0,
  qty: (trade) => trade.qty || 0,
  closeDate: (trade) => tradeTime(trade.date),
  exit: (trade) => trade.exit || 0,
  cost: (trade) => tradeCost(trade),
  sourcePnl: (trade) => Number.isFinite(trade.sourcePnl) ? trade.sourcePnl : trade.pnl || 0,
  pnl: (trade) => trade.pnl || 0,
  returnPct: (trade) => tradeReturnPercent(trade),
  setup: (trade) => trade.setup || "",
  notes: (trade) => trade.notes || ""
};

function normalizeHeader(value) {
  return cleanCell(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findColumn(headers, field) {
  const normalized = headers.map(normalizeHeader);
  const index = normalized.findIndex((header) => aliases[field].includes(header));
  return index >= 0 ? headers[index] : null;
}

function cleanCell(value) {
  let text = String(value ?? "").trim();
  if (text.startsWith('="') && text.endsWith('"')) text = text.slice(2, -1);
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  if (text.startsWith("=")) text = text.slice(1);
  return text.replace(/""/g, '"').trim();
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function parseDelimited(text) {
  text = normalizeTextEncoding(text);
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cleanCell(cell));
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cleanCell(cell));
  if (row.some((item) => item.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeTextEncoding(text) {
  const nullCount = (text.match(/\u0000/g) || []).length;
  if (nullCount > text.length / 4) return text.replace(/\u0000/g, "").replace(/^\uFEFF/, "");
  return text.replace(/^\uFEFF/, "");
}

function moneyNumber(value) {
  const cleaned = cleanCell(value)
    .replace(/[^\d.,()-]/g, "")
    .replace(/,/g, "");
  if (!cleaned) return 0;
  const negative = cleaned.includes("(") && cleaned.includes(")");
  const number = Number(cleaned.replace(/[()]/g, ""));
  return Number.isFinite(number) ? (negative ? -Math.abs(number) : number) : 0;
}

function valueOf(record, column) {
  return column ? cleanCell(record[column]) : "";
}

function inferCurrency(record, columns) {
  const description = valueOf(record, columns.notes) || valueOf(record, columns.symbol);
  const fromMatch = description.match(/\bfrom\s+([A-Z]{3})-C\b/i);
  if (fromMatch) return fromMatch[1].toUpperCase();
  return (valueOf(record, columns.currency) || "UNC").toUpperCase();
}

function inferSymbol(record, columns) {
  const symbol = valueOf(record, columns.symbol);
  if (!symbol) return "Unknown";
  if (/currency conversion/i.test(symbol)) return "Currency conversion";
  return symbol;
}

function inferSide(record, columns) {
  const amount = moneyNumber(valueOf(record, columns.qty));
  if (amount > 0) return "Long";
  if (amount < 0) return "Short";
  const action = valueOf(record, columns.side);
  if (/buy|long/i.test(action)) return "Long";
  if (/sell|short/i.test(action)) return "Short";
  return action;
}

function inferQuantity(record, columns) {
  return Math.abs(moneyNumber(valueOf(record, columns.qty)));
}

function tradeFingerprint(trade) {
  if (trade.serial) return `serial:${trade.serial}`;
  return [
    "trade",
    trade.date,
    trade.symbol,
    trade.side,
    trade.qty,
    trade.entry,
    trade.exit,
    trade.pnl,
    trade.currency
  ].map((part) => String(part ?? "").trim().toLowerCase()).join("|");
}

function currentDisplayCurrency() {
  return state.activeCurrency === AUD_VIEW ? TARGET_CURRENCY : state.activeCurrency;
}

function isCombinedAudView() {
  return state.activeCurrency === AUD_VIEW;
}

function isTradeRow(record, columns) {
  const action = valueOf(record, columns.side);
  const symbol = inferSymbol(record, columns);
  const pnl = moneyNumber(valueOf(record, columns.pnl));
  const description = valueOf(record, columns.notes) || symbol;
  if (/online transfer|cash in|cash out|deposit|withdrawal/i.test(description)) return false;
  if (/currency conversion/i.test(symbol)) return false;
  if (/trade receivable|trade payable/i.test(action)) return true;
  return pnl !== 0 && symbol !== "Unknown";
}

function isCashTransferRow(record, columns) {
  const action = valueOf(record, columns.side);
  const description = valueOf(record, columns.notes) || valueOf(record, columns.symbol);
  return /online transfer|cash in|cash out|deposit|withdrawal/i.test(`${action} ${description}`);
}

function cashTransferFromRecord(record, columns, index) {
  const description = valueOf(record, columns.notes) || valueOf(record, columns.symbol);
  const action = valueOf(record, columns.side);
  const pnl = moneyNumber(valueOf(record, columns.pnl));
  const amount = moneyNumber(valueOf(record, columns.qty)) || pnl;
  const type = /cash out|withdrawal/i.test(`${action} ${description}`) || amount < 0 ? "withdrawal" : "deposit";
  return {
    id: valueOf(record, columns.serial) || `${Date.now()}-cash-${index}-${Math.random().toString(16).slice(2)}`,
    date: valueOf(record, columns.date),
    description,
    type,
    amount: Math.abs(amount),
    currency: (valueOf(record, columns.currency) || "UNC").toUpperCase()
  };
}

function statementBalanceFromRecord(record, columns, index) {
  const rawBalance = valueOf(record, columns.balance);
  if (!rawBalance) return null;
  const balance = moneyNumber(rawBalance);
  const currency = (valueOf(record, columns.currency) || "UNC").toUpperCase();
  if (!columns.balance || !Number.isFinite(balance) || !currency) return null;
  return {
    id: valueOf(record, columns.serial) || `${valueOf(record, columns.date)}|${currency}|${balance}|${index}`,
    order: index,
    date: valueOf(record, columns.date),
    currency,
    balance
  };
}

function parseConversion(description) {
  const text = cleanCell(description);
  const toFrom = text.match(/currency conversion to ([A-Z]{3})-C from ([A-Z]{3})-C @ ([\d.]+)/i);
  if (toFrom) return { to: toFrom[1].toUpperCase(), from: toFrom[2].toUpperCase(), rate: Number(toFrom[3]) };
  const fromTo = text.match(/currency conversion from ([A-Z]{3})-C to ([A-Z]{3})-C @ ([\d.]+)/i);
  if (fromTo) return { from: fromTo[1].toUpperCase(), to: fromTo[2].toUpperCase(), rate: Number(fromTo[3]) };
  return null;
}

function buildStatementConversions(rows, headers, columns) {
  return rows.map((row) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]));
    const details = parseConversion(valueOf(record, columns.notes) || valueOf(record, columns.symbol));
    if (!details) return null;
    return {
      ...details,
      date: valueOf(record, columns.date),
      currency: valueOf(record, columns.currency).toUpperCase(),
      pnl: moneyNumber(valueOf(record, columns.pnl))
    };
  }).filter(Boolean);
}

function conversionToAudRate(conversion, sourceCurrency) {
  if (!conversion || sourceCurrency === TARGET_CURRENCY) return 1;
  if (conversion.from === sourceCurrency && conversion.to === TARGET_CURRENCY) return conversion.rate;
  if (conversion.from === TARGET_CURRENCY && conversion.to === sourceCurrency) return conversion.rate ? 1 / conversion.rate : null;
  return null;
}

function impliedForeignAmount(conversion, sourceCurrency) {
  const rateToAud = conversionToAudRate(conversion, sourceCurrency);
  if (!rateToAud) return Number.POSITIVE_INFINITY;
  return Math.abs(conversion.pnl / rateToAud);
}

function findStatementAudConversion(trade, conversions) {
  if (trade.pnl === 0) {
    return { audPnl: 0, fxRateToAud: null, fxSource: "zero P/L" };
  }
  if (trade.currency === TARGET_CURRENCY) {
    return { audPnl: trade.pnl, fxRateToAud: 1, fxSource: "statement currency" };
  }

  const sameMoment = conversions.filter((conversion) => (
    conversion.date === trade.date
    && conversion.currency === TARGET_CURRENCY
    && ((conversion.from === trade.currency && conversion.to === TARGET_CURRENCY)
      || (conversion.from === TARGET_CURRENCY && conversion.to === trade.currency))
    && Math.sign(conversion.pnl || 0) === Math.sign(trade.pnl || 0)
  ));

  if (!sameMoment.length) return null;

  const best = sameMoment
    .map((conversion) => ({
      conversion,
      distance: Math.abs(impliedForeignAmount(conversion, trade.currency) - Math.abs(trade.pnl))
    }))
    .sort((a, b) => a.distance - b.distance)[0].conversion;

  return {
    audPnl: best.pnl,
    fxRateToAud: conversionToAudRate(best, trade.currency),
    fxSource: "statement conversion"
  };
}

function tradeTime(value) {
  const text = cleanCell(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
  }
  const parsed = new Date(text).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayStart(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function parseIsoDay(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function dateRangeBounds() {
  if (state.dateFilter === "all") return null;
  const tradeTimes = state.trades.map((trade) => tradeTime(trade.date)).filter(Boolean);
  const reference = tradeTimes.length ? Math.max(...tradeTimes) : Date.now();
  const end = new Date(reference);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  if (state.dateFilter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "30d") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "3m") {
    start.setMonth(start.getMonth() - 3);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "6m") {
    start.setMonth(start.getMonth() - 6);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (state.dateFilter === "custom") {
    return {
      from: parseIsoDay(state.dateFrom) ?? Number.NEGATIVE_INFINITY,
      to: parseIsoDay(state.dateTo, true) ?? Number.POSITIVE_INFINITY
    };
  }

  return { from: start.getTime(), to: end.getTime() };
}

function matchesDateFilter(trade) {
  const bounds = dateRangeBounds();
  if (!bounds) return true;
  const time = tradeTime(trade.date);
  return time >= bounds.from && time <= bounds.to;
}

function importTrades(csvText) {
  const rows = parseDelimited(csvText);
  const headers = rows.shift() || [];
  const columns = Object.fromEntries(Object.keys(aliases).map((field) => [field, findColumn(headers, field)]));
  const conversions = buildStatementConversions(rows, headers, columns);
  const wasEmpty = state.trades.length === 0;

  const cashFlows = rows.map((row, index) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]));
    return isCashTransferRow(record, columns) ? cashTransferFromRecord(record, columns, index) : null;
  }).filter(Boolean);

  const statementBalances = rows.map((row, index) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]));
    return statementBalanceFromRecord(record, columns, index);
  }).filter(Boolean);

  const imported = rows.map((row, index) => {
    const record = Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]));
    if (!isTradeRow(record, columns)) return null;
    const currency = inferCurrency(record, columns);
    const description = valueOf(record, columns.notes) || valueOf(record, columns.symbol);
    const trade = {
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      serial: valueOf(record, columns.serial),
      date: valueOf(record, columns.date),
      symbol: inferSymbol(record, columns),
      side: inferSide(record, columns),
      qty: inferQuantity(record, columns),
      entry: moneyNumber(valueOf(record, columns.entry)),
      exit: moneyNumber(valueOf(record, columns.exit)),
      pnl: moneyNumber(valueOf(record, columns.pnl)),
      currency,
      setup: valueOf(record, columns.setup) || "Unclassified",
      notes: description,
      action: valueOf(record, columns.side),
      openedAt: valueOf(record, columns.openDate) || valueOf(record, columns.date),
      hasExplicitOpenDate: Boolean(columns.openDate && valueOf(record, columns.openDate))
    };
    const audConversion = findStatementAudConversion(trade, conversions);
    return audConversion ? { ...trade, ...audConversion } : trade;
  }).filter(Boolean);

  const existing = new Map(state.trades.map((trade, index) => [tradeFingerprint(trade), index]));
  const seen = new Set(existing.keys());
  const unique = imported.filter((trade) => {
    const key = tradeFingerprint(trade);
    if (existing.has(key)) {
      const existingIndex = existing.get(key);
      state.trades[existingIndex] = { ...state.trades[existingIndex], ...trade };
      return false;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  state.trades = [...state.trades, ...unique];
  state.cashFlows ||= [];
  const existingCashFlowIds = new Set(state.cashFlows.map((flow) => flow.id));
  const uniqueCashFlows = cashFlows.filter((flow) => !existingCashFlowIds.has(flow.id));
  state.cashFlows = [...state.cashFlows, ...uniqueCashFlows];
  state.statementBalances ||= [];
  const existingStatementBalanceIds = new Set(state.statementBalances.map((balance) => balance.id));
  const uniqueStatementBalances = statementBalances.filter((balance) => !existingStatementBalanceIds.has(balance.id));
  state.statementBalances = [...state.statementBalances, ...uniqueStatementBalances];
  const currencies = getCurrencies();
  const importedCurrencies = [...new Set(imported.map((trade) => trade.currency).filter(Boolean))].sort();
  if (importedCurrencies.length > 1) {
    state.activeCurrency = AUD_VIEW;
  } else if (importedCurrencies.length === 1) {
    state.activeCurrency = importedCurrencies[0];
  } else if (!state.activeCurrency || (wasEmpty && currencies.length > 1)) {
    state.activeCurrency = currencies.length > 1 ? AUD_VIEW : currencies[0] || "";
  }
  state.symbolFilter = "";
  save();
  render();
}

function getCurrencies() {
  return [...new Set(state.trades.map((trade) => trade.currency || "UNC"))].sort();
}

function activeTrades() {
  const sourceTrades = sourceTradesForCurrentJournal();

  return sourceTrades
    .map(convertTradeForView)
    .filter(matchesDateFilter)
    .filter(matchesResultFilter)
    .filter(matchesSymbolFilter)
    .sort(compareTrades);
}

function sourceTradesForCurrentJournal() {
  return isCombinedAudView()
    ? state.trades
    : state.trades.filter((trade) => trade.currency === state.activeCurrency);
}

function symbolOptionsForCurrentContext() {
  return [...new Set(sourceTradesForCurrentJournal()
    .map(convertTradeForView)
    .filter(matchesDateFilter)
    .filter(matchesResultFilter)
    .map((trade) => trade.symbol)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function matchesResultFilter(trade) {
  const filter = els.resultFilter.value;
  if (filter === "wins") return trade.pnl > 0;
  if (filter === "losses") return trade.pnl < 0;
  return true;
}

function matchesSymbolFilter(trade) {
  return !state.symbolFilter || trade.symbol === state.symbolFilter;
}

function compareTrades(a, b) {
  const accessor = sortAccessors[state.sortKey] || sortAccessors.closeDate;
  const direction = state.sortDirection === "asc" ? 1 : -1;
  const aValue = accessor(a);
  const bValue = accessor(b);
  let result;

  if (typeof aValue === "number" && typeof bValue === "number") {
    result = aValue - bValue;
  } else {
    result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
  }

  if (result === 0) result = tradeTime(a.date) - tradeTime(b.date);
  return result * direction;
}

function formatMoney(value, currency = state.activeCurrency) {
  currency = currency === AUD_VIEW ? TARGET_CURRENCY : currency;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
  } catch {
    return `${currency || ""} ${Number(value).toFixed(2)}`.trim();
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatPercent(value, decimals = 2) {
  return `${((Number(value) || 0) * 100).toFixed(decimals)}%`;
}

function formatDate(value) {
  const time = tradeTime(value);
  if (!time) return value || "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(time));
}

function tradeCost(trade) {
  if (Number.isFinite(trade.convertedCost)) return trade.convertedCost;
  return Math.abs((trade.entry || 0) * (trade.qty || 0));
}

function tradeReturnPercent(trade) {
  const cost = tradeCost(trade);
  return cost ? trade.pnl / cost : 0;
}

function calculateStats(trades) {
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const net = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  trades.forEach((trade) => {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });
  return {
    net,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    avg: trades.length ? net / trades.length : 0,
    maxDrawdown,
    count: trades.length
  };
}

function activeCashFlows() {
  const currency = currentDisplayCurrency();
  state.cashFlows ||= [];
  return state.cashFlows.filter((flow) => flow.currency === currency);
}

function cashFlowSignedAmount(flow) {
  return flow.type === "withdrawal" ? -Math.abs(flow.amount || 0) : Math.abs(flow.amount || 0);
}

function latestStatementBalanceForCurrentCurrency() {
  const currency = currentDisplayCurrency();
  state.statementBalances ||= [];
  const balances = state.statementBalances
    .filter((balance) => balance.currency === currency && Number.isFinite(balance.balance));
  if (!balances.length) return null;
  return balances.slice().sort((a, b) => {
    const timeDelta = tradeTime(b.date) - tradeTime(a.date);
    if (timeDelta) return timeDelta;
    return (a.order || 0) - (b.order || 0);
  })[0].balance;
}

function statementBalanceAtOrBefore(time) {
  const currency = currentDisplayCurrency();
  state.statementBalances ||= [];
  const balances = state.statementBalances
    .filter((balance) => balance.currency === currency && Number.isFinite(balance.balance) && tradeTime(balance.date) <= time);
  if (!balances.length) return null;
  return balances.slice().sort((a, b) => {
    const timeDelta = tradeTime(b.date) - tradeTime(a.date);
    if (timeDelta) return timeDelta;
    return (a.order || 0) - (b.order || 0);
  })[0].balance;
}

function calculateAccountBalance(trades) {
  const statementBalance = latestStatementBalanceForCurrentCurrency();
  if (Number.isFinite(statementBalance)) return statementBalance;
  const tradePnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const cashFlowTotal = activeCashFlows().reduce((sum, flow) => sum + cashFlowSignedAmount(flow), 0);
  return cashFlowTotal + tradePnl;
}

function supabaseConfigured() {
  return Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);
}

function supabaseUrl(path) {
  return `${String(publicConfig.supabaseUrl || "").replace(/\/+$/, "")}${path}`;
}

function authHeaders(includeBearer = true) {
  const headers = {
    apikey: publicConfig.supabaseAnonKey || "",
    "Content-Type": "application/json"
  };
  if (includeBearer && authSession?.access_token) {
    headers.Authorization = `Bearer ${authSession.access_token}`;
  }
  return headers;
}

async function supabaseRequest(path, options = {}) {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured in this deployment.");
  const response = await fetch(supabaseUrl(path), {
    method: options.method || "GET",
    headers: { ...authHeaders(options.auth !== false), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error_description || data?.hint || "Supabase request failed.");
  return data;
}

function saveAuthSession(session) {
  authSession = session;
  if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
  renderAuthState();
}

function restoreAuthSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    if (saved?.access_token) authSession = saved;
  } catch {
    authSession = null;
  }
  renderAuthState();
}

function renderAuthState(message = "") {
  if (!els.authStatus) return;
  const signedIn = Boolean(authSession?.user?.email);
  if (els.authEmail) els.authEmail.hidden = signedIn;
  if (els.authPassword) els.authPassword.hidden = signedIn;
  if (els.signInBtn) els.signInBtn.hidden = signedIn;
  if (els.signUpBtn) els.signUpBtn.hidden = signedIn;
  if (els.syncUpBtn) els.syncUpBtn.hidden = !signedIn;
  if (els.syncDownBtn) els.syncDownBtn.hidden = !signedIn;
  if (els.signOutBtn) els.signOutBtn.hidden = !signedIn;
  els.authStatus.textContent = message || (signedIn
    ? authSession.user.email
    : supabaseConfigured() ? "Cloud ready" : "Local only");
}

function authCredentials() {
  const email = cleanCell(els.authEmail?.value || "");
  const password = els.authPassword?.value || "";
  if (!email || !password) throw new Error("Enter your email and password first.");
  return { email, password };
}

async function signIn() {
  renderAuthState("Signing in...");
  const session = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    auth: false,
    body: authCredentials()
  });
  saveAuthSession(session);
  if (els.authPassword) els.authPassword.value = "";
  renderAuthState("Signed in");
}

async function signUp() {
  renderAuthState("Creating account...");
  const session = await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    auth: false,
    body: authCredentials()
  });
  if (session?.access_token) {
    saveAuthSession(session);
    renderAuthState("Account created");
  } else {
    renderAuthState("Check your email");
  }
  if (els.authPassword) els.authPassword.value = "";
}

async function signOut() {
  if (authSession?.access_token) {
    try {
      await supabaseRequest("/auth/v1/logout", { method: "POST" });
    } catch {
      // Local sign-out still matters if the network request fails.
    }
  }
  saveAuthSession(null);
}

function requireAuthUser() {
  if (!authSession?.user?.id || !authSession?.access_token) throw new Error("Sign in before syncing.");
  return authSession.user;
}

function toIsoTimestamp(value) {
  const time = tradeTime(value);
  return time ? new Date(time).toISOString() : null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function chunk(items, size = 200) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

async function upsertRows(table, rows, conflict) {
  if (!rows.length) return;
  for (const group of chunk(rows)) {
    await supabaseRequest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: group
    });
  }
}

function tradeToCloudRow(trade, userId) {
  return {
    user_id: userId,
    fingerprint: tradeFingerprint(trade),
    serial: trade.serial || null,
    symbol: trade.symbol || "Unknown",
    side: trade.side || null,
    opened_at: toIsoTimestamp(trade.openedAt || trade.date),
    closed_at: toIsoTimestamp(trade.date),
    qty: finiteOrNull(trade.qty) || 0,
    entry: finiteOrNull(trade.entry),
    exit: finiteOrNull(trade.exit),
    pnl: finiteOrNull(trade.pnl) || 0,
    source_pnl: finiteOrNull(trade.sourcePnl),
    currency: trade.currency || "UNC",
    source_currency: trade.sourceCurrency || null,
    aud_pnl: finiteOrNull(trade.audPnl),
    fx_rate_to_aud: finiteOrNull(trade.fxRateToAud),
    setup: trade.setup || "Unclassified",
    notes: trade.notes || "",
    raw: trade
  };
}

function cloudRowToTrade(row) {
  const raw = row.raw && typeof row.raw === "object" ? row.raw : {};
  const trade = {
    ...raw,
    id: row.id,
    serial: row.serial || raw.serial || "",
    date: raw.date || row.closed_at || "",
    symbol: row.symbol || raw.symbol || "Unknown",
    side: row.side || raw.side || "",
    qty: Number(row.qty || raw.qty || 0),
    entry: Number(row.entry ?? raw.entry ?? 0),
    exit: Number(row.exit ?? raw.exit ?? 0),
    pnl: Number(row.pnl || raw.pnl || 0),
    currency: row.currency || raw.currency || "UNC",
    setup: row.setup || raw.setup || "Unclassified",
    notes: row.notes || raw.notes || "",
    openedAt: raw.openedAt || row.opened_at || row.closed_at || "",
    sourcePnl: Number(row.source_pnl ?? raw.sourcePnl ?? row.pnl ?? 0),
    sourceCurrency: row.source_currency || raw.sourceCurrency || row.currency || raw.currency
  };
  if (Number.isFinite(Number(row.aud_pnl))) trade.audPnl = Number(row.aud_pnl);
  if (Number.isFinite(Number(row.fx_rate_to_aud))) trade.fxRateToAud = Number(row.fx_rate_to_aud);
  return trade;
}

function cashFlowToCloudRow(flow, userId) {
  const fingerprint = flow.id || [flow.date, flow.description, flow.type, flow.amount, flow.currency].join("|");
  return {
    user_id: userId,
    fingerprint,
    occurred_at: toIsoTimestamp(flow.date),
    description: flow.description || "",
    type: flow.type === "withdrawal" ? "withdrawal" : "deposit",
    amount: finiteOrNull(flow.amount) || 0,
    currency: flow.currency || "UNC"
  };
}

function cloudRowToCashFlow(row) {
  return {
    id: row.fingerprint || row.id,
    date: row.occurred_at || "",
    description: row.description || "",
    type: row.type || "deposit",
    amount: Number(row.amount || 0),
    currency: row.currency || "UNC"
  };
}

function balanceToCloudRow(balance, userId) {
  const fingerprint = balance.id || [balance.date, balance.currency, balance.balance, balance.order].join("|");
  return {
    user_id: userId,
    fingerprint,
    recorded_at: toIsoTimestamp(balance.date),
    currency: balance.currency || "UNC",
    balance: finiteOrNull(balance.balance) || 0,
    row_order: Number.isFinite(Number(balance.order)) ? Number(balance.order) : null
  };
}

function cloudRowToBalance(row) {
  return {
    id: row.fingerprint || row.id,
    date: row.recorded_at || "",
    currency: row.currency || "UNC",
    balance: Number(row.balance || 0),
    order: Number.isFinite(Number(row.row_order)) ? Number(row.row_order) : 0
  };
}

async function syncLocalToCloud() {
  const user = requireAuthUser();
  renderAuthState("Syncing up...");
  await upsertRows("trades", state.trades.map((trade) => tradeToCloudRow(trade, user.id)), "user_id,fingerprint");
  state.cashFlows ||= [];
  await upsertRows("cash_flows", state.cashFlows.map((flow) => cashFlowToCloudRow(flow, user.id)), "user_id,fingerprint");
  state.statementBalances ||= [];
  await upsertRows("statement_balances", state.statementBalances.map((balance) => balanceToCloudRow(balance, user.id)), "user_id,fingerprint");
  renderAuthState("Synced");
}

async function loadCloudToLocal() {
  requireAuthUser();
  renderAuthState("Loading cloud...");
  const [trades, cashFlows, balances] = await Promise.all([
    supabaseRequest("/rest/v1/trades?select=*&order=closed_at.asc"),
    supabaseRequest("/rest/v1/cash_flows?select=*&order=occurred_at.asc"),
    supabaseRequest("/rest/v1/statement_balances?select=*&order=recorded_at.asc")
  ]);
  state.trades = (trades || []).map(cloudRowToTrade);
  state.cashFlows = (cashFlows || []).map(cloudRowToCashFlow);
  state.statementBalances = (balances || []).map(cloudRowToBalance);
  const currencies = getCurrencies();
  state.activeCurrency = currencies.length > 1 ? AUD_VIEW : currencies[0] || "";
  state.symbolFilter = "";
  state.calendarMonth = "";
  save();
  render();
  renderAuthState("Cloud loaded");
}

async function runAuthAction(action) {
  try {
    await action();
  } catch (error) {
    renderAuthState(error.message || "Cloud action failed");
  }
}

function convertTradeForView(trade) {
  if (!isCombinedAudView()) return { ...trade, fxRate: 1 };
  if (trade.currency === TARGET_CURRENCY) {
    return { ...trade, sourcePnl: trade.pnl, sourceCurrency: trade.currency, fxRate: 1 };
  }
  const rate = trade.fxRateToAud || null;
  if (!Number.isFinite(trade.audPnl)) return { ...trade, fxRate: rate || 1, missingAudConversion: true };
  return {
    ...trade,
    sourcePnl: trade.pnl,
    sourceCurrency: trade.currency,
    pnl: trade.audPnl,
    convertedCost: rate ? tradeCost(trade) * rate : tradeCost(trade),
    fxRate: rate || 1
  };
}

function updateFxStatus(trades) {
  if (!isCombinedAudView()) {
    fxStatus = "";
    return;
  }
  const missing = trades.filter((trade) => trade.missingAudConversion && trade.currency !== TARGET_CURRENCY).length;
  fxStatus = missing
    ? `${missing} trades are missing statement AUD conversion rows`
    : "Statement conversion rows used for AUD";
}

function renderTabs() {
  const currencies = getCurrencies();
  const options = currencies.length > 1 ? [AUD_VIEW, ...currencies] : currencies;
  if (!options.includes(state.activeCurrency)) state.activeCurrency = currencies[0] || "";

  els.currencySelect.innerHTML = options.map((currency) => {
    const label = currency === AUD_VIEW ? "All in AUD" : currency;
    return `<option value="${currency}">${label}</option>`;
  }).join("");
  els.currencySelect.value = state.activeCurrency;
  els.journalTabs.innerHTML = options.length
    ? options.map((currency) => {
      const count = currency === AUD_VIEW ? state.trades.length : state.trades.filter((trade) => trade.currency === currency).length;
      const active = currency === state.activeCurrency ? " active" : "";
      const label = currency === AUD_VIEW ? "All AUD" : currency;
      return `<button class="journal-tab${active}" type="button" data-currency="${currency}"><span>${label}</span><small>${count}</small></button>`;
    }).join("")
    : `<div class="empty">No currency journals yet.</div>`;
}

function renderMetrics(trades) {
  const stats = calculateStats(trades);
  els.netPnl.textContent = formatMoney(stats.net, currentDisplayCurrency());
  els.netPnl.className = stats.net < 0 ? "pnl-loss" : "pnl-win";
  els.winRate.textContent = `${Math.round(stats.winRate * 100)}%`;
  els.profitFactor.textContent = stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2);
  els.avgTrade.textContent = formatMoney(stats.avg, currentDisplayCurrency());
  els.maxDrawdown.textContent = formatMoney(stats.maxDrawdown, currentDisplayCurrency());
  els.tradeCount.textContent = String(stats.count);
  if (els.accountBalance) els.accountBalance.textContent = formatMoney(calculateAccountBalance(trades), currentDisplayCurrency());
  if (els.statusReturn) els.statusReturn.textContent = formatMoney(stats.net, currentDisplayCurrency());
  if (els.sideAvgReturn) els.sideAvgReturn.textContent = formatMoney(stats.avg, currentDisplayCurrency());
  if (els.sideAvgPct) {
    const avgPct = trades.length ? trades.reduce((sum, trade) => sum + tradeReturnPercent(trade), 0) / trades.length : 0;
    els.sideAvgPct.textContent = `${(avgPct * 100).toFixed(2)}%`;
  }
  if (els.sideWin) els.sideWin.textContent = `${Math.round(stats.winRate * 100)}%`;
}

function renderChart(trades, targetCanvas = els.equityChart, compact = true) {
  const canvas = targetCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = compact ? "#171d2b" : "#171d2b";
  ctx.fillRect(0, 0, width, height);

  const points = trades.reduce((acc, trade) => {
    const previous = acc.length ? acc[acc.length - 1].value : 0;
    acc.push({ label: trade.date || trade.symbol, value: previous + trade.pnl });
    return acc;
  }, [{ label: "Start", value: 0 }]);

  if (points.length <= 1) {
    ctx.fillStyle = "#64716b";
    ctx.font = compact ? "12px sans-serif" : "14px sans-serif";
    ctx.fillText("Import trades to draw the equity curve.", 18, compact ? 42 : 54);
    return;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const pad = compact ? 8 : 18;
  const xStep = (width - pad * 2) / Math.max(points.length - 1, 1);
  const y = (value) => height - pad - ((value - min) / span) * (height - pad * 2);

  ctx.strokeStyle = compact ? "rgba(43,53,72,.35)" : "#263246";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const yy = pad + i * ((height - pad * 2) / 4);
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(width - pad, yy);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(pad, 0, width - pad, 0);
  gradient.addColorStop(0, "#6b5cff");
  gradient.addColorStop(1, "#00d5d8");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = compact ? 2 : 3;
  ctx.beginPath();
  points.forEach((point, i) => {
    const x = pad + i * xStep;
    const yy = y(point.value);
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  });
  ctx.stroke();

  const zeroY = y(0);
  ctx.strokeStyle = "rgba(255,94,138,.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(width - pad, zeroY);
  ctx.stroke();

  if (!compact) {
    ctx.fillStyle = "#8d96a8";
    ctx.font = "11px sans-serif";
    ctx.fillText(formatMoney(max, currentDisplayCurrency()), pad, 14);
    ctx.fillText(formatMoney(min, currentDisplayCurrency()), pad, height - 8);
  }
}

function formatAxisMoney(value) {
  const abs = Math.abs(value);
  const currency = currentDisplayCurrency();
  let symbol = currency ? `${currency} ` : "";
  try {
    symbol = new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value || symbol;
  } catch {
    symbol = currency ? `${currency} ` : "";
  }
  if (abs >= 1000) {
    const compact = value / 1000;
    const sign = compact < 0 ? "-" : "";
    const amount = Math.abs(compact);
    return `${sign}${symbol}${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}k`;
  }
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(value || 0).toLocaleString(undefined, { maximumFractionDigits: abs >= 100 ? 0 : 2 })}`;
}

function overviewDateLabel(value) {
  const time = tradeTime(value);
  if (!time) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(time));
}

function overviewPointLabel(point) {
  return point.label || overviewDateLabel(point.date) || "";
}

function renderOverviewEquityChart(
  trades,
  customPoints = null,
  valueFormatter = (value) => formatMoney(value, currentDisplayCurrency()),
  axisFormatter = formatAxisMoney,
  chartType = state.overviewChartType || "line"
) {
  overviewChartConfig = { trades, customPoints, valueFormatter, axisFormatter };
  const host = els.overviewChart;
  if (!host) return;
  const rect = typeof host.getBoundingClientRect === "function" ? host.getBoundingClientRect() : null;
  const width = Math.max(640, Math.round(rect?.width || host.clientWidth || 1600));
  const height = Math.max(260, Math.round(rect?.height || host.clientHeight || 366));

  const points = customPoints || trades.reduce((acc, trade) => {
    const previous = acc.length ? acc[acc.length - 1].value : 0;
    acc.push({ date: trade.date, time: tradeTime(trade.date), value: previous + (trade.pnl || 0) });
    return acc;
  }, []);

  if (!points.length) {
    host.innerHTML = `<svg width="100%" height="100%"><text x="28" y="70" fill="#64716b" font-size="14">Import trades to draw the cumulative return chart.</text></svg>`;
    return;
  }

  const values = points.map((point) => point.value).concat(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const left = 46;
  const right = 14;
  const top = 34;
  const bottom = 32;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const y = (value) => top + ((max - value) / span) * chartHeight;
  const x = (index) => left + (points.length === 1 ? 0 : (index / (points.length - 1)) * chartWidth);

  const horizontalLines = [];
  for (let i = 0; i <= 5; i += 1) {
    const yy = top + (chartHeight / 5) * i;
    horizontalLines.push(`<line class="overview-grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"></line>`);
  }
  const verticalLines = [];
  for (let i = 0; i <= 28; i += 1) {
    const xx = left + (chartWidth / 28) * i;
    verticalLines.push(`<line class="overview-grid-line" x1="${xx}" y1="${top}" x2="${xx}" y2="${height - bottom}"></line>`);
  }

  const yLabelBackplates = [];
  const yLabels = [];
  for (let i = 0; i <= 5; i += 1) {
    const value = max - (span / 5) * i;
    const yy = top + (chartHeight / 5) * i;
    yLabelBackplates.push(`<rect class="overview-label-plate" x="0" y="${yy - 8}" width="${left - 3}" height="16" rx="2"></rect>`);
    yLabels.push(`<text class="overview-axis-label" x="${left - 10}" y="${yy}" text-anchor="end">${escapeHtml(axisFormatter(value))}</text>`);
  }

  const dateIndexes = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1]
    .filter((index, position, arr) => index >= 0 && arr.indexOf(index) === position);
  const dateLabelBackplates = dateIndexes.map((index) => {
    const xx = x(index);
    const rectX = Math.max(0, Math.min(width - 92, xx - 46));
    return `<rect class="overview-label-plate" x="${rectX}" y="${height - bottom + 6}" width="92" height="18" rx="2"></rect>`;
  });
  const dateLabels = dateIndexes.map((index) => (
    `<text class="overview-date-label" x="${x(index)}" y="${height - bottom + 16}" text-anchor="middle">${escapeHtml(overviewPointLabel(points[index]))}</text>`
  ));

  const zeroY = y(0);
  const plottedPoints = points.map((point, index) => ({
    ...point,
    x: x(index),
    y: y(point.value)
  }));
  const path = plottedPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const barWidth = Math.max(2, Math.min(18, (chartWidth / Math.max(points.length, 1)) * 0.62));
  const bars = plottedPoints.map((point) => {
    const barY = Math.min(point.y, zeroY);
    const barHeight = Math.max(1, Math.abs(zeroY - point.y));
    const lossClass = point.value < 0 ? " loss" : "";
    return `<rect class="overview-equity-bar${lossClass}" x="${(point.x - barWidth / 2).toFixed(2)}" y="${barY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="1"></rect>`;
  }).join("");
  const seriesMarkup = chartType === "bar"
    ? bars
    : `<path class="overview-equity-line" d="${path}"></path>`;

  host.innerHTML = `<svg width="100%" height="100%">
    ${horizontalLines.join("")}
    ${verticalLines.join("")}
    <line class="overview-zero-line" x1="${left}" y1="${zeroY}" x2="${width - right}" y2="${zeroY}"></line>
    ${yLabelBackplates.join("")}
    ${dateLabelBackplates.join("")}
    ${yLabels.join("")}
    ${dateLabels.join("")}
    ${seriesMarkup}
    <g class="overview-crosshair" style="display:none">
      <line class="overview-crosshair-line overview-crosshair-x" x1="0" y1="${top}" x2="0" y2="${height - bottom}"></line>
      <line class="overview-crosshair-line overview-crosshair-y" x1="${left}" y1="0" x2="${width - right}" y2="0"></line>
      <circle class="overview-crosshair-dot" cx="0" cy="0" r="4"></circle>
    </g>
  </svg>
  <div class="overview-chart-tooltip" hidden></div>`;

  const svg = host.querySelector("svg");
  const crosshair = host.querySelector(".overview-crosshair");
  const vertical = host.querySelector(".overview-crosshair-x");
  const horizontal = host.querySelector(".overview-crosshair-y");
  const dot = host.querySelector(".overview-crosshair-dot");
  const tooltip = host.querySelector(".overview-chart-tooltip");
  if (!svg || !crosshair || !vertical || !horizontal || !dot || !tooltip) return;

  host.onmousemove = (event) => {
    const bounds = host.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nearest = plottedPoints.reduce((best, point) => (
      Math.abs(point.x - pointerX) < Math.abs(best.x - pointerX) ? point : best
    ), plottedPoints[0]);
    crosshair.style.display = "";
    vertical.setAttribute("x1", nearest.x);
    vertical.setAttribute("x2", nearest.x);
    horizontal.setAttribute("y1", nearest.y);
    horizontal.setAttribute("y2", nearest.y);
    dot.setAttribute("cx", nearest.x);
    dot.setAttribute("cy", nearest.y);

    tooltip.hidden = false;
    tooltip.innerHTML = `<span>${escapeHtml(overviewPointLabel(nearest))}</span>${valueFormatter(nearest.value)}`;
    const tooltipX = Math.min(bounds.width - 150, Math.max(8, event.clientX - bounds.left + 12));
    const tooltipY = Math.min(bounds.height - 54, Math.max(8, event.clientY - bounds.top - 44));
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
  };

  host.onmouseleave = () => {
    crosshair.style.display = "none";
    tooltip.hidden = true;
  };
}

function renderSetups(trades) {
  const groups = new Map();
  trades.forEach((trade) => {
    const setup = trade.setup || "Unclassified";
    if (!groups.has(setup)) groups.set(setup, []);
    groups.get(setup).push(trade);
  });

  const items = [...groups.entries()]
    .map(([setup, setupTrades]) => ({ setup, trades: setupTrades, stats: calculateStats(setupTrades) }))
    .sort((a, b) => b.stats.net - a.stats.net);

  els.setupList.innerHTML = items.length ? items.map((item) => {
    const winPercent = Math.round(item.stats.winRate * 100);
    return `<div class="setup-item">
      <strong>${escapeHtml(item.setup)}</strong>
      <div class="setup-meta"><span>${item.stats.count} trades</span><span>${formatMoney(item.stats.net, currentDisplayCurrency())}</span></div>
      <div class="bar"><span style="width:${winPercent}%"></span></div>
      <div class="setup-meta"><span>Win rate</span><span>${winPercent}%</span></div>
    </div>`;
  }).join("") : `<div class="empty">No setups in this journal.</div>`;
}

function renderMistakes(trades) {
  if (!els.mistakeList) return;
  const losingGroups = new Map();
  trades.filter((trade) => trade.pnl < 0).forEach((trade) => {
    const key = trade.symbol || "No Setup";
    if (!losingGroups.has(key)) losingGroups.set(key, []);
    losingGroups.get(key).push(trade);
  });
  const items = [...losingGroups.entries()]
    .map(([setup, setupTrades]) => ({ setup, stats: calculateStats(setupTrades) }))
    .sort((a, b) => a.stats.net - b.stats.net)
    .slice(0, 7);

  els.mistakeList.innerHTML = items.length ? items.map((item) => {
    const width = Math.min(100, Math.max(6, Math.abs(item.stats.net)));
    return `<div class="setup-item">
      <div class="setup-meta"><span>${escapeHtml(item.setup)}</span><span>${formatMoney(item.stats.net, currentDisplayCurrency())}</span></div>
      <div class="bar loss-bar"><span style="width:${width}%"></span></div>
    </div>`;
  }).join("") : `<div class="empty">No losses in this journal.</div>`;
}

function renderRows(trades) {
  const dateLabel = dateFilterLabel();
  els.tableSubtitle.textContent = state.activeCurrency
    ? `${trades.length} visible trades in ${isCombinedAudView() ? "All in AUD" : state.activeCurrency}${dateLabel ? ` · ${dateLabel}` : ""}`
    : "Import a CSV to begin";
  els.tradeRows.innerHTML = trades.length ? trades.map((trade) => {
    const pnlClass = trade.pnl < 0 ? "pnl-loss" : "pnl-win";
    const status = trade.pnl > 0 ? "WIN" : trade.pnl < 0 ? "LOSS" : "OPEN";
    const statusClass = trade.pnl > 0 ? "status-win" : trade.pnl < 0 ? "status-loss" : "status-open";
    const sideClass = trade.side === "Short" ? "side-short" : "";
    const returnPct = tradeReturnPercent(trade);
    const sourceCurrency = trade.sourceCurrency || trade.currency;
    const sourcePnl = Number.isFinite(trade.sourcePnl) ? trade.sourcePnl : trade.pnl;
    const sourcePnlClass = sourcePnl < 0 ? "pnl-loss" : "pnl-win";
    return `<tr>
      <td><span class="check"></span></td>
      <td class="expand">›</td>
      <td><span class="status-pill ${statusClass}">${status}</span></td>
      <td><span class="side-pill ${sideClass}">${escapeHtml(trade.side || "-")}</span></td>
      <td><span class="symbol-link">#${escapeHtml(trade.symbol)}</span></td>
      <td>${escapeHtml(sourceCurrency)}</td>
      <td>${escapeHtml(formatDate(trade.openedAt || trade.date))}</td>
      <td>${formatNumber(trade.entry)}</td>
      <td>${formatNumber(trade.qty)}</td>
      <td>${escapeHtml(formatDate(trade.date))}</td>
      <td>${formatNumber(trade.exit)}</td>
      <td>${formatMoney(tradeCost(trade), currentDisplayCurrency())}</td>
      <td class="${sourcePnlClass}">${formatMoney(sourcePnl, sourceCurrency)}</td>
      <td class="${pnlClass}">${formatMoney(trade.pnl, currentDisplayCurrency())}</td>
      <td class="${pnlClass}">${(returnPct * 100).toFixed(2)}%</td>
      <td><span class="setup-pill">${escapeHtml(trade.setup || "TRADE")}</span></td>
      <td>${escapeHtml(trade.notes)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="17" class="empty">No trades match this view.</td></tr>`;
}

function calendarTrades() {
  return sourceTradesForCurrentJournal()
    .map(convertTradeForView)
    .filter(matchesResultFilter)
    .filter(matchesSymbolFilter);
}

function reportTrades() {
  return sourceTradesForCurrentJournal()
    .map(convertTradeForView)
    .filter(matchesDateFilter)
    .filter(matchesResultFilter)
    .filter(matchesSymbolFilter)
    .sort((a, b) => tradeTime(a.date) - tradeTime(b.date));
}

function cumulativeSeries(trades, accessor = (trade) => trade.pnl || 0) {
  let total = 0;
  const values = trades.map((trade) => {
    total += accessor(trade);
    return total;
  });
  return values.length ? values : [0];
}

function sparkline(values, labels = []) {
  const safe = values.length ? values : [0];
  const min = Math.min(...safe, 0);
  const max = Math.max(...safe, 0);
  const span = max - min || 1;
  const points = safe.map((value, index) => {
    const x = safe.length === 1 ? 0 : (index / (safe.length - 1)) * 100;
    const y = 30 - ((value - min) / span) * 28;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const dataValues = safe.map((value) => Number(value || 0).toFixed(6)).join(",");
  const safeLabels = safe.map((_, index) => labels[index] || `Point ${index + 1}`);
  return `<svg class="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" data-values="${dataValues}" aria-hidden="true">
    <polyline points="${points}"></polyline>
    <g class="sparkline-crosshair" style="display:none">
      <line class="sparkline-crosshair-line sparkline-crosshair-x" x1="0" y1="1" x2="0" y2="31"></line>
      <line class="sparkline-crosshair-line sparkline-crosshair-y" x1="0" y1="0" x2="100" y2="0"></line>
    </g>
  </svg><div class="sparkline-card-crosshair" hidden></div><div class="sparkline-card-dot" hidden></div><div class="sparkline-tooltip" data-labels="${escapeHtml(JSON.stringify(safeLabels))}" hidden></div>`;
}

function standardDeviation(values) {
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function maxConsecutive(trades, predicate) {
  let current = 0;
  let best = 0;
  trades.forEach((trade) => {
    if (predicate(trade)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

function dailyPnlValues(trades) {
  const byDay = new Map();
  trades.forEach((trade) => {
    const key = tradeDayKey(trade.date);
    if (!key) return;
    byDay.set(key, (byDay.get(key) || 0) + (trade.pnl || 0));
  });
  return [...byDay.values()];
}

function tradeDurationMs(trade) {
  const open = tradeTime(trade.openedAt || trade.date);
  const close = tradeTime(trade.date);
  return open && close && close >= open ? close - open : 0;
}

function averageDuration(trades) {
  if (!trades.length) return 0;
  return trades.reduce((sum, trade) => sum + tradeDurationMs(trade), 0) / trades.length;
}

function formatDuration(ms) {
  const seconds = Math.round((ms || 0) / 1000);
  if (seconds < 60) return `${seconds} Sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} Hr`;
  return `${Math.round(hours / 24)} Days`;
}

function monthKeyFromTime(time) {
  const date = new Date(time || Date.now());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key) {
  const match = String(key || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function latestCalendarMonthKey(items = calendarTrades()) {
  const tradeTimes = items.map((trade) => tradeTime(trade.date)).filter(Boolean);
  const flowTimes = activeCashFlows().map((flow) => tradeTime(flow.date)).filter(Boolean);
  const times = [...tradeTimes, ...flowTimes];
  return monthKeyFromTime(times.length ? Math.max(...times) : Date.now());
}

function moveCalendarMonth(delta) {
  const month = parseMonthKey(state.calendarMonth || latestCalendarMonthKey());
  month.setMonth(month.getMonth() + delta);
  state.calendarMonth = monthKeyFromTime(month.getTime());
}

function tradeDayKey(value) {
  const time = tradeTime(value);
  if (!time) return "";
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function pluralizeTrade(count) {
  return `${count} ${count === 1 ? "trade" : "trades"}`;
}

function periodReturnPercent(pnl, endTime, fallbackCost = 0) {
  const endBalance = statementBalanceAtOrBefore(endTime);
  const startingBalance = Number.isFinite(endBalance) ? endBalance - pnl : 0;
  const denominator = Math.abs(startingBalance) > 0 ? Math.abs(startingBalance) : Math.abs(fallbackCost);
  return denominator ? pnl / denominator : 0;
}

function signedPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function renderCalendar() {
  if (!els.calendarGrid) return;
  const trades = calendarTrades();
  if (!state.calendarMonth) state.calendarMonth = latestCalendarMonthKey(trades);
  const month = parseMonthKey(state.calendarMonth);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthLabel = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(month);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const daily = new Map();
  const flowNotes = new Map();

  trades.forEach((trade) => {
    const key = tradeDayKey(trade.date);
    if (!key) return;
    if (!daily.has(key)) daily.set(key, { pnl: 0, count: 0, cost: 0 });
    const day = daily.get(key);
    day.pnl += trade.pnl || 0;
    day.count += 1;
    day.cost += tradeCost(trade);
  });

  activeCashFlows().forEach((flow) => {
    const key = tradeDayKey(flow.date);
    if (!key) return;
    if (!flowNotes.has(key)) flowNotes.set(key, []);
    flowNotes.get(key).push(flow.description || flow.type);
  });

  const cells = [];
  const dayCell = (day) => {
    if (!day) return `<div class="calendar-day is-empty" aria-hidden="true"></div>`;
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const item = daily.get(key);
    const notes = flowNotes.get(key) || [];
    const resultClass = !item ? "" : item.pnl > 0 ? " is-win" : item.pnl < 0 ? " is-loss" : " is-flat";
    const endTime = new Date(year, monthIndex, day, 23, 59, 59, 999).getTime();
    const percent = item ? periodReturnPercent(item.pnl, endTime, item.cost) : 0;
    const tradeContent = item
      ? `<strong class="calendar-return">${formatMoney(item.pnl, currentDisplayCurrency())}</strong><span class="calendar-count">${pluralizeTrade(item.count)}</span><span class="calendar-percent">${signedPercent(percent)}</span>`
      : "";
    const noteContent = notes.length ? `<span class="calendar-note">${escapeHtml(notes[0])}</span>` : "";
    return `<div class="calendar-day${item ? " has-trades" : ""}${resultClass}">
      <span class="calendar-date">${String(day).padStart(2, "0")}</span>
      ${tradeContent || noteContent}
    </div>`;
  };

  const totalSlots = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  for (let slot = 0; slot < totalSlots; slot += 7) {
    let weekPnl = 0;
    let weekCount = 0;
    let weekCost = 0;
    let weekEndTime = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const day = slot + offset - leadingBlanks + 1;
      const inMonth = day >= 1 && day <= daysInMonth;
      if (inMonth) {
        const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const item = daily.get(key);
        weekEndTime = new Date(year, monthIndex, day, 23, 59, 59, 999).getTime();
        if (item) {
          weekPnl += item.pnl;
          weekCount += item.count;
          weekCost += item.cost;
        }
      }
      cells.push(dayCell(inMonth ? day : null));
    }
    const weekClass = weekPnl > 0 ? " is-win" : weekPnl < 0 ? " is-loss" : "";
    const weekPercent = periodReturnPercent(weekPnl, weekEndTime, weekCost);
    cells.push(`<div class="calendar-week-total${weekClass}">
      <strong>${formatMoney(weekPnl, currentDisplayCurrency())}</strong>
      <span>${pluralizeTrade(weekCount)}</span>
      <span class="calendar-percent">${signedPercent(weekPercent)}</span>
    </div>`);
  }

  els.calendarTitle.textContent = monthLabel;
  const net = trades
    .filter((trade) => {
      const time = tradeTime(trade.date);
      const date = new Date(time);
      return time && date.getFullYear() === year && date.getMonth() === monthIndex;
    })
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const monthTrades = trades.filter((trade) => {
    const time = tradeTime(trade.date);
    const date = new Date(time);
    return time && date.getFullYear() === year && date.getMonth() === monthIndex;
  });
  const monthCost = monthTrades.reduce((sum, trade) => sum + tradeCost(trade), 0);
  const monthEndTime = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999).getTime();
  const monthPercent = periodReturnPercent(net, monthEndTime, monthCost);
  const count = [...daily.values()].reduce((sum, day) => sum + day.count, 0);
  els.calendarSummary.textContent = `${pluralizeTrade(count)} · ${formatMoney(net, currentDisplayCurrency())} for ${isCombinedAudView() ? "All in AUD" : currentDisplayCurrency()}`;
  els.calendarGrid.innerHTML = cells.join("");
  if (els.calendarMonthTotal) {
    const pnlClass = net < 0 ? "pnl-loss" : "pnl-win";
    els.calendarMonthTotal.innerHTML = `<span>Month total</span><strong class="${pnlClass}">${formatMoney(net, currentDisplayCurrency())}</strong><strong class="${pnlClass}">${signedPercent(monthPercent)}</strong>`;
  }
}

function weekdayReportGroups() {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trades = reportTrades();
  const groups = labels.map((name, index) => ({ name, index, trades: [] }));
  trades.forEach((trade) => {
    const time = tradeTime(trade.date);
    if (!time) return;
    groups[new Date(time).getDay()].trades.push(trade);
  });
  const hasWeekend = groups[0].trades.length || groups[6].trades.length;
  const visible = hasWeekend ? groups : groups.slice(1, 6);
  return visible.map((group) => {
    const wins = group.trades.filter((trade) => trade.pnl > 0);
    const losses = group.trades.filter((trade) => trade.pnl < 0);
    const others = group.trades.filter((trade) => trade.pnl === 0);
    const returnWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const returnLoss = losses.reduce((sum, trade) => sum + trade.pnl, 0);
    const returnOthers = others.reduce((sum, trade) => sum + trade.pnl, 0);
    const net = group.trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const size = group.trades.reduce((sum, trade) => sum + (trade.qty || 0), 0);
    const profitFactor = Math.abs(returnLoss) ? returnWin / Math.abs(returnLoss) : returnWin ? Infinity : 0;
    return {
      ...group,
      net,
      returnWin,
      returnLoss,
      returnOthers,
      trades: group.trades,
      size,
      profitFactor,
      winRate: group.trades.length ? wins.length / group.trades.length : 0,
      avgReturn: group.trades.length ? net / group.trades.length : 0,
      avgProfit: wins.length ? returnWin / wins.length : 0,
      avgLoser: losses.length ? returnLoss / losses.length : 0
    };
  });
}

function renderWeekdayReport() {
  if (!els.weekdayReport) return;
  const groups = weekdayReportGroups();
  const maxAbs = Math.max(...groups.map((group) => Math.abs(group.net)), 1);
  const best = groups.slice().sort((a, b) => b.net - a.net)[0];
  const worst = groups.slice().sort((a, b) => a.net - b.net)[0];
  const total = groups.reduce((sum, group) => sum + group.net, 0);
  const bestShare = total ? best.net / Math.abs(total) : 0;

  if (els.weekdayChart) {
    els.weekdayChart.style.setProperty("--weekday-count", groups.length);
    els.weekdayChart.innerHTML = groups.map((group) => {
      const height = Math.max(6, (Math.abs(group.net) / maxAbs) * 82);
      const lossClass = group.net < 0 ? " loss" : "";
      return `<div class="weekday-bar-group">
        <div class="weekday-bar${lossClass}" style="height:${height}%"></div>
        <div class="weekday-bar-label">${escapeHtml(group.name)}</div>
      </div>`;
    }).join("");
  }

  if (els.weekdayRows) {
    els.weekdayRows.innerHTML = groups.map((group) => {
      const pnlClass = group.net < 0 ? "pnl-loss" : "pnl-win";
      return `<tr>
        <td>${escapeHtml(group.name)}</td>
        <td class="${pnlClass}">${formatMoney(group.net, currentDisplayCurrency())}</td>
        <td>${group.profitFactor === Infinity ? "∞" : group.profitFactor.toFixed(2)}</td>
        <td>${formatMoney(group.returnWin, currentDisplayCurrency())}</td>
        <td>${formatPercent(group.winRate)}</td>
        <td>${formatMoney(group.returnLoss, currentDisplayCurrency())}</td>
        <td>${formatMoney(group.returnOthers, currentDisplayCurrency())}</td>
        <td>${formatNumber(group.trades.length)}</td>
        <td>${formatNumber(group.size)}</td>
        <td>${formatMoney(group.avgReturn, currentDisplayCurrency())}</td>
        <td>${formatMoney(group.avgProfit, currentDisplayCurrency())}</td>
        <td>${formatMoney(group.avgLoser, currentDisplayCurrency())}</td>
      </tr>`;
    }).join("");
  }

  if (els.weekdayInsights) {
    els.weekdayInsights.innerHTML = `<h3>Insights</h3>
      <strong>${escapeHtml(best.name)} is your strongest weekday with ${formatMoney(best.net, currentDisplayCurrency())} net return.</strong>
      <p>${escapeHtml(best.name)} produced ${formatPercent(bestShare)} of the absolute net return in this filtered report. ${escapeHtml(worst.name)} is the weakest weekday at ${formatMoney(worst.net, currentDisplayCurrency())}.</p>
      <div class="insight-stat"><span>Avg Return</span><b>${formatMoney(best.avgReturn, currentDisplayCurrency())}</b></div>
      <div class="insight-stat"><span>Win Rate</span><b>${formatPercent(best.winRate)}</b></div>
      <div class="insight-stat"><span>Trades</span><b>${formatNumber(best.trades.length)}</b></div>
      <p>Use this to spot days where your playbook is working, or days where trade frequency and losses need tighter rules.</p>`;
  }
}

function sizeReportGroups() {
  const trades = groupedPositionSizeTrades()
    .filter((trade) => Number.isFinite(trade.positionSize) && trade.positionSize > 0)
    .sort((a, b) => a.positionSize - b.positionSize);
  const bandCount = Math.min(5, Math.max(1, trades.length));
  const groups = [];

  for (let index = 0; index < bandCount; index += 1) {
    const start = Math.floor((index / bandCount) * trades.length);
    const end = Math.floor(((index + 1) / bandCount) * trades.length);
    const bandTrades = trades.slice(start, end);
    if (!bandTrades.length) continue;
    const min = bandTrades[0].positionSize;
    const max = bandTrades[bandTrades.length - 1].positionSize;
    const wins = bandTrades.filter((trade) => trade.pnl > 0);
    const losses = bandTrades.filter((trade) => trade.pnl < 0);
    const returnWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const returnLoss = losses.reduce((sum, trade) => sum + trade.pnl, 0);
    const net = bandTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalCost = bandTrades.reduce((sum, trade) => sum + trade.positionCost, 0);
    const totalQty = bandTrades.reduce((sum, trade) => sum + (trade.qty || 0), 0);
    const name = min === max
      ? formatNumber(min)
      : `${formatNumber(min)} - ${formatNumber(max)}`;
    groups.push({
      id: name,
      name,
      trades: bandTrades,
      net,
      returnWin,
      returnLoss,
      totalCost,
      avgSize: bandTrades.length ? totalQty / bandTrades.length : 0,
      profitFactor: Math.abs(returnLoss) ? returnWin / Math.abs(returnLoss) : returnWin ? Infinity : 0,
      winRate: bandTrades.length ? wins.length / bandTrades.length : 0,
      avgReturn: bandTrades.length ? net / bandTrades.length : 0,
      avgProfit: wins.length ? returnWin / wins.length : 0,
      avgLoser: losses.length ? returnLoss / losses.length : 0
    });
  }

  return groups;
}

function positionGroupKey(trade) {
  const openedAt = cleanCell(trade.openedAt);
  const closeDate = cleanCell(trade.date);
  const hasOpenAnchor = trade.hasExplicitOpenDate || (openedAt && openedAt !== closeDate);
  if (!hasOpenAnchor) return trade.id || tradeFingerprint(trade);
  return [
    trade.symbol,
    trade.side,
    openedAt,
    trade.sourceCurrency || trade.currency,
    trade.currency
  ].map((part) => String(part ?? "").trim().toLowerCase()).join("|");
}

function weightedAverage(trades, valueAccessor, weightAccessor = (trade) => Math.abs(trade.qty || 0)) {
  const totalWeight = trades.reduce((sum, trade) => sum + weightAccessor(trade), 0);
  if (!totalWeight) return 0;
  return trades.reduce((sum, trade) => sum + (valueAccessor(trade) || 0) * weightAccessor(trade), 0) / totalWeight;
}

function groupedPositionSizeTrades() {
  const groups = new Map();
  reportTrades().forEach((trade) => {
    const key = positionGroupKey(trade);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trade);
  });

  return [...groups.entries()].map(([key, trades]) => {
    if (trades.length === 1) {
      const [trade] = trades;
      return {
        ...trade,
        positionSize: Math.abs(trade.qty || 0),
        positionCost: tradeCost(trade),
        closeLegs: 1
      };
    }

    const ordered = trades.slice().sort((a, b) => tradeTime(a.date) - tradeTime(b.date));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const positionSize = ordered.reduce((sum, trade) => sum + Math.abs(trade.qty || 0), 0);
    const pnl = ordered.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const positionCost = ordered.reduce((sum, trade) => sum + tradeCost(trade), 0);

    return {
      ...first,
      id: `position:${key}`,
      serial: "",
      date: last.date,
      qty: positionSize,
      positionSize,
      positionCost,
      pnl,
      entry: weightedAverage(ordered, (trade) => trade.entry),
      exit: weightedAverage(ordered, (trade) => trade.exit),
      notes: `${ordered.length} partial closes grouped for trade-size analysis`,
      closeLegs: ordered.length,
      isGroupedPosition: true
    };
  });
}

function renderBandReport({ groups, chartEl, rowsEl, insightsEl, drilldownEl = null, label = "band", selectable = false }) {
  if (!groups.length) {
    if (chartEl) chartEl.innerHTML = `<div class="empty">No trades available for this report.</div>`;
    if (rowsEl) rowsEl.innerHTML = "";
    if (drilldownEl) drilldownEl.innerHTML = "";
    if (insightsEl) insightsEl.innerHTML = `<h3>Insights</h3><p>No ${escapeHtml(label)} data is available for the current filters.</p>`;
    return;
  }

  const maxAbs = Math.max(...groups.map((group) => Math.abs(group.net)), 1);
  const best = groups.slice().sort((a, b) => b.net - a.net)[0];
  const worst = groups.slice().sort((a, b) => a.net - b.net)[0];
  const total = groups.reduce((sum, group) => sum + group.net, 0);
  const bestShare = total ? best.net / Math.abs(total) : 0;

  if (chartEl) {
    chartEl.style.setProperty("--weekday-count", groups.length);
    chartEl.innerHTML = groups.map((group) => {
      const height = Math.max(6, (Math.abs(group.net) / maxAbs) * 82);
      const lossClass = group.net < 0 ? " loss" : "";
      const activeClass = selectable && group.id === state.selectedSizeBand ? " is-active" : "";
      const clickableClass = selectable ? " is-clickable" : "";
      const bandAttr = selectable ? ` data-size-band="${escapeHtml(group.id)}"` : "";
      return `<div class="weekday-bar-group${clickableClass}${activeClass}"${bandAttr}>
        <div class="weekday-bar${lossClass}" style="height:${height}%"></div>
        <div class="weekday-bar-label">${escapeHtml(group.name)}</div>
      </div>`;
    }).join("");
  }

  if (rowsEl) {
    rowsEl.innerHTML = groups.map((group) => {
      const pnlClass = group.net < 0 ? "pnl-loss" : "pnl-win";
      const activeClass = selectable && group.id === state.selectedSizeBand ? " is-active" : "";
      const clickableClass = selectable ? " class=\"is-clickable${activeClass}\"" : "";
      const bandAttr = selectable ? ` data-size-band="${escapeHtml(group.id)}"` : "";
      const row = `<tr${clickableClass}${bandAttr}>
        <td>${escapeHtml(group.name)}</td>
        <td class="${pnlClass}">${formatMoney(group.net, currentDisplayCurrency())}</td>
        <td>${group.profitFactor === Infinity ? "∞" : group.profitFactor.toFixed(2)}</td>
        <td>${formatMoney(group.returnWin, currentDisplayCurrency())}</td>
        <td>${formatPercent(group.winRate)}</td>
        <td>${formatMoney(group.returnLoss, currentDisplayCurrency())}</td>
        <td>${formatNumber(group.trades.length)}</td>
        <td>${formatMoney(group.totalCost, currentDisplayCurrency())}</td>
        <td>${formatNumber(group.avgSize)}</td>
        <td>${formatMoney(group.avgReturn, currentDisplayCurrency())}</td>
        <td>${formatMoney(group.avgProfit, currentDisplayCurrency())}</td>
        <td>${formatMoney(group.avgLoser, currentDisplayCurrency())}</td>
      </tr>`;
      return selectable && group.id === state.selectedSizeBand
        ? `${row}<tr class="size-drilldown-row"><td colspan="12">${sizeDrilldownMarkup(group)}</td></tr>`
        : row;
    }).join("");
  }

  if (insightsEl) {
    insightsEl.innerHTML = `<h3>Insights</h3>
      <strong>Your strongest ${escapeHtml(label)} is ${escapeHtml(best.name)} with ${formatMoney(best.net, currentDisplayCurrency())} net return.</strong>
      <p>That group contributed ${formatPercent(bestShare)} of the absolute net return in the current filter. The weakest ${escapeHtml(label)} is ${escapeHtml(worst.name)} at ${formatMoney(worst.net, currentDisplayCurrency())}.</p>
      <div class="insight-stat"><span>Avg Return</span><b>${formatMoney(best.avgReturn, currentDisplayCurrency())}</b></div>
      <div class="insight-stat"><span>Win Rate</span><b>${formatPercent(best.winRate)}</b></div>
      <div class="insight-stat"><span>Trades</span><b>${formatNumber(best.trades.length)}</b></div>
      <p>Use this to check whether scaling up improves expectancy or simply increases drawdown.</p>`;
  }

  if (drilldownEl) drilldownEl.innerHTML = "";
}

function renderSizeReport() {
  if (!els.sizeReport) return;
  renderBandReport({
    groups: sizeReportGroups(),
    chartEl: els.sizeChart,
    rowsEl: els.sizeRows,
    insightsEl: els.sizeInsights,
    drilldownEl: els.sizeDrilldown,
    label: "position-size band",
    selectable: true
  });
}

function sizeDrilldownMarkup(group) {
  return `<h3>${escapeHtml(group.name)} trades</h3>
    <div class="weekday-table-wrap">
      <table class="size-drilldown-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Open Date</th>
            <th>Close Date</th>
            <th>Size</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Return $</th>
            <th>Close Legs</th>
            <th>Setup</th>
          </tr>
        </thead>
        <tbody>
          ${group.trades.map((trade) => {
            const pnlClass = trade.pnl < 0 ? "pnl-loss" : "pnl-win";
            return `<tr>
              <td><span class="symbol-link">#${escapeHtml(trade.symbol)}</span></td>
              <td>${escapeHtml(trade.side || "-")}</td>
              <td>${escapeHtml(formatDate(trade.openedAt || trade.date))}</td>
              <td>${escapeHtml(formatDate(trade.date))}</td>
              <td>${formatNumber(trade.positionSize || trade.qty)}</td>
              <td>${formatNumber(trade.entry)}</td>
              <td>${formatNumber(trade.exit)}</td>
              <td class="${pnlClass}">${formatMoney(trade.pnl, currentDisplayCurrency())}</td>
              <td>${formatNumber(trade.closeLegs || 1)}</td>
              <td>${escapeHtml(trade.setup || "Unclassified")}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <button class="size-drilldown-collapse" type="button" data-size-band-collapse>Collapse</button>`;
}

function renderOverviewReport() {
  if (!els.overviewSections) return;
  const trades = reportTrades();
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const breakevens = trades.filter((trade) => trade.pnl === 0);
  const longs = trades.filter((trade) => /long/i.test(trade.side || ""));
  const shorts = trades.filter((trade) => /short/i.test(trade.side || ""));
  const returns = trades.map((trade) => trade.pnl || 0);
  const returnPercents = trades.map(tradeReturnPercent);
  const daily = dailyPnlValues(trades);
  const stats = calculateStats(trades);
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = losses.reduce((sum, trade) => sum + trade.pnl, 0);
  const totalCost = trades.reduce((sum, trade) => sum + tradeCost(trade), 0);
  const totalSize = trades.reduce((sum, trade) => sum + (trade.qty || 0), 0);
  const avg = (items, accessor) => items.length ? items.reduce((sum, item) => sum + accessor(item), 0) / items.length : 0;
  const series = cumulativeSeries(trades);
  const biggestWin = wins.length ? Math.max(...wins.map((trade) => trade.pnl)) : 0;
  const biggestLoss = losses.length ? Math.min(...losses.map((trade) => trade.pnl)) : 0;
  const biggestPctWin = returnPercents.length ? Math.max(...returnPercents) : 0;
  const biggestPctLoss = returnPercents.length ? Math.min(...returnPercents) : 0;
  const stdev = standardDeviation(returns);
  const systemQuality = stdev ? (stats.avg / stdev) * Math.sqrt(trades.length || 1) : 0;
  const peakEquity = Math.max(...cumulativeSeries(trades), 0);
  const drawdownPercent = peakEquity ? stats.maxDrawdown / peakEquity : 0;

  if (els.overviewGrossLabel) els.overviewGrossLabel.textContent = "Accumulative Return Gross $";
  if (els.overviewGrossReturn) els.overviewGrossReturn.textContent = formatMoney(stats.net, currentDisplayCurrency());
  renderOverviewEquityChart(trades);

  const labelsForValues = (values) => values.map((_, index) => {
    if (!trades.length) return `Point ${index + 1}`;
    const mappedIndex = values.length === 1
      ? trades.length - 1
      : Math.round((index / (values.length - 1)) * (trades.length - 1));
    return overviewDateLabel(trades[mappedIndex]?.date) || `Point ${index + 1}`;
  });
  const card = (label, value, values = series) => {
    const labels = labelsForValues(values);
    return `
    <article class="overview-stat-card" data-chart-title="${escapeHtml(label)}" data-chart-value="${escapeHtml(value)}" data-chart-values="${escapeHtml(JSON.stringify(values.map((item) => Number(item || 0))))}" data-chart-labels="${escapeHtml(JSON.stringify(labels))}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${sparkline(values, labels)}
    </article>`;
  };
  const moneyCard = (label, value, values) => card(label, formatMoney(value, currentDisplayCurrency()), values);
  const section = (title, cards) => `
    <section class="overview-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="overview-card-grid">${cards.join("")}</div>
    </section>`;

  const returnCards = [
    moneyCard("Accumulative Return Net $", stats.net, series),
    moneyCard("Accumulative Return Gross $", stats.net, series),
    moneyCard("Account Balance", calculateAccountBalance(trades), series),
    moneyCard("Daily Return $", daily.length ? daily[daily.length - 1] : 0, daily),
    moneyCard("Max Drawdown $", stats.maxDrawdown, series),
    moneyCard("Return on Winners", grossWin, cumulativeSeries(wins)),
    moneyCard("Return on Losers", grossLoss, cumulativeSeries(losses)),
    moneyCard("Return $ on Long", longs.reduce((sum, trade) => sum + trade.pnl, 0), cumulativeSeries(longs)),
    moneyCard("Return $ on Short", shorts.reduce((sum, trade) => sum + trade.pnl, 0), cumulativeSeries(shorts)),
    moneyCard("Biggest Profit $", biggestWin, wins.map((trade) => trade.pnl)),
    moneyCard("Biggest Loss $", biggestLoss, losses.map((trade) => trade.pnl)),
    card("Profit/Loss Ratio", stats.profitFactor === Infinity ? "∞" : `${stats.profitFactor.toFixed(2)}:1`, series),
    moneyCard("Trade $ Expectancy", stats.avg, series),
    card("Profit Factor", stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2), series)
  ];

  const returnPercentCards = [
    card("Win %", formatPercent(stats.winRate), cumulativeSeries(trades, (trade) => trade.pnl > 0 ? 1 : 0)),
    card("Loss %", formatPercent(trades.length ? losses.length / trades.length : 0), cumulativeSeries(trades, (trade) => trade.pnl < 0 ? 1 : 0)),
    card("BE %", formatPercent(trades.length ? breakevens.length / trades.length : 0), cumulativeSeries(trades, (trade) => trade.pnl === 0 ? 1 : 0)),
    card("Open %", "0.00%", [0]),
    card("Accumulative Return %", formatPercent(totalCost ? stats.net / totalCost : 0), cumulativeSeries(trades, tradeReturnPercent)),
    card("Max Drawdown %", formatPercent(drawdownPercent), series),
    card("Biggest % Profit", formatPercent(biggestPctWin), returnPercents),
    card("Biggest % Loser", formatPercent(biggestPctLoss), returnPercents),
    card("Return per Share", formatPercent(totalSize ? stats.net / totalSize : 0), series),
    card("Kelly Criterion", formatPercent(stats.profitFactor ? stats.winRate - ((1 - stats.winRate) / stats.profitFactor) : 0), series)
  ];

  const avgReturnCards = [
    moneyCard("Avg Return $", stats.avg, series),
    moneyCard("Return/Size", totalSize ? stats.net / totalSize : 0, series),
    moneyCard("Avg $ on Winners", avg(wins, (trade) => trade.pnl), wins.map((trade) => trade.pnl)),
    moneyCard("Avg $ on Losers", avg(losses, (trade) => trade.pnl), losses.map((trade) => trade.pnl)),
    moneyCard("Avg Daily P&L", daily.length ? daily.reduce((sum, value) => sum + value, 0) / daily.length : 0, daily),
    moneyCard("Avg $ Position MFE", biggestWin, wins.map((trade) => trade.pnl)),
    moneyCard("Avg $ Position MAE", biggestLoss, losses.map((trade) => trade.pnl)),
    card("Avg % Return", formatPercent(returnPercents.length ? returnPercents.reduce((sum, value) => sum + value, 0) / returnPercents.length : 0), returnPercents),
    card("Avg % on Winners", formatPercent(avg(wins, tradeReturnPercent)), wins.map(tradeReturnPercent)),
    card("Avg % on Losers", formatPercent(avg(losses, tradeReturnPercent)), losses.map(tradeReturnPercent)),
    card("Avg % on Long", formatPercent(avg(longs, tradeReturnPercent)), longs.map(tradeReturnPercent)),
    card("Avg % on Shorts", formatPercent(avg(shorts, tradeReturnPercent)), shorts.map(tradeReturnPercent))
  ];

  const tradeCards = [
    card("Total Closed Trades", formatNumber(trades.length), cumulativeSeries(trades, () => 1)),
    card("Total Trades", formatNumber(trades.length), cumulativeSeries(trades, () => 1)),
    card("Total Open Trades", "0", [0]),
    card("Total Winner", formatNumber(wins.length), cumulativeSeries(trades, (trade) => trade.pnl > 0 ? 1 : 0)),
    card("Total Losers", formatNumber(losses.length), cumulativeSeries(trades, (trade) => trade.pnl < 0 ? 1 : 0)),
    card("Total BE", formatNumber(breakevens.length), cumulativeSeries(trades, (trade) => trade.pnl === 0 ? 1 : 0)),
    card("Max Consec. Win", formatNumber(maxConsecutive(trades, (trade) => trade.pnl > 0)), series),
    card("Max Consec. Loss", formatNumber(maxConsecutive(trades, (trade) => trade.pnl < 0)), series)
  ];

  const sizeCards = [
    card("Total Shares", formatNumber(totalSize), cumulativeSeries(trades, (trade) => trade.qty || 0))
  ];

  const holdCards = [
    card("Avg Winners Hold Time", formatDuration(averageDuration(wins)), wins.map(tradeDurationMs)),
    card("Avg Closed Trades Hold Time", formatDuration(averageDuration(trades)), trades.map(tradeDurationMs)),
    card("Avg Losers Hold Time", formatDuration(averageDuration(losses)), losses.map(tradeDurationMs)),
    card("Avg Breakeven Hold Time", formatDuration(averageDuration(breakevens)), breakevens.map(tradeDurationMs))
  ];

  const performanceCards = [
    card("PnL Standard Deviation", formatNumber(stdev), returns),
    card("PnL Standard Deviation on Winners", formatNumber(standardDeviation(wins.map((trade) => trade.pnl))), wins.map((trade) => trade.pnl)),
    card("PnL Standard Deviation on Losers", formatNumber(standardDeviation(losses.map((trade) => trade.pnl))), losses.map((trade) => trade.pnl)),
    card("System Quality Number", formatNumber(systemQuality), series)
  ];

  els.overviewSections.innerHTML = [
    section("Return $", returnCards),
    section("Return %", returnPercentCards),
    section("Avg Return", avgReturnCards),
    section("Trades", tradeCards),
    section("Trades Size", sizeCards),
    section("Hold Time", holdCards),
    section("Performance", performanceCards)
  ].join("");
}

function dateFilterLabel() {
  if (state.dateFilter === "all") return "";
  if (state.dateFilter === "custom") {
    const from = state.dateFrom || "start";
    const to = state.dateTo || "end";
    return `${from} to ${to}`;
  }
  const labels = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "3m": "Last 3 months",
    "6m": "Last 6 months",
    month: "This month",
    year: "This year"
  };
  return labels[state.dateFilter] || "";
}

function renderDateFilterState() {
  if (!els.dateFilter) return;
  els.dateFilter.value = state.dateFilter || "all";
  els.dateFrom.value = state.dateFrom || "";
  els.dateTo.value = state.dateTo || "";
  els.customDateRange.hidden = state.dateFilter !== "custom";
}

function renderSymbolFilterState() {
  const symbols = symbolOptionsForCurrentContext();
  if (state.symbolFilter && !symbols.includes(state.symbolFilter)) state.symbolFilter = "";
  els.symbolSelect.innerHTML = [`<option value="">All symbols</option>`]
    .concat(symbols.map((symbol) => `<option value="${escapeHtml(symbol)}">${escapeHtml(symbol)}</option>`))
    .join("");
  els.symbolSelect.value = state.symbolFilter || "";
}

function renderOverviewChartTypeState() {
  document.querySelectorAll("[data-overview-chart-type]").forEach((button) => {
    button.classList.toggle("active", button.dataset.overviewChartType === (state.overviewChartType || "line"));
  });
}

function renderViewState() {
  if (state.activeView === "calendar") state.activeView = "reports";
  if (!state.activeReport) state.activeReport = "overview";
  const isReports = state.activeView === "reports";
  const isOverviewReport = isReports && state.activeReport === "overview";
  const isCalendarReport = isReports && state.activeReport === "calendar";
  const isWeekdayReport = isReports && state.activeReport === "weekday";
  const isSizeReport = isReports && state.activeReport === "size";
  if (els.tablePanel) els.tablePanel.hidden = isReports;
  if (els.overviewReport) els.overviewReport.hidden = !isOverviewReport;
  if (els.calendarView) els.calendarView.hidden = !isCalendarReport;
  if (els.weekdayReport) els.weekdayReport.hidden = !isWeekdayReport;
  if (els.sizeReport) els.sizeReport.hidden = !isSizeReport;
  if (els.metricsGrid) els.metricsGrid.hidden = isReports;
  if (els.inspector) els.inspector.hidden = isReports;
  if (els.journalLayout) els.journalLayout.classList.toggle("reports-mode", isReports);
  if (els.appShell) els.appShell.classList.toggle("reports-open", isReports);
  if (els.reportsSubnav) els.reportsSubnav.hidden = !isReports;
  if (els.journalViewBtn) els.journalViewBtn.classList.toggle("active", !isReports);
  if (els.reportsViewBtn) els.reportsViewBtn.classList.toggle("active", isReports);
  if (els.overviewReportBtn) els.overviewReportBtn.classList.toggle("active", isOverviewReport);
  if (els.calendarReportBtn) els.calendarReportBtn.classList.toggle("active", isCalendarReport);
  if (els.weekdayReportBtn) els.weekdayReportBtn.classList.toggle("active", isWeekdayReport);
  if (els.sizeReportBtn) els.sizeReportBtn.classList.toggle("active", isSizeReport);
}

function renderSortState() {
  document.querySelectorAll("[data-sort]").forEach((button) => {
    const active = button.dataset.sort === state.sortKey;
    button.classList.toggle("active", active);
    button.classList.toggle("asc", active && state.sortDirection === "asc");
    button.classList.toggle("desc", active && state.sortDirection === "desc");
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function render() {
  renderTabs();
  const trades = activeTrades();
  updateFxStatus(trades);
  els.journalTitle.textContent = state.activeCurrency
    ? isCombinedAudView() ? "All in AUD" : `${state.activeCurrency} Journal`
    : "No trades yet";
  els.chartSubtitle.textContent = fxStatus || (state.activeCurrency
    ? isCombinedAudView() ? "Statement AUD conversions" : `P&L shown only in ${state.activeCurrency}`
    : "P&L in journal currency");
  renderMetrics(trades);
  renderChart(trades);
  renderChart(trades, els.performanceChart, false);
  renderSetups(trades);
  renderMistakes(trades);
  renderRows(trades);
  renderViewState();
  renderOverviewReport();
  renderCalendar();
  renderWeekdayReport();
  renderSizeReport();
  renderSortState();
  renderDateFilterState();
  renderSymbolFilterState();
  renderOverviewChartTypeState();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state = { activeView: "journal", activeReport: "overview", overviewChartType: "line", sortKey: "closeDate", sortDirection: "desc", dateFilter: "all", dateFrom: "", dateTo: "", calendarMonth: "", symbolFilter: "", selectedSizeBand: "", cashFlows: [], statementBalances: [], ...JSON.parse(saved) };
    } catch {
      state = { activeView: "journal", activeReport: "overview", overviewChartType: "line", activeCurrency: "", sortKey: "closeDate", sortDirection: "desc", dateFilter: "all", dateFrom: "", dateTo: "", calendarMonth: "", symbolFilter: "", selectedSizeBand: "", cashFlows: [], statementBalances: [], trades: [] };
    }
  }
  render();
}

function exportActiveJournal() {
  const trades = isCombinedAudView()
    ? activeTrades()
    : state.trades.filter((trade) => trade.currency === state.activeCurrency);
  if (!trades.length) return;
  const headers = ["Date", "Symbol", "Side", "Qty", "Entry", "Exit", "PnL", "Currency", "Original Currency", "FX Rate", "Setup", "Notes"];
  const lines = [headers.join(",")].concat(trades.map((trade) => [
    trade.date,
    trade.symbol,
    trade.side,
    trade.qty,
    trade.entry,
    trade.exit,
    trade.pnl,
    currentDisplayCurrency(),
    trade.sourceCurrency || trade.currency,
    trade.fxRate || 1,
    trade.setup,
    trade.notes
  ].map(csvCell).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.activeCurrency || "journal"}-trades.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

els.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importTrades(await readFileText(file));
  event.target.value = "";
});

async function readFileText(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

els.sampleBtn.addEventListener("click", () => importTrades(sampleCsv));
els.resetBtn.addEventListener("click", () => {
  state = { activeView: "journal", activeReport: "overview", overviewChartType: "line", activeCurrency: "", sortKey: "closeDate", sortDirection: "desc", dateFilter: "all", dateFrom: "", dateTo: "", calendarMonth: "", symbolFilter: "", selectedSizeBand: "", cashFlows: [], statementBalances: [], trades: [] };
  save();
  render();
});
els.signInBtn?.addEventListener("click", () => runAuthAction(signIn));
els.signUpBtn?.addEventListener("click", () => runAuthAction(signUp));
els.signOutBtn?.addEventListener("click", () => runAuthAction(signOut));
els.syncUpBtn?.addEventListener("click", () => runAuthAction(syncLocalToCloud));
els.syncDownBtn?.addEventListener("click", () => runAuthAction(loadCloudToLocal));
els.exportBtn.addEventListener("click", exportActiveJournal);
els.currencySelect.addEventListener("change", (event) => {
  state.activeCurrency = event.target.value;
  save();
  render();
});
els.journalTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-currency]");
  if (!button) return;
  state.activeCurrency = button.dataset.currency;
  state.calendarMonth = "";
  save();
  render();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  state.activeView = button.dataset.view === "reports" ? "reports" : "journal";
  if (state.activeView === "reports") {
    state.activeReport = "overview";
  }
  save();
  render();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report]");
  if (!button) return;
  state.activeView = "reports";
  state.activeReport = button.dataset.report || "calendar";
  if (state.activeReport === "calendar" && !state.calendarMonth) state.calendarMonth = latestCalendarMonthKey();
  save();
  render();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort]");
  if (!button) return;
  const nextKey = button.dataset.sort;
  if (state.sortKey === nextKey) {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = nextKey;
    state.sortDirection = ["symbol", "side", "setup", "notes", "status"].includes(nextKey) ? "asc" : "desc";
  }
  save();
  render();
});
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-size-band]");
  if (!target) return;
  const nextBand = target.dataset.sizeBand || "";
  state.selectedSizeBand = state.selectedSizeBand === nextBand ? "" : nextBand;
  save();
  renderSizeReport();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-size-band-collapse]")) return;
  state.selectedSizeBand = "";
  save();
  renderSizeReport();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-overview-chart-type]");
  if (!button) return;
  state.overviewChartType = button.dataset.overviewChartType || "line";
  save();
  renderOverviewChartTypeState();
  if (overviewChartConfig) {
    renderOverviewEquityChart(
      overviewChartConfig.trades,
      overviewChartConfig.customPoints,
      overviewChartConfig.valueFormatter,
      overviewChartConfig.axisFormatter
    );
  } else {
    renderOverviewReport();
  }
});
els.symbolSelect.addEventListener("change", (event) => {
  state.symbolFilter = event.target.value;
  state.calendarMonth = "";
  save();
  render();
});
els.resultFilter.addEventListener("change", () => {
  state.calendarMonth = "";
  save();
  render();
});
els.dateFilter.addEventListener("change", (event) => {
  state.dateFilter = event.target.value;
  if (state.dateFilter !== "custom") {
    state.dateFrom = "";
    state.dateTo = "";
  }
  save();
  render();
});
els.dateFrom.addEventListener("change", (event) => {
  state.dateFrom = event.target.value;
  save();
  render();
});
els.dateTo.addEventListener("change", (event) => {
  state.dateTo = event.target.value;
  save();
  render();
});
els.calendarPrev.addEventListener("click", () => {
  moveCalendarMonth(-1);
  save();
  render();
});
els.calendarToday.addEventListener("click", () => {
  state.calendarMonth = latestCalendarMonthKey();
  save();
  render();
});
els.calendarNext.addEventListener("click", () => {
  moveCalendarMonth(1);
  save();
  render();
});
document.addEventListener("mousemove", (event) => {
  const card = event.target.closest?.(".overview-stat-card");
  const svg = card?.querySelector(".sparkline");
  if (!card || !svg) return;
  const values = (svg.dataset.values || "").split(",").map(Number).filter(Number.isFinite);
  if (!values.length) return;
  const bounds = svg.getBoundingClientRect();
  const pointerX = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
  const nearestIndex = values.length === 1
    ? 0
    : Math.round((pointerX / 100) * (values.length - 1));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const value = values[nearestIndex] || 0;
  const x = values.length === 1 ? 0 : (nearestIndex / (values.length - 1)) * 100;
  const y = 30 - ((value - min) / span) * 28;
  const crosshair = svg.querySelector(".sparkline-crosshair");
  const vertical = svg.querySelector(".sparkline-crosshair-x");
  const horizontal = svg.querySelector(".sparkline-crosshair-y");
  if (!crosshair || !vertical || !horizontal) return;
  crosshair.style.display = "";
  vertical.setAttribute("x1", x);
  vertical.setAttribute("x2", x);
  horizontal.setAttribute("y1", y);
  horizontal.setAttribute("y2", y);

  const tooltip = card?.querySelector(".sparkline-tooltip");
  if (!tooltip || !card) return;
  let labels = [];
  try {
    labels = JSON.parse(tooltip.dataset.labels || "[]");
  } catch {
    labels = [];
  }
  const label = labels[nearestIndex] || `Point ${nearestIndex + 1}`;
  const cardBounds = card.getBoundingClientRect();
  const fullHeightCrosshair = card.querySelector(".sparkline-card-crosshair");
  const roundDot = card.querySelector(".sparkline-card-dot");
  const cardX = (bounds.left - cardBounds.left) + ((x / 100) * bounds.width);
  const cardY = (bounds.top - cardBounds.top) + ((y / 32) * bounds.height);
  if (fullHeightCrosshair) {
    fullHeightCrosshair.hidden = false;
    fullHeightCrosshair.style.left = `${Math.min(cardBounds.width - 1, Math.max(0, cardX))}px`;
  }
  if (roundDot) {
    roundDot.hidden = false;
    roundDot.style.left = `${cardX}px`;
    roundDot.style.top = `${cardY}px`;
  }
  tooltip.hidden = false;
  tooltip.innerHTML = `<span>${escapeHtml(label)}</span>${formatNumber(value)}`;
  tooltip.style.left = `${Math.min(cardBounds.width - 92, Math.max(8, event.clientX - cardBounds.left + 10))}px`;
  tooltip.style.top = `${Math.min(cardBounds.height - 34, Math.max(8, event.clientY - cardBounds.top - 28))}px`;
});
document.addEventListener("mouseout", (event) => {
  const card = event.target.closest?.(".overview-stat-card");
  if (!card || card.contains(event.relatedTarget)) return;
  const svg = card.querySelector(".sparkline");
  const crosshair = svg?.querySelector(".sparkline-crosshair");
  const tooltip = card.querySelector(".sparkline-tooltip");
  const fullHeightCrosshair = card.querySelector(".sparkline-card-crosshair");
  const roundDot = card.querySelector(".sparkline-card-dot");
  if (crosshair) crosshair.style.display = "none";
  if (fullHeightCrosshair) fullHeightCrosshair.hidden = true;
  if (roundDot) roundDot.hidden = true;
  if (tooltip) tooltip.hidden = true;
});
document.addEventListener("click", (event) => {
  const card = event.target.closest?.(".overview-stat-card");
  if (!card) return;
  let values = [];
  let labels = [];
  try {
    values = JSON.parse(card.dataset.chartValues || "[]").map(Number).filter(Number.isFinite);
    labels = JSON.parse(card.dataset.chartLabels || "[]");
  } catch {
    values = [];
    labels = [];
  }
  if (!values.length) return;
  const points = values.map((value, index) => ({
    value,
    date: labels[index] || `Point ${index + 1}`,
    label: labels[index] || `Point ${index + 1}`
  }));
  if (els.overviewGrossLabel) els.overviewGrossLabel.textContent = card.dataset.chartTitle || "Metric";
  if (els.overviewGrossReturn) els.overviewGrossReturn.textContent = card.dataset.chartValue || "";
  renderOverviewEquityChart([], points, formatNumber, formatNumber);
});
window.addEventListener("resize", () => {
  if (state.activeView !== "reports" || state.activeReport !== "overview") return;
  if (overviewChartConfig) {
    renderOverviewEquityChart(
      overviewChartConfig.trades,
      overviewChartConfig.customPoints,
      overviewChartConfig.valueFormatter,
      overviewChartConfig.axisFormatter
    );
  } else {
    renderOverviewReport();
  }
});

load();
restoreAuthSession();
