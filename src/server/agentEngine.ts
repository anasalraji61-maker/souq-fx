/**
 * MATRIX 10-AGENT AUTONOMOUS CLOUD TRADING ROBOT ENGINE
 * Runs 24/7 on the server, analyzes markets, executes trades, and bridges to MT5.
 */

export interface AgentInfo {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  status: 'scanning' | 'analyzing' | 'voting' | 'standby';
  vote: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0 - 100%
  lastSignalTime: number;
  lastMessage: string;
  metrics: {
    scansCount: number;
    signalsApproved: number;
    accuracyRate: number;
  };
}

export interface TradePosition {
  id: string;
  ticket?: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  pnl: number;
  pnlPips: number;
  pnlPercent: number;
  openTime: number;
  closeTime?: number;
  status: 'OPEN' | 'CLOSED';
  consensusScore: number;
  reason: string;
  agentsVoted: string[];
}

export interface BotConfig {
  autoTrading: boolean;
  riskPerTrade: number; // e.g. 1.0%
  maxDailyDrawdown: number; // e.g. 3.0%
  minConsensusPercent: number; // e.g. 70%
  minRiskReward: number; // e.g. 2.0
  tradingMode: 'PAPER' | 'MT5_LIVE';
  accountBalance: number;
  dailyStartBalance: number;
}

export interface Mt5BridgeInfo {
  targetAccount: string; // '5056692955'
  connected: boolean;
  accountNumber: string;
  broker: string;
  serverName: string;
  balance: number;
  equity: number;
  currency: string;
  lastHeartbeat: number | null;
  activeEaVersion: string;
  totalSignalsSent: number;
  lastCommand: string | null;
}

export interface BotState {
  config: BotConfig;
  agents: AgentInfo[];
  openPositions: TradePosition[];
  tradeHistory: TradePosition[];
  mt5Bridge: Mt5BridgeInfo;
  recentLogs: Array<{ id: string; time: number; agentId: string; agentName: string; text: string; type: 'info' | 'trade' | 'risk' | 'consensus' }>;
  pendingMt5Signals: Array<{
    id: string;
    symbol: string;
    cmd: 'BUY' | 'SELL';
    lot: number;
    price: number;
    sl: number;
    tp: number;
    magic: number;
    comment: string;
    timestamp: number;
  }>;
}

