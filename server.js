// server.js
const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3100;

// Configurações
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware para adicionar db a todas as requisições
app.use((req, res, next) => {
    req.db = db;
    next();
});

// ========== ROTAS ==========

// 1. PÁGINA INICIAL - Listar produtos com busca
app.get('/', async (req, res) => {
    try {
        const { search, categoria, minPrice, maxPrice, ativo } = req.query;
        
        const filtros = {};
        if (search) filtros.search = search;
        if (categoria) filtros.categoria = categoria;
        if (minPrice) filtros.minPrice = parseFloat(minPrice);
        if (maxPrice) filtros.maxPrice = parseFloat(maxPrice);
        if (ativo !== undefined) filtros.ativo = ativo === 'true';
        
        const produtos = await db.buscarTodosProdutos(filtros);
        const categorias = await db.buscarCategorias();
        const estatisticas = await db.buscarEstatisticas();
        
        res.render('index', { 
            produtos, 
            categorias,
            estatisticas,
            filtros: {
                search: search || '',
                categoria: categoria || '',
                minPrice: minPrice || '',
                maxPrice: maxPrice || '',
                ativo: ativo || ''
            }
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        res.status(500).render('error', { error });
    }
});

// 2. FORMULÁRIO DE NOVO PRODUTO
app.get('/novo', (req, res) => {
    res.render('form', { 
        produto: null,
        titulo: 'Novo Produto',
        categorias: ['Eletrônicos', 'Roupas', 'Alimentos', 'Livros', 'Outros']
    });
});

// 3. CRIAR PRODUTO
app.post('/produtos', async (req, res) => {
    try {
        const produto = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            preco: parseFloat(req.body.preco),
            estoque: parseInt(req.body.estoque),
            categoria: req.body.categoria,
            ativo: req.body.ativo === 'true'
        };
        
        const id = await db.inserirProduto(produto);
        console.log(`✅ Produto criado: ${produto.nome} (ID: ${id})`);
        
        res.redirect(`/produtos/${id}`);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).render('error', { error });
    }
});

// 4. DETALHES DO PRODUTO
app.get('/produtos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const produto = await db.buscarProdutoPorId(id);
        
        if (!produto) {
            return res.status(404).render('404');
        }
        
        res.render('detalhes', { produto });
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).render('error', { error });
    }
});

// 5. FORMULÁRIO DE EDIÇÃO
app.get('/produtos/:id/editar', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const produto = await db.buscarProdutoPorId(id);
        
        if (!produto) {
            return res.status(404).render('404');
        }
        
        res.render('form', { 
            produto,
            titulo: 'Editar Produto',
            categorias: ['Eletrônicos', 'Roupas', 'Alimentos', 'Livros', 'Outros']
        });
    } catch (error) {
        console.error('Erro ao carregar edição:', error);
        res.status(500).render('error', { error });
    }
});

// 6. ATUALIZAR PRODUTO
app.post('/produtos/:id/atualizar', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const produto = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            preco: parseFloat(req.body.preco),
            estoque: parseInt(req.body.estoque),
            categoria: req.body.categoria,
            ativo: req.body.ativo === 'true'
        };
        
        const changes = await db.atualizarProduto(id, produto);
        
        if (changes === 0) {
            return res.status(404).render('404');
        }
        
        console.log(`✏️  Produto atualizado: ${produto.nome} (ID: ${id})`);
        res.redirect(`/produtos/${id}`);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).render('error', { error });
    }
});

// 7. EXCLUIR PRODUTO
app.post('/produtos/:id/excluir', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const changes = await db.excluirProduto(id);
        
        if (changes === 0) {
            return res.status(404).render('404');
        }
        
        console.log(`🗑️  Produto excluído: ID ${id}`);
        res.redirect('/');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).render('error', { error });
    }
});

// 8. API REST (opcional)
app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await db.buscarTodosProdutos();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/produtos/:id', async (req, res) => {
    try {
        const produto = await db.buscarProdutoPorId(req.params.id);
        if (produto) {
            res.json(produto);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 9. PÁGINA 404
app.use((req, res) => {
    res.status(404).render('404');
});

// 10. ERRO GERAL
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

// Inicializar banco e iniciar servidor
async function iniciarServidor() {
    try {
        // Criar tabela se não existir
        await db.criarTabela();
        console.log('✅ Tabela verificada/criada');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
            console.log(`🗃️  Banco de dados: database.db`);
            console.log(`📁 Views: ${path.join(__dirname, 'views')}`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar
iniciarServidor();