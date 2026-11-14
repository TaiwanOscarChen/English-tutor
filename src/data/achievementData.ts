import { AchievementDomain, MilestoneBadge } from '../types';

export const FAB_ACHIEVEMENT_DOMAINS: AchievementDomain[] = [
  {
    id: 'foup-loadport',
    title: '晶圓載具與 FOUP 傳送',
    englishTitle: 'FOUP & Loadport Handling',
    iconName: 'Box',
    color: 'from-amber-500 to-yellow-400',
    description: '掌握晶圓載具鎖死、開門卡爪異常及 OHT 派車失敗之急救對答',
    nodes: [
      {
        id: 'node-foup-1',
        title: 'FOUP 門爪夾死',
        domainId: 'foup-loadport',
        domainName: '晶圓載具與 FOUP 傳送',
        svoPattern: 'S (Tech) + V (Release) + O (Door Latch)',
        scenario: 'Loadport 門爪突然無法卸載晶圓盒',
        level: 1,
        iconName: 'Lock',
        status: 'mastered',
        masteryPercentage: 100,
        rewardBadgeTitle: '載具門爪解鎖者'
      },
      {
        id: 'node-foup-2',
        title: 'OHT 懸空卡車',
        domainId: 'foup-loadport',
        domainName: '晶圓載具與 FOUP 傳送',
        svoPattern: 'S (OHT Rail) + V (Hold) + O (Pod Position)',
        scenario: '天花板天車停在半空卡住路徑',
        level: 2,
        iconName: 'Truck',
        status: 'mastered',
        masteryPercentage: 100,
        requiredNodeIds: ['node-foup-1'],
        rewardBadgeTitle: 'OHT 降落導航員'
      },
      {
        id: 'node-foup-3',
        title: 'Mapping 錯位警報',
        domainId: 'foup-loadport',
        domainName: '晶圓載具與 FOUP 傳送',
        svoPattern: 'S (Sensor) + V (Detect) + O (Cross-Slot Wafer)',
        scenario: '雷射感測器掃描到雙層跳槽晶圓',
        level: 3,
        iconName: 'Grid',
        status: 'practicing',
        masteryPercentage: 65,
        requiredNodeIds: ['node-foup-2'],
        rewardBadgeTitle: '零破片金牌 FSE'
      }
    ]
  },
  {
    id: 'vacuum-pump',
    title: '真空腔體與 Dry Pump',
    englishTitle: 'Vacuum Chamber & Pump PM',
    iconName: 'Gauge',
    color: 'from-cyan-500 to-blue-500',
    description: '熟練乾式幫浦抽氣洩漏、渦輪分子幫浦軸承異常與上鎖掛牌流程',
    nodes: [
      {
        id: 'node-vac-1',
        title: 'LOTO 上鎖掛牌',
        domainId: 'vacuum-pump',
        domainName: '真空腔體與 Dry Pump',
        svoPattern: 'S (Engineer) + V (Apply) + O (LOTO Lock)',
        scenario: '進入 High-Vac 腔體檢修前標準工安程序',
        level: 1,
        iconName: 'ShieldCheck',
        status: 'mastered',
        masteryPercentage: 100,
        rewardBadgeTitle: '工安 LOTO 守護神'
      },
      {
        id: 'node-vac-2',
        title: 'Dry Pump 高溫退化',
        domainId: 'vacuum-pump',
        domainName: '真空腔體與 Dry Pump',
        svoPattern: 'S (Pump Water) + V (Cool) + O (Rotor Temperature)',
        scenario: '乾式幫浦冷卻水流量低下導致過熱Warning',
        level: 2,
        iconName: 'Thermometer',
        status: 'mastered',
        masteryPercentage: 100,
        requiredNodeIds: ['node-vac-1'],
        rewardBadgeTitle: '真空低溫專家'
      },
      {
        id: 'node-vac-3',
        title: 'TMP 渦輪振動洩漏',
        domainId: 'vacuum-pump',
        domainName: '真空腔體與 Dry Pump',
        svoPattern: 'S (Helium Leak Detector) + V (Locate) + O (Micro Leak)',
        scenario: '用氦氣檢漏儀搜尋 10^-8 Torr 微小微滲漏',
        level: 3,
        iconName: 'Activity',
        status: 'practicing',
        masteryPercentage: 80,
        requiredNodeIds: ['node-vac-2'],
        rewardBadgeTitle: 'EUV 極限真空大師'
      }
    ]
  },
  {
    id: 'rf-plasma',
    title: 'RF 射頻電漿與 Matcher',
    englishTitle: 'RF Plasma & Power Matcher',
    iconName: 'Zap',
    color: 'from-yellow-400 to-amber-500',
    description: '掌控 13.56MHz 射頻反射波過高、點火失敗與頻率偏置校正',
    nodes: [
      {
        id: 'node-rf-1',
        title: 'RF 匹配箱手動調諧',
        domainId: 'rf-plasma',
        domainName: 'RF 射頻電漿與 Matcher',
        svoPattern: 'S (Matcher) + V (Tune) + O (Capacitor Value)',
        scenario: '高反射功率導致點火熄滅',
        level: 1,
        iconName: 'Radio',
        status: 'mastered',
        masteryPercentage: 100,
        rewardBadgeTitle: '射頻諧振精算師'
      },
      {
        id: 'node-rf-2',
        title: 'Plasma 電漿打火閃爍',
        domainId: 'rf-plasma',
        domainName: 'RF 射頻電漿與 Matcher',
        svoPattern: 'S (Interlock) + V (Trip) + O (RF Generator)',
        scenario: '腔體石英窗沉積薄膜導致電漿閃爍 Trip 機',
        level: 2,
        iconName: 'Zap',
        status: 'practicing',
        masteryPercentage: 70,
        requiredNodeIds: ['node-rf-1'],
        rewardBadgeTitle: '電漿火花控速師'
      }
    ]
  },
  {
    id: 'gas-mfc',
    title: '特氣管道與 MFC 控制',
    englishTitle: 'Gas Line & MFC Precision',
    iconName: 'Wind',
    color: 'from-emerald-400 to-teal-500',
    description: '特氟龍氣體閥門鎖死、MFC 流量飄移與排氣 Scrubbing 氣密溝通',
    nodes: [
      {
        id: 'node-gas-1',
        title: 'MFC 流量飄移校正',
        domainId: 'gas-mfc',
        domainName: '特氣管道與 MFC 控制',
        svoPattern: 'S (Calibrator) + V (Adjust) + O (MFC Flow Offset)',
        scenario: 'SiH4 或 Ar 氣體實際流量與設定值偏差 5%',
        level: 1,
        iconName: 'Sliders',
        status: 'mastered',
        masteryPercentage: 100,
        rewardBadgeTitle: '微升流量精準大師'
      },
      {
        id: 'node-gas-2',
        title: 'Scrubber 尾氣抽氣不平',
        domainId: 'gas-mfc',
        domainName: '特氣管道與 MFC 控制',
        svoPattern: 'S (Exhaust Duct) + V (Purge) + O (Toxic Residue)',
        scenario: '毒性氣體廢氣管路壓差警報排除',
        level: 2,
        iconName: 'Flame',
        status: 'practicing',
        masteryPercentage: 50,
        requiredNodeIds: ['node-gas-1'],
        rewardBadgeTitle: '綠能廢氣防衛官'
      }
    ]
  },
  {
    id: 'alarm-handover',
    title: '異常交接與技術支援溝通',
    englishTitle: 'Alarm Handover & Tech Support',
    iconName: 'MessageSquare',
    color: 'from-purple-400 to-indigo-500',
    description: '交接班停機主因交代、跨部門技術支援電話會報與備品零件追查',
    nodes: [
      {
        id: 'node-ho-1',
        title: '大夜班異常停機匯報',
        domainId: 'alarm-handover',
        domainName: '異常交接與技術支援溝通',
        svoPattern: 'S (Night Shift) + V (Isolate) + O (Failed Valve)',
        scenario: '向日班帶班主管與副理進行 3 分鐘精準重點交接',
        level: 1,
        iconName: 'Clock',
        status: 'mastered',
        masteryPercentage: 100,
        rewardBadgeTitle: '交接簡報零延遲'
      },
      {
        id: 'node-ho-2',
        title: '國際設備技術專家連線',
        domainId: 'alarm-handover',
        domainName: '異常交接與技術支援溝通',
        svoPattern: 'S (FSE) + V (Escalate) + O (Diagnostic Log)',
        scenario: '與國際設備技術專家線上共同排錯',
        level: 2,
        iconName: 'Globe',
        status: 'practicing',
        masteryPercentage: 85,
        requiredNodeIds: ['node-ho-1'],
        rewardBadgeTitle: '跨國半導體雙語戰神'
      }
    ]
  }
];

