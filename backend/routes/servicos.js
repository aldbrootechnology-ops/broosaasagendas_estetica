const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

/**
 * @route GET /api/servicos
 * @description Lista todos os serviços ativos
 */
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    
    let query = supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });
    
    if (categoria) {
      query = query.eq('categoria', categoria);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      total: data?.length || 0,
      servicos: data || []
    });
    
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao listar serviços' 
    });
  }
});

/**
 * @route GET /api/servicos/:id
 * @description Obtém um serviço específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Serviço não encontrado'
      });
    }
    
    res.json({
      success: true,
      servico: data
    });
    
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar serviço' 
    });
  }
});

/**
 * @route POST /api/servicos
 * @description Cria um novo serviço
 */
router.post('/', async (req, res) => {
  try {
    const servico = req.body;
    
    // Validações básicas
    if (!servico.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome do serviço é obrigatório'
      });
    }
    
    if (!servico.duracao_min || servico.duracao_min < 1) {
      return res.status(400).json({
        success: false,
        error: 'Duração do serviço é obrigatória'
      });
    }
    
    const { data, error } = await supabase
      .from('servicos')
      .insert([{
        nome: servico.nome,
        duracao_min: servico.duracao_min,
        valor: servico.valor || 0,
        categoria: servico.categoria || 'geral',
        descricao: servico.descricao,
        ativo: servico.ativo !== undefined ? servico.ativo : true
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Serviço criado com sucesso',
      servico: data
    });
    
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar serviço' 
    });
  }
});

module.exports = router;
