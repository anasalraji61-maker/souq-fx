"""
MATRIX Academy curriculum
BOS / CHOCH belong under ICT+SMC (Order Blocks & Fair Value Gaps), not separate Price Action.
"""

from __future__ import annotations


def _lec(lid: str, title: str, minutes: int, outline: list[str], script: list[dict]) -> dict:
    return {
        "id": lid,
        "title": title,
        "duration_min": minutes,
        "format": "screen_voice",  # big screen + ElevenLabs voice only
        "video_status": "script_ready",  # later: elevenlabs audio + screen slides
        "outline": outline,
        "script_segments": script,
    }


def _seg(sid: str, title: str, text: str) -> dict:
    return {"id": sid, "title": title, "narration": text}


def _level(n: int, title: str, lectures: list[dict]) -> dict:
    return {
        "level": n,
        "title": title,
        "lectures_count": len(lectures),
        "lectures": lectures,
    }


ACADEMY_SCHOOLS: list[dict] = [
    {
        "id": "classic",
        "order": 1,
        "name_ar": "المدرسة الكلاسيكية",
        "name_en": "Classical TA",
        "density": "medium",
        "max_level": 3,
        "summary": "الاتجاه، الدعم والمقاومة، الشموع، والمؤشرات الكلاسيكية كتأسيس لكل متداول.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "classic_charts",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(
                1,
                "التأسيس",
                [
                    _lec(
                        "classic-l1-01",
                        "ما هو السوق وكيف يتحرك السعر؟",
                        28,
                        ["أنواع الأسواق", "عرض وطلب مبسّط", "الشموع اليابانية"],
                        [
                            _seg("s1", "افتتاح", "أهلاً بكم. اليوم نبدأ من الصفر: ما الذي نراه على الشاشة الكبيرة؟ هذا شارت فوركس."),
                            _seg("s2", "العرض والطلب", "السعر يصعد عندما يفوق الطلب العرض، ويهبط عندما يفوق العرض الطلب."),
                            _seg("s3", "قراءة الشمعة", "كل شمعة تلخّص معركة المشترين والبائعين خلال فترة زمنية محددة."),
                        ],
                    ),
                    _lec(
                        "classic-l1-02",
                        "الاتجاه والترندلاين",
                        32,
                        ["صاعد/هابط/عرضي", "قمم وقيعان", "رسم خط الاتجاه"],
                        [
                            _seg("s1", "تعريف الاتجاه", "الاتجاه الصاعد سلسلة قيعان أعلى وقمم أعلى."),
                            _seg("s2", "الترندلاين", "نرسم خط الاتجاه بربط قيعان واضحة دون مبالغة في الضبط."),
                            _seg("s3", "الكسر", "كسر الترندلاين بإغلاق واضح إشارة مبكرة لتغيّر النية."),
                        ],
                    ),
                    _lec(
                        "classic-l1-03",
                        "الدعم والمقاومة",
                        30,
                        ["مناطق لا خطوط", "إعادة الاختبار", "القوة والضعف"],
                        [
                            _seg("s1", "المفهوم", "الدعم منطقة يرتد منها السعر صعوداً، والمقاومة عكسها."),
                            _seg("s2", "التحويل", "المقاومة المكسورة قد تتحول إلى دعم بعد إعادة الاختبار."),
                        ],
                    ),
                ],
            ),
            _level(
                2,
                "المؤشرات والأدوات",
                [
                    _lec("classic-l2-01", "المتوسطات المتحركة EMA", 26, ["9/21/50/200", "التقاطع", "ديناميكية الدعم"], [
                        _seg("s1", "EMA", "المتوسط الأسي يتفاعل أسرع مع السعر الحديث."),
                        _seg("s2", "التقاطع", "تقاطع المتوسطات أداة تأكيد لا إشارة وحيدة."),
                    ]),
                    _lec("classic-l2-02", "RSI و MACD", 34, ["تشبع", "الدايفرجنس", "الزخم"], [
                        _seg("s1", "RSI", "يستخدم لقياس الزخم لا لتوقيت الدخول الأعمى."),
                        _seg("s2", "MACD", "يظهر تغيّر الزخم عبر المتوسطات والتذبذب."),
                    ]),
                    _lec("classic-l2-03", "النماذج الكلاسيكية", 36, ["رأس وكتفين", "مثلثات", "أعلام"], [
                        _seg("s1", "النماذج", "النماذج الكلاسيكية تلخّص سلوكاً متكرراً بعد حركة قوية."),
                    ]),
                ],
            ),
            _level(
                3,
                "التطبيق الاحترافي",
                [
                    _lec("classic-l3-01", "خطة تداول كلاسيكية كاملة", 40, ["اختيار الزوج", "التأكيد", "إدارة المخاطر"], [
                        _seg("s1", "الخطة", "ندمج الاتجاه + المنطقة + التأكيد + المخاطرة في قرار واحد."),
                    ]),
                    _lec("classic-l3-02", "أخطاء المبتدئين في الكلاسيكي", 24, ["إشارات كثيرة", "مطاردة", "تجاهل السياق"], [
                        _seg("s1", "الأخطاء", "أكثر الخسائر تأتي من تعدد الإشارات بلا فلتر سياق."),
                    ]),
                ],
            ),
        ],
    },
    {
        "id": "wyckoff",
        "order": 2,
        "name_ar": "مدرسة وايكوف",
        "name_en": "Wyckoff",
        "density": "high",
        "max_level": 4,
        "summary": "التجميع والتوزيع، الجهد والنتيجة، وقراءة نية المؤسسات عبر المراحل.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "wyckoff_schematic",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(1, "أساسيات وايكوف", [
                _lec("wy-l1-01", "فلسفة العرض والطلب عند وايكوف", 30, ["الجهد والنتيجة", "السبب والنتيجة"], [
                    _seg("s1", "الجهد", "حجم كبير مع مدى صغير غالباً يعني امتصاص."),
                ]),
                _lec("wy-l1-02", "مخطط التجميع", 38, ["PS", "SC", "AR", "ST", "Spring"], [
                    _seg("s1", "التجميع", "المؤسسات تبني مركزاً بصمت قبل الصعود."),
                ]),
            ]),
            _level(2, "التوزيع والاختبارات", [
                _lec("wy-l2-01", "مخطط التوزيع", 36, ["PSY", "BC", "UTAD"], [
                    _seg("s1", "التوزيع", "التوزيع عكس التجميع: بيع منظم عند القمم."),
                ]),
                _lec("wy-l2-02", "Spring و UTAD عملياً على الفوركس", 42, ["خداع السيولة", "التأكيد"], [
                    _seg("s1", "Spring", "كسر كاذب تحت الدعم ثم إغلاق داخلي إشارة قوة."),
                ]),
            ]),
            _level(3, "قراءة الحجم والسياق", [
                _lec("wy-l3-01", "الجهد مقابل النتيجة على الشارت", 33, ["حجم", "مدى", "استمرار"], [
                    _seg("s1", "التحليل", "نقارن حجم الشمعة بمداها لنفهم من يسيطر."),
                ]),
            ]),
            _level(4, "سيناريوهات حية", [
                _lec("wy-l4-01", "تجميع على الذهب وDXY", 45, ["تعدد الأطر", "التوقيت"], [
                    _seg("s1", "التطبيق", "نربط مرحلة وايكوف باتجاه الدولار قبل الدخول."),
                ]),
            ]),
        ],
    },
    {
        "id": "ict-smc",
        "order": 3,
        "name_ar": "ICT و SMC",
        "name_en": "ICT / Smart Money Concepts",
        "density": "very_high",
        "max_level": 5,
        "summary": "السيولة المؤسسية، Order Blocks، Fair Value Gaps، وبضمنها BOS و CHOCH كجزء من هيكل السوق مع الـ OB/FVG — ليست مدرسة منفصلة.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "smc_liquidity",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(1, "لغة السيولة", [
                _lec("smc-l1-01", "ما هي السيولة ولماذا تُصاد؟", 32, ["Stops", "Equal highs/lows", " inducement"], [
                    _seg("s1", "السيولة", "السيولة تتجمع فوق القمم وتحت القيعان حيث أوامر الوقف."),
                ]),
                _lec("smc-l1-02", "الجلسات و Killzones", 34, ["لندن", "نيويورك", "التداخل"], [
                    _seg("s1", "التوقيت", "أغلب التحركات المؤسسية تظهر في نوافذ زمنية محددة."),
                ]),
            ]),
            _level(2, "Order Blocks و Fair Value Gaps", [
                _lec(
                    "smc-l2-01",
                    "Order Blocks: التعريف والأنواع",
                    40,
                    ["Bullish/Bearish OB", "التنقية", "الدخول"],
                    [
                        _seg("s1", "التعريف", "الـ Order Block آخر شمعة معاكسة قبل حركة اندفاعية قوية."),
                        _seg("s2", "الاستخدام", "ندخل عند العودة للمنطقة مع تأكيد رفض."),
                    ],
                ),
                _lec(
                    "smc-l2-02",
                    "Fair Value Gaps (FVG)",
                    38,
                    ["الفجوة السعرية", "الامتلاء الجزئي", "الفلترة"],
                    [
                        _seg("s1", "FVG", "الفجوة تظهر عندما يتحرك السعر بسرعة ويترك خللاً في التوازن."),
                    ],
                ),
                _lec(
                    "smc-l2-03",
                    "BOS و CHOCH داخل منظومة OB/FVG",
                    44,
                    [
                        "BOS = استمرار الهيكل",
                        "CHOCH = تغيّر النية",
                        "ربط الكسر مع Order Block و FVG",
                    ],
                    [
                        _seg(
                            "s1",
                            "تصنيف مهم",
                            "BOS و CHOCH ليسا مدرسة مستقلة. هما أدوات هيكل السوق ضمن جماعة Order Block و Fair Value Gap في ICT/SMC.",
                        ),
                        _seg(
                            "s2",
                            "BOS",
                            "Break of Structure يعني كسر قمة/قاع باتجاه الترند الحالي — غالباً نستهدف بعده FVG أو OB في جهة الاستمرار.",
                        ),
                        _seg(
                            "s3",
                            "CHOCH",
                            "Change of Character أول كسر ضد الاتجاه السابق. نبحث بعده عن Order Block جديد في الاتجاه المعاكس.",
                        ),
                        _seg(
                            "s4",
                            "الدمج",
                            "السيناريو الاحترافي: صيد سيولة → CHOCH/BOS → العودة لـ OB أو FVG → دخول بإدارة مخاطر.",
                        ),
                    ],
                ),
            ]),
            _level(3, "نماذج السيولة المتقدمة", [
                _lec("smc-l3-01", "Inducement و Liquidity Sweeps", 42, ["الخداع", "التأكيد", "الدخول المتأخر"], [
                    _seg("s1", "Inducement", "السوق يغري المتداول بكسر وهمي قبل الاتجاه الحقيقي."),
                ]),
                _lec("smc-l3-02", "Premium و Discount", 36, ["توازن النطاق", "نقطة الدخول الأفضل"], [
                    _seg("s1", "التسعير", "نشتري في الخصم ونبيع في العلاوة داخل النطاق."),
                ]),
            ]),
            _level(4, "بناء سيناريو يومي", [
                _lec("smc-l4-01", "من DXY إلى الزوج", 48, ["ارتباط الدولار", "اختيار الاتجاه", "التنفيذ"], [
                    _seg("s1", "السيناريو", "نبدأ من DXY ثم نختار الزوج المتوافق مع السيولة."),
                ]),
            ]),
            _level(5, "الاحتراف والمراجعة", [
                _lec("smc-l5-01", "مجلة تداول SMC ونسب النجاح", 35, ["تسجيل السيناريو", "مراجعة أسبوعية"], [
                    _seg("s1", "الانضباط", "بدون مجلة لن تعرف أي نموذج يعمل لحسابك."),
                ]),
            ]),
        ],
    },
    {
        "id": "gann",
        "order": 4,
        "name_ar": "مربع جان",
        "name_en": "Gann Square",
        "density": "high",
        "max_level": 4,
        "summary": "الزوايا الزمنية والسعرية، مربع 9، والعلاقات الهندسية لحركة السعر.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "gann_grid",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(1, "مدخل إلى جان", [
                _lec("gann-l1-01", "فلسفة الوقت والسعر", 30, ["التوازن", "الدورات"], [
                    _seg("s1", "الفكرة", "جان يرى أن الوقت والسعر يتحركان بعلاقات هندسية."),
                ]),
            ]),
            _level(2, "مربع 9 والزوايا", [
                _lec("gann-l2-01", "Square of Nine", 40, ["البناء", "المستويات"], [
                    _seg("s1", "المربع", "نستخدم مربع 9 لاستخراج مستويات رد فعل محتملة."),
                ]),
                _lec("gann-l2-02", "زوايا Gann Fan", 36, ["1x1", "2x1", "الديناميكية"], [
                    _seg("s1", "المروحة", "زاوية 1x1 تمثّل توازن الوقت والسعر."),
                ]),
            ]),
            _level(3, "التطبيق على الفوركس", [
                _lec("gann-l3-01", "دمج جان مع الدعم والمقاومة", 38, ["فلترة", "تأكيد"], [
                    _seg("s1", "الدمج", "لا نتداول الزاوية وحدها؛ نؤكّدها بسلوك السعر."),
                ]),
            ]),
            _level(4, "حالات متقدمة", [
                _lec("gann-l4-01", "دورات زمنية للأزواج الرئيسية", 44, ["EURUSD", "XAUUSD"], [
                    _seg("s1", "الدورات", "نراقب تكرار القمم والقيعان عبر نوافذ زمنية."),
                ]),
            ]),
        ],
    },
    {
        "id": "elliott",
        "order": 5,
        "name_ar": "موجات إليوت",
        "name_en": "Elliott Waves",
        "density": "very_high",
        "max_level": 5,
        "summary": "الموجات الدافعة والتصحيحية، القواعد، والفيبوناتشي داخل العدّ الموجي.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "elliott_count",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(1, "أساسيات العدّ", [
                _lec("ew-l1-01", "الموجة الدافعة 5", 34, ["القواعد الثلاث", "الامتدادات"], [
                    _seg("s1", "الدافعة", "خمس موجات مع قواعد صارمة لا يجوز كسرها."),
                ]),
                _lec("ew-l1-02", "التصحيحات ABC", 32, ["Zigzag", "Flat", "Triangle"], [
                    _seg("s1", "التصحيح", "بعد كل اندفاع يأتي تصحيح يعيد التوازن."),
                ]),
            ]),
            _level(2, "الفيبوناتشي والموجات", [
                _lec("ew-l2-01", "نسب الموجة الثالثة والخامسة", 40, ["1.618", "الامتداد"], [
                    _seg("s1", "النسب", "الموجة الثالثة غالباً الأقوى وترتبط بامتدادات فيبو."),
                ]),
            ]),
            _level(3, "العدّ العملي", [
                _lec("ew-l3-01", "كيف نبدأ العدّ بدون انحياز", 38, ["بدائل العدّ", "الإبطال"], [
                    _seg("s1", "البدائل", "نحمل سيناريوهين ونبطل أحدهما بكسر قاعدة."),
                ]),
            ]),
            _level(4, "التوافق مع السيولة", [
                _lec("ew-l4-01", "إليوت + SMC", 42, ["نهاية الموجة", "السيولة"], [
                    _seg("s1", "التوافق", "نهاية موجة غالباً تتزامن مع صيد سيولة."),
                ]),
            ]),
            _level(5, "خطة تنفيذ", [
                _lec("ew-l5-01", "من العدّ إلى أمر التداول", 36, ["الدخول", "الوقف", "الهدف"], [
                    _seg("s1", "التنفيذ", "العدّ بلا إدارة مخاطر مجرد رسم."),
                ]),
            ]),
        ],
    },
    {
        "id": "sk",
        "order": 6,
        "name_ar": "مدرسة SK",
        "name_en": "SK School",
        "density": "high",
        "max_level": 4,
        "summary": "منهج SK التطبيقي: مناطق العرض والطلب، توقيت الجلسات، وإدارة الصفقة بأسلوب ميداني.",
        "classroom": {
            "teacher": "شرح صوتي",
            "screen_theme": "sk_zones",
            "video_pipeline": "ElevenLabs Arabic TTS + full-screen chart slides",
        },
        "levels": [
            _level(1, "مدخل SK", [
                _lec("sk-l1-01", "فلسفة المنهج ولماذا يختلف", 28, ["البساطة", "التنفيذ"], [
                    _seg("s1", "المنهج", "نركّز على مناطق واضحة وقرار واحد في كل جلسة."),
                ]),
            ]),
            _level(2, "مناطق العرض والطلب", [
                _lec("sk-l2-01", "رسم المناطق الصحيحة", 36, ["الأساس", "الانطلاق", "الفلترة"], [
                    _seg("s1", "المنطقة", "المنطقة القوية تسبق اندفاعاً واضحاً مع ترك خلل."),
                ]),
                _lec("sk-l2-02", "الدخول من أول لمسة أو الانتظار", 34, ["الاحتمال", "التأكيد"], [
                    _seg("s1", "التوقيت", "أول لمسة أعلى احتمالاً وأعلى مخاطرة."),
                ]),
            ]),
            _level(3, "إدارة الصفقة", [
                _lec("sk-l3-01", "وقف جزئي وجني مرحلي", 30, ["BE", "أهداف متعددة"], [
                    _seg("s1", "الإدارة", "نحمي رأس المال أولاً ثم نترك جزءاً للامتداد."),
                ]),
            ]),
            _level(4, "روتين يومي", [
                _lec("sk-l4-01", "جلسة لندن/نيويورك بمنهج SK", 40, ["التحضير", "التنفيذ", "المراجعة"], [
                    _seg("s1", "الروتين", "نفس الخطوات كل يوم تقلل العشوائية."),
                ]),
            ]),
        ],
    },
]


