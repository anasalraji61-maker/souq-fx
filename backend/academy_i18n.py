"""Translations of the academy curriculum (academy_data.ACADEMY_SCHOOLS): English and Kurdish (Sorani).

`localize_school(school, lang)` returns a translated copy; any missing field keeps the Arabic original.
Keys: "school:<id>" → {"name", "summary", "teacher"}, "level:<school>:<n>" → title,
"lec:<lecture id>" → {"title", "outline", "seg": {<seg id>: (title, narration)}}.
"""
from __future__ import annotations

import copy
from typing import Any

EN: dict[str, Any] = {
    # ---------------------------------------------------------------- basics
    "school:basics": {"name": "Trading Basics", "summary": "Start here if you are completely new to trading: the pip, the lot, leverage and margin, and how to manage risk before your first real trade.", "teacher": "Voice lesson"},
    "level:basics:1": "Core concepts",
    "lec:basics-l1-01": {
        "title": "What is a pip?",
        "outline": ["Definition of a pip", "Pip value by pair", "Why we measure moves in pips"],
        "seg": {
            "s1": ("Definition", "A pip is the smallest standard unit of change in a currency pair's price, usually the fourth decimal place."),
            "s2": ("Value", "A pip's value depends on the trade size (the lot) and the pair traded, and most platforms calculate it automatically."),
            "s3": ("Why it matters", "Every technical analysis and every profit target turns into a number of pips in practice — understanding pips is the basis of understanding any trade."),
        },
    },
    "lec:basics-l1-02": {
        "title": "Lots and position size",
        "outline": ["Standard / mini / micro lots", "How lot size relates to risk", "Choosing a size that fits your capital"],
        "seg": {
            "s1": ("Lot types", "A standard lot = 100,000 units, a mini lot = 10,000 and a micro lot = 1,000 units of the base currency."),
            "s2": ("The effect", "Lot size sets the dollar value of each pip — a bigger lot means faster profit or loss for the same number of pips."),
            "s3": ("Choosing", "Pick the lot size from your capital and the risk you accept, not from the wish for a quick profit."),
        },
    },
    "lec:basics-l1-03": {
        "title": "Leverage and margin",
        "outline": ["What leverage is", "Required margin", "The danger of high leverage"],
        "seg": {
            "s1": ("Leverage", "Leverage lets you open a position larger than your actual capital; 1:100 leverage, for example, controls a hundred times your deposit."),
            "s2": ("Margin", "Margin is the amount the broker holds as collateral to open the position, and it shrinks as leverage grows."),
            "s3": ("The danger", "Leverage magnifies profits and losses alike — high leverage without clear risk management can wipe out an account quickly."),
        },
    },
    "lec:basics-l1-04": {
        "title": "Risk management: how much to risk per trade?",
        "outline": ["The 1–2% rule per trade", "Always use a stop loss", "Risk-to-reward ratio"],
        "seg": {
            "s1": ("The rule", "Most disciplined traders risk no more than 1–2% of their capital on a single trade."),
            "s2": ("Stop loss", "A stop loss is a basic protection tool that sets the maximum acceptable loss before the trade is opened, not after."),
            "s3": ("Risk/reward", "A trade with a risk-to-reward of 1:2 or better means the target covers at least two possible losses."),
        },
    },
    "lec:basics-l1-05": {
        "title": "Demo or real account? Where to start",
        "outline": ["Why a demo account helps", "When to move to a real account", "Realistic expectations at the start"],
        "seg": {
            "s1": ("Demo", "A demo account lets you practise everything above with virtual money and no real risk."),
            "s2": ("Moving on", "Move to a real account only after steady results you understand on the demo account over a long enough period."),
            "s3": ("Being realistic", "Trading is a skill built with time and discipline, not a quick road to profit — realistic expectations protect you from reckless decisions."),
        },
    },
    # ---------------------------------------------------------------- classic
    "school:classic": {"name": "Classical TA", "summary": "Trend, support and resistance, candlesticks and classic indicators — the foundation for every trader.", "teacher": "Voice lesson"},
    "level:classic:1": "Foundations",
    "level:classic:2": "Indicators and tools",
    "level:classic:3": "Professional application",
    "lec:classic-l1-01": {
        "title": "What is the market and how does price move?",
        "outline": ["Types of markets", "Supply and demand, simply", "Japanese candlesticks"],
        "seg": {
            "s1": ("Opening", "Welcome. Today we start from zero: what are we looking at on the big screen? This is a forex chart."),
            "s2": ("Supply and demand", "Price rises when demand exceeds supply, and falls when supply exceeds demand."),
            "s3": ("Reading a candle", "Each candle sums up the battle between buyers and sellers over a set period of time."),
        },
    },
    "lec:classic-l1-02": {
        "title": "Trend and trendlines",
        "outline": ["Up / down / sideways", "Highs and lows", "Drawing a trendline"],
        "seg": {
            "s1": ("What a trend is", "An uptrend is a series of higher lows and higher highs."),
            "s2": ("The trendline", "Draw the trendline by joining clear lows, without forcing it to fit perfectly."),
            "s3": ("The break", "A clear close through the trendline is an early sign that intent is changing."),
        },
    },
    "lec:classic-l1-03": {
        "title": "Support and resistance",
        "outline": ["Zones, not lines", "The retest", "Strength and weakness"],
        "seg": {
            "s1": ("The idea", "Support is a zone price bounces up from; resistance is the opposite."),
            "s2": ("Role reversal", "Broken resistance can turn into support after a retest."),
        },
    },
    "lec:classic-l2-01": {
        "title": "Moving averages (EMA)",
        "outline": ["9 / 21 / 50 / 200", "Crossovers", "Dynamic support"],
        "seg": {
            "s1": ("EMA", "The exponential moving average reacts faster to recent prices."),
            "s2": ("Crossovers", "A moving-average crossover is a confirmation tool, not a signal on its own."),
        },
    },
    "lec:classic-l2-02": {
        "title": "RSI and MACD",
        "outline": ["Overbought / oversold", "Divergence", "Momentum"],
        "seg": {
            "s1": ("RSI", "Use it to measure momentum, not to time entries blindly."),
            "s2": ("MACD", "It shows changes in momentum through averages and oscillation."),
        },
    },
    "lec:classic-l2-03": {
        "title": "Classic chart patterns",
        "outline": ["Head and shoulders", "Triangles", "Flags"],
        "seg": {"s1": ("Patterns", "Classic patterns summarise behaviour that repeats after a strong move.")},
    },
    "lec:classic-l3-01": {
        "title": "A complete classical trading plan",
        "outline": ["Choosing the pair", "Confirmation", "Risk management"],
        "seg": {"s1": ("The plan", "We combine trend + zone + confirmation + risk into one decision.")},
    },
    "lec:classic-l3-02": {
        "title": "Beginner mistakes in classical analysis",
        "outline": ["Too many signals", "Chasing price", "Ignoring context"],
        "seg": {"s1": ("Mistakes", "Most losses come from piling up signals without a context filter.")},
    },
    # ---------------------------------------------------------------- wyckoff
    "school:wyckoff": {"name": "Wyckoff Method", "summary": "Accumulation and distribution, effort and result, and reading institutional intent through the phases.", "teacher": "Voice lesson"},
    "level:wyckoff:1": "Wyckoff basics",
    "level:wyckoff:2": "Distribution and tests",
    "level:wyckoff:3": "Reading volume and context",
    "level:wyckoff:4": "Live scenarios",
    "lec:wy-l1-01": {
        "title": "Wyckoff's philosophy of supply and demand",
        "outline": ["Effort and result", "Cause and effect"],
        "seg": {"s1": ("Effort", "High volume with a small range often means absorption.")},
    },
    "lec:wy-l1-02": {
        "title": "The accumulation schematic",
        "outline": ["PS", "SC", "AR", "ST", "Spring"],
        "seg": {"s1": ("Accumulation", "Institutions quietly build a position before the advance.")},
    },
    "lec:wy-l2-01": {
        "title": "The distribution schematic",
        "outline": ["PSY", "BC", "UTAD"],
        "seg": {"s1": ("Distribution", "Distribution is the reverse of accumulation: organised selling at the highs.")},
    },
    "lec:wy-l2-02": {
        "title": "Spring and UTAD in practice on forex",
        "outline": ["Liquidity traps", "Confirmation"],
        "seg": {"s1": ("Spring", "A false break below support followed by a close back inside is a sign of strength.")},
    },
    "lec:wy-l3-01": {
        "title": "Effort versus result on the chart",
        "outline": ["Volume", "Range", "Follow-through"],
        "seg": {"s1": ("Analysis", "We compare a candle's volume with its range to see who is in control.")},
    },
    "lec:wy-l4-01": {
        "title": "Accumulation on gold and the DXY",
        "outline": ["Multiple timeframes", "Timing"],
        "seg": {"s1": ("Application", "We link the Wyckoff phase to the dollar's direction before entering.")},
    },
    # ---------------------------------------------------------------- ict / smc
    "school:ict-smc": {"name": "ICT / SMC (Smart Money)", "summary": "Institutional liquidity, Order Blocks and Fair Value Gaps, including BOS and CHOCH as part of market structure alongside OB/FVG — not a separate school.", "teacher": "Voice lesson"},
    "level:ict-smc:1": "The language of liquidity",
    "level:ict-smc:2": "Order Blocks and Fair Value Gaps",
    "level:ict-smc:3": "Advanced liquidity models",
    "level:ict-smc:4": "Building a daily scenario",
    "level:ict-smc:5": "Mastery and review",
    "lec:smc-l1-01": {
        "title": "What is liquidity and why is it hunted?",
        "outline": ["Stops", "Equal highs / lows", "Inducement"],
        "seg": {"s1": ("Liquidity", "Liquidity gathers above highs and below lows, where stop orders sit.")},
    },
    "lec:smc-l1-02": {
        "title": "Sessions and killzones",
        "outline": ["London", "New York", "The overlap"],
        "seg": {"s1": ("Timing", "Most institutional moves appear in specific time windows.")},
    },
    "lec:smc-l2-01": {
        "title": "Order Blocks: definition and types",
        "outline": ["Bullish / bearish OB", "Refinement", "Entry"],
        "seg": {
            "s1": ("Definition", "An Order Block is the last opposite candle before a strong impulsive move."),
            "s2": ("Use", "We enter on the return to the zone with a confirmed rejection."),
        },
    },
    "lec:smc-l2-02": {
        "title": "Fair Value Gaps (FVG)",
        "outline": ["The price gap", "Partial fill", "Filtering"],
        "seg": {"s1": ("FVG", "A gap appears when price moves fast and leaves an imbalance behind.")},
    },
    "lec:smc-l2-03": {
        "title": "BOS and CHOCH within the OB / FVG framework",
        "outline": ["BOS = structure continues", "CHOCH = intent changes", "Linking the break with an Order Block and FVG"],
        "seg": {
            "s1": ("An important classification", "BOS and CHOCH are not a separate school. They are market-structure tools within the Order Block and Fair Value Gap family in ICT/SMC."),
            "s2": ("BOS", "A Break of Structure breaks a high or low in the direction of the current trend — afterwards we usually target an FVG or OB on the continuation side."),
            "s3": ("CHOCH", "A Change of Character is the first break against the previous trend. After it we look for a new Order Block in the opposite direction."),
            "s4": ("Putting it together", "The professional scenario: liquidity sweep → CHOCH/BOS → return to an OB or FVG → entry with risk management."),
        },
    },
    "lec:smc-l3-01": {
        "title": "Inducement and liquidity sweeps",
        "outline": ["The trap", "Confirmation", "The late entry"],
        "seg": {"s1": ("Inducement", "The market lures traders with a fake break before the real move.")},
    },
    "lec:smc-l3-02": {
        "title": "Premium and discount",
        "outline": ["Range equilibrium", "The better entry point"],
        "seg": {"s1": ("Pricing", "We buy at a discount and sell at a premium within the range.")},
    },
    "lec:smc-l4-01": {
        "title": "From the DXY to the pair",
        "outline": ["Dollar correlation", "Choosing direction", "Execution"],
        "seg": {"s1": ("The scenario", "We start from the DXY, then choose the pair that agrees with the liquidity.")},
    },
    "lec:smc-l5-01": {
        "title": "An SMC trading journal and win rates",
        "outline": ["Recording the scenario", "Weekly review"],
        "seg": {"s1": ("Discipline", "Without a journal you will never know which model works for your account.")},
    },
    # ---------------------------------------------------------------- gann
    "school:gann": {"name": "Gann Angles & Square", "summary": "Time and price angles, the Square of Nine, and the geometric relationships of price movement.", "teacher": "Voice lesson"},
    "level:gann:1": "Introduction to Gann",
    "level:gann:2": "Square of Nine and angles",
    "level:gann:3": "Applying it to forex",
    "level:gann:4": "Advanced cases",
    "lec:gann-l1-01": {
        "title": "The philosophy of time and price",
        "outline": ["Balance", "Cycles"],
        "seg": {"s1": ("The idea", "Gann held that time and price move in geometric relationships.")},
    },
    "lec:gann-l2-01": {
        "title": "Square of Nine",
        "outline": ["Construction", "Levels"],
        "seg": {"s1": ("The square", "We use the Square of Nine to derive possible reaction levels.")},
    },
    "lec:gann-l2-02": {
        "title": "Gann Fan angles",
        "outline": ["1x1", "2x1", "Dynamics"],
        "seg": {"s1": ("The fan", "The 1x1 angle represents the balance of time and price.")},
    },
    "lec:gann-l3-01": {
        "title": "Combining Gann with support and resistance",
        "outline": ["Filtering", "Confirmation"],
        "seg": {"s1": ("Combining", "We never trade the angle alone; we confirm it with price behaviour.")},
    },
    "lec:gann-l4-01": {
        "title": "Time cycles for the major pairs",
        "outline": ["EURUSD", "XAUUSD"],
        "seg": {"s1": ("Cycles", "We watch highs and lows repeat across time windows.")},
    },
    # ---------------------------------------------------------------- elliott
    "school:elliott": {"name": "Elliott Wave", "summary": "Impulse and corrective waves, the rules, and Fibonacci within the wave count.", "teacher": "Voice lesson"},
    "level:elliott:1": "Counting basics",
    "level:elliott:2": "Fibonacci and waves",
    "level:elliott:3": "Practical counting",
    "level:elliott:4": "Agreement with liquidity",
    "level:elliott:5": "Execution plan",
    "lec:ew-l1-01": {
        "title": "The 5-wave impulse",
        "outline": ["The three rules", "Extensions"],
        "seg": {"s1": ("Impulse", "Five waves with strict rules that must never be broken.")},
    },
    "lec:ew-l1-02": {
        "title": "ABC corrections",
        "outline": ["Zigzag", "Flat", "Triangle"],
        "seg": {"s1": ("Correction", "Every impulse is followed by a correction that restores balance.")},
    },
    "lec:ew-l2-01": {
        "title": "Wave 3 and wave 5 ratios",
        "outline": ["1.618", "Extension"],
        "seg": {"s1": ("Ratios", "Wave three is often the strongest and relates to Fibonacci extensions.")},
    },
    "lec:ew-l3-01": {
        "title": "How to start a count without bias",
        "outline": ["Alternative counts", "Invalidation"],
        "seg": {"s1": ("Alternatives", "We keep two scenarios and invalidate one when a rule is broken.")},
    },
    "lec:ew-l4-01": {
        "title": "Elliott + SMC",
        "outline": ["End of the wave", "Liquidity"],
        "seg": {"s1": ("Agreement", "The end of a wave often coincides with a liquidity sweep.")},
    },
    "lec:ew-l5-01": {
        "title": "From the count to the trading order",
        "outline": ["Entry", "Stop", "Target"],
        "seg": {"s1": ("Execution", "A count without risk management is just a drawing.")},
    },
    # ---------------------------------------------------------------- sk
    "school:sk": {"name": "SK System", "summary": "The practical SK approach: supply and demand zones, session timing, and managing the trade the hands-on way.", "teacher": "Voice lesson"},
    "level:sk:1": "Introduction to SK",
    "level:sk:2": "Supply and demand zones",
    "level:sk:3": "Managing the trade",
    "level:sk:4": "Daily routine",
    "lec:sk-l1-01": {
        "title": "The approach and why it is different",
        "outline": ["Simplicity", "Execution"],
        "seg": {"s1": ("The approach", "We focus on clear zones and one decision per session.")},
    },
    "lec:sk-l2-01": {
        "title": "Drawing the right zones",
        "outline": ["The base", "The departure", "Filtering"],
        "seg": {"s1": ("The zone", "A strong zone comes right before a clear impulse that leaves an imbalance.")},
    },
    "lec:sk-l2-02": {
        "title": "Enter on the first touch or wait?",
        "outline": ["Probability", "Confirmation"],
        "seg": {"s1": ("Timing", "The first touch has higher probability and higher risk.")},
    },
    "lec:sk-l3-01": {
        "title": "Partial stops and scaling out",
        "outline": ["Break-even", "Multiple targets"],
        "seg": {"s1": ("Management", "We protect capital first, then leave a part to run.")},
    },
    "lec:sk-l4-01": {
        "title": "A London / New York session with SK",
        "outline": ["Preparation", "Execution", "Review"],
        "seg": {"s1": ("The routine", "The same steps every day reduce randomness.")},
    },
}

