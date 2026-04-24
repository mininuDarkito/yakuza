// Script para depuração da API
// Execute com: node debug-api-response.js

async function testAPI() {
  try {
    console.log('🔍 Testando API em http://localhost:3000/api/admin/grupos...\n')
    
    const response = await fetch('http://localhost:3000/api/admin/grupos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Se precisar de autenticação, adicione cookies aqui
      }
    })

    console.log(`📊 Status da resposta: ${response.status}\n`)

    const data = await response.json()
    
    if (data.success && data.grupos && data.grupos.length > 0) {
      console.log('✅ API retornou grupos com sucesso\n')
      
      const grupo = data.grupos[0]
      console.log(`📌 Primeiro grupo: ${grupo.nome}`)
      console.log(`   Vendedores: ${grupo.vendedores.length}`)
      
      if (grupo.vendedores.length > 0) {
        const vendedor = grupo.vendedores[0]
        console.log(`\n👤 Primeiro vendedor: ${vendedor.nome}`)
        console.log(`   Produtos: ${vendedor.produtos.length}`)
        
        if (vendedor.produtos.length > 0) {
          const produto = vendedor.produtos[0]
          console.log(`\n📦 Primeiro produto:`)
          console.log(`   Nome: ${produto.nome}`)
          console.log(`   Nome Alternativo: ${produto.nomeAlternativo || '(vazio)'}`)
          console.log(`   Imagem URL: ${produto.imagemUrl || '(vazio)'}`)
          console.log(`   Plataforma: ${produto.plataforma || '(vazio)'}`)
          console.log(`\n📝 Objeto completo do produto:`)
          console.log(JSON.stringify(produto, null, 2))
        }
      }
    } else {
      console.log('❌ API não retornou dados esperados')
      console.log('Resposta completa:')
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message)
  }
}

testAPI()