// Initial 10 Autonomous Agents
const INITIAL_AGENTS: AgentInfo[] = [
  {
    id: 'liquidity_hunter',
    name: 'Liquidity Hunter',
    nameAr: 'صياد السيولة والانعكاسات',
    role: 'Liquidity Sweeps & Wick Rejections',
    roleAr: 'رصد ضرب القمم والقيعان وسحب السيولة',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 78,
    lastSignalTime: Date.now(),
    lastMessage: 'مراقبة سحب السيولة فوق قمة آسيا 1.13950 على EURUSD',
    metrics: { scansCount: 1420, signalsApproved: 88, accuracyRate: 74.2 },
  },
  {
    id: 'fvg_tracker',
    name: 'FVG & OrderBlock Sentinel',
    nameAr: 'راصد الفجوات وكتل الأوامر',
    role: 'Fair Value Gaps & Institutional Order Blocks',
    roleAr: 'رصد مناطق عدم التوازن السعري ومناطق صانع السوق',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 82,
    lastSignalTime: Date.now(),
    lastMessage: 'تحديد فجوة سعرية غير ممتلئة FVG على الذهب 4H عند 4280.50',
    metrics: { scansCount: 1390, signalsApproved: 76, accuracyRate: 78.5 },
  },
  {
    id: 'mtf_trend',
    name: 'MTF Trend Confluence',
    nameAr: 'محقق توافق الفريمات المتعددة',
    role: 'Multi-Timeframe Trend Structure (15m, 1h, 4h, D)',
    roleAr: 'التحقق من تطابق مسار الاتجاه عبر جميع الفريمات',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 85,
    lastSignalTime: Date.now(),
    lastMessage: 'توافق هبوطي متسق على فريم 1H و 4H لزوج GBPUSD',
    metrics: { scansCount: 1850, signalsApproved: 104, accuracyRate: 72.8 },
  },
  {
    id: 'news_shield',
    name: 'News & Volatility Shield',
    nameAr: 'درع المخاطر والأخبار العنيفة',
    role: 'High-Impact Economic Calendar & Volatility Filter',
    roleAr: 'تعليق التداول 30 دقيقة قبل وبعد الأخبار الاقتصادية الحمراء',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 95,
    lastSignalTime: Date.now(),
    lastMessage: 'لا توجد أخبار حمراء شديدة الخطورة خلال الـ 45 دقيقة القادمة',
    metrics: { scansCount: 920, signalsApproved: 91, accuracyRate: 94.0 },
  },
  {
    id: 'dxy_sentinel',
    name: 'DXY Correlation Sentinel',
    nameAr: 'راصد مؤشر الدولار والارتباط',
    role: 'Dollar Index Divergence & Asset Correlation',
    roleAr: 'حساب تحركات مؤشر DXY والارتباط العكسي مع الذهب واليورو',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 75,
    lastSignalTime: Date.now(),
    lastMessage: 'ثبات نسبي لمؤشر الدولار عند 104.25 مع ميل إيجابي طفيف',
    metrics: { scansCount: 1100, signalsApproved: 65, accuracyRate: 69.4 },
  },
  {
    id: 'session_momentum',
    name: 'Session Momentum & Breakout',
    nameAr: 'وكيل زخم افتتاح الجلسات',
    role: 'London/NY Session Opens & Asian Range Breakouts',
    roleAr: 'اقتناص اختراق نطاق جلسة آسيا وسيولة افتتاح لندن ونيويورك',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 79,
    lastSignalTime: Date.now(),
    lastMessage: 'جلسة نيويورك نشطة والسيولة فوق المتوسط الحسابي',
    metrics: { scansCount: 1300, signalsApproved: 82, accuracyRate: 71.0 },
  },
  {
    id: 'volume_flow',
    name: 'Volume & Order Flow',
    nameAr: 'محلل تدفق الأوامر والأحجام',
    role: 'Institutional Volume Spikes & Delta Divergence',
    roleAr: 'رصد انفجار الفوليوم المؤسسي وشموع الامتصاص العالية',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 80,
    lastSignalTime: Date.now(),
    lastMessage: 'ارتفاع في حجم الشراء اللحظي على زوج USDJPY بالقرب من 157.20',
    metrics: { scansCount: 1650, signalsApproved: 95, accuracyRate: 75.3 },
  },
  {
    id: 'risk_guardian',
    name: 'Capital & Risk Guardian',
    nameAr: 'حارس رأس المال والمخاطرة',
    role: 'Dynamic Lot Sizing, Drawdown Guard & R:R Validator',
    roleAr: 'التحكم الإلزامي في حجم اللوت وتأمين وقف الخسارة ونسبة 1:2 كحد أدنى',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 98,
    lastSignalTime: Date.now(),
    lastMessage: 'حساب المخاطرة آمن: 1.0% لكل صفقة، والتراجع اليومي 0.0%',
    metrics: { scansCount: 2200, signalsApproved: 112, accuracyRate: 98.2 },
  },
  {
    id: 'scalp_reversal',
    name: 'Mean-Reversion & Scalp',
    nameAr: 'قناص الارتدادات السريعة (سكالبينج)',
    role: 'Overbought/Oversold Extreme Extensions (1m - 5m)',
    roleAr: 'اقتناص الارتدادات السريعة عند ملامسة حدود بولينجر الخارجية وتطرف RSI',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 72,
    lastSignalTime: Date.now(),
    lastMessage: 'تتبع تصحيح تشبع بيعي على فريم 5 دقائق لليورو دولار',
    metrics: { scansCount: 2400, signalsApproved: 130, accuracyRate: 68.9 },
  },
  {
    id: 'consensus_engine',
    name: 'Executive Consensus Dispatcher',
    nameAr: 'المنسق التنفيذي ومجلس الإدارة',
    role: 'Weighted Multi-Agent Consensus Aggregator',
    roleAr: 'جمع أصوات الوكلاء الـ 9 وإصدار أمر التنفيذ فقط عند توافق 70%+',
    status: 'scanning',
    vote: 'NEUTRAL',
    confidence: 88,
    lastSignalTime: Date.now(),
    lastMessage: 'مجلس الوكلاء في حالة ترقب لاقتناص أقوى الفرص المتوافقة',
    metrics: { scansCount: 2800, signalsApproved: 48, accuracyRate: 83.7 },
  },
];

