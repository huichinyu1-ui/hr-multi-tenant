/**
 * 台灣勞健保與勞退級距預設資料庫
 * 來源：勞動部、衛福部健保署官方公告
 * 2024 (113年) 基本工資 27,470 / 2025 (114年) 基本工資 28,590
 *
 * 勞保費率：12.5%（員工:雇主:政府 = 20%:70%:10%）
 *   → 員工自付 = 投保薪資 × 12.5% × 20% = 投保薪資 × 0.025
 * 健保費率：5.17%（員工:雇主:政府 = 30%:60%:10%；雇主含眷屬係數1.57）
 *   → 員工自付 = 投保薪資 × 5.17% × 30% = 投保薪資 × 0.01551
 * 勞退：雇主提繳 6%，員工可自提 0~6%
 */

// 完整健保投保金額分級表（2025年，51級）
// 來源：衛生福利部中央健康保險署「113年度」
const HEALTH_GRADES_2025 = [
  { grade: 1,  range_start: 0,      range_end: 28590,  salary: 28590  },
  { grade: 2,  range_start: 28591,  range_end: 30300,  salary: 30300  },
  { grade: 3,  range_start: 30301,  range_end: 31800,  salary: 31800  },
  { grade: 4,  range_start: 31801,  range_end: 33300,  salary: 33300  },
  { grade: 5,  range_start: 33301,  range_end: 34800,  salary: 34800  },
  { grade: 6,  range_start: 34801,  range_end: 36300,  salary: 36300  },
  { grade: 7,  range_start: 36301,  range_end: 38200,  salary: 38200  },
  { grade: 8,  range_start: 38201,  range_end: 40100,  salary: 40100  },
  { grade: 9,  range_start: 40101,  range_end: 42000,  salary: 42000  },
  { grade: 10, range_start: 42001,  range_end: 43900,  salary: 43900  },
  { grade: 11, range_start: 43901,  range_end: 45800,  salary: 45800  },
  { grade: 12, range_start: 45801,  range_end: 48200,  salary: 48200  },
  { grade: 13, range_start: 48201,  range_end: 50600,  salary: 50600  },
  { grade: 14, range_start: 50601,  range_end: 53000,  salary: 53000  },
  { grade: 15, range_start: 53001,  range_end: 55400,  salary: 55400  },
  { grade: 16, range_start: 55401,  range_end: 57800,  salary: 57800  },
  { grade: 17, range_start: 57801,  range_end: 60800,  salary: 60800  },
  { grade: 18, range_start: 60801,  range_end: 63800,  salary: 63800  },
  { grade: 19, range_start: 63801,  range_end: 66800,  salary: 66800  },
  { grade: 20, range_start: 66801,  range_end: 69800,  salary: 69800  },
  { grade: 21, range_start: 69801,  range_end: 72800,  salary: 72800  },
  { grade: 22, range_start: 72801,  range_end: 76500,  salary: 76500  },
  { grade: 23, range_start: 76501,  range_end: 80200,  salary: 80200  },
  { grade: 24, range_start: 80201,  range_end: 83900,  salary: 83900  },
  { grade: 25, range_start: 83901,  range_end: 87600,  salary: 87600  },
  { grade: 26, range_start: 87601,  range_end: 92100,  salary: 92100  },
  { grade: 27, range_start: 92101,  range_end: 96600,  salary: 96600  },
  { grade: 28, range_start: 96601,  range_end: 101100, salary: 101100 },
  { grade: 29, range_start: 101101, range_end: 105600, salary: 105600 },
  { grade: 30, range_start: 105601, range_end: 110100, salary: 110100 },
  { grade: 31, range_start: 110101, range_end: 115500, salary: 115500 },
  { grade: 32, range_start: 115501, range_end: 120900, salary: 120900 },
  { grade: 33, range_start: 120901, range_end: 126300, salary: 126300 },
  { grade: 34, range_start: 126301, range_end: 131700, salary: 131700 },
  { grade: 35, range_start: 131701, range_end: 137100, salary: 137100 },
  { grade: 36, range_start: 137101, range_end: 142500, salary: 142500 },
  { grade: 37, range_start: 142501, range_end: 147900, salary: 147900 },
  { grade: 38, range_start: 147901, range_end: 153300, salary: 153300 },
  { grade: 39, range_start: 153301, range_end: 158700, salary: 158700 },
  { grade: 40, range_start: 158701, range_end: 164100, salary: 164100 },
  { grade: 41, range_start: 164101, range_end: 169500, salary: 169500 },
  { grade: 42, range_start: 169501, range_end: 174900, salary: 174900 },
  { grade: 43, range_start: 174901, range_end: 180300, salary: 180300 },
  { grade: 44, range_start: 180301, range_end: 185700, salary: 185700 },
  { grade: 45, range_start: 185701, range_end: 191100, salary: 191100 },
  { grade: 46, range_start: 191101, range_end: 196500, salary: 196500 },
  { grade: 47, range_start: 196501, range_end: 201900, salary: 201900 },
  { grade: 48, range_start: 201901, range_end: 219500, salary: 219500 },
  { grade: 49, range_start: 219501, range_end: 253000, salary: 253000 },
  { grade: 50, range_start: 253001, range_end: 292000, salary: 292000 },
  { grade: 51, range_start: 292001, range_end: 9999999, salary: 313000 },
];

