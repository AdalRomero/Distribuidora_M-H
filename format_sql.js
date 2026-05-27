const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\adal\\.gemini\\antigravity-ide\\brain\\c4802517-1c39-4bea-9b8e-01fa748ddb65\\.system_generated\\steps\\1249\\output.txt', 'utf8');

let match = content.match(/\[\{"prosrc":"([\s\S]*?)"\}\]/);
if (!match) throw new Error("No match");

let sql = match[1];

sql = sql.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');

// Replace the specific line:
const searchStr = "estado = (record->>'estado')::boolean, cantidad = NULLIF(record->>'cantidad', '')::numeric,";
sql = sql.replace(searchStr, "");

const finalSql = `CREATE OR REPLACE FUNCTION public.push_changes(changes jsonb)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\n` + sql + `\n$function$;`;

fs.writeFileSync('C:\\Users\\adal\\Documents\\Programacion\\reactjs\\Distribuidora_M-H\\clean_push_changes.sql', finalSql);
console.log('Success!');