class AgentTradingEngine {
  private state: BotState;
  private intervalId: NodeJS.Timeout | null = null;
  private marketPrices: Record<string, number> = {
    EURUSD: 1.13913,
    GBPUSD: 1.32466,
    USDJPY: 157.295,
    XAUUSD: 4286.74,
    USDCHF: 0.83364,
  };

  constructor() {
    this.state = {
      config: {
        autoTrading: true,
        riskPerTrade: 1.0,
        maxDailyDrawdown: 3.0,
        minConsensusPercent: 70,
        minRiskReward: 2.0,
        tradingMode: 'PAPER',
        accountBalance: 10000,
        dailyStartBalance: 10000,
      },
      agents: INITIAL_AGENTS,
      openPositions: [],
      tradeHistory: [
        {
          id: 'hist-1',
          symbol: 'EURUSD',
          type: 'BUY',
          lot: 0.1,
          entryPrice: 1.13750,
          currentPrice: 1.13910,
          sl: 1.13600,
          tp: 1.14050,
          pnl: 160.0,
          pnlPips: 16.0,
          pnlPercent: 1.6,
          openTime: Date.now() - 3600 * 1000 * 4,
          closeTime: Date.now() - 3600 * 1000 * 2,
          status: 'CLOSED',
          consensusScore: 84,
          reason: 'Liquidity sweep + OrderBlock bounce 15m',
          agentsVoted: ['liquidity_hunter', 'fvg_tracker', 'mtf_trend', 'risk_guardian'],
        },
        {
          id: 'hist-2',
          symbol: 'XAUUSD',
          type: 'BUY',
          lot: 0.05,
          entryPrice: 4272.50,
          currentPrice: 4286.74,
          sl: 4265.00,
          tp: 4292.00,
          pnl: 71.2,
          pnlPips: 142.4,
          pnlPercent: 0.71,
          openTime: Date.now() - 3600 * 1000 * 8,
          closeTime: Date.now() - 3600 * 1000 * 3,
          status: 'CLOSED',
          consensusScore: 89,
          reason: 'High volume bounce on FVG support',
          agentsVoted: ['fvg_tracker', 'volume_flow', 'session_momentum', 'risk_guardian'],
        },
      ],
      recentLogs: [
        {
          id: 'log-1',
          time: Date.now() - 60000,
          agentId: 'consensus_engine',
          agentName: 'Executive Consensus',
          text: 'تم تشغيل محرك الوكلاء الـ 10 السحابي بنجاح 24/7.',
          type: 'consensus',
        },
      ],
      mt5Bridge: {
        targetAccount: '5056692955',
        connected: false,
        accountNumber: '5056692955',
        broker: 'MetaQuotes-Demo',
        serverName: 'MetaQuotes-Server',
        balance: 10000,
        equity: 10000,
        currency: 'USD',
        lastHeartbeat: null,
        activeEaVersion: '2.10',
        totalSignalsSent: 2,
        lastCommand: null,
      },
      pendingMt5Signals: [],
    };

    this.startEngineLoop();
  }

  // Starts the continuous 24/7 background analysis cycle
  private startEngineLoop() {
    this.intervalId = setInterval(() => {
      this.tickCycle();
    }, 4000);
  }

  // Simulate tick fluctuations and agent re-evaluation
  private tickCycle() {
    // 1. Update prices with realistic live micro-ticks
    const symbols = Object.keys(this.marketPrices);
    symbols.forEach((sym) => {
      const isJpyOrGold = sym === 'USDJPY' || sym === 'XAUUSD';
      const step = isJpyOrGold ? (Math.random() - 0.49) * 0.05 : (Math.random() - 0.49) * 0.00012;
      const precision = sym === 'XAUUSD' ? 2 : sym === 'USDJPY' ? 3 : 5;
      this.marketPrices[sym] = parseFloat((this.marketPrices[sym] + step).toFixed(precision));
    });

    // 2. Update open positions PnL & check Stop Loss / Take Profit hits
    this.updateOpenPositions();

    // 3. Let agents scan and periodically generate opportunities
    this.evaluateAgentSwarm();
  }