// 2024 年健保（與 2025 相同，只有最低一級不同）
const HEALTH_GRADES_2024 = HEALTH_GRADES_2025.map((g, i) =>
  i === 0 ? { ...g, range_end: 27470, salary: 27470 } : g
);

// 完整勞保投保薪資分級表（2025年，11級）
const LABOR_GRADES_2025 = [
  { grade: 1,  range_start: 0,     range_end: 28590, salary: 28590 },
  { grade: 2,  range_start: 28591, range_end: 30300, salary: 30300 },
  { grade: 3,  range_start: 30301, range_end: 31800, salary: 31800 },
  { grade: 4,  range_start: 31801, range_end: 33300, salary: 33300 },
  { grade: 5,  range_start: 33301, range_end: 34800, salary: 34800 },
  { grade: 6,  range_start: 34801, range_end: 36300, salary: 36300 },
  { grade: 7,  range_start: 36301, range_end: 38200, salary: 38200 },
  { grade: 8,  range_start: 38201, range_end: 40100, salary: 40100 },
  { grade: 9,  range_start: 40101, range_end: 42000, salary: 42000 },
  { grade: 10, range_start: 42001, range_end: 43900, salary: 43900 },
  { grade: 11, range_start: 43901, range_end: 9999999, salary: 45800 }, // 最高級
];

const LABOR_GRADES_2024 = [
  { grade: 1,  range_start: 0,     range_end: 27470, salary: 27470 },
  { grade: 2,  range_start: 27471, range_end: 28800, salary: 28800 },
  { grade: 3,  range_start: 28801, range_end: 30300, salary: 30300 },
  { grade: 4,  range_start: 30301, range_end: 31800, salary: 31800 },
  { grade: 5,  range_start: 31801, range_end: 33300, salary: 33300 },
  { grade: 6,  range_start: 33301, range_end: 34800, salary: 34800 },
  { grade: 7,  range_start: 34801, range_end: 36300, salary: 36300 },
  { grade: 8,  range_start: 36301, range_end: 38200, salary: 38200 },
  { grade: 9,  range_start: 38201, range_end: 40100, salary: 40100 },
  { grade: 10, range_start: 40101, range_end: 42000, salary: 42000 },
  { grade: 11, range_start: 42001, range_end: 43900, salary: 43900 },
  { grade: 12, range_start: 43901, range_end: 9999999, salary: 45800 }, // 最高級
];

