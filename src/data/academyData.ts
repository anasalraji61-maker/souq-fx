export interface ScriptSegment {
  id: string;
  title: string;
  narration: string;
}

export interface AcademyLecture {
  id: string;
  title: string;
  duration_min: number;
  format: string;
  outline: string[];
  script_segments: ScriptSegment[];
  chartConcept?: 'support_resistance' | 'order_block' | 'wyckoff' | 'elliott_wave' | 'fibonacci' | 'risk_reward';
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  };
}

export interface AcademyLevel {
  level: number;
  title: string;
  lectures_count: number;
  lectures: AcademyLecture[];
}

export interface AcademySchool {
  id: string;
  order: number;
  name_ar: string;
  name_en: string;
  density: 'low' | 'medium' | 'high' | 'very_high';
  max_level: number;
  summary: string;
  summary_en: string;
  /** server: the school name in the requested language (Kurdish / English) */
  name_localized?: string;
  /** server: language of the lesson texts in this copy ('ar' | 'en' | 'ku') */
  content_lang?: string;
  levels_count: number;
  lectures_count: number;
  classroom: {
    teacher: string;
    screen_theme: string;
  };
  levels: AcademyLevel[];
}

export const ACADEMY_SCHOOLS: AcademySchool[] = [
  {
    id: 'basics',
    order: 0,
    name_ar: 'أساسيات التداول للمبتدئين',
    name_en: 'Trading Basics',
    density: 'low',
    max_level: 1,
    summary: 'ابدأ من هنا إن كنت جديداً تماماً: النقطة (Pip)، اللوت، الرافعة والهامش، وإدارة المخاطر قبل أول صفقة حقيقية.',
    summary_en: 'Pips, lot sizes, leverage, margin, and risk management before your first live trade.',
    levels_count: 1,
    lectures_count: 4,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'basics_intro',
    },
    levels: [
      {
        level: 1,
        title: 'المفاهيم الأساسية',
        lectures_count: 4,
        lectures: [
          {
            id: 'basics-l1-01',
            title: 'ما هو الـ Pip (النقطة) وكيف تُحسب؟',
            duration_min: 3,
            format: 'screen_voice',
            outline: ['تعريف النقطة', 'قيمة النقطة حسب الزوج', 'أزواج الين الياباني مقابل الأزواج الرئيسية'],
            script_segments: [
              {
                id: 's1',
                title: 'تعريف النقطة (Pip)',
                narration: 'النقطة أو Pip هي وحدة القياس المعيارية للتغير في سعر أزواج العملات. في معظم الأزواج الرئيسية مثل EUR/USD، تمثل النقطة الخانة العشرية الرابعة (0.0001).'
              },
              {
                id: 's2',
                title: 'حساب قيمة النقطة',
                narration: 'قيمة النقطة تختلف بحسب حجم العقد (اللوت). في اللوت القياسي، تساوي النقطة في EUR/USD عادة 10 دولارات، بينما في اللوت المصغر (0.10) تساوي دولاراً واحداً.'
              },
              {
                id: 's3',
                title: 'استثناء الين الياباني والذهب',
                narration: 'في أزواج الين الياباني (مثل USD/JPY) والذهب (XAU/USD)، تكون النقطة في الخانة العشرية الثانية (0.01) نظراً لطبيعة تسعير الين والسلع.'
              }
            ],
            chartConcept: 'risk_reward',
            quiz: {
              question: 'في زوج EUR/USD، إذا تحرك السعر من 1.0820 إلى 1.0850، كم نقطة (Pip) تحرك السعر؟',
              options: ['3 نقاط', '30 نقطة', '300 نقطة', '0.3 نقطة'],
              correctAnswer: 1,
              explanation: 'تحرك السعر بمقدار 0.0030 وهو يعادل 30 نقطة في الأزواج المكونة من أربع وخمس خانات عشرية.'
            }
          },
          {
            id: 'basics-l1-02',
            title: 'اللوت وحجم الصفقة (Lot Sizing)',
            duration_min: 4,
            format: 'screen_voice',
            outline: ['اللوت القياسي والمصغر والميكرو', 'علاقة اللوت بالمخاطرة', 'قاعدة ذهبية في حجم العقود'],
            script_segments: [
              {
                id: 's1',
                title: 'أنواع اللوتات',
                narration: 'العقد القياسي (Standard Lot) = 100,000 وحدة من العملة الأساسية. العقد المصغر (Mini Lot 0.1) = 10,000 وحدة. والعقد الميكرو (Micro Lot 0.01) = 1,000 وحدة.'
              },
              {
                id: 's2',
                title: 'اختيار الحجم الصحيح',
                narration: 'لا تختر حجم اللوت عشوائياً. القاعدة السليمة هي حساب اللوت بناءً على وقف الخسارة ونسبة المخاطرة المحددة مسبقاً (مثل 1% من رأس المال).'
              }
            ],
            chartConcept: 'risk_reward',
            quiz: {
              question: 'ما هو حجم العقد الميكرو (0.01 لوت) بالوحدات؟',
              options: ['100,000 وحدة', '10,000 وحدة', '1,000 وحدة', '100 وحدة'],
              correctAnswer: 2,
              explanation: 'العقد الميكرو 0.01 يساوي 1,000 وحدة من العملة الأساسية.'
            }
          },
          {
            id: 'basics-l1-03',
            title: 'الرافعة المالية والهامش (Leverage & Margin)',
            duration_min: 3,
            format: 'screen_voice',
            outline: ['ما هي الرافعة المالية؟', 'الهامش المستخدم والمتاح', 'مخاطر الرافعة المفرطة'],
            script_segments: [
              {
                id: 's1',
                title: 'آلية عمل الرافعة',
                narration: 'الرافعة المالية تتيح لك التداول بأحجام تفوق إيداعك الفعلي. رافعة 1:100 تعني أن كل دولار تملكه يمكنك من فتح صفقات بقيمة 100 دولار.'
              },
              {
                id: 's2',
                title: 'سلاح ذو حدين',
                narration: 'الرافعة تكبر الأرباح ولكنها تكبر الخسائر بالقدر نفسه تماماً. الرافعة العالية بلا خطة توقف واضحة هي أسرع طريق لخسارة الحساب (نداء الهامش).'
              }
            ],
            chartConcept: 'risk_reward'
          },
          {
            id: 'basics-l1-04',
            title: 'إدارة المخاطر: كم تخاطر في كل صفقة؟',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['قاعدة الـ 1% والـ 2%', 'معادلة المخاطرة إلى العائد (R:R)', 'أهمية وقف الخسارة (Stop Loss)'],
            script_segments: [
              {
                id: 's1',
                title: 'قاعدة النسبة الثابتة',
                narration: 'المتداول المحترف لا يخاطر بأكثر من 1% إلى 2% من إجمالي رأس ماله في صفقة واحدة، مهما كانت الصفقة مغرية.'
              },
              {
                id: 's2',
                title: 'نسبة المخاطرة إلى العائد (Risk to Reward)',
                narration: 'ابحث عن صفقات تقدم نسبة عائد إلى مخاطرة 1:2 على الأقل. بنسبة 1:2 يمكنك تحقيق ربح إجمالي حتى لو أصبت في 40% فقط من صفقاتك.'
              }
            ],
            chartConcept: 'risk_reward'
          }
        ]
      }
    ]
  },
  {
    id: 'classic',
    order: 1,
    name_ar: 'المدرسة الكلاسيكية',
    name_en: 'Classical TA',
    density: 'medium',
    max_level: 2,
    summary: 'خطوط الاتجاه، الدعم والمقاومة، القنوات السعرية، ونماذج الشموع اليابانية الفعالة.',
    summary_en: 'Trendlines, support and resistance, price channels, and high-probability candlestick patterns.',
    levels_count: 2,
    lectures_count: 4,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'classic_charts',
    },
    levels: [
      {
        level: 1,
        title: 'الدعوم والمقاومات والترند',
        lectures_count: 2,
        lectures: [
          {
            id: 'classic-l1-01',
            title: 'تحديد مستويات الدعم والمقاومة الحقيقية',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['الدعم والمقاومة كأشرطة ومناطق لا خطوط رفيعة', 'تبادل الأدوار (Role Reversal)', 'تأكيد الارتداد'],
            script_segments: [
              {
                id: 's1',
                title: 'مفهوم المنطقة',
                narration: 'الدعم ليس سعراً ثابتاً دقيقاً، بل منطقة سعرية يتفوق فيها المشترون على البائعين فيتوقف الهبوط. المقاومة هي منطقة يتفوق فيها البائعون.'
              },
              {
                id: 's2',
                title: 'تبادل الأدوار',
                narration: 'عندما تُكسر المقاومة بشمعة إغلاق قوية، فإنها تتحول في أغلب الأحيان إلى دعم جديد عند إعادة الاختبار (Retest).'
              }
            ],
            chartConcept: 'support_resistance',
            quiz: {
              question: 'ماذا يحدث لمستوى المقاومة المكسور بعد إغلاق شمعة قوية فوقه؟',
              options: ['يختفي ولا قيمة له', 'يتحول غالباً إلى مستوى دعم مستقبلي', 'يتحول فوراً إلى قاع جديد', 'يجب البيع عنده فوراً'],
              correctAnswer: 1,
              explanation: 'ظاهرة تبادل الأدوار (Polarity / Role Reversal) تعني أن المقاومة المخترقة تعمل كدعم لاحق.'
            }
          },
          {
            id: 'classic-l1-02',
            title: 'رسم خطوط الاتجاه (Trendlines) والقنوات',
            duration_min: 4,
            format: 'screen_voice',
            outline: ['شروط صحة الترند', 'قيعان متصاعدة وقمم متصاعدة', 'كسر الترند وإعادة الاختبار'],
            script_segments: [
              {
                id: 's1',
                title: 'شروط الترند الصحيح',
                narration: 'خط الترند الصاعد يحتاج إلى نقطتي ارتكاز لتأسيسه، وتأكيده يحتاج إلى لمسة ثالثة تثبت احترام السعر للمسار.'
              }
            ],
            chartConcept: 'support_resistance'
          }
        ]
      },
      {
        level: 2,
        title: 'مستويات فيبوناتشي والنماذج السعرية',
        lectures_count: 2,
        lectures: [
          {
            id: 'classic-l2-01',
            title: 'أسرار نسب فيبوناتشي الذهبية (0.618 و 0.50)',
            duration_min: 6,
            format: 'screen_voice',
            outline: ['رسم فيبوناتشي التصحيحي من القاع للقمة', 'المنطقة الذهبية (Golden Pocket)', 'دمج فيبوناتشي مع مستويات الدعم'],
            script_segments: [
              {
                id: 's1',
                title: 'المنطقة الذهبية',
                narration: 'النسبة 61.8% و 50% تمثلان أقوى مناطق التصحيح في الاتجاه السائد. التلاقي بين نسبة فيبوناتشي ودعم كلاسيكي يعطي إشارة عالية الدقة.'
              }
            ],
            chartConcept: 'fibonacci'
          },
          {
            id: 'classic-l2-02',
            title: 'نماذج الانعكاس: الرأس والكتفين والقمة المزدوجة',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['نموذج الرأس والكتفين (Head & Shoulders)', 'خط العنق (Neckline)', 'حساب الهدف الفني للنموذج'],
            script_segments: [
              {
                id: 's1',
                title: 'خط العنق وكسره',
                narration: 'لا يتم اعتماد نموذج الرأس والكتفين إلا بعد كسر خط العنق بإغلاق شمعة، وقياس الهدف يكون مساوياً للمسافة بين الرأس وخط العنق.'
              }
            ],
            chartConcept: 'support_resistance'
          }
        ]
      }
    ]
  },
  {
    id: 'ict-smc',
    order: 2,
    name_ar: 'مدرسة ICT و SMC (أموال المؤسسات)',
    name_en: 'ICT / SMC (Smart Money)',
    density: 'very_high',
    max_level: 2,
    summary: 'كتل الأوامر (Order Blocks)، فجوات القيمة العادلة (FVG)، وسحب السيولة وهيكل السوق (BOS / CHOCH).',
    summary_en: 'Order Blocks, Fair Value Gaps (FVG), Liquidity Sweeps, and Market Structure shifts (BOS / CHOCH).',
    levels_count: 2,
    lectures_count: 4,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'smc_liquidity',
    },
    levels: [
      {
        level: 1,
        title: 'هيكل السوق والسيولة',
        lectures_count: 2,
        lectures: [
          {
            id: 'ict-l1-01',
            title: 'BOS و CHOCH: قراءة بنية السوق الحقيقية',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['كسر الهيكل (Break of Structure - BOS)', 'تغير طبيعة الحركة (Change of Character - CHOCH)', 'السيولة الداخلية والخارجية'],
            script_segments: [
              {
                id: 's1',
                title: 'الفرق بين BOS و CHOCH',
                narration: 'الـ BOS هو استمرار في نفس الاتجاه بكسر قمة في ترند صاعد. أما CHOCH فهو كسر أول قاع رئيسي صاعد، ويعلن أول إشارة لانقلاب الهيكل لصالح البائعين.'
              }
            ],
            chartConcept: 'order_block',
            quiz: {
              question: 'ما هو معنى اختصار CHOCH في التحليل بهيكل السوق (SMC)؟',
              options: ['كسر هيكل مستمر', 'تغير في طبيعة الحركة (Change of Character)', 'فجوة سعرية غير مغلقة', 'كتلة أوامر شرائية'],
              correctAnswer: 1,
              explanation: 'CHOCH تعني Change of Character وتشير إلى انعكاس محتمل في اتجاه بنية السوق.'
            }
          },
          {
            id: 'ict-l1-02',
            title: 'فخاخ السيولة وسحب السيولة (Liquidity Sweeps)',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['أين يضع صغار المتداولين وقف الخسارة؟', 'القمم والقيعان المتساوية (Equal Highs/Lows)', 'ضرب الوقف والدخول المؤسسي'],
            script_segments: [
              {
                id: 's1',
                title: 'صيد السيولة',
                narration: 'المؤسسات الكبرى تحتاج سيولة لملء صفقاتها الضخمة. القمم المتساوية تجذب المشترين وتجمع أوامر الوقف فوقها، فيقوم صناع السوق بكسرها سريعاً وسحب السيولة ثم الهبوط العنيف.'
              }
            ],
            chartConcept: 'order_block'
          }
        ]
      },
      {
        level: 2,
        title: 'كتل الأوامر وفجوات القيمة العادلة',
        lectures_count: 2,
        lectures: [
          {
            id: 'ict-l2-01',
            title: 'كتلة الأوامر (Order Block - OB)',
            duration_min: 6,
            format: 'screen_voice',
            outline: ['تعريف كتلة الأوامر المؤسسية', 'شمعة الهبوط الأخيرة قبل الانفجار الصاعد', 'مناطق التخفيف والتأكيد'],
            script_segments: [
              {
                id: 's1',
                title: 'تحديد الـ Order Block',
                narration: 'الـ Bullish Order Block هي آخر شمعة هابطة سبقت حركة صعودية عنيفة كسرت هيكل السوق وأنشأت اختلالاً سعرياً.'
              }
            ],
            chartConcept: 'order_block'
          },
          {
            id: 'ict-l2-02',
            title: 'فجوة القيمة العادلة (Fair Value Gap - FVG)',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['تشكيل الشموع الثلاثة', 'منطقة عدم الاتزان (Imbalance)', 'إعادة ملء الفجوة كنقطة دخول مثالية'],
            script_segments: [
              {
                id: 's1',
                title: 'كيف تتشكل FVG؟',
                narration: 'تتشكل FVG عندما تترك الشمعة الثانية فجوة بين قمة الشمعة الأولى وقاع الشمعة الثالثة دون تداخل. هذا الفراغ يجذب السعر لإعادة التوازن.'
              }
            ],
            chartConcept: 'order_block'
          }
        ]
      }
    ]
  },
  {
    id: 'wyckoff',
    order: 3,
    name_ar: 'مدرسة وايكوف (Wyckoff)',
    name_en: 'Wyckoff Method',
    density: 'high',
    max_level: 1,
    summary: 'مراحل التجميع والتوزيع، ذروة الشراء والبيع، واختبار الربيع (Spring).',
    summary_en: 'Accumulation and distribution phases, buying/selling climax, and Spring tests.',
    levels_count: 1,
    lectures_count: 2,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'wyckoff_schematic',
    },
    levels: [
      {
        level: 1,
        title: 'دورة وايكوف السعرية',
        lectures_count: 2,
        lectures: [
          {
            id: 'wyckoff-l1-01',
            title: 'مخطط التجميع وحركة الربيع (Spring)',
            duration_min: 6,
            format: 'screen_voice',
            outline: ['مراحل التجميع (Phases A-E)', 'ذروة البيع (Selling Climax)', 'اختبار الربيع وكسر القاع الوهمي'],
            script_segments: [
              {
                id: 's1',
                title: 'اختبار الربيع (Spring)',
                narration: 'حركة الـ Spring هي كسر زائف لقاع نطاق التجميع بهدف إخراج المشترين المترددين واختبار كميات المعروض المتبقية قبل إطلاق الاتجاه الصاعد.'
              }
            ],
            chartConcept: 'wyckoff'
          },
          {
            id: 'wyckoff-l1-02',
            title: 'مخطط التوزيع ومصيدة الشراء (UTAD)',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['مراحل التوزيع في القمم', 'ذروة الشراء (Buying Climax)', 'حركة الـ UTAD والانعكاس الهابط'],
            script_segments: [
              {
                id: 's1',
                title: 'حركة الـ UTAD',
                narration: 'الـ Upthrust After Distribution هي اندفاع أخير فوق قمة النطاق يخدع المتداولين بكسر وهمي ثم يعود السعر سريعاً إلى داخل النطاق ويبدأ الهبوط الحقيقي.'
              }
            ],
            chartConcept: 'wyckoff'
          }
        ]
      }
    ]
  },
  {
    id: 'elliott',
    order: 4,
    name_ar: 'موجات إليوت (Elliott Wave)',
    name_en: 'Elliott Wave',
    density: 'very_high',
    max_level: 1,
    summary: 'الموجات الدافعة الخماسية (1-2-3-4-5) والموجات التصحيحية الثلاثية (A-B-C).',
    summary_en: 'Five-wave impulse patterns (1-2-3-4-5) and three-wave corrective cycles (A-B-C).',
    levels_count: 1,
    lectures_count: 2,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'elliott_count',
    },
    levels: [
      {
        level: 1,
        title: 'الأسس الحاكمة لموجات إليوت',
        lectures_count: 2,
        lectures: [
          {
            id: 'elliott-l1-01',
            title: 'قواعد الموجات الدافعة الخماسية',
            duration_min: 6,
            format: 'screen_voice',
            outline: ['الموجات 1 و 3 و 5', 'القاعدة الصارمة: الموجة 3 ليست الأقصر', 'القاعدة: الموجة 4 لا تتداخل مع قمة الموجة 1'],
            script_segments: [
              {
                id: 's1',
                title: 'القوانين الثلاثة التي لا تكسر',
                narration: '1. الموجة الثانية لا تصحح 100% من الموجة الأولى. 2. الموجة الثالثة لا يمكن أن تكون أقصر الموجات الدافعة الثلاث. 3. قاع الموجة الرابعة لا يتداخل مع قمة الموجة الأولى في الأسواق النقدية.'
              }
            ],
            chartConcept: 'elliott_wave',
            quiz: {
              question: 'أي من القواعد التالية تعتبر قانوناً صارماً غير قابل للكسر في موجات إليوت الدافعة؟',
              options: ['الموجة 3 دائماً تساوي الموجة 1', 'الموجة 3 لا يمكن أن تكون الأقصر بين 1 و 3 و 5', 'الموجة 2 يجب أن تصحح 100%', 'الموجة 4 تتداخل دائماً مع قمة 1'],
              correctAnswer: 1,
              explanation: 'القانون الأساسي ينص على أن الموجة 3 لا يمكن أبداً أن تكون الأقصر بين الموجات الدافعة (1، 3، 5).'
            }
          },
          {
            id: 'elliott-l1-02',
            title: 'الأنماط التصحيحية (A-B-C): المتعرج والمستوي',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['تصحيح Zigzag الحاد (5-3-5)', 'تصحيح Flat العرضي (3-3-5)', 'المثلثات التجميعية (Triangles)'],
            script_segments: [
              {
                id: 's1',
                title: 'بنية Zigzag',
                narration: 'الـ Zigzag هو تصحيح عميق وسريع يتكون من 5 موجات في A، و3 موجات ارتداد في B، ثم 5 موجات استكمال في C.'
              }
            ],
            chartConcept: 'elliott_wave'
          }
        ]
      }
    ]
  },
  {
    id: 'gann',
    order: 5,
    name_ar: 'مربع وزوايا جان (W.D. Gann)',
    name_en: 'Gann Angles & Square',
    density: 'high',
    max_level: 1,
    summary: 'الزوايا الهندسية لجان، توازن السعر والزمن، ودورات الوقت في الأسواق المالية.',
    summary_en: 'Geometric angles, price-time balancing (1x1), and market timing cycles.',
    levels_count: 1,
    lectures_count: 1,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'gann_grid',
    },
    levels: [
      {
        level: 1,
        title: 'هندسة السعر والزمن',
        lectures_count: 1,
        lectures: [
          {
            id: 'gann-l1-01',
            title: 'زاوية 1x1 ومربع التسعة',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['تساوي السعر والزمن (Squaring of Price and Time)', 'الزاوية 45 درجة (1x1)', 'الدورات الزمنية الانعكاسية'],
            script_segments: [
              {
                id: 's1',
                title: 'توازن زاوية 1x1',
                narration: 'اعتقد جان أن زاوية 1x1 (وحدة سعرية لكل وحدة زمنية) تمثل التوازن المثالي؛ والسعر فوقها يكون في اتجاه صاعد قوي وتحتها في اتجاه هابط.'
              }
            ],
            chartConcept: 'fibonacci'
          }
        ]
      }
    ]
  },
  {
    id: 'sk',
    order: 6,
    name_ar: 'مدرسة SK (العرض والطلب التوافقي)',
    name_en: 'SK System',
    density: 'high',
    max_level: 1,
    summary: 'مناطق العرض والطلب الممتدة، استراتيجيات الدخول عند المستويات القصوى، وتحديد الأهداف.',
    summary_en: 'Extended Supply & Demand zones, boundary entry setups, and target extensions.',
    levels_count: 1,
    lectures_count: 1,
    classroom: {
      teacher: 'شرح صوتي تحليلي',
      screen_theme: 'sk_zones',
    },
    levels: [
      {
        level: 1,
        title: 'مناطق العرض والطلب بأسلوب SK',
        lectures_count: 1,
        lectures: [
          {
            id: 'sk-l1-01',
            title: 'تحديد مناطق ارتداد SK وإدارة المخاطر',
            duration_min: 5,
            format: 'screen_voice',
            outline: ['مستويات الارتداد المستهدفة', 'تأكيد شمعة الانعكاس', 'وضع الوقف تحت منطقة الطلب'],
            script_segments: [
              {
                id: 's1',
                title: 'دخول مناطق الطلب',
                narration: 'يركز نظام SK على انتظار وصول السعر إلى أقصى نقطة في منطقة الطلب المؤسسية، مع تأكيد رفض السعر بذيل شمعة واضحة قبل الشراء.'
              }
            ],
            chartConcept: 'support_resistance'
          }
        ]
      }
    ]
  }
];
