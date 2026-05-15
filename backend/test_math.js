const FormulaEngine = require('./src/services/FormulaEngine');
const pool = { base: 40000, late_days: 0, absent_days: 0 };

console.log(FormulaEngine.calculate('{base} * 0.05', pool));
console.log(FormulaEngine.calculate('{late_days} + {absent_days} == 0 ? 1000 : 0', pool));