// 勞退提繳工資分級表（2025年，60級）
const PENSION_GRADES_2025 = [
  { grade: 1,  range_start: 0,      range_end: 1500,   salary: 1500   },
  { grade: 2,  range_start: 1501,   range_end: 3000,   salary: 3000   },
  { grade: 3,  range_start: 3001,   range_end: 4500,   salary: 4500   },
  { grade: 4,  range_start: 4501,   range_end: 6000,   salary: 6000   },
  { grade: 5,  range_start: 6001,   range_end: 7500,   salary: 7500   },
  { grade: 6,  range_start: 7501,   range_end: 8700,   salary: 8700   },
  { grade: 7,  range_start: 8701,   range_end: 9900,   salary: 9900   },
  { grade: 8,  range_start: 9901,   range_end: 11100,  salary: 11100  },
  { grade: 9,  range_start: 11101,  range_end: 12540,  salary: 12540  },
  { grade: 10, range_start: 12541,  range_end: 13500,  salary: 13500  },
  { grade: 11, range_start: 13501,  range_end: 15840,  salary: 15840  },
  { grade: 12, range_start: 15841,  range_end: 16500,  salary: 16500  },
  { grade: 13, range_start: 16501,  range_end: 17280,  salary: 17280  },
  { grade: 14, range_start: 17281,  range_end: 17880,  salary: 17880  },
  { grade: 15, range_start: 17881,  range_end: 19047,  salary: 19047  },
  { grade: 16, range_start: 19048,  range_end: 20008,  salary: 20008  },
  { grade: 17, range_start: 20009,  range_end: 21009,  salary: 21009  },
  { grade: 18, range_start: 21010,  range_end: 22000,  salary: 22000  },
  { grade: 19, range_start: 22001,  range_end: 23100,  salary: 23100  },
  { grade: 20, range_start: 23101,  range_end: 24000,  salary: 24000  },
  { grade: 21, range_start: 24001,  range_end: 25250,  salary: 25250  },
  { grade: 22, range_start: 25251,  range_end: 26400,  salary: 26400  },
  { grade: 23, range_start: 26401,  range_end: 27470,  salary: 27470  },
  { grade: 24, range_start: 27471,  range_end: 28590,  salary: 28590  },
  { grade: 25, range_start: 28591,  range_end: 30300,  salary: 30300  },
  { grade: 26, range_start: 30301,  range_end: 31800,  salary: 31800  },
  { grade: 27, range_start: 31801,  range_end: 33300,  salary: 33300  },
  { grade: 28, range_start: 33301,  range_end: 34800,  salary: 34800  },
  { grade: 29, range_start: 34801,  range_end: 36300,  salary: 36300  },
  { grade: 30, range_start: 36301,  range_end: 38200,  salary: 38200  },
  { grade: 31, range_start: 38201,  range_end: 40100,  salary: 40100  },
  { grade: 32, range_start: 40101,  range_end: 42000,  salary: 42000  },
  { grade: 33, range_start: 42001,  range_end: 43900,  salary: 43900  },
  { grade: 34, range_start: 43901,  range_end: 45800,  salary: 45800  },
  { grade: 35, range_start: 45801,  range_end: 48200,  salary: 48200  },
  { grade: 36, range_start: 48201,  range_end: 50600,  salary: 50600  },
  { grade: 37, range_start: 50601,  range_end: 53000,  salary: 53000  },
  { grade: 38, range_start: 53001,  range_end: 55400,  salary: 55400  },
  { grade: 39, range_start: 55401,  range_end: 57800,  salary: 57800  },
  { grade: 40, range_start: 57801,  range_end: 60800,  salary: 60800  },
  { grade: 41, range_start: 60801,  range_end: 63800,  salary: 63800  },
  { grade: 42, range_start: 63801,  range_end: 66800,  salary: 66800  },
  { grade: 43, range_start: 66801,  range_end: 69800,  salary: 69800  },
  { grade: 44, range_start: 69801,  range_end: 72800,  salary: 72800  },
  { grade: 45, range_start: 72801,  range_end: 76500,  salary: 76500  },
  { grade: 46, range_start: 76501,  range_end: 80200,  salary: 80200  },
  { grade: 47, range_start: 80201,  range_end: 83900,  salary: 83900  },
  { grade: 48, range_start: 83901,  range_end: 87600,  salary: 87600  },
  { grade: 49, range_start: 87601,  range_end: 92100,  salary: 92100  },
  { grade: 50, range_start: 92101,  range_end: 96600,  salary: 96600  },
  { grade: 51, range_start: 96601,  range_end: 101100, salary: 101100 },
  { grade: 52, range_start: 101101, range_end: 105600, salary: 105600 },
  { grade: 53, range_start: 105601, range_end: 110100, salary: 110100 },
  { grade: 54, range_start: 110101, range_end: 115500, salary: 115500 },
  { grade: 55, range_start: 115501, range_end: 120900, salary: 120900 },
  { grade: 56, range_start: 120901, range_end: 126300, salary: 126300 },
  { grade: 57, range_start: 126301, range_end: 131700, salary: 131700 },
  { grade: 58, range_start: 131701, range_end: 137100, salary: 137100 },
  { grade: 59, range_start: 137101, range_end: 147900, salary: 147900 },
  { grade: 60, range_start: 147901, range_end: 9999999, salary: 150000 }, // 最高級
];

