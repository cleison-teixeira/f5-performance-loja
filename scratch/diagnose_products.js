const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Env vars missing!');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get active recurring products
  const { data: products, error } = await supabase
    .from('produtos')
    .select('id, nome, qtd_mensagens, ativo, recorrente')
    .eq('ativo', true)
    .eq('recorrente', true);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Encontrados ${products.length} produtos recorrentes ativos.`);
  
  let countLess5 = 0;
  for (const p of products) {
    // Check templates count and missing 4/5
    const { data: messages } = await supabase
      .from('mensagens_produto')
      .select('ordem')
      .eq('produto_id', p.id);
      
    const ordens = (messages || []).map(m => m.ordem);
    const missing = [4, 5].filter(o => !ordens.includes(o));
    
    if (p.qtd_mensagens < 5 || missing.length > 0) {
      countLess5++;
      console.log(`- Produto: "${p.nome}" | qtd_mensagens cadastrada: ${p.qtd_mensagens} | Ordens no DB: [${ordens.join(', ')}] | Faltam: [${missing.join(', ')}]`);
    }
  }
  
  console.log(`Total de produtos que precisam de backfill: ${countLess5}`);
}

run();
