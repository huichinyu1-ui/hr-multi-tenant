const { evaluate } = require('mathjs');

const customScope = {
  if: (cond, trueVal, falseVal) => (cond ? trueVal : falseVal),
  and: (a, b) => (a && b ? 1 : 0),
  or: (a, b) => (a || b ? 1 : 0),
};

const tests = [
  { name: 'IF 判斷式',       expr: 'if(30 > 10, 500, 0)',         expect: 500 },
  { name: 'IF 判斷式(否)',   expr: 'if(5 > 10, 500, 0)',          expect: 0 },
  { name: 'ROUND',           expr: 'round(3.567, 0)',              expect: 4 },
  { name: 'CEIL',            expr: 'ceil(100.1)',                  expect: 101 },
  { name: 'FLOOR',           expr: 'floor(100.9)',                 expect: 100 },
  { name: 'ABS',             expr: 'abs(-500)',                    expect: 500 },
  { name: 'MAX',             expr: 'max(1000, 27470)',             expect: 27470 },
  { name: 'MIN',             expr: 'min(9999, 5000)',              expect: 5000 },
  { name: 'AND (true)',      expr: 'and(1, 1)',                    expect: 1 },
  { name: 'AND (false)',     expr: 'and(1, 0)',                    expect: 0 },
  { name: 'OR (true)',       expr: 'or(0, 1)',                     expect: 1 },
  { name: 'OR (false)',      expr: 'or(0, 0)',                     expect: 0 },
  { name: '複合公式',        expr: 'if(10/2 > 3, round(100.6, 0), 0)', expect: 101 },
];

console.log('--- 公式函數測試 ---\n');
let pass = 0, fail = 0;
for (const t of tests) {
  try {
    const result = Math.round(Number(evaluate(t.expr, customScope)));
    const ok = result === t.expect;
    console.log(`${ok ? '✅' : '❌'} ${t.name}: ${t.expr} = ${result} (預期: ${t.expect})`);
    ok ? pass++ : fail++;
  } catch (e) {
    console.log(`❌ ${t.name}: 錯誤 - ${e.message}`);
    fail++;
  }
}
console.log(`\n結果: ${pass} 通過, ${fail} 失敗`);