KU: dict[str, Any] = {
    # ---------------------------------------------------------------- basics
    "school:basics": {"name": "بنەماکانی بازرگانی بۆ دەستپێکەران", "summary": "ئەگەر بە تەواوی تازەیت لە بازرگانیدا لێرەوە دەست پێبکە: خاڵ (Pip)، لۆت، لیڤەرێج و مارجن، و چۆن مەترسییەکانت بەڕێوە دەبەیت پێش یەکەم مامەڵەی ڕاستەقینە.", "teacher": "وانەی دەنگی"},
    "level:basics:1": "چەمکە بنەڕەتییەکان",
    "lec:basics-l1-01": {
        "title": "Pip (خاڵ) چییە؟",
        "outline": ["پێناسەی خاڵ", "بەهای خاڵ بەپێی جووتەکە", "بۆچی جووڵە بە خاڵ دەپێوین"],
        "seg": {
            "s1": ("پێناسە", "خاڵ (Pip) بچووکترین یەکەی ستانداردی گۆڕانە لە نرخی جووتە دراوێکدا، زۆرجار خانەی دەیی چوارەمە."),
            "s2": ("بەها", "بەهای خاڵ بەپێی قەبارەی مامەڵە (لۆت) و جووتە دراوەکە دەگۆڕێت، و زۆربەی پلاتفۆرمەکان خۆکارانە دەیژمێرن."),
            "s3": ("گرنگی", "هەموو شیکارییەکی تەکنیکی یان ئامانجێکی قازانج لە کرداردا دەبێتە ژمارەیەک خاڵ — تێگەیشتن لێی بنەمای تێگەیشتنە لە هەر مامەڵەیەک."),
        },
    },
    "lec:basics-l1-02": {
        "title": "لۆت و قەبارەی مامەڵە",
        "outline": ["لۆتی ستاندارد / مینی / مایکرۆ", "پەیوەندی نێوان قەبارەی لۆت و مەترسی", "هەڵبژاردنی قەبارەیەکی گونجاو بۆ سەرمایە"],
        "seg": {
            "s1": ("جۆرەکانی لۆت", "لۆتی ستاندارد = 100,000 یەکە، مینی = 10,000، و مایکرۆ = 1,000 یەکە لە دراوی بنەڕەتی."),
            "s2": ("کاریگەری", "قەبارەی لۆت بەهای هەر خاڵێک بە دۆلار دیاری دەکات — لۆتی گەورەتر واتە قازانج یان زیانی خێراتر بە هەمان ژمارەی خاڵ."),
            "s3": ("هەڵبژاردن", "قەبارەی لۆت بەپێی سەرمایە و ڕێژەی مەترسی پەسەندکراو هەڵدەبژێردرێت، نەک بەپێی ئارەزووی قازانجی خێرا."),
        },
    },
    "lec:basics-l1-03": {
        "title": "لیڤەرێج و مارجن",
        "outline": ["پێناسەی لیڤەرێج", "مارجنی پێویست", "مەترسی لیڤەرێجی بەرز"],
        "seg": {
            "s1": ("لیڤەرێج", "لیڤەرێج ڕێگە دەدات مامەڵەیەک بکەیتەوە گەورەتر لە سەرمایەی ڕاستەقینەت؛ بۆ نموونە لیڤەرێجی 1:100 واتە کۆنترۆڵکردنی سەد هێندەی پارەی دانراو."),
            "s2": ("مارجن", "مارجن ئەو بڕە پارەیەیە کە بڕۆکەر وەک گرەنتی بۆ کردنەوەی مامەڵەکە دەیگرێت، و بە زیادبوونی لیڤەرێج کەم دەبێتەوە."),
            "s3": ("مەترسی", "لیڤەرێج قازانج و زیان پێکەوە گەورە دەکات — لیڤەرێجی بەرز بێ بەڕێوەبردنی ڕوونی مەترسی دەتوانێت بە خێرایی هەژمارەکە بەتاڵ بکات."),
        },
    },
    "lec:basics-l1-04": {
        "title": "بەڕێوەبردنی مەترسی: لە هەر مامەڵەیەکدا چەند مەترسی بکەیت؟",
        "outline": ["یاسای 1-2% بۆ هەر مامەڵەیەک", "هەمیشە وەستاندنی زیان", "ڕێژەی مەترسی بۆ قازانج"],
        "seg": {
            "s1": ("یاساکە", "زۆربەی بازرگانە ڕێکخراوەکان لە یەک مامەڵەدا زیاتر لە 1-2% ی سەرمایەکەیان ناخەنە مەترسییەوە."),
            "s2": ("وەستاندنی زیان", "وەستاندنی زیان ئامرازێکی بنەڕەتی پاراستنە کە پێشتر زۆرترین زیانی پەسەندکراو دیاری دەکات، پێش کردنەوەی مامەڵەکە نەک دوای."),
            "s3": ("مەترسی/قازانج", "مامەڵەیەک بە ڕێژەی مەترسی بۆ قازانجی 1:2 یان باشتر واتە ئامانجەکە لانیکەم دوو زیانی ئەگەری قەرەبوو دەکاتەوە."),
        },
    },
    "lec:basics-l1-05": {
        "title": "هەژماری تاقیکاری یان ڕاستەقینە؟ لە کوێوە دەست پێبکەیت",
        "outline": ["سوودی هەژماری تاقیکاری (Demo)", "کەی بگوازیتەوە بۆ هەژماری ڕاستەقینە", "چاوەڕوانی واقیعی بۆ دەستپێک"],
        "seg": {
            "s1": ("تاقیکاری", "هەژماری تاقیکاری (Demo) ڕێگە دەدات هەموو ئەوانەی سەرەوە بە پارەی گریمانەیی و بێ هیچ مەترسییەکی ڕاستەقینە تاقی بکەیتەوە."),
            "s2": ("گواستنەوە", "باشترە تەنها دوای ئەنجامی جێگیر و تێگەیشتراو لەسەر هەژماری تاقیکاری بۆ ماوەیەکی پێویست بگوازیتەوە بۆ هەژماری ڕاستەقینە."),
            "s3": ("واقیعبینی", "بازرگانی لێهاتووییەکە بە کات و ڕێکوپێکی دروست دەبێت، نەک ڕێگایەکی خێرا بۆ قازانج — چاوەڕوانی واقیعی دەتپارێزێت لە بڕیاری بێ بیرکردنەوە."),
        },
    },
    # ---------------------------------------------------------------- classic
    "school:classic": {"name": "قوتابخانەی کلاسیکی", "summary": "ئاراستە، پاڵپشتی و بەرگری، مۆمەکان و پێوەرە کلاسیکییەکان وەک بناغە بۆ هەموو بازرگانێک.", "teacher": "وانەی دەنگی"},
    "level:classic:1": "بناغە",
    "level:classic:2": "پێوەر و ئامرازەکان",
    "level:classic:3": "جێبەجێکردنی پیشەگەرانە",
    "lec:classic-l1-01": {
        "title": "بازاڕ چییە و نرخ چۆن دەجووڵێت؟",
        "outline": ["جۆرەکانی بازاڕ", "خستنەڕوو و داواکاری بە سادەیی", "مۆمە ژاپۆنییەکان"],
        "seg": {
            "s1": ("دەستپێک", "بەخێربێن. ئەمڕۆ لە سفرەوە دەست پێدەکەین: لەسەر شاشە گەورەکە چی دەبینین؟ ئەمە چارتێکی فۆرێکسە."),
            "s2": ("خستنەڕوو و داواکاری", "نرخ بەرز دەبێتەوە کاتێک داواکاری لە خستنەڕوو زیاترە، و دادەبەزێت کاتێک خستنەڕوو لە داواکاری زیاترە."),
            "s3": ("خوێندنەوەی مۆم", "هەر مۆمێک کورتەی شەڕی کڕیاران و فرۆشیاران دەکات لە ماوەیەکی دیاریکراودا."),
        },
    },
    "lec:classic-l1-02": {
        "title": "ئاراستە و هێڵی ترێند",
        "outline": ["بەرزبوونەوە / دابەزین / لاتەریک", "لووتکە و نزمایی", "کێشانی هێڵی ئاراستە"],
        "seg": {
            "s1": ("پێناسەی ئاراستە", "ئاراستەی بەرزبوونەوە زنجیرەیەک نزمایی بەرزتر و لووتکەی بەرزترە."),
            "s2": ("هێڵی ترێند", "هێڵی ئاراستە بە بەستنەوەی نزمایی ڕوون دەکێشین، بێ زێدەڕۆیی لە وردکردنەوەدا."),
            "s3": ("شکاندن", "شکاندنی هێڵی ترێند بە داخستنێکی ڕوون ئاماژەیەکی زووە بۆ گۆڕانی مەبەست."),
        },
    },
    "lec:classic-l1-03": {
        "title": "پاڵپشتی و بەرگری",
        "outline": ["ناوچە نەک هێڵ", "تاقیکردنەوەی دووبارە", "بەهێزی و لاوازی"],
        "seg": {
            "s1": ("چەمک", "پاڵپشتی ناوچەیەکە کە نرخ لێیەوە بەرز دەبێتەوە، و بەرگری پێچەوانەکەیەتی."),
            "s2": ("گۆڕانی ڕۆڵ", "بەرگری شکاو دەکرێت دوای تاقیکردنەوەی دووبارە ببێتە پاڵپشتی."),
        },
    },
    "lec:classic-l2-01": {
        "title": "تێکڕا جووڵاوەکان (EMA)",
        "outline": ["9 / 21 / 50 / 200", "یەکتربڕین", "پاڵپشتی جووڵاو"],
        "seg": {
            "s1": ("EMA", "تێکڕای ئەکسپۆنێنشیاڵ خێراتر کاردانەوە بۆ نرخی نوێ دەکات."),
            "s2": ("یەکتربڕین", "یەکتربڕینی تێکڕاکان ئامرازێکی پشتڕاستکردنەوەیە نەک ئاماژەیەکی تەنها."),
        },
    },
    "lec:classic-l2-02": {
        "title": "RSI و MACD",
        "outline": ["تێربوون", "دایڤێرجێنس", "هێز (مۆمێنتەم)"],
        "seg": {
            "s1": ("RSI", "بۆ پێوانی هێزی جووڵە بەکاردێت نەک بۆ کاتی چوونەژوورەوەی کوێرانە."),
            "s2": ("MACD", "گۆڕانی هێزی جووڵە لە ڕێگەی تێکڕاکان و لەرینەوە پیشان دەدات."),
        },
    },
    "lec:classic-l2-03": {
        "title": "نموونە کلاسیکییەکان",
        "outline": ["سەر و دوو شان", "سێگۆشەکان", "ئاڵاکان"],
        "seg": {"s1": ("نموونەکان", "نموونە کلاسیکییەکان کورتەی ڕەفتارێکی دووبارەبووەوەن دوای جووڵەیەکی بەهێز.")},
    },
    "lec:classic-l3-01": {
        "title": "پلانێکی تەواوی بازرگانی کلاسیکی",
        "outline": ["هەڵبژاردنی جووت", "پشتڕاستکردنەوە", "بەڕێوەبردنی مەترسی"],
        "seg": {"s1": ("پلان", "ئاراستە + ناوچە + پشتڕاستکردنەوە + مەترسی دەکەینە یەک بڕیار.")},
    },
    "lec:classic-l3-02": {
        "title": "هەڵەکانی دەستپێکەران لە شیکاری کلاسیکیدا",
        "outline": ["ئاماژەی زۆر", "ڕاونانی نرخ", "پشتگوێخستنی دۆخ"],
        "seg": {"s1": ("هەڵەکان", "زۆربەی زیانەکان لە زۆری ئاماژە بێ پاڵاوتنی دۆخەوە دێن.")},
    },
    # ---------------------------------------------------------------- wyckoff
    "school:wyckoff": {"name": "قوتابخانەی وایکۆف", "summary": "کۆکردنەوە و دابەشکردن، هەوڵ و ئەنجام، و خوێندنەوەی مەبەستی دامەزراوەکان لە ڕێگەی قۆناغەکانەوە.", "teacher": "وانەی دەنگی"},
    "level:wyckoff:1": "بنەماکانی وایکۆف",
    "level:wyckoff:2": "دابەشکردن و تاقیکردنەوەکان",
    "level:wyckoff:3": "خوێندنەوەی قەبارە و دۆخ",
    "level:wyckoff:4": "سیناریۆی زیندوو",
    "lec:wy-l1-01": {
        "title": "فەلسەفەی خستنەڕوو و داواکاری لای وایکۆف",
        "outline": ["هەوڵ و ئەنجام", "هۆکار و ئەنجام"],
        "seg": {"s1": ("هەوڵ", "قەبارەی گەورە لەگەڵ مەودای بچووک زۆرجار واتە هەڵمژین.")},
    },
    "lec:wy-l1-02": {
        "title": "نەخشەی کۆکردنەوە",
        "outline": ["PS", "SC", "AR", "ST", "Spring"],
        "seg": {"s1": ("کۆکردنەوە", "دامەزراوەکان پێش بەرزبوونەوە بە بێدەنگی پێگەیەک دروست دەکەن.")},
    },
    "lec:wy-l2-01": {
        "title": "نەخشەی دابەشکردن",
        "outline": ["PSY", "BC", "UTAD"],
        "seg": {"s1": ("دابەشکردن", "دابەشکردن پێچەوانەی کۆکردنەوەیە: فرۆشتنی ڕێکخراو لە لووتکەکاندا.")},
    },
    "lec:wy-l2-02": {
        "title": "Spring و UTAD بە کرداری لە فۆرێکسدا",
        "outline": ["فێڵی لیکویدیتی", "پشتڕاستکردنەوە"],
        "seg": {"s1": ("Spring", "شکاندنی درۆینە لە خوار پاڵپشتی پاشان داخستنی ناوەوە ئاماژەی بەهێزییە.")},
    },
    "lec:wy-l3-01": {
        "title": "هەوڵ بەرامبەر ئەنجام لەسەر چارت",
        "outline": ["قەبارە", "مەودا", "بەردەوامی"],
        "seg": {"s1": ("شیکاری", "قەبارەی مۆم بە مەوداکەی بەراورد دەکەین بۆ ئەوەی بزانین کێ کۆنترۆڵی هەیە.")},
    },
    "lec:wy-l4-01": {
        "title": "کۆکردنەوە لەسەر زێڕ و DXY",
        "outline": ["چەند چوارچێوەی کات", "کاتبەندی"],
        "seg": {"s1": ("جێبەجێکردن", "پێش چوونەژوورەوە قۆناغی وایکۆف بە ئاراستەی دۆلارەوە دەبەستینەوە.")},
    },
    # ---------------------------------------------------------------- ict / smc
    "school:ict-smc": {"name": "ICT و SMC (پارەی زیرەک)", "summary": "لیکویدیتی دامەزراوەکان، Order Block و Fair Value Gap، لەگەڵ BOS و CHOCH وەک بەشێک لە پێکهاتەی بازاڕ لەگەڵ OB/FVG — نەک قوتابخانەیەکی جیا.", "teacher": "وانەی دەنگی"},
    "level:ict-smc:1": "زمانی لیکویدیتی",
    "level:ict-smc:2": "Order Block و Fair Value Gap",
    "level:ict-smc:3": "نموونە پێشکەوتووەکانی لیکویدیتی",
    "level:ict-smc:4": "دروستکردنی سیناریۆی ڕۆژانە",
    "level:ict-smc:5": "پیشەگەری و پێداچوونەوە",
    "lec:smc-l1-01": {
        "title": "لیکویدیتی چییە و بۆچی ڕاو دەکرێت؟",
        "outline": ["وەستاندنەکان", "لووتکە / نزمایی یەکسان", "Inducement"],
        "seg": {"s1": ("لیکویدیتی", "لیکویدیتی لە سەرووی لووتکەکان و خوار نزماییەکاندا کۆ دەبێتەوە، لەو شوێنەی فەرمانەکانی وەستاندن هەن.")},
    },
    "lec:smc-l1-02": {
        "title": "دانیشتنەکان و Killzone",
        "outline": ["لەندەن", "نیویۆرک", "تێکەڵبوون"],
        "seg": {"s1": ("کاتبەندی", "زۆربەی جووڵە دامەزراوەییەکان لە پەنجەرەی کاتی دیاریکراودا دەردەکەون.")},
    },
    "lec:smc-l2-01": {
        "title": "Order Block: پێناسە و جۆرەکان",
        "outline": ["OB ی بەرزبوونەوە / دابەزین", "پاڵاوتن", "چوونەژوورەوە"],
        "seg": {
            "s1": ("پێناسە", "Order Block دوایین مۆمی پێچەوانەیە پێش جووڵەیەکی پاڵنەری بەهێز."),
            "s2": ("بەکارهێنان", "لە گەڕانەوە بۆ ناوچەکە لەگەڵ پشتڕاستکردنەوەی ڕەتکردنەوە دەچینە ژوورەوە."),
        },
    },
    "lec:smc-l2-02": {
        "title": "Fair Value Gap (FVG)",
        "outline": ["بۆشایی نرخ", "پڕبوونەوەی بەشەکی", "پاڵاوتن"],
        "seg": {"s1": ("FVG", "بۆشاییەکە دەردەکەوێت کاتێک نرخ بە خێرایی دەجووڵێت و ناهاوسەنگییەک بەجێ دەهێڵێت.")},
    },
    "lec:smc-l2-03": {
        "title": "BOS و CHOCH لە ناو سیستەمی OB/FVG",
        "outline": ["BOS = بەردەوامی پێکهاتە", "CHOCH = گۆڕانی مەبەست", "بەستنەوەی شکاندن بە Order Block و FVG"],
        "seg": {
            "s1": ("پۆلێنکردنێکی گرنگ", "BOS و CHOCH قوتابخانەیەکی سەربەخۆ نین. ئامرازی پێکهاتەی بازاڕن لە خێزانی Order Block و Fair Value Gap لە ICT/SMC."),
            "s2": ("BOS", "Break of Structure واتە شکاندنی لووتکە/نزمایی بە ئاراستەی ترێندی ئێستا — زۆرجار دواتر FVG یان OB لە لای بەردەوامی دەکەینە ئامانج."),
            "s3": ("CHOCH", "Change of Character یەکەم شکاندنە دژی ئاراستەی پێشوو. دوای ئەوە بە دوای Order Blockێکی نوێدا دەگەڕێین بە ئاراستەی پێچەوانە."),
            "s4": ("یەکخستن", "سیناریۆی پیشەگەرانە: ڕاوی لیکویدیتی ← CHOCH/BOS ← گەڕانەوە بۆ OB یان FVG ← چوونەژوورەوە لەگەڵ بەڕێوەبردنی مەترسی."),
        },
    },
    "lec:smc-l3-01": {
        "title": "Inducement و Liquidity Sweep",
        "outline": ["فێڵ", "پشتڕاستکردنەوە", "چوونەژوورەوەی دواکەوتوو"],
        "seg": {"s1": ("Inducement", "بازاڕ بازرگان بە شکاندنێکی درۆینە هان دەدات پێش ئاراستە ڕاستەقینەکە.")},
    },
    "lec:smc-l3-02": {
        "title": "Premium و Discount",
        "outline": ["هاوسەنگی مەودا", "باشترین خاڵی چوونەژوورەوە"],
        "seg": {"s1": ("نرخاندن", "لە ناو مەوداکەدا لە داشکاندندا دەکڕین و لە زیادەدا دەفرۆشین.")},
    },
    "lec:smc-l4-01": {
        "title": "لە DXY ەوە بۆ جووتەکە",
        "outline": ["پەیوەندی دۆلار", "هەڵبژاردنی ئاراستە", "جێبەجێکردن"],
        "seg": {"s1": ("سیناریۆ", "لە DXY ەوە دەست پێدەکەین پاشان ئەو جووتە هەڵدەبژێرین کە لەگەڵ لیکویدیتی دەگونجێت.")},
    },
    "lec:smc-l5-01": {
        "title": "دەفتەری بازرگانی SMC و ڕێژەی سەرکەوتن",
        "outline": ["تۆمارکردنی سیناریۆ", "پێداچوونەوەی هەفتانە"],
        "seg": {"s1": ("ڕێکوپێکی", "بێ دەفتەر هەرگیز نازانیت کام نموونە بۆ هەژمارەکەت کار دەکات.")},
    },
    # ---------------------------------------------------------------- gann
    "school:gann": {"name": "چوارگۆشەی گان", "summary": "گۆشەکانی کات و نرخ، چوارگۆشەی 9، و پەیوەندییە ئەندازەییەکانی جووڵەی نرخ.", "teacher": "وانەی دەنگی"},
    "level:gann:1": "دەستپێکێک بۆ گان",
    "level:gann:2": "چوارگۆشەی 9 و گۆشەکان",
    "level:gann:3": "جێبەجێکردن لەسەر فۆرێکس",
    "level:gann:4": "حاڵەتە پێشکەوتووەکان",
    "lec:gann-l1-01": {
        "title": "فەلسەفەی کات و نرخ",
        "outline": ["هاوسەنگی", "خولەکان"],
        "seg": {"s1": ("بیرۆکە", "گان پێی وابوو کات و نرخ بە پەیوەندی ئەندازەیی دەجووڵێن.")},
    },
    "lec:gann-l2-01": {
        "title": "Square of Nine",
        "outline": ["دروستکردن", "ئاستەکان"],
        "seg": {"s1": ("چوارگۆشەکە", "چوارگۆشەی 9 بەکاردێنین بۆ دەرهێنانی ئاستی کاردانەوەی ئەگەری.")},
    },
    "lec:gann-l2-02": {
        "title": "گۆشەکانی Gann Fan",
        "outline": ["1x1", "2x1", "جووڵاوی"],
        "seg": {"s1": ("بادەوەشێنەکە", "گۆشەی 1x1 هاوسەنگی کات و نرخ دەنوێنێت.")},
    },
    "lec:gann-l3-01": {
        "title": "تێکەڵکردنی گان لەگەڵ پاڵپشتی و بەرگری",
        "outline": ["پاڵاوتن", "پشتڕاستکردنەوە"],
        "seg": {"s1": ("تێکەڵکردن", "هەرگیز تەنها لەسەر گۆشەکە بازرگانی ناکەین؛ بە ڕەفتاری نرخ پشتڕاستی دەکەینەوە.")},
    },
    "lec:gann-l4-01": {
        "title": "خولە کاتییەکان بۆ جووتە سەرەکییەکان",
        "outline": ["EURUSD", "XAUUSD"],
        "seg": {"s1": ("خولەکان", "دووبارەبوونەوەی لووتکە و نزماییەکان لە پەنجەرەی کاتیدا چاودێری دەکەین.")},
    },
    # ---------------------------------------------------------------- elliott
    "school:elliott": {"name": "شەپۆلەکانی ئێلیۆت", "summary": "شەپۆلە پاڵنەر و ڕاستکەرەوەکان، یاساکان، و فیبۆناچی لە ناو ژماردنی شەپۆلدا.", "teacher": "وانەی دەنگی"},
    "level:elliott:1": "بنەماکانی ژماردن",
    "level:elliott:2": "فیبۆناچی و شەپۆلەکان",
    "level:elliott:3": "ژماردنی کرداری",
    "level:elliott:4": "گونجان لەگەڵ لیکویدیتی",
    "level:elliott:5": "پلانی جێبەجێکردن",
    "lec:ew-l1-01": {
        "title": "شەپۆلی پاڵنەری 5",
        "outline": ["سێ یاساکە", "درێژبوونەوەکان"],
        "seg": {"s1": ("پاڵنەر", "پێنج شەپۆل لەگەڵ یاسای توند کە نابێت بشکێنرێن.")},
    },
    "lec:ew-l1-02": {
        "title": "ڕاستکردنەوەکانی ABC",
        "outline": ["Zigzag", "Flat", "Triangle"],
        "seg": {"s1": ("ڕاستکردنەوە", "دوای هەر پاڵنانێک ڕاستکردنەوەیەک دێت کە هاوسەنگی دەگەڕێنێتەوە.")},
    },
    "lec:ew-l2-01": {
        "title": "ڕێژەکانی شەپۆلی سێیەم و پێنجەم",
        "outline": ["1.618", "درێژبوونەوە"],
        "seg": {"s1": ("ڕێژەکان", "شەپۆلی سێیەم زۆرجار بەهێزترینە و بە درێژبوونەوەکانی فیبۆوە پەیوەستە.")},
    },
    "lec:ew-l3-01": {
        "title": "چۆن بێ لایەنگری دەست بە ژماردن بکەین",
        "outline": ["ژماردنی جێگرەوە", "هەڵوەشاندنەوە"],
        "seg": {"s1": ("جێگرەوەکان", "دوو سیناریۆ هەڵدەگرین و بە شکاندنی یاسایەک یەکێکیان هەڵدەوەشێنینەوە.")},
    },
    "lec:ew-l4-01": {
        "title": "ئێلیۆت + SMC",
        "outline": ["کۆتایی شەپۆل", "لیکویدیتی"],
        "seg": {"s1": ("گونجان", "کۆتایی شەپۆلێک زۆرجار لەگەڵ ڕاوی لیکویدیتی هاوکات دەبێت.")},
    },
    "lec:ew-l5-01": {
        "title": "لە ژماردنەوە بۆ فەرمانی بازرگانی",
        "outline": ["چوونەژوورەوە", "وەستاندن", "ئامانج"],
        "seg": {"s1": ("جێبەجێکردن", "ژماردن بێ بەڕێوەبردنی مەترسی تەنها وێنەکێشانە.")},
    },
    # ---------------------------------------------------------------- sk
    "school:sk": {"name": "قوتابخانەی SK", "summary": "ڕێبازی کرداری SK: ناوچەکانی خستنەڕوو و داواکاری، کاتبەندی دانیشتنەکان، و بەڕێوەبردنی مامەڵە بە شێوازی مەیدانی.", "teacher": "وانەی دەنگی"},
    "level:sk:1": "دەستپێکی SK",
    "level:sk:2": "ناوچەکانی خستنەڕوو و داواکاری",
    "level:sk:3": "بەڕێوەبردنی مامەڵە",
    "level:sk:4": "ڕووتینی ڕۆژانە",
    "lec:sk-l1-01": {
        "title": "فەلسەفەی ڕێبازەکە و بۆچی جیاوازە",
        "outline": ["سادەیی", "جێبەجێکردن"],
        "seg": {"s1": ("ڕێباز", "سەرنج دەخەینە سەر ناوچەی ڕوون و یەک بڕیار لە هەر دانیشتنێکدا.")},
    },
    "lec:sk-l2-01": {
        "title": "کێشانی ناوچە دروستەکان",
        "outline": ["بنکە", "دەرچوون", "پاڵاوتن"],
        "seg": {"s1": ("ناوچە", "ناوچەی بەهێز پێش پاڵنانێکی ڕوون دێت کە ناهاوسەنگییەک بەجێ دەهێڵێت.")},
    },
    "lec:sk-l2-02": {
        "title": "لە یەکەم دەستلێدان بچیتە ژوورەوە یان چاوەڕێ بکەیت؟",
        "outline": ["ئەگەر", "پشتڕاستکردنەوە"],
        "seg": {"s1": ("کاتبەندی", "یەکەم دەستلێدان ئەگەری بەرزتر و مەترسی بەرزتری هەیە.")},
    },
    "lec:sk-l3-01": {
        "title": "وەستاندنی بەشەکی و قازانجی قۆناغ بە قۆناغ",
        "outline": ["Break-even", "چەند ئامانجێک"],
        "seg": {"s1": ("بەڕێوەبردن", "سەرەتا سەرمایە دەپارێزین پاشان بەشێک بۆ درێژبوونەوە بەجێ دەهێڵین.")},
    },
    "lec:sk-l4-01": {
        "title": "دانیشتنی لەندەن/نیویۆرک بە ڕێبازی SK",
        "outline": ["ئامادەکاری", "جێبەجێکردن", "پێداچوونەوە"],
        "seg": {"s1": ("ڕووتین", "هەمان هەنگاوەکان هەموو ڕۆژێک هەڕەمەکی کەم دەکەنەوە.")},
    },
}

