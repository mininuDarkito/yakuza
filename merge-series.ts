import { prisma } from "./lib/db";

async function mergeSeries() {
  const nomeErrado = "伪装名流漫画";
  const nomeCerto = "伪装名流";

  console.log(`🚀 Iniciando fusão: "${nomeErrado}" -> "${nomeCerto}"`);

  try {
    const produtoErrado = await prisma.produtos.findUnique({ where: { nome: nomeErrado } });
    const produtoCerto = await prisma.produtos.findUnique({ where: { nome: nomeCerto } });

    if (!produtoErrado || !produtoCerto) {
      console.error("❌ Não foi possível encontrar um dos produtos.");
      console.log("Errado:", produtoErrado?.id);
      console.log("Certo:", produtoCerto?.id);
      return;
    }

    const idErrado = produtoErrado.id;
    const idCerto = produtoCerto.id;

    await prisma.$transaction(async (tx) => {
      // 1. Mover Vendas
      const vendasUpdate = await tx.vendas.updateMany({
        where: { produto_id: idErrado },
        data: { produto_id: idCerto }
      });
      console.log(`✅ ${vendasUpdate.count} vendas movidas.`);

      // 2. Mover Vínculos de Usuários (Ignorar duplicados se o usuário já tiver vínculo na certa)
      // Como o updateMany não suporta "ON CONFLICT", fazemos manual ou apenas deletamos os do errado que seriam duplicados
      const userSeries = await tx.user_series.findMany({ where: { produto_id: idErrado } });
      for (const us of userSeries) {
        await tx.user_series.upsert({
          where: {
            user_id_produto_id_grupo_id: {
              user_id: us.user_id,
              produto_id: idCerto,
              grupo_id: us.grupo_id
            }
          },
          update: { ativo: us.ativo },
          create: {
            user_id: us.user_id,
            produto_id: idCerto,
            grupo_id: us.grupo_id,
            ativo: us.ativo,
            created_at: us.created_at
          }
        });
      }
      await tx.user_series.deleteMany({ where: { produto_id: idErrado } });
      console.log(`✅ Vínculos de usuários processados.`);

      // 3. Mover Configurações de Preço (Grupo Series)
      const grupoSeries = await tx.grupo_series.findMany({ where: { produto_id: idErrado } });
      for (const gs of grupoSeries) {
        await tx.grupo_series.upsert({
          where: {
            grupo_id_produto_id: {
              grupo_id: gs.grupo_id,
              produto_id: idCerto
            }
          },
          update: { preco: gs.preco },
          create: {
            grupo_id: gs.grupo_id,
            produto_id: idCerto,
            preco: gs.preco,
            created_at: gs.created_at
          }
        });
      }
      await tx.grupo_series.deleteMany({ where: { produto_id: idErrado } });
      console.log(`✅ Configurações de preço processadas.`);

      // 4. Deletar a série errada
      await tx.produtos.delete({ where: { id: idErrado } });
      console.log(`🗑️ Série antiga deletada com sucesso.`);
    });

    console.log("✨ FUSÃO CONCLUÍDA COM SUCESSO!");

  } catch (error) {
    console.error("❌ Erro durante a fusão:", error);
  } finally {
    process.exit();
  }
}

mergeSeries();