export const MILESTONE_BADGES: MilestoneBadge[] = [
  {
    id: 'badge-foup-master',
    title: 'OHT 晶圓降落導航員',
    category: 'FOUP 載具特訓',
    icon: 'Package',
    description: '精通晶圓傳送、FOUP 解鎖與零破片夾爪緊急狀況英語溝通。',
    isUnlocked: true,
    unlockedAt: '2026-08-01',
    bonusAttributes: ['+25% FOUP 自動排錯反應速', '+20% 晶圓防破損自信心']
  },
  {
    id: 'badge-vacuum-guardian',
    title: 'EUV 極限真空守護神',
    category: '真空幫浦與 LOTO',
    icon: 'ShieldCheck',
    description: '熟練 10^-8 Torr 微小氦氣滲漏追蹤與 LOTO 安全防護標準台詞。',
    isUnlocked: true,
    unlockedAt: '2026-08-05',
    bonusAttributes: ['+30% 工安稽核流暢度', '+15% 氦氣檢漏無停頓口頭說明']
  },
  {
    id: 'badge-rf-whisperer',
    title: '射頻電漿諧振大師',
    category: 'RF Matcher 諧振',
    icon: 'Zap',
    description: '點火熄滅與匹配箱高反射功率對答掌握率達 80% 以上。',
    isUnlocked: false,
    bonusAttributes: ['+20% RF 點火排錯口訣力', '+10% 匹配箱參數解說力']
  },
  {
    id: 'badge-handover-king',
    title: '半導體交接英語簡報大師',
    category: '交接匯報',
    icon: 'Award',
    description: '3 分鐘內精確交代大夜班 Down 機主因、處置步驟與日班 Pending Action。',
    isUnlocked: true,
    unlockedAt: '2026-08-08',
    bonusAttributes: ['+35% 交接英文說服力', '+25% 副理點頭滿意度']
  }
];