TRANSLATIONS = {"en": EN, "ku": KU}


def normalize_lang(lang: str | None) -> str:
    l = (lang or "").lower()
    if l.startswith("en"):
        return "en"
    if l.startswith("ku") or l.startswith("ckb"):
        return "ku"
    return "ar"


def localize_school(school: dict, lang: str | None) -> dict:
    """A translated deep copy of a school (Arabic when `lang` is ar or a field has no translation)."""
    code = normalize_lang(lang)
    if code == "ar":
        return school
    tr = TRANSLATIONS[code]
    out = copy.deepcopy(school)
    s = tr.get(f"school:{school['id']}") or {}
    if s.get("summary"):
        out["summary"] = s["summary"]
    if s.get("name"):
        out["name_localized"] = s["name"]
    if s.get("teacher") and isinstance(out.get("classroom"), dict):
        out["classroom"]["teacher"] = s["teacher"]
    out["content_lang"] = code
    for lv in out.get("levels", []):
        t = tr.get(f"level:{school['id']}:{lv['level']}")
        if t:
            lv["title"] = t
        for lec in lv.get("lectures", []):
            lt = tr.get(f"lec:{lec['id']}")
            if not lt:
                continue
            lec["title"] = lt.get("title", lec["title"])
            if lt.get("outline") and len(lt["outline"]) == len(lec.get("outline", [])):
                lec["outline"] = list(lt["outline"])
            segs = lt.get("seg", {})
            for seg in lec.get("script_segments", []):
                pair = segs.get(seg["id"])
                if pair:
                    seg["title"], seg["narration"] = pair[0], pair[1]
            full = _lesson(lec["id"], code)
            if full:
                lec["script_segments"] = [dict(x) for x in full]
    return out