const PENSION_GRADES_2024 = PENSION_GRADES_2025.map((g, i) =>
  i === 0 ? { ...g } : g
);

// 2026年（115年）版：基本工資調升至 29,500，其餘級距不變
// 勞保：11級，健保：51級，最高 313,000，健保費率 5.17% 不變
const LABOR_GRADES_2026 = LABOR_GRADES_2025.map((g, i) =>
  i === 0 ? { ...g, range_end: 29500, salary: 29500 } : g
);
const HEALTH_GRADES_2026 = HEALTH_GRADES_2025.map((g, i) =>
  i === 0 ? { ...g, range_end: 29500, salary: 29500 } : g
);
const PENSION_GRADES_2026 = PENSION_GRADES_2025.map((g, i) =>
  i === 0 ? { ...g, range_end: 1500, salary: 1500 } : // 勞退第一級不跟基本工資連動
  i === 23 ? { ...g, range_start: 26401, range_end: 27470, salary: 27470 } :
  i === 24 ? { ...g, range_start: 27471, range_end: 29500, salary: 29500 } :
  g
);

const PRESETS = {
  "2026_GOV_STD": {
    id: "2026_GOV_STD",
    name: "2026年 政府標準級距 (基本工資 29,500)",
    ratios: {
      // 勞保費率 12.5%（115年維持不變）
      labor:   { total: 12.5, employee: 20, employer: 70 },
      // 健保費率 5.17%（115年維持不變）
      health:  { total: 5.17, employee: 30, employer: 60 },
      pension: { employee: 0, employer: 6 }
    },
    labor:   LABOR_GRADES_2026,
    health:  HEALTH_GRADES_2026,
    pension: PENSION_GRADES_2026
  },
  "2025_GOV_STD": {
    id: "2025_GOV_STD",
    name: "2025年 政府標準級距 (基本工資 28,590)",
    ratios: {
      labor:   { total: 12.5, employee: 20, employer: 70 },
      health:  { total: 5.17, employee: 30, employer: 60 },
      pension: { employee: 0, employer: 6 }
    },
    labor:   LABOR_GRADES_2025,
    health:  HEALTH_GRADES_2025,
    pension: PENSION_GRADES_2025
  },
  "2024_GOV_STD": {
    id: "2024_GOV_STD",
    name: "2024年 政府標準級距 (基本工資 27,470)",
    ratios: {
      labor:   { total: 12.0, employee: 20, employer: 70 },
      health:  { total: 5.17, employee: 30, employer: 60 },
      pension: { employee: 0, employer: 6 }
    },
    labor:   LABOR_GRADES_2024,
    health:  HEALTH_GRADES_2024,
    pension: PENSION_GRADES_2024
  }
};

module.exports = PRESETS;
