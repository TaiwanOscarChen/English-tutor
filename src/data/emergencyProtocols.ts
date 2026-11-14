export interface EmergencyProtocol {
  id: string;
  category: 'gas' | 'chemical' | 'equipment' | 'safety' | 'handover';
  titleZh: string;
  titleEn: string;
  urgency: 'critical' | 'high' | 'warning';
  iconName: string;
  summary: string;
  sopSteps: {
    stepNumber: number;
    actionZh: string;
    actionEn: string;
    phonetic: string;
    keyTerm: string;
    cleanroomTip: string;
  }[];
  broadcastScriptEn: string;
  broadcastScriptZh: string;
  essentialVocab: {
    term: string;
    phonetic: string;
    meaning: string;
    example: string;
  }[];
}

export const FAB_EMERGENCY_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'sos-toxic-gas',
    category: 'gas',
    titleZh: '🚨 劇毒與易燃氣體洩漏警報及緊急疏散',
    titleEn: 'Toxic & Flammable Gas Alarm Evacuation Protocol',
    urgency: 'critical',
    iconName: 'AlertTriangle',
    summary: '當矽甲烷、三氟化氮或氯氣偵測器觸發二級警報時之現場應變與英文通報標準程序。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '立即停止機台進氣並按下緊急排氣按鈕。',
        actionEn: 'Immediately isolate the gas inlet and trigger the emergency exhaust interlock.',
        phonetic: '[ɪˋmidɪɪtlɪ ˋaɪs!͵et ðə gæs ˋɪnlɛt]',
        keyTerm: 'Emergency Exhaust Interlock',
        cleanroomTip: '切勿重啟機台，直接通報廠務緊急應變中心。'
      },
      {
        stepNumber: 2,
        actionZh: '對周圍人員高喊撤離並透過無線電回報應變控制中心。',
        actionEn: 'Evacuate all personnel in the process area and report the gas alarm to the response center immediately.',
        phonetic: '[ɪˋvækjʊ͵et ɔl ͵pɝsəˋnɛl ɪn ðə ˋprɑsɛs ˋɛrɪə]',
        keyTerm: 'Evacuate Area Personnel',
        cleanroomTip: '使用標準無線電通報格式：通報人身份、所在區域位置、氣體種類與濃度數值。'
      },
      {
        stepNumber: 3,
        actionZh: '逆風向撤離至無塵室緊急集合點並清點人數。',
        actionEn: 'Proceed upwind to the designated muster station outside the airlock and perform roll call.',
        phonetic: '[prəˋsid ˋʌp͵wɪnd tu ðə ˋmʌstɚ ˋsteʃən]',
        keyTerm: 'Muster Station & Roll Call',
        cleanroomTip: '不可搭乘電梯，一律由氣閘緊急安全門疏散。'
      }
    ],
    broadcastScriptEn: 'Attention all personnel: A hazardous gas alarm has been triggered in the dry etch area. Evacuate immediately via the emergency exit to the muster station!',
    broadcastScriptZh: '全廠人員請注意：乾蝕刻製程區已觸發危險氣體警報。請所有人立即由緊急逃生門疏散至集合點！',
    essentialVocab: [
      { term: 'Gas Abatement System', phonetic: '[gæs əˋbetmənt ˋsɪstəm]', meaning: '廢氣燃燒與洗滌處理系統', example: 'Check if the gas scrubber abatement unit is operating normally.' },
      { term: 'Muster Station', phonetic: '[ˋmʌstɚ ˋsteʃən]', meaning: '緊急疏散集合點', example: 'All shift members must assemble at the muster station.' },
      { term: 'Lower Flammable Limit', phonetic: '[ˋloɚ ˋflæməb! ˋlɪmɪt]', meaning: '爆炸下限與燃燒下限濃度', example: 'The hydrogen concentration remained below the lower flammable limit.' },
      { term: 'Emergency Response Center', phonetic: '[ɪˋmɝdʒənsɪ rɪˋspɑns ˋsɛntɚ]', meaning: '廠務緊急應變中心', example: 'Report the alarm directly to the emergency response center.' }
    ]
  },
  {
    id: 'sos-hf-chemical-burn',
    category: 'chemical',
    titleZh: '🧪 氫氟酸與強酸鹼噴濺中和急救',
    titleEn: 'Hydrofluoric Acid Splash & Eyewash Station Protocol',
    urgency: 'critical',
    iconName: 'ShieldAlert',
    summary: '濕式化學清洗或研磨機台發生強酸或氫氟酸噴濺時的黃金急救處置與通報。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '立即拉下緊急淋浴洗眼器，持續大量沖水十五分鐘以上。',
        actionEn: 'Pull the emergency eyewash safety shower and flush continuously for at least fifteen minutes.',
        phonetic: '[pʊl ðə ɪˋmɝdʒənsɪ ˋaɪ͵wɑʃ ˋʃaʊɚ]',
        keyTerm: 'Emergency Eyewash & Safety Shower',
        cleanroomTip: '不要先脫去無塵衣再沖水，應立即整身衝入淋浴區，邊沖水邊移除受污染衣物。'
      },
      {
        stepNumber: 2,
        actionZh: '若為氫氟酸噴濺，沖水後立即厚塗葡萄糖酸鈣中和軟膏。',
        actionEn: 'Apply calcium gluconate gel generously over the exposed skin area immediately after rinsing.',
        phonetic: '[ˋkælsɪəm ˋglukə͵net dʒɛl]',
        keyTerm: 'Calcium Gluconate Gel',
        cleanroomTip: '戴上防酸手套塗敷患部直到疼痛緩解，以防止氟離子滲透皮膚組織。'
      },
      {
        stepNumber: 3,
        actionZh: '通報救護車並指定攜帶化學專用醫療急救包護送就醫。',
        actionEn: 'Call medical emergency dispatch and escort the injured person with the chemical antidote kit.',
        phonetic: '[ˋɛskɔrt wɪð ðə ˋæntɪ͵dot kɪt]',
        keyTerm: 'Medical Escort with Antidote Kit',
        cleanroomTip: '向急診醫師清楚說明接觸之酸鹼化學品名稱與濃度。'
      }
    ],
    broadcastScriptEn: 'Chemical incident alert: Suspected acid exposure in the wet clean area. First responder deployed with calcium gluconate gel and medical kit!',
    broadcastScriptZh: '化學事故通報：濕式清洗區疑似發生氫氟酸接觸事故。現場急救員已攜帶葡萄糖酸鈣軟膏與急救包前往支援！',
    essentialVocab: [
      { term: 'Calcium Gluconate Gel', phonetic: '[ˋkælsɪəm ˋglukə͵net dʒɛl]', meaning: '葡萄糖酸鈣軟膏', example: 'Check the expiration date on the calcium gluconate gel tubes.' },
      { term: 'Eyewash Station', phonetic: '[ˋaɪ͵wɑʃ ˋsteʃən]', meaning: '緊急洗眼器', example: 'The weekly inspection tag on the eyewash station is verified.' },
      { term: 'Personal Protective Equipment', phonetic: '[ˋpɝsən! prəˋtɛktɪv ɪˋkwɪpmənt]', meaning: '個人化學防護裝備', example: 'Full acid-resistant protective equipment must be worn prior to maintenance.' }
    ]
  },
  {
    id: 'sos-wafer-drop-crash',
    category: 'equipment',
    titleZh: '🤖 機械手臂掉片與晶圓破片異常處置',
    titleEn: 'Wafer Transfer Arm Drop & Particle Excursion Protocol',
    urgency: 'high',
    iconName: 'Cpu',
    summary: '前端機械手臂吸嘴真空失效導致十二吋晶圓破片或晶圓盒卡片碰撞時之標準處置。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '切勿手動強行拉扯機械手臂，立即在主機介面執行暫停進料與扣留。',
        actionEn: 'Put the tool on hold and inhibit the wafer transfer sequence immediately to prevent chain collisions.',
        phonetic: '[ɪnˋhɪbɪt ðə ˋwefɚ ˋtrænsfɚ ˋsikwəns]',
        keyTerm: 'Tool Inhibit & Transfer Abort',
        cleanroomTip: '避免機台繼續抽片導致更多晶圓受損。'
      },
      {
        stepNumber: 2,
        actionZh: '記錄真空監控數值與晶圓破片位置，並通報設備工程負責人。',
        actionEn: 'Record the end-effector position and notify the equipment engineer of the vacuum drop.',
        phonetic: '[ˋnɑtə͵faɪ ðə ɪˋkwɪpmənt ͵ɛndʒəˋnɪr]',
        keyTerm: 'End-Effector Vacuum Excursion',
        cleanroomTip: '調閱真空計數值與感測器日誌作為異常根因分析依據。'
      },
      {
        stepNumber: 3,
        actionZh: '使用無塵專用防靜電真空吸筆回收碎片，並執行測試片落塵驗證。',
        actionEn: 'Use an electrostatic-safe vacuum wand to retrieve fragments and perform a dummy particle run.',
        phonetic: '[ˋvækjuəm wɑnd tu rɪˋtriv ˋfrægmənts]',
        keyTerm: 'Dummy Particle Run',
        cleanroomTip: '確認微塵顆粒數低於放行標準後，方可恢復生產。'
      }
    ],
    broadcastScriptEn: 'Tool down notification: Wafer transfer robot error detected. Production lot is held at the loadport and particle sweep is in progress.',
    broadcastScriptZh: '機台停機通知：晶圓傳輸機械手臂異常。生產批次已於載入口暫停保護，目前正進行微塵清掃作業。',
    essentialVocab: [
      { term: 'End-Effector', phonetic: '[ˋɛnd ɪˋfɛktɚ]', meaning: '機械手臂末端夾爪與吸盤', example: 'Inspect the suction pads on the end-effector for wear.' },
      { term: 'Particle Count Excursion', phonetic: '[ˋpɑrtɪk! kaʊnt ɪkˋskɝʒən]', meaning: '微塵粒子數超標異常', example: 'The optical inspection detected a particle count excursion.' },
      { term: 'Dummy Wafer Run', phonetic: '[ˋdʌmɪ ˋwefɚ rʌn]', meaning: '測試片暖機跑線驗證', example: 'Run dummy wafers to verify the transfer accuracy.' }
    ]
  },
  {
    id: 'sos-loto-interlock',
    category: 'safety',
    titleZh: '⚡ 機台高壓斷電與上鎖掛牌安全程序',
    titleEn: 'Lockout-Tagout Electrical Safety Procedure',
    urgency: 'high',
    iconName: 'Zap',
    summary: '更換射頻電源、真空幫浦或進入腔體內部檢修前的標準高壓隔離與上鎖掛牌程序。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '確認機台進入低溫低壓安全狀態，切斷總電源斷路器。',
        actionEn: 'De-energize the main circuit breaker and verify zero energy state on all power supplies.',
        phonetic: '[diˋɛnɚ͵dʒaɪz ðə men ˋsɝkɪt ˋbrekɚ]',
        keyTerm: 'De-energize & Zero Energy State',
        cleanroomTip: '使用電表測量確認殘餘電壓為零伏特。'
      },
      {
        stepNumber: 2,
        actionZh: '掛上個人專屬安全鎖與防護警示吊牌。',
        actionEn: 'Attach your personal padlock and danger tag to the electrical isolation switchbox.',
        phonetic: '[əˋtætʃ jʊr ˋpɝsən! ˋpæd͵lɑk]',
        keyTerm: 'Padlock & Personal Danger Tag',
        cleanroomTip: '一人一鎖一鑰匙，嚴禁代掛或由他人解鎖。'
      },
      {
        stepNumber: 3,
        actionZh: '作業完畢後由原掛鎖工程師親自巡檢解鎖並回報復電。',
        actionEn: 'Conduct final clearance check and remove the personal lock prior to system re-energization.',
        phonetic: '[ri͵ɛnɚdʒəˋzeʃən ˋklɪrəns]',
        keyTerm: 'Re-energization Clearance',
        cleanroomTip: '確認無任何工具遺留在配電箱內再行復電。'
      }
    ],
    broadcastScriptEn: 'Safety notice: Lockout-tagout protocol is active on the process equipment. High voltage supply is isolated and locked. Do not attempt to re-energize!',
    broadcastScriptZh: '工安告示：製程機台已啟動上鎖掛牌安全程序。高壓電源已隔離上鎖，嚴禁嘗試重送電！',
    essentialVocab: [
      { term: 'Lockout Tagout', phonetic: '[ˋlɑk͵aʊt ˋtæg͵aʊt]', meaning: '上鎖掛牌斷電工安程序', example: 'Always complete lockout tagout before electrical maintenance.' },
      { term: 'Zero Energy State', phonetic: '[ˋzɪro ˋɛnɚdʒɪ stet]', meaning: '零能量與零殘餘電壓安全狀態', example: 'Discharge all capacitors to achieve complete zero energy state.' },
      { term: 'Circuit Breaker', phonetic: '[ˋsɝkɪt ˋbrekɚ]', meaning: '總電源無熔絲斷路器', example: 'Switch off the main circuit breaker on the power rack.' }
    ]
  },
  {
    id: 'sos-smoke-fire',
    category: 'safety',
    titleZh: '🔥 無塵室極早期煙霧偵測與火警通報',
    titleEn: 'Cleanroom Fire & Early Smoke Detection Protocol',
    urgency: 'critical',
    iconName: 'Flame',
    summary: '當無塵室天花板或回風道極早期煙霧偵測器觸發火警警報時之黃金通報與氣體滅火避險程序。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '確認煙霧來源並立即啟動手動火警發信機按鈕。',
        actionEn: 'Locate the smoke source and immediately trigger the manual fire pull station.',
        phonetic: '[ˋloket ðə smok sors ænd pʊl ðə ˋsteʃən]',
        keyTerm: 'Manual Fire Alarm Pull Station',
        cleanroomTip: '切勿慌亂，先確認自身逃生動線暢通無阻。'
      },
      {
        stepNumber: 2,
        actionZh: '通報廠務應變中心說明起火區域及化學品狀態。',
        actionEn: 'Radio the emergency response dispatch with exact area location and chemical involvement status.',
        phonetic: '[ˋredɪo ðə ɪˋmɝdʒənsɪ rɪˋspɑns ˋdɪspætʃ]',
        keyTerm: 'Emergency Radio Report',
        cleanroomTip: '回報內容包含是否有特氣或有機溶劑受影響。'
      },
      {
        stepNumber: 3,
        actionZh: '若潔淨氣體自動滅火系統倒數警報響起，立即在三十秒內撤離該區域！',
        actionEn: 'Evacuate the area immediately if the gaseous fire suppression pre-discharge siren sounds.',
        phonetic: '[ɪˋvækjʊ͵et bɪˋfor pri-dɪsˋtʃɑrdʒ]',
        keyTerm: 'Gaseous Fire Suppression Evacuation',
        cleanroomTip: '自動滅火氣體釋放時會降低氧氣濃度，人員必須先行撤出。'
      }
    ],
    broadcastScriptEn: 'Emergency fire alert: Early smoke detected in the lithography module area. All personnel evacuate via the emergency stairwell immediately!',
    broadcastScriptZh: '緊急火警廣播：微影模組區域偵測到煙霧警報。全體人員請立即由緊急安全梯疏散！',
    essentialVocab: [
      { term: 'Early Smoke Detection', phonetic: '[ˋɝlɪ smok dɪˋtɛkʃən]', meaning: '極早期吸氣式煙霧探測系統', example: 'Early smoke detection triggered an alert in the return air duct.' },
      { term: 'Fire Suppression System', phonetic: '[faɪr səˋprɛʃən ˋsɪstəm]', meaning: '潔淨氣體自動滅火系統', example: 'The automatic fire suppression system will discharge in thirty seconds.' },
      { term: 'Fire Extinguisher', phonetic: '[faɪr ɪkˋstɪŋgwɪʃɚ]', meaning: '電氣專用滅火器', example: 'Use the carbon dioxide extinguisher for electrical panel fires.' }
    ]
  },
  {
    id: 'sos-earthquake-fab',
    category: 'safety',
    titleZh: '🌍 強震突發與機台自動停機聯鎖應變',
    titleEn: 'Earthquake Scram & Chemical Line Interlock Protocol',
    urgency: 'high',
    iconName: 'Activity',
    summary: '無塵室感震儀偵測強震時，機台自動急停與毒性氣體管路聯鎖巡檢標準程序。',
    sopSteps: [
      {
        stepNumber: 1,
        actionZh: '就地避難：遠離高處掛架、天車軌道與玻璃視窗，迅速蹲下護頭。',
        actionEn: 'Drop, cover, and stay clear of overhead tracks and elevated chemical piping immediately.',
        phonetic: '[drɑp, ˋkʌvɚ, ænd ste klɪr ʌv ˋovɚ͵hɛd træks]',
        keyTerm: 'Drop, Cover & Hold On',
        cleanroomTip: '留意天花板晶圓天車是否有晃動風險。'
      },
      {
        stepNumber: 2,
        actionZh: '主震停止後，檢查機台地震聯鎖是否已成功切斷特氣供應。',
        actionEn: 'Verify that the automated seismic interlock has isolated all toxic gas supplies.',
        phonetic: '[ˋvɛrə͵faɪ ˋsaɪzmɪk ˋɪntɚ͵lɑk]',
        keyTerm: 'Seismic Gas Valve Interlock',
        cleanroomTip: '確認氣櫃氣動隔離閥均已自動關閉鎖定。'
      },
      {
        stepNumber: 3,
        actionZh: '依照廣播指示依序撤離，於集合點清點名冊並回報機台與晶圓狀態。',
        actionEn: 'Evacuate orderly following public announcements and submit tool status logs to the shift lead.',
        phonetic: '[səbˋmɪt tul ˋstetəs lɔgz]',
        keyTerm: 'Post-Quake Damage Assessment',
        cleanroomTip: '待環境監測確認無氣體外洩後，方可依序重返復機。'
      }
    ],
    broadcastScriptEn: 'Earthquake protocol active: Seismic sensors triggered safety interlocks. All tools are in safe hold state. Await facility structural clearance.',
    broadcastScriptZh: '地震應變啟動：感震儀已觸發安全聯鎖。全區機台進入安全保持狀態，請靜候廠務安全結構放行通知。',
    essentialVocab: [
      { term: 'Seismic Interlock', phonetic: '[ˋsaɪzmɪk ˋɪntɚ͵lɑk]', meaning: '地震自動切斷聯鎖裝置', example: 'The seismic sensor automatically shut off the gas pipeline.' },
      { term: 'Tool Scram', phonetic: '[tul skræm]', meaning: '機台緊急聯鎖急停', example: 'All process tools went into emergency scram mode.' },
      { term: 'Gas Free Clearance', phonetic: '[gæs fri ˋklɪrəns]', meaning: '氣體零外洩安全放行', example: 'Facility engineers confirmed gas free clearance after inspection.' }
    ]
  }
];