def _lesson(lecture_id: str, code: str) -> list[dict] | None:
    import academy_data

    return academy_data.LESSON_CONTENT.get(lecture_id, {}).get(code)


def coverage(lang: str) -> dict[str, int]:
    """How many lectures / segments have a translation (used by tests)."""
    import academy_data

    tr = TRANSLATIONS[normalize_lang(lang)]
    lec = seg = lec_tr = seg_tr = 0
    for s in academy_data.ACADEMY_SCHOOLS:
        for lv in s["levels"]:
            for l in lv["lectures"]:
                lec += 1
                t = tr.get(f"lec:{l['id']}")
                lec_tr += 1 if t else 0
                full = {x["id"] for x in (_lesson(l["id"], normalize_lang(lang)) or [])}
                for g in l["script_segments"]:
                    seg += 1
                    seg_tr += 1 if (g["id"] in full) or (t and g["id"] in t.get("seg", {})) else 0
    return {"lectures": lec, "lectures_translated": lec_tr, "segments": seg, "segments_translated": seg_tr}


def _add_extra_translations() -> None:
    import json
    from pathlib import Path

    f = Path(__file__).resolve().parent / "academy_extra.json"
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return
    for code, table in (("en", EN), ("ku", KU)):
        for x in data.get("level_titles", []):
            table.setdefault(f"level:{x['school']}:{x['level']}", x["title"][code])
        for ex in data.get("lectures", []):
            table[f"lec:{ex['id']}"] = {"title": ex["title"][code], "outline": list(ex["outline"][code]), "seg": {}}


_add_extra_translations()
