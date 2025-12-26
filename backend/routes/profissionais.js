const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');

/**
 * @route GET /api/profissionais
 * @description Lista todos os profissionais ativos
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });
    
    if (error) throw error;
    
    res.json({
      success: true,
      total: data?.length || 0,
      profissionais: data || []
    });
    
  } catch (error) {
    console.error('Erro ao listar profissionais:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao listar profissionais' 
    });
  }
});

/**
 * @route GET /api/profissionais/:id
 * @description Obtém um profissional específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Profissional não encontrado'
      });
    }
    
    res.json({
      success: true,
      profissional: data
    });
    
  } catch (error) {
    console.error('Erro ao buscar profissional:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar profissional' 
    });
  }
});

/**
 * @route POST /api/profissionais
 * @description Cria um novo profissional
 */
router.post('/', async (req, res) => {
  try {
    const profissional = req.body;
    
    // Validações básicas
    if (!profissional.nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome do profissional é obrigatório'
      });
    }
    
    const { data, error } = await supabase
      .from('profissionais')
      .insert([{
        nome: profissional.nome,
        especialidades: profissional.especialidades || [],
        cor_agenda: profissional.cor_agenda || '#8a4af3',
        ativo: profissional.ativo !== undefined ? profissional.ativo : true
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Profissional criado com sucesso',
      profissional: data
    });
    
  } catch (error) {
    console.error('Erro ao criar profissional:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar profissional' 
    });
  }
});

/**
 * @route PUT /api/profissionais/:id
 * @description Atualiza um profissional
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Não permitir atualizar ID
    delete updates.id;
    
    const { data, error } = await supabase
      .from('profissionais')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Profissional não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Profissional atualizado com sucesso',
      profissional: data
    });
    
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao atualizar profissional' 
    });
  }
});

module.exports = router;
