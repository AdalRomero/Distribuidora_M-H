const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\adal\\.gemini\\antigravity-ide\\brain\\c4802517-1c39-4bea-9b8e-01fa748ddb65\\.system_generated\\steps\\1249\\output.txt', 'utf8');

// The content is the MCP tool result JSON string - find the prosrc value
const prosrcStart = content.indexOf('"prosrc":"') + 10;
const prosrcEnd = content.indexOf('"}]\\n</untrusted');
let body = content.substring(prosrcStart, prosrcEnd);

// Unescape JSON string escapes
body = body
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '')
  .replace(/\\t/g, '\t')
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\');

console.log('Body length:', body.length);
console.log('Last 300:', body.slice(-300));

// Remove cantidad+estado from lotes UPDATE
const bad = "estado = (record->>'estado')::boolean, cantidad = NULLIF(record->>'cantidad', '')::numeric, ";
if (body.includes(bad)) {
  body = body.split(bad).join('');
  console.log('Removed cantidad/estado from lotes UPDATE');
} else {
  console.log('Pattern NOT found. Looking for partial...');
  const idx = body.indexOf("cantidad = NULLIF(record->>'cantidad'");
  console.log('cantidad index:', idx);
  if (idx > -1) console.log('Context:', body.slice(idx - 50, idx + 100));
}

const finalSql = `CREATE OR REPLACE FUNCTION public.push_changes(changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
${body}
$function$;`;

fs.writeFileSync('C:\\Users\\adal\\Documents\\Programacion\\reactjs\\Distribuidora_M-H\\push_changes_restored.sql', finalSql);
console.log('Wrote file, size:', finalSql.length);