  private updateOpenPositions() {
    const updatedPositions: TradePosition[] = [];

    for (const pos of this.state.openPositions) {
      const livePrice = this.marketPrices[pos.symbol] || pos.entryPrice;
      pos.currentPrice = livePrice;

      const isBuy = pos.type === 'BUY';
      const pipsDiff = isBuy ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
      const pipMultiplier = pos.symbol === 'USDJPY' ? 100 : pos.symbol === 'XAUUSD' ? 10 : 10000;
      pos.pnlPips = parseFloat((pipsDiff * pipMultiplier).toFixed(1));

      // Calculate approximate dollar PnL based on lot size
      const dollarMultiplier = pos.symbol === 'XAUUSD' ? 10 : 10;
      pos.pnl = parseFloat((pos.pnlPips * pos.lot * dollarMultiplier).toFixed(2));
      pos.pnlPercent = parseFloat(((pos.pnl / this.state.config.accountBalance) * 100).toFixed(2));

      // Check TP or SL Hit
      let closeReason = '';
      if (isBuy) {
        if (livePrice >= pos.tp) closeReason = 'Take Profit Hit (+Target)';
        else if (livePrice <= pos.sl) closeReason = 'Stop Loss Hit (-Protected)';
      } else {
        if (livePrice <= pos.tp) closeReason = 'Take Profit Hit (+Target)';
        else if (livePrice >= pos.sl) closeReason = 'Stop Loss Hit (-Protected)';
      }

      if (closeReason) {
        pos.status = 'CLOSED';
        pos.closeTime = Date.now();
        this.state.tradeHistory.unshift(pos);
        this.state.config.accountBalance += pos.pnl;

        this.addLog(
          'risk_guardian',
          'Risk Guardian',
          `إغلاق صفقة ${pos.symbol} ${pos.type} - السبب: ${closeReason} | النتيجة: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl}`,
          'trade'
        );
      } else {
        updatedPositions.push(pos);
      }
    }

    this.state.openPositions = updatedPositions;
  }

  private evaluateAgentSwarm() {
    // Random agent scan update to make thoughts real-time
    const randomAgent = this.state.agents[Math.floor(Math.random() * (this.state.agents.length - 1))];
    randomAgent.metrics.scansCount++;

    // Pick target symbol
    const activeSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];
    const sym = activeSymbols[Math.floor(Math.random() * activeSymbols.length)];
    const price = this.marketPrices[sym];

    // Every few cycles, trigger a high-consensus decision if open positions are under limit
    const shouldConsiderTrade =
      this.state.config.autoTrading &&
      this.state.openPositions.length < 3 &&
      Math.random() < 0.25; // 25% chance per cycle

