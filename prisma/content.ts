export type LessonSeed = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  path: "beginner" | "intermediate" | "advanced";
  minutes: number;
  questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }>;
};

export const lessons: LessonSeed[] = [
  {
    slug: "what-a-share-is",
    title: "What a share represents",
    summary: "A share is a unit of ownership, not a promise of profit.",
    level: "BEGINNER",
    path: "beginner",
    minutes: 8,
    body: "A listed company divides its ownership into shares. Buying a share in this simulator makes you a virtual owner of that slice. The price moves because buyers and sellers change what they are willing to pay, not because the chart owes you a result.\n\nEquity markets exist so companies can raise capital and so owners can transfer that capital later. A ticker such as RELIANCE is only the short name used to find the instrument. The company, the exchange, and the quote are three different things.\n\nTradeLab uses virtual rupees. A fill here changes your practice ledger. It does not change a real demat account, and it is not an instruction to a broker.",
    questions: [
      { prompt: "What does a share represent?", options: ["A guaranteed return", "A unit of ownership", "A loan to the exchange"], correctIndex: 1, explanation: "A share is ownership. The price can rise or fall." },
      { prompt: "What does a TradeLab fill do?", options: ["Sends an order to a broker", "Updates the virtual ledger", "Moves real bank money"], correctIndex: 1, explanation: "This application is paper trading only." },
    ],
  },
  {
    slug: "tickers-and-exchanges",
    title: "Tickers and exchanges",
    summary: "The symbol is an address. The exchange is where that symbol is listed.",
    level: "BEGINNER",
    path: "beginner",
    minutes: 7,
    body: "NSE and BSE are venues. A company can be discussed in class with its ticker, but the venue still matters because rules, session times, and tick sizes belong to the venue.\n\nIn India the cash session used by this simulator is an approximation of 09:15 to 15:30 Asia/Kolkata on weekdays. Holidays can be added by an administrator. The status label tells you whether the session model is open.\n\nSearch by symbol or company name. If a symbol is disabled, the order ticket must reject it. Do not assume two similar names are the same instrument.",
    questions: [
      { prompt: "A ticker is best described as", options: ["The exchange itself", "The short identifier of an instrument", "The student's virtual balance"], correctIndex: 1, explanation: "The ticker identifies the instrument. The exchange is the venue." },
      { prompt: "The session clock in TradeLab is", options: ["A model of the cash session", "Proof that a live auction is open", "A broker heartbeat"], correctIndex: 0, explanation: "It is an educational session model, not a broker connection." },
    ],
  },
  {
    slug: "bid-ask-and-volume",
    title: "Bid, ask, and volume",
    summary: "The spread is the gap between the best buyer and the best seller.",
    level: "BEGINNER",
    path: "beginner",
    minutes: 8,
    body: "The bid is the price a buyer is showing. The ask is the price a seller is showing. You usually pay closer to the ask when you buy and receive closer to the bid when you sell. The difference is the spread, and it is a real cost even before brokerage.\n\nVolume counts how much traded. High volume does not mean the next move is safe. It means more transactions occurred. In demo mode the bid, ask, and volume are synthetic and labelled as demo.\n\nA market order in this simulator starts from the ask for a buy or the bid for a sell, then applies the configured slippage. If that reference is missing or stale, the order is rejected.",
    questions: [
      { prompt: "The spread is", options: ["Ask minus bid", "Volume times price", "Your realized profit"], correctIndex: 0, explanation: "The spread is the gap between ask and bid." },
      { prompt: "High volume means", options: ["The trade cannot lose", "More quantity changed hands", "The quote is always real-time"], correctIndex: 1, explanation: "Volume is activity, not a forecast." },
    ],
  },
  {
    slug: "reading-candles",
    title: "Reading candlesticks",
    summary: "A candle compresses open, high, low, and close for one interval.",
    level: "BEGINNER",
    path: "beginner",
    minutes: 9,
    body: "Each candle has four prices. The body covers the open and the close. The wicks reach the high and the low. A green candle in this terminal closed above its open. A red candle closed below its open. Neither colour predicts the next candle.\n\nThe interval matters. A daily candle hides the path inside the day. A five-minute candle hides nothing that happened after it, because it has not happened yet. Changing timeframe changes the story you are looking at.\n\nUse the crosshair to read a specific bar. The data badge tells you whether those bars are demo, delayed, historical, or real-time. Do not treat a demo candle as an exchange print.",
    questions: [
      { prompt: "A candle's wick shows", options: ["Only the close", "The high and low of the interval", "Brokerage"], correctIndex: 1, explanation: "Wicks mark the extreme prices inside the interval." },
      { prompt: "Switching from daily to five-minute", options: ["Changes the interval being summarised", "Converts demo data into live data", "Removes volume"], correctIndex: 0, explanation: "Timeframe selects the summary window." },
    ],
  },
  {
    slug: "indicators-are-descriptions",
    title: "Indicators describe the past",
    summary: "Moving averages, RSI, and MACD summarise prices you already have.",
    level: "BEGINNER",
    path: "beginner",
    minutes: 8,
    body: "A moving average smooths recent closes. RSI compares the size of recent rises and falls and places the result between 0 and 100. MACD compares a faster and a slower average, then smooths that difference again.\n\nThese calculations can help you describe a chart. They do not know the next auction. Two students can read the same RSI and make opposite decisions. That is a property of indicators, not a bug in the chart.\n\nIn TradeLab the indicator series are computed from the candles on screen. If the candles are demo or delayed, the indicator is demo or delayed too.",
    questions: [
      { prompt: "An indicator is", options: ["A guarantee", "A summary of past prices", "A broker order type"], correctIndex: 1, explanation: "Indicators describe history." },
      { prompt: "If the candles are delayed, the RSI is", options: ["Real-time", "Based on those delayed candles", "Removed"], correctIndex: 1, explanation: "The indicator cannot be fresher than its input." },
    ],
  },
  {
    slug: "support-and-resistance",
    title: "Support and resistance",
    summary: "These are areas where trading previously clustered, not floors with a contract.",
    level: "INTERMEDIATE",
    path: "intermediate",
    minutes: 8,
    body: "Support is a zone where buyers previously absorbed selling. Resistance is a zone where sellers previously absorbed buying. Prices can cut through either zone. A line on a chart is your note, not an exchange rule.\n\nLook for areas rather than a single magic price. The more often a level is touched, the more obvious it is, and the more crowded the orders around it may be in a real market. This simulator does not show the full order book, so it cannot prove that a level is crowded.\n\nWrite the level in your journal before the trade, including what would show that the idea has failed.",
    questions: [
      { prompt: "Support is", options: ["A guaranteed floor", "An area of prior buying interest", "The brokerage cap"], correctIndex: 1, explanation: "Support can break." },
      { prompt: "This simulator's chart", options: ["Shows the full order book", "Does not prove how many orders sit at a level", "Places real orders at support"], correctIndex: 1, explanation: "There is no live order book behind the drawing." },
    ],
  },
  {
    slug: "trends",
    title: "Trends and ranges",
    summary: "A trend is a sequence. A range is a lack of one.",
    level: "INTERMEDIATE",
    path: "intermediate",
    minutes: 8,
    body: "An uptrend makes higher swing highs and higher swing lows. A downtrend does the opposite. A range chops between areas. Naming the condition does not tell you how long it will last.\n\nMany losing practice trades come from treating a single candle as a new trend. Require the swing structure, then decide whether the virtual risk is small enough. The equity curve in Analytics is the record of those decisions, including charges.\n\nIf the market-data badge says the price is stale, do not invent a trend from a number that has stopped updating.",
    questions: [
      { prompt: "An uptrend is commonly described as", options: ["Higher highs and higher lows", "Any green candle", "Rising volume only"], correctIndex: 0, explanation: "Swing structure is the usual definition." },
      { prompt: "A stale quote", options: ["Should still be used for a market order", "Is a reason not to invent a fresh trend", "Means the company has halted forever"], correctIndex: 1, explanation: "Market orders are rejected when the reference is stale." },
    ],
  },
  {
    slug: "risk-and-reward",
    title: "Risk and reward",
    summary: "Write the loss you accept before you write the profit you hope for.",
    level: "INTERMEDIATE",
    path: "intermediate",
    minutes: 9,
    body: "Risk is the virtual money you can lose if the idea fails. Reward is the virtual money you would gain if the planned exit is reached. A ratio of 2 means the planned gain is twice the planned loss. It is not the probability of either outcome.\n\nA high ratio with a tiny chance of success can still lose. A low ratio can be acceptable only when you have a reason to believe the win happens often enough, and even then the belief can be wrong. Record the ratio in the journal so later review is honest.\n\nAnalytics will flag journal ratios below 1. That flag is a prompt to reread the plan, not a rule that every trade must look the same.",
    questions: [
      { prompt: "A risk/reward ratio measures", options: ["Certainty", "Planned gain versus planned loss", "Win rate after the fact"], correctIndex: 1, explanation: "It is a plan, not a probability." },
      { prompt: "A ratio below 1 means", options: ["The planned gain is smaller than the planned loss", "The trade is illegal", "The indicator has failed"], correctIndex: 0, explanation: "The planned upside does not cover the planned downside." },
    ],
  },
  {
    slug: "position-sizing",
    title: "Position sizing",
    summary: "Size is how much of the virtual account a single idea is allowed to use.",
    level: "INTERMEDIATE",
    path: "intermediate",
    minutes: 8,
    body: "Quantity is not a feeling. If the account has ₹1,00,000 of virtual capital and one idea is allowed to lose 1 percent, the planned loss is ₹1,000. The share quantity has to fit that loss given the distance to the exit, plus charges.\n\nThis terminal can also enforce a maximum order value and a maximum position percentage. Those are administrator settings. They reject an order. They do not make the remaining orders wise.\n\nAvailable cash is not the same as equity. Cash reserved for a resting buy cannot be spent again. The wallet shows the two amounts separately so they are not counted twice.",
    questions: [
      { prompt: "Reserved cash is", options: ["Free to spend on another buy", "Locked for a resting order", "Realised profit"], correctIndex: 1, explanation: "A reserve is unavailable until the order fills, cancels, or is rejected." },
      { prompt: "Position size should start from", options: ["The largest quantity the screen allows", "The loss the plan can accept", "Yesterday's winner"], correctIndex: 1, explanation: "Size follows the planned loss." },
    ],
  },
  {
    slug: "stop-loss-concepts",
    title: "Stop-loss concepts",
    summary: "A stop is a pre-committed exit, with limitations in a simulator.",
    level: "INTERMEDIATE",
    path: "intermediate",
    minutes: 9,
    body: "A stop-loss is a decision made in advance: if price trades to this point, the idea has failed and the position should be reduced or closed. In TradeLab a STOP sell becomes a simulated market sell when the reference last price is at or below the stop, and only when that reference is fresh enough.\n\nA stop-limit arms at the stop and then rests at a limit. It can fail to fill if price jumps through the limit. A target sell is the planned favourable exit. None of these see a real order book, queue position, or auction. Fills use the documented reference price, not a broker.\n\nIf the market is closed and the feed is a live provider, marketable orders wait or reject according to the rules. Demo mode can be configured to keep filling for classroom practice, and the execution is still labelled DEMO.",
    questions: [
      { prompt: "A simulated stop uses", options: ["A brokerage connection", "A reference price and the published rules", "The student's edited balance"], correctIndex: 1, explanation: "Stops are evaluated against stored reference prices." },
      { prompt: "A stop-limit can", options: ["Remain unfilled if price gaps past the limit", "Never miss a fill", "Increase virtual cash by itself"], correctIndex: 0, explanation: "The limit may not trade after the stop triggers." },
    ],
  },
  {
    slug: "diversification",
    title: "Diversification",
    summary: "Owning several names does not help if they all depend on the same risk.",
    level: "ADVANCED",
    path: "advanced",
    minutes: 8,
    body: "Diversification spreads exposure so that one instrument cannot decide the whole virtual account. It fails when the names look different but move together, for example several banks in the same credit cycle.\n\nThe allocation panel is a description of the current book, including cash. Cash is a position too: it reduces exposure. It also earns nothing in this simulator. There is no interest model unless an administrator books an adjustment, and adjustments are excluded from competition performance.\n\nAdding more symbols with no journal plan is not diversification. It is a longer list of unexamined risk.",
    questions: [
      { prompt: "Diversification fails when", options: ["Positions share the same underlying risk", "The account holds any cash", "A chart has volume"], correctIndex: 0, explanation: "Correlated bets are one bet." },
      { prompt: "Cash in the allocation panel", options: ["Is hidden", "Is part of the book", "Is a realized profit"], correctIndex: 1, explanation: "Uninvested cash is still part of equity." },
    ],
  },
  {
    slug: "trading-psychology",
    title: "Trading psychology",
    summary: "The journal exists so a mood is visible after the trade, not only during it.",
    level: "ADVANCED",
    path: "advanced",
    minutes: 8,
    body: "Fear, greed, frustration, and overconfidence change size and timing. The useful question is not whether you felt something. It is whether the feeling changed the plan after entry.\n\nRecord the emotion at the time of the note. Later, compare it with the result. A calm losing trade can still be a good process. A greedy winning trade can still be a bad process. The equity curve alone cannot tell those apart, which is why the journal sits next to it.\n\nNothing in the psychology of markets removes the possibility of loss. The point of practice is to see your own pattern while the money is virtual.",
    questions: [
      { prompt: "A useful journal records", options: ["Only winning trades", "The plan and the emotion", "The indicator as a promise"], correctIndex: 1, explanation: "Process includes both the plan and the state you were in." },
      { prompt: "A winning trade", options: ["Proves the process was sound", "Can still come from a poor process", "Cannot be reviewed"], correctIndex: 1, explanation: "Outcome and process are different." },
    ],
  },
  {
    slug: "common-mistakes",
    title: "Common practice mistakes",
    summary: "The frequent errors are sizing, moving the exit, and trading without a record.",
    level: "ADVANCED",
    path: "advanced",
    minutes: 8,
    body: "Students often increase quantity after a win, skip the exit price, and treat a rejected order as a personal insult rather than a control. Rejections for insufficient cash, stale data, or an oversized position are the simulator doing what it was configured to do.\n\nAnother pattern is averaging down without a new plan. Adding to a losing virtual position changes the average cost and the loss if the idea keeps failing. Write a new thesis or do not add.\n\nTag repeated mistakes in the journal. Analytics counts tags that appear more than once. The count is a mirror, not a ranking of who will be profitable.",
    questions: [
      { prompt: "A rejected order usually means", options: ["The exchange is angry", "A validation rule failed", "The ledger was deleted"], correctIndex: 1, explanation: "Read the rejection reason." },
      { prompt: "Adding to a loser", options: ["Always repairs the average", "Needs a new written plan", "Is blocked for every student"], correctIndex: 1, explanation: "The average changes, and so does the risk." },
    ],
  },
  {
    slug: "investing-versus-trading",
    title: "Investing and short-term trading",
    summary: "The holding period changes the question you are trying to answer.",
    level: "ADVANCED",
    path: "advanced",
    minutes: 9,
    body: "Investing, in the classroom sense, is a claim about a business over a long period: its products, its finances, and the price you pay. Short-term trading is a claim about the path of the price over a short period. Both can lose money. They are not moral opposites.\n\nA five-minute chart is a poor tool for a ten-year claim, and a decade of financial statements is a poor tool for a five-minute claim. Pick the horizon first, then the evidence.\n\nThis practice account can be reset by an administrator. The old period stays in the database. A reset is a new exercise, not an eraser, and competition entries tied to the old period are frozen so the reset cannot manufacture a ranking.",
    questions: [
      { prompt: "Investing and trading differ mainly by", options: ["The question and the horizon", "Whether loss is possible", "The colour of the candle"], correctIndex: 0, explanation: "Both can lose. The horizon and the evidence change." },
      { prompt: "An account reset", options: ["Deletes the ledger", "Opens a new practice period and keeps history", "Improves a competition rank automatically"], correctIndex: 1, explanation: "History remains, and competition entries freeze." },
    ],
  },
];