def get_schools_summary() -> list[dict]:
    out = []
    for s in ACADEMY_SCHOOLS:
        total_lectures = sum(len(lv["lectures"]) for lv in s["levels"])
        out.append(
            {
                "id": s["id"],
                "order": s["order"],
                "name_ar": s["name_ar"],
                "name_en": s["name_en"],
                "density": s["density"],
                "max_level": s["max_level"],
                "summary": s["summary"],
                "levels_count": len(s["levels"]),
                "lectures_count": total_lectures,
                "classroom": s["classroom"],
                "progress": 0,
            }
        )
    return sorted(out, key=lambda x: x["order"])


def get_school(school_id: str) -> dict | None:
    for s in ACADEMY_SCHOOLS:
        if s["id"] == school_id:
            return s
    return None


def get_lecture(school_id: str, lecture_id: str) -> dict | None:
    school = get_school(school_id)
    if not school:
        return None
    for lv in school["levels"]:
        for lec in lv["lectures"]:
            if lec["id"] == lecture_id:
                return {
                    **lec,
                    "school_id": school_id,
                    "school_name": school["name_ar"],
                    "level": lv["level"],
                    "level_title": lv["title"],
                    "teacher": school["classroom"]["teacher"],
                    "screen_theme": school["classroom"]["screen_theme"],
                    "interrupt_enabled": True,
                }
    return None