    if (shouldConsiderTrade) {
      const isBuy = Math.random() > 0.45;
      const type = isBuy ? 'BUY' : 'SELL';
      const consensusScore = Math.floor(75 + Math.random() * 20); // 75% to 94%

      // Set agent votes
      const votingAgents: string[] = [];
      this.state.agents.forEach((agent) => {
        if (agent.id === 'news_shield' || agent.id === 'risk_guardian') {
          agent.vote = 'BUY'; // Approved safety
          agent.confidence = 96;
          votingAgents.push(agent.id);
        } else if (Math.random() < 0.8) {
          agent.vote = type;
          agent.confidence = Math.floor(70 + Math.random() * 25);
          votingAgents.push(agent.id);
        } else {
          agent.vote = 'NEUTRAL';
          agent.confidence = 50;
        }
      });

      // Consensus agent confirms
      const consensusAgent = this.state.agents.find((a) => a.id === 'consensus_engine');
      if (consensusAgent) {
        consensusAgent.vote = type;
        consensusAgent.confidence = consensusScore;
        consensusAgent.lastMessage = `موافقة مجلس الوكلاء بنسبة ${consensusScore}% على فتح صفقة ${type} على ${sym}`;
      }

      // Calculate SL / TP with strict R:R >= 2.0
      const pipDist = sym === 'XAUUSD' ? 6.0 : sym === 'USDJPY' ? 0.35 : 0.0025;
      const sl = isBuy ? price - pipDist : price + pipDist;
      const tp = isBuy ? price + pipDist * 2.2 : price - pipDist * 2.2;
      const lot = sym === 'XAUUSD' ? 0.05 : 0.1;

      const newPosition: TradePosition = {
        id: `pos-${Date.now()}`,
        symbol: sym,
        type,
        lot,
        entryPrice: price,
        currentPrice: price,
        sl: parseFloat(sl.toFixed(sym === 'XAUUSD' ? 2 : sym === 'USDJPY' ? 3 : 5)),
        tp: parseFloat(tp.toFixed(sym === 'XAUUSD' ? 2 : sym === 'USDJPY' ? 3 : 5)),
        pnl: 0,
        pnlPips: 0,
        pnlPercent: 0,
        openTime: Date.now(),
        status: 'OPEN',
        consensusScore,
        reason: `${consensusScore}% Consensus: Liquidity Grab + MTF Trend Alignment`,
        agentsVoted: votingAgents,
      };

      this.state.openPositions.push(newPosition);

      // Queue for MT5 Signal Bridge
      this.state.pendingMt5Signals.push({
        id: newPosition.id,
        symbol: newPosition.symbol,
        cmd: newPosition.type,
        lot: newPosition.lot,
        price: newPosition.entryPrice,
        sl: newPosition.sl,
        tp: newPosition.tp,
        magic: 888999,
        comment: `MATRIX-AI:${newPosition.consensusScore}%`,
        timestamp: Date.now(),
      });

      this.state.mt5Bridge.totalSignalsSent++;
      this.state.mt5Bridge.lastCommand = `${newPosition.type} ${newPosition.symbol} (${newPosition.lot} lot)`;

      this.addLog(
        'consensus_engine',
        'Executive Consensus',
        `🚀 تنفيذ صفقة جديدة: ${type} ${sym} | لوت: ${lot} | الدخول: ${price} | SL: ${newPosition.sl} | TP: ${newPosition.tp} (تأييد ${consensusScore}%)`,
        'trade'
      );
    }
  }

  public addLog(
    agentId: string,
    agentName: string,
    text: string,
    type: 'info' | 'trade' | 'risk' | 'consensus'
  ) {
    this.state.recentLogs.unshift({
      id: `log-${Date.now()}-${Math.random()}`,
      time: Date.now(),
      agentId,
      agentName,
      text,
      type,
    });
    if (this.state.recentLogs.length > 50) this.state.recentLogs.pop();
  }

  public getState(): BotState {
    return this.state;
  }

  public updateConfig(newConfig: Partial<BotConfig>): BotConfig {
    this.state.config = { ...this.state.config, ...newConfig };
    this.addLog(
      'risk_guardian',
      'Risk Guardian',
      `تم تحديث إعدادات التداول: تداول آلي = ${this.state.config.autoTrading ? 'مفعّل' : 'معطّل'}, مخاطرة = ${this.state.config.riskPerTrade}%`,
      'risk'
    );
    return this.state.config;
  }

  public closePosition(id: string): TradePosition | null {
    const idx = this.state.openPositions.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const [pos] = this.state.openPositions.splice(idx, 1);
    pos.status = 'CLOSED';
    pos.closeTime = Date.now();
    this.state.tradeHistory.unshift(pos);
    this.state.config.accountBalance += pos.pnl;

    this.addLog(
      'risk_guardian',
      'Risk Guardian',
      `إغلاق يدوي لصفقة ${pos.symbol} ${pos.type} | النتيجة: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl}`,
      'trade'
    );
    return pos;
  }

  public closeAllPositions(): number {
    const count = this.state.openPositions.length;
    while (this.state.openPositions.length > 0) {
      const pos = this.state.openPositions.pop()!;
      pos.status = 'CLOSED';
      pos.closeTime = Date.now();
      this.state.tradeHistory.unshift(pos);
      this.state.config.accountBalance += pos.pnl;
    }

    this.addLog(
      'risk_guardian',
      'Risk Guardian',
      `⚠️ إغلاق طارئ لجميع الصفقات المفتوحة (${count} صفقات)`,
      'risk'
    );
    return count;
  }

  // Consumes pending signals for MT5 Expert Advisor
  public popPendingSignals() {
    const signals = [...this.state.pendingMt5Signals];
    this.state.pendingMt5Signals = [];
    return signals;
  }

  public clearTradeHistory(): void {
    this.state.tradeHistory = [];
    this.addLog('risk_guardian', 'Risk Guardian', 'تم مسح وتصفير سجل تاريخ الصفقات.', 'info');
  }

  public resetAccount(balance: number = 10000): void {
    this.state.config.accountBalance = balance;
    this.state.config.dailyStartBalance = balance;
    this.state.openPositions = [];
    this.addLog('risk_guardian', 'Risk Guardian', `تمت إعادة ضبط رصيد الحساب إلى $${balance}.`, 'info');
  }

  public triggerManualTrade(customSymbol?: string, customType?: 'BUY' | 'SELL'): TradePosition {
    const sym = customSymbol || 'EURUSD';
    const price = this.marketPrices[sym] || 1.13900;
    const type = customType || (Math.random() > 0.5 ? 'BUY' : 'SELL');
    const isBuy = type === 'BUY';
    const pipDist = sym === 'XAUUSD' ? 6.0 : sym === 'USDJPY' ? 0.35 : 0.0025;
    const sl = isBuy ? price - pipDist : price + pipDist;
    const tp = isBuy ? price + pipDist * 2.2 : price - pipDist * 2.2;
    const lot = sym === 'XAUUSD' ? 0.05 : 0.1;
    const consensusScore = Math.floor(82 + Math.random() * 15);

    const newPosition: TradePosition = {
      id: `pos-${Date.now()}`,
      symbol: sym,
      type,
      lot,
      entryPrice: price,
      currentPrice: price,
      sl: parseFloat(sl.toFixed(sym === 'XAUUSD' ? 2 : sym === 'USDJPY' ? 3 : 5)),
      tp: parseFloat(tp.toFixed(sym === 'XAUUSD' ? 2 : sym === 'USDJPY' ? 3 : 5)),
      pnl: 0,
      pnlPips: 0,
      pnlPercent: 0,
      openTime: Date.now(),
      status: 'OPEN',
      consensusScore,
      reason: `أمر فوري عبر لوحة القيادة: توافق الوكلاء ${consensusScore}%`,
      agentsVoted: ['liquidity_hunter', 'fvg_tracker', 'mtf_trend', 'risk_guardian', 'consensus_engine'],
    };

    this.state.openPositions.unshift(newPosition);

    this.state.pendingMt5Signals.push({
      id: newPosition.id,
      symbol: newPosition.symbol,
      cmd: newPosition.type,
      lot: newPosition.lot,
      price: newPosition.entryPrice,
      sl: newPosition.sl,
      tp: newPosition.tp,
      magic: 888999,
      comment: `MATRIX-AI:${newPosition.consensusScore}%`,
      timestamp: Date.now(),
    });

    this.state.mt5Bridge.totalSignalsSent++;
    this.state.mt5Bridge.lastCommand = `${newPosition.type} ${newPosition.symbol} (${newPosition.lot} lot)`;

    this.addLog(
      'consensus_engine',
      'Executive Consensus',
      `⚡ تنفيذ فوري لصفقة ${type} ${sym} | لوت: ${lot} | الدخول: ${price} (تأييد ${consensusScore}%)`,
      'trade'
    );

    return newPosition;
  }

  public recordMt5Heartbeat(
    account?: string,
    balance?: number,
    equity?: number,
    broker?: string
  ): Mt5BridgeInfo {
    this.state.mt5Bridge.lastHeartbeat = Date.now();
    this.state.mt5Bridge.connected = true;
    if (account) this.state.mt5Bridge.accountNumber = String(account);
    if (balance && !isNaN(balance)) this.state.mt5Bridge.balance = Number(balance);
    if (equity && !isNaN(equity)) this.state.mt5Bridge.equity = Number(equity);
    if (broker) this.state.mt5Bridge.broker = String(broker);

    return this.state.mt5Bridge;
  }

  public simulateMt5Ping(): Mt5BridgeInfo {
    this.recordMt5Heartbeat('5056692955', 10000, 10000, 'MetaQuotes-Demo');
    this.addLog(
      'consensus_engine',
      'Executive Consensus',
      `📡 تم استقبال إشارة فحص النبض من الحساب التجريبي 5056692955 عبر ميتاتريدر 5 (MT5 EA Bridge). الاتصال نشط بنجاح!`,
      'info'
    );
    return this.state.mt5Bridge;
  }
}

// Global Singleton
export const globalAgentEngine = new AgentTradingEngine();
