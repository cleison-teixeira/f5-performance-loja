const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables manually
const envFile = fs.readFileSync('/Users/cleissonteixeira/F5-Recompra/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse CLI flags
const args = process.argv.slice(2);
const dryRun = !args.includes('--dry-run=false');

async function run() {
  console.log('=== Backfill Lista de Espera Convertidos ===');
  console.log('Mode:', dryRun ? 'PREVIEW (DRY RUN)' : 'WRITE (APPLY)');

  // Get items status='convertido' with venda_id null
  const { data: items, error: fetchError } = await supabase
    .from('lista_espera')
    .select('id, loja_id, cliente_id, cliente_nome, cliente_whatsapp, produto_id, produto_nome, valor_potencial, quantidade, vendedora_id, criado_em')
    .eq('status', 'convertido')
    .is('venda_id', null);

  if (fetchError) {
    console.error('Error fetching waitlist items:', fetchError.message);
    process.exit(1);
  }

  console.log(`Total found items: ${items.length}`);

  if (items.length === 0) {
    console.log('No items to process.');
    return;
  }

  let convertedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    console.log(`\nProcessing Item ID: ${item.id}`);
    console.log(`  Client: ${item.cliente_nome} (${item.cliente_whatsapp})`);
    console.log(`  Product: ${item.produto_nome} | Qty: ${item.quantidade} | Potential: R$ ${item.valor_potencial}`);
    console.log(`  Store ID: ${item.loja_id}`);

    if (dryRun) {
      console.log('  [Preview] Would convert this item to a real sale.');
      skippedCount++;
      continue;
    }

    try {
      // 1. Resolve/Upsert Client
      let finalClienteId = item.cliente_id;
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .upsert(
          { loja_id: item.loja_id, whatsapp: item.cliente_whatsapp, nome: item.cliente_nome },
          { onConflict: 'loja_id,whatsapp' }
        )
        .select('id')
        .single();
      
      if (clienteError) {
        throw new Error(`Failed to upsert client: ${clienteError.message}`);
      }
      if (clienteData) {
        finalClienteId = clienteData.id;
      }

      // 2. Resolve/Create Product
      let finalProdutoId = item.produto_id;
      if (!finalProdutoId) {
        const { data: prod } = await supabase
          .from('produtos')
          .select('id')
          .eq('loja_id', item.loja_id)
          .eq('nome', item.produto_nome.trim())
          .limit(1)
          .maybeSingle();

        if (prod) {
          finalProdutoId = prod.id;
        } else {
          const { data: newProd, error: prodError } = await supabase
            .from('produtos')
            .insert({
              loja_id: item.loja_id,
              nome: item.produto_nome.trim(),
              recorrente: false,
              ativo: true
            })
            .select('id')
            .single();
          
          if (prodError || !newProd) {
            throw new Error(`Failed to create product: ${prodError?.message || 'unknown error'}`);
          }
          finalProdutoId = newProd.id;
        }
      }

      const valPot = item.valor_potencial ? Number(item.valor_potencial) : 0;
      const valorTotal = valPot * item.quantidade;

      // 3. Create Sale
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          loja_id: item.loja_id,
          cliente_id: finalClienteId,
          vendedora_id: item.vendedora_id,
          valor: valorTotal,
          data_compra: new Date(item.criado_em).toISOString().split('T')[0],
          origem: 'lista_espera',
        })
        .select('id')
        .single();

      if (vendaError || !vendaData) {
        throw new Error(`Failed to insert sale: ${vendaError?.message || 'unknown error'}`);
      }
      const vendaId = vendaData.id;

      // 4. Create Sale Item
      const { error: itemError } = await supabase.from('itens_venda').insert({
        venda_id: vendaId,
        produto_id: finalProdutoId,
        produto_nome: item.produto_nome,
        recorrente: false,
        comissionavel: false,
        quantidade: item.quantidade,
        valor_unitario: valPot,
        subtotal: valorTotal,
      });

      if (itemError) {
        // Rollback sale manually if item insert fails
        await supabase.from('vendas').delete().eq('id', vendaId);
        throw new Error(`Failed to insert sale item: ${itemError.message}`);
      }

      // 4.5. Gravar comissão (always 0 since comissionavel is false)
      try {
        const { gravarComissaoVenda } = require('../lib/comissoes/gravar');
        await gravarComissaoVenda({
          loja_id: item.loja_id,
          venda_id: vendaId,
          vendedora_id: item.vendedora_id,
          data_venda: new Date(item.criado_em).toISOString().split('T')[0],
          itens: [{
            produto_id: finalProdutoId,
            produto_nome: item.produto_nome,
            subtotal: valorTotal,
            comissionavel: false,
          }],
        });
      } catch (comissaoErr) {
        console.warn(`  [Warning] Failed to record commission record: ${comissaoErr.message}`);
      }

      // 5. Update waitlist item
      const { error: updateError } = await supabase
        .from('lista_espera')
        .update({ venda_id: vendaId })
        .eq('id', item.id);

      if (updateError) {
        // Rollback
        await supabase.from('itens_venda').delete().eq('venda_id', vendaId);
        await supabase.from('vendas').delete().eq('id', vendaId);
        throw new Error(`Failed to link waitlist item to sale: ${updateError.message}`);
      }

      console.log(`  [Success] Converted successfully. Sale ID: ${vendaId}`);
      convertedCount++;

    } catch (err) {
      console.error(`  [Error] Failed to process: ${err.message}`);
    }
  }

  console.log('\n=== Backfill Summary ===');
  console.log(`Total found: ${items.length}`);
  console.log(`Total converted: ${convertedCount}`);
  console.log(`Total skipped/previewed: ${skippedCount}`);
  console.log(`Total errors: ${items.length - convertedCount - skippedCount}`);
}

run().catch(err => console.error(err));
