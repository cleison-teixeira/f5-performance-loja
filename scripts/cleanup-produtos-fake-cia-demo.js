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

const targetStores = [
  'b1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000003'
];

const fakeProductNames = [
  'Base Líquida HD',
  'Batom Matte Duradouro',
  'Creme Premium Antissinais',
  'Esfoliante Corporal Rose',
  'Hidratante Facial FPS 30',
  'Máscara de Cílios Volume',
  'Paleta de Sombras Glamour',
  'Sérum Vitamina C 30ml'
];

async function run() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--dry-run=false');

  console.log(`=== Fake Products Cleanup Script ===`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (No database writes)' : 'APPLY (Modifying database!)'}`);
  console.log(`Target Stores: ${targetStores.length}`);
  console.log(`Fake Products to target: ${fakeProductNames.length}\n`);

  for (const storeId of targetStores) {
    // Get store info
    const { data: store } = await supabase
      .from('lojas')
      .select('nome')
      .eq('id', storeId)
      .maybeSingle();

    if (!store) {
      console.log(`Store ${storeId} not found. Skipping.`);
      continue;
    }

    console.log(`\nStore: ${store.nome} (${storeId})`);

    for (const prodName of fakeProductNames) {
      // Find product in store
      const { data: prods } = await supabase
        .from('produtos')
        .select('id, nome')
        .eq('loja_id', storeId)
        .eq('nome', prodName);

      if (!prods || prods.length === 0) {
        console.log(`  - [Not Found] ${prodName}`);
        continue;
      }

      for (const p of prods) {
        // Count sales dependencies
        const { count: salesCount } = await supabase
          .from('vendas')
          .select('*', { count: 'exact', head: true })
          .eq('produto_id', p.id);

        // Count waitlist items
        const { count: waitlistCount } = await supabase
          .from('lista_espera')
          .select('*', { count: 'exact', head: true })
          .eq('produto_id', p.id);

        // Count pending alerts
        const { count: pendingAlertsCount } = await supabase
          .from('avisos')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente')
          .in('item_venda_id', (
            await supabase.from('itens_venda').select('id').eq('produto_id', p.id)
          ).data?.map(i => i.id) || []);

        console.log(`  - Found: "${p.nome}" (ID: ${p.id})`);
        console.log(`    Dependencies: Sales: ${salesCount || 0}, Waitlist: ${waitlistCount || 0}, Pending Alerts: ${pendingAlertsCount || 0}`);

        if (dryRun) {
          if ((salesCount || 0) === 0 && (waitlistCount || 0) === 0) {
            console.log(`    [DRY RUN Action] Would DELETE the product.`);
          } else {
            console.log(`    [DRY RUN Action] Would ARCHIVE (ativo=false, recorrente=false, comissionavel_recompra=false) and DELETE pending alerts.`);
          }
        } else {
          if ((salesCount || 0) === 0 && (waitlistCount || 0) === 0) {
            // Delete product
            console.log(`    [Action] DELETING product...`);
            const { error: delErr } = await supabase
              .from('produtos')
              .delete()
              .eq('id', p.id);
            if (delErr) {
              console.error(`      Error deleting:`, delErr.message);
            } else {
              console.log(`      Deleted successfully.`);
            }
          } else {
            // Archive product
            console.log(`    [Action] ARCHIVING product (deactivating)...`);
            const { error: updErr } = await supabase
              .from('produtos')
              .update({
                ativo: false,
                recorrente: false,
                comissionavel_recompra: false
              })
              .eq('id', p.id);
            if (updErr) {
              console.error(`      Error updating:`, updErr.message);
            } else {
              console.log(`      Archived successfully.`);
            }

            // Remove pending alerts
            const itemVendas = (await supabase.from('itens_venda').select('id').eq('produto_id', p.id)).data || [];
            const itemVendaIds = itemVendas.map(i => i.id);
            if (itemVendaIds.length > 0) {
              console.log(`    [Action] Deleting ${pendingAlertsCount || 0} pending alerts...`);
              const { error: delAlertsErr } = await supabase
                .from('avisos')
                .delete()
                .eq('status', 'pendente')
                .in('item_venda_id', itemVendaIds);
              if (delAlertsErr) {
                console.error(`      Error deleting alerts:`, delAlertsErr.message);
              } else {
                console.log(`      Alerts deleted successfully.`);
              }
            }
          }
        }
      }
    }
  }

  if (dryRun) {
    console.log(`\nTo execute database updates, run: node scripts/cleanup-produtos-fake-cia-demo.js --dry-run=false`);
  } else {
    console.log(`\nApply finished.`);
  }
}

run().catch(err => console.error(err));
