// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'database.db');

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite');
    }
});

// Funções para o banco de dados

// Criar tabela se não existir
function criarTabela() {
    const sql = `
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            estoque INTEGER DEFAULT 0,
            categoria TEXT,
            ativo BOOLEAN DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    return new Promise((resolve, reject) => {
        db.run(sql, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Inserir produto
function inserirProduto(produto) {
    const sql = `
        INSERT INTO produtos (nome, descricao, preco, estoque, categoria, ativo)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        produto.nome,
        produto.descricao || '',
        produto.preco,
        produto.estoque || 0,
        produto.categoria || 'Outros',
        produto.ativo !== false ? 1 : 0
    ];
    
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID); // Retorna o ID do produto inserido
            }
        });
    });
}

// Buscar todos os produtos
function buscarTodosProdutos(filtros = {}) {
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    
    // Filtros
    if (filtros.search) {
        sql += ' AND (nome LIKE ? OR descricao LIKE ?)';
        params.push(`%${filtros.search}%`, `%${filtros.search}%`);
    }
    
    if (filtros.categoria) {
        sql += ' AND categoria = ?';
        params.push(filtros.categoria);
    }
    
    if (filtros.minPrice) {
        sql += ' AND preco >= ?';
        params.push(filtros.minPrice);
    }
    
    if (filtros.maxPrice) {
        sql += ' AND preco <= ?';
        params.push(filtros.maxPrice);
    }
    
    if (filtros.ativo !== undefined) {
        sql += ' AND ativo = ?';
        params.push(filtros.ativo ? 1 : 0);
    }
    
    // Ordenação
    sql += ' ORDER BY criado_em DESC';
    
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Converter valores booleanos
                const produtos = rows.map(row => ({
                    ...row,
                    ativo: row.ativo === 1,
                    preco: parseFloat(row.preco),
                    estoque: parseInt(row.estoque)
                }));
                resolve(produtos);
            }
        });
    });
}

// Buscar produto por ID
function buscarProdutoPorId(id) {
    const sql = 'SELECT * FROM produtos WHERE id = ?';
    
    return new Promise((resolve, reject) => {
        db.get(sql, [id], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                // Converter valores
                const produto = {
                    ...row,
                    ativo: row.ativo === 1,
                    preco: parseFloat(row.preco),
                    estoque: parseInt(row.estoque)
                };
                resolve(produto);
            } else {
                resolve(null); // Produto não encontrado
            }
        });
    });
}

// Atualizar produto
function atualizarProduto(id, produto) {
    const sql = `
        UPDATE produtos 
        SET nome = ?, descricao = ?, preco = ?, estoque = ?, 
            categoria = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    const params = [
        produto.nome,
        produto.descricao || '',
        produto.preco,
        produto.estoque || 0,
        produto.categoria || 'Outros',
        produto.ativo !== false ? 1 : 0,
        id
    ];
    
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes); // Retorna número de linhas afetadas
            }
        });
    });
}

// Excluir produto
function excluirProduto(id) {
    const sql = 'DELETE FROM produtos WHERE id = ?';
    
    return new Promise((resolve, reject) => {
        db.run(sql, [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes); // Retorna número de linhas afetadas
            }
        });
    });
}

// Buscar categorias únicas
function buscarCategorias() {
    const sql = 'SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL ORDER BY categoria';
    
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.categoria));
            }
        });
    });
}

// Estatísticas
function buscarEstatisticas() {
    const sql = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estoque > 0 THEN 1 ELSE 0 END) as com_estoque,
            SUM(CASE WHEN estoque = 0 THEN 1 ELSE 0 END) as sem_estoque,
            SUM(CASE WHEN estoque > 0 AND estoque <= 10 THEN 1 ELSE 0 END) as estoque_baixo,
            AVG(preco) as preco_medio,
            SUM(estoque) as total_estoque
        FROM produtos
        WHERE ativo = 1
    `;
    
    return new Promise((resolve, reject) => {
        db.get(sql, [], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Exportar funções
module.exports = {
    db,
    criarTabela,
    inserirProduto,
    buscarTodosProdutos,
    buscarProdutoPorId,
    atualizarProduto,
    excluirProduto,
    buscarCategorias,
    buscarEstatisticas
};