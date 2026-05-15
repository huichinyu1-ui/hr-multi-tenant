const { evaluate } = require('mathjs');

class FormulaEngine {
  /**
   * 建立員工當月的變數池
   * @param {Object} employee 員工資料
   * @param {Object} attendance 當月出勤紀錄
   * @returns {Object} 變數池
   */
  static createVariablePool(employee, attendance) {
    // 關鍵修正：將 Prisma 物件轉為純 JS 物件，確保 Object.keys 能抓到所有欄位
    const empData = JSON.parse(JSON.stringify(employee));
    
    const pool = {
      base: Number(empData.base_salary) || 0,
      base_salary: Number(empData.base_salary) || 0,
    };

    // 動態加入員工資料中的所有數值欄位
    Object.keys(empData).forEach(key => {
      const val = empData[key];
      // 排除非數值欄位
      if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val) && val !== '' && val !== null)) {
        pool[key] = Number(val);
      }
    });

    // 合併考勤數據並確保數值化
    if (attendance) {
      Object.keys(attendance).forEach(key => {
        const val = attendance[key];
        pool[key] = (typeof val === 'number') ? val : (Number(val) || 0);
      });
    }

    return pool;
  }

  /**
   * 替換字串公式中的變數並計算結果
   * @param {String} formula_expr 公式
   * @param {Object} pool 變數池
   * @returns {Number} 計算結果
   */
  static calculate(formula_expr, pool) {
    if (!formula_expr) return 0;
    
    // 強制數值替換模式：
    // 將 {var_name} 替換為實際數值，徹底避免變數名解析錯誤
    const parsedExpr = formula_expr.replace(/{([^}]+)}/g, (match, varName) => {
      const val = pool[varName.trim()];
      if (val === undefined || val === null) {
        // 如果找不到變數，記錄警告並補 0
        console.warn(`[FormulaEngine] 找不到變數: ${varName}`);
        return 0;
      }
      return Number(val);
    });

    // 自訂函數範疇：補齊 mathjs 沒有的 if/and/or 語法
    const customScope = {
      if: (cond, trueVal, falseVal) => (cond ? trueVal : falseVal),
      and: (a, b) => (a && b ? 1 : 0),
      or: (a, b) => (a || b ? 1 : 0),
    };

    try {
      // 使用 mathjs 進行純數值運算，並注入自訂函數
      const result = evaluate(parsedExpr, customScope);
      
      if (typeof result === 'boolean') {
        return result ? 1 : 0;
      }
      // 確保結果是數字，並進行四捨五入取整
      return Math.round(Number(result) || 0);
    } catch (error) {
      console.error(`公式計算錯誤: "${formula_expr}" 解析為 "${parsedExpr}" ->`, error.message);
      return 0;
    }
  }
}

module.exports = FormulaEngine;
