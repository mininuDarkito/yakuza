w# Validação da Correção - Plataformas e Imagens

## O Problema
O componente GroupManager não estava exibindo as plataformas e imagens dos produtos, mesmo tendo os dados corretos no banco de dados.

## Possíveis Causas Identificadas e Corrigidas

### 1. **Strings Vazias vs Undefined (CORRIGIDO)**
   - **Problema**: O SQL retornava strings vazias `''` via `COALESCE(p.plataforma, '')`
   - **Solução**: Agora o código verifica se a string não está vazia: `produto.plataforma && produto.plataforma.trim()`

### 2. **Conversão Dupla de Datas (CORRIGIDO)**
   - **Problema**: A API retornava datas como strings, mas o componente tentava converter novamente com `new Date()`
   - **Solução**: Agora a API não converte as datas, deixando para o componente fazê-lo uma única vez

### 3. **Dados NULL no Banco de Dados**
   - Se as colunas existem mas contêm NULL, o COALESCE retorna string vazia
   - Você pode verificar isso executando: `SELECT nome, nome_alternativo, imagem_url, plataforma FROM produtos WHERE nome_alternativo IS NOT NULL OR imagem_url IS NOT NULL OR plataforma IS NOT NULL LIMIT 10;`

## Como Validar a Correção

### 1. Verificar os Dados Brutos da API
Execute em seu navegador ou terminal:
```bash
# Com curl
curl -X GET http://localhost:3000/api/admin/grupos

# Ou use o script de debug
node debug-api-response.js
```

Procure por objetos de produtos que contenham:
```json
{
  "id": "uuid",
  "nome": "Nome da Série",
  "nomeAlternativo": "Nome Alternativo",
  "imagemUrl": "https://exemplo.com/imagem.jpg",
  "plataforma": "Nome da Plataforma",
  "transacoes": [...]
}
```

### 2. Verificar o Banco de Dados
Execute estas queries SQL no seu banco de dados:

**Verificar se as colunas existem:**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'produtos' 
AND column_name IN ('nome_alternativo', 'imagem_url', 'plataforma')
ORDER BY ordinal_position;
```

**Ver dados de exemplo:**
```sql
SELECT 
  id,
  nome,
  nome_alternativo,
  imagem_url,
  plataforma
FROM produtos 
WHERE nome_alternativo IS NOT NULL 
   OR imagem_url IS NOT NULL 
   OR plataforma IS NOT NULL
LIMIT 10;
```

### 3. Verificar no Componente
1. Abra o Dashboard Admin → Gerenciar Grupos
2. Expandir um grupo e vendedor
3. Procure pelos cards de séries/produtos
4. Verifique se:
   - ✅ As imagens aparecem (ou "Sem imagem" se vazio)
   - ✅ O nome alternativo aparece em cinza abaixo do nome principal
   - ✅ A plataforma aparece como um badge

## Checklist de Implementação

- [x] Corrigir queries SQL para usar `COALESCE` corretamente
- [x] Verificar e limpar strings vazias no componente
- [x] Não converter datas duplamente
- [x] Atualizar a lógica de filtragem para ignorar campos vazios
- [x] Testar renderização do SerieCard

## Próximos Passos se Ainda Não Funcionar

1. **Se colunas não existem**: Execute a migration para adicionar as colunas `nome_alternativo`, `imagem_url`, `plataforma` à tabela `produtos`

2. **Se dados estão NULL**: Atualize a base com dados de exemplo:
   ```sql
   UPDATE produtos 
   SET imagem_url = 'https://via.placeholder.com/64x96' 
   WHERE imagem_url IS NULL
   LIMIT 5;
   ```

3. **Se ainda não aparecer**: Abra o DevTools (F12) → Console e procure por:
   - Erros de JavaScript
   - Valores dos produtos no estado do React
   - Resposta da API em Network

## Arquivos Modificados

- `/app/api/admin/grupos/route.ts` - Corrigido COALESCE e conversão de dados
- `/app/api/admin/grupos/[id]/route.ts` - Corrigido COALESCE e conversão de dados
- `/components/dashboard/grupos/GroupManager.tsx` - Corrigido trimagem de strings e conversão de datas
- `/debug-api-response.js` - Novo arquivo de debug (opcional)
