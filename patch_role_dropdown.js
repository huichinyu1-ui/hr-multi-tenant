const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/Employees.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 使用正規表達式匹配整個角色下拉區塊（不管空格/換行細節）
const regex = /(<div className="space-y-1\.5 md:col-span-2">\s*<label className="text-xs font-black text-gray-500">角色權限類別<\/label>\s*<select value=\{form\.role\}[^>]*>[\s\S]*?<\/select>\s*<\/div>)/;

const newSnippet = `<div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-black text-gray-500">角色權限類別</label>
                        <select
                          value={form.roleId ?? ''}
                          onChange={e => {
                            const matched = roles.find(r => String(r.id) === e.target.value);
                            if (matched) {
                              setForm({ ...form, roleId: matched.id, role: matched.name });
                            }
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          <option value="">— 請選擇角色 —</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}{r.description ? \` — \${r.description}\` : ''}
                            </option>
                          ))}
                        </select>
                        {form.roleId && (
                          <p className="text-[10px] text-indigo-500 mt-1">
                            ✦ 細項權限可至「角色與權限管理」頁面調整
                          </p>
                        )}
                      </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newSnippet);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Role dropdown replaced successfully!');
} else {
  console.log('❌ Regex did not match. Trying direct indexOf approach...');
  
  // 備用方式：找到確切位置並替換
  const start = content.indexOf('<select value={form.role} onChange={e=>setForm({...form, role: e.target.value})}');
  if (start === -1) {
    console.log('❌ Could not find select element');
    process.exit(1);
  }
  
  // 往前找 <div
  const divStart = content.lastIndexOf('<div className="space-y-1.5 md:col-span-2">', start);
  // 往後找 </div>
  const divEnd = content.indexOf('</div>', start) + '</div>'.length;
  
  console.log('Found block at:', divStart, '-', divEnd);
  console.log('Block content:', JSON.stringify(content.substring(divStart, divEnd)));
  
  const before = content.substring(0, divStart);
  const after = content.substring(divEnd);
  content = before + newSnippet + after;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Role dropdown replaced via indexOf!');
}
